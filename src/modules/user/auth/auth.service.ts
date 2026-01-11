import crypto from "crypto";
import { Response } from "express";
import { Types } from "mongoose";
import { RequestWithUser } from "@modules/core/types/auth";
import { User, UserModel } from "@modules/user/user.model";
import { comparePassword, hashPassword } from "@utils/auth/hash";
import { signTokenPair, verifyRefreshToken } from "@utils/auth/token";
import { ENV } from "@config/env";
import { EmailService } from "@modules/communication/email/email.service";
import { messages } from "@constants/messages";
import { RefreshSessionModel } from "@modules/user/auth/refreshSession.model";
import { PasswordResetModel } from "@modules/user/auth/passwordReset.model";
import { AppError } from "@utils/common/appError";
import { emailTemplates } from "@modules/communication/email/email.templates";
import { getAuthProvider } from "@modules/user/auth/providers";
import { getProviderMeta } from "@modules/user/auth/providers/base/provider";
import { ForgotPasswordDTO } from "@modules/user/auth/auth.validation";
import { subscriptionService } from "@modules/billing/subscriptions/subscription.service";
import { buildUserPayload, UserDocumentLike } from "@utils/auth/userPayload";
import { MediaService } from "@modules/assets/media/media.service";
import { ThemeEnum } from "@modules/user/settings/types";
import { AuthIdentityModel } from "@modules/user/auth/authIdentity.model";

export const REFRESH_COOKIE = "refresh_token";
export const ACCESS_COOKIE = "access_token";
const MAX_AVATAR_SIZE_BYTES = 5 * 1024 * 1024;

/* --------------------------- helpers --------------------------- */

// English-only comments.
function msToNumber(value: string): number {
  const m = /^(\d+)([smhd])$/.exec(value);
  if (!m) return 7 * 24 * 60 * 60 * 1000;
  const n = Number(m[1]);
  switch (m[2]) {
    case "s":
      return n * 1000;
    case "m":
      return n * 60 * 1000;
    case "h":
      return n * 60 * 60 * 1000;
    case "d":
      return n * 24 * 60 * 60 * 1000;
    default:
      return 7 * 24 * 60 * 60 * 1000;
  }
}

function accessCookieOptions() {
  return {
    httpOnly: true,
    secure: ENV.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: msToNumber(ENV.JWT_EXPIRES_IN),
  };
}

function refreshCookieOptions() {
  return {
    httpOnly: true,
    secure: ENV.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: msToNumber(ENV.JWT_REFRESH_EXPIRES_IN),
  };
}

/**
 * Build auth response with full permission tree.
 * Plan is resolved from active subscription, not from the user document.
 */
async function formatAuthResponse(user: User, accessToken: string) {
  const userPayload = await buildUserPayload(user as UserDocumentLike);

  return {
    accessToken,
    user: userPayload,
  };
}

// Whitelist check for final front-end redirect
function pickAllowedRedirect(
  candidate: string | undefined | null,
): string | null {
  if (!candidate) return null;
  const allowed = (ENV.OAUTH_ALLOWED_REDIRECTS || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return allowed.includes(candidate) ? candidate : null;
}

// Encode redirect into state for round-trip safety
function buildState(redirect?: string): string {
  const payload = {
    n: crypto.randomBytes(16).toString("hex"),
    r: redirect || null,
    t: Date.now(),
  };
  return Buffer.from(JSON.stringify(payload)).toString("base64url");
}

function parseState(state?: string): { redirect?: string | null } {
  if (!state) return {};
  try {
    const json = JSON.parse(Buffer.from(state, "base64url").toString("utf8"));
    return { redirect: typeof json?.r === "string" ? json.r : null };
  } catch {
    return {};
  }
}

function shouldImportAvatar(avatar: User["avatar"], incomingUrl?: string) {
  if (!incomingUrl) return false;

  const isObjectIdString =
    typeof avatar === "string" && /^[a-f\d]{24}$/i.test(avatar);

  if (avatar && typeof avatar !== "string") return false;
  if (isObjectIdString) return false;

  return true;
}

function isObjectIdString(value?: string) {
  return typeof value === "string" && Types.ObjectId.isValid(value);
}

/* ---------------------------- service --------------------------- */
type OAuthIntent = "login" | "register";

type OauthCodeInput = {
  provider: string;
  code: string;
  redirect_uri?: string;
  state?: string;
  locale?: string;
  code_verifier?: string;
  intent?: OAuthIntent;
  theme?: ThemeEnum;
};

export class AuthService {
  // Provider accessor with uniform error
  private getProvider(providerKey: string) {
    try {
      return getAuthProvider(providerKey);
    } catch {
      throw new AppError(messages.auth.invalidToken, 400, {
        reason: "provider_not_configured",
      });
    }
  }

  private async ensureAvatarImported(avatarUrl: string, user: User) {
    if (!shouldImportAvatar(user.avatar, avatarUrl)) return;

    try {
      const media = await MediaService.uploadFromUrl(
        avatarUrl,
        String(user._id),
        {
          name: user.name || user.email || user.authProviders[0]?.providerId,
          description: "Imported from OAuth provider",
        },
      );

      user.avatar = media._id as any;
      await user.save();
    } catch (error) {
      // Non-blocking: auth should succeed even if avatar import fails
      console.warn("Failed to import OAuth avatar", error);
    }
  }

  /* ---------- OAuth: build authorization URL (code flow) ---------- */
  async getAuthorizationUrl(
    providerKey: string,
    opts: {
      redirect?: string;
      scope?: string[];
      code_challenge?: string;
      code_challenge_method?: "S256" | "plain";
      prompt?: string;
      access_type?: "online" | "offline";
      extra?: Record<string, string | undefined>;
    } = {},
  ): Promise<string> {
    const provider = this.getProvider(providerKey);
    const state = buildState(opts.redirect);
    const url = provider.getAuthorizationUrl({
      state,
      scope: opts.scope,
      code_challenge: opts.code_challenge,
      code_challenge_method: opts.code_challenge_method,
      prompt: opts.prompt as any,
      access_type: opts.access_type,
      extra: opts.extra,
    });
    return url;
  }

  /* ---------- OAuth: finish by code (callback or SPA post) ---------- */
  async oauthLoginWithCode(
    input: OauthCodeInput,
    req: RequestWithUser,
    res: Response,
  ) {
    const provider = this.getProvider(input.provider);

    const profile = await provider.getProfile(input.code, {
      redirectUriOverride: input.redirect_uri,
      code_verifier: input.code_verifier,
    });

    return this.finishOauth(
      profile,
      input.locale,
      input.theme,
      input.intent ?? "login",
      req,
      res,
    );
  }

  /* ---------- OAuth: id_token direct path (legacy / One Tap) ---------- */
  async oauthLogin(
    body: {
      provider: string;
      idToken: string;
      locale?: string;
      theme?: ThemeEnum;
      intent?: OAuthIntent;
    },
    req: RequestWithUser,
    res: Response,
  ) {
    const { provider, idToken, locale, intent = "login" } = body;
    if (provider === "email") {
      throw new AppError(messages.auth.invalidToken, 400);
    }

    const providerImpl = this.getProvider(provider);
    const claims = await providerImpl.verify(idToken);

    const profile = {
      provider,
      providerId: claims.providerId,
      email: claims.email,
      emailVerified: claims.emailVerified,
      name: claims.name,
      avatar: claims.avatar,
    };

    return this.finishOauth(profile, locale, body.theme, intent, req, res);
  }

  /* ---------- Shared finalization for both OAuth paths ---------- */
  private async finishOauth(
    profile: {
      provider: string;
      providerId: string;
      email?: string;
      emailVerified?: boolean;
      name?: string;
      avatar?: string;
    },
    locale: string | undefined,
    theme: ThemeEnum | undefined,
    intent: OAuthIntent,
    req: RequestWithUser,
    res: Response,
  ) {
    try {
      const provider = profile.provider;
      const providerId = profile.providerId;
      const email = profile.email?.toLowerCase();
      const emailVerified = profile.emailVerified;
      const name = profile.name;
      const avatar = profile.avatar;

      const meta = getProviderMeta(provider);
      const requireVerified = meta.requireVerifiedEmailToLink;

      if (!providerId) {
        throw new AppError(messages.auth.invalidToken, 400, {
          reason: "missing_provider_id",
        });
      }

      let user: User | null = null;
      let identity = await AuthIdentityModel.findOne({
        provider,
        providerId,
      });
      if (identity) {
        user = await UserModel.findById(identity.userId);
        if (!user) {
          await AuthIdentityModel.deleteOne({ _id: identity._id });
          identity = null;
        }
      }

      if (intent === "login") {
        if (!user && email) {
          const byEmail = await UserModel.findOne({ email });

          if (byEmail) {
            const hasLocal =
              !!byEmail.passwordHash ||
              !!byEmail.password ||
              byEmail.authProviders.some((p: any) => p.provider === "email");

            if (hasLocal) {
              throw new AppError(messages.auth.invalidAuthMethond, 400, {
                email,
                provider,
              });
            }

            if (requireVerified && !emailVerified) {
              throw new AppError(messages.auth.forbidden, 401);
            }

            user = byEmail;
          } else {
            throw new AppError(messages.auth.userWithSuchEmailNotFount, 401, {
              email,
            });
          }
        }

        if (!user && !email) {
          throw new AppError(messages.auth.userWithSuchEmailNotFount, 401);
        }
      } else {
        // intent === "register"
        if (!user) {
          if (email) {
            const byEmail = await UserModel.findOne({ email });
            if (byEmail) {
              const hasLocal =
                !!byEmail.passwordHash ||
                !!byEmail.password ||
                byEmail.authProviders.some((p: any) => p.provider === "email");

              if (hasLocal) {
                throw new AppError(messages.auth.emailUsed, 409, { email });
              }

              if (requireVerified && !emailVerified) {
                throw new AppError(messages.auth.forbidden, 401);
              }

              user = byEmail;
            }
          }

          if (!user) {
            if (requireVerified && email && !emailVerified) {
              throw new AppError(messages.auth.forbidden, 401);
            }

            try {
              user = await UserModel.create({
                email,
                emailVerified: Boolean(emailVerified),
                emailVerifiedAt: emailVerified ? new Date() : undefined,
                name,
                role: "user",
                settings: {
                  locale: locale || req.lang || ENV.DEFAULT_LANGUAGE,
                  theme,
                },
                authProviders: [
                  {
                    provider: provider as any,
                    providerId,
                    email,
                    addedAt: new Date(),
                    lastUsedAt: new Date(),
                  },
                ],
              });

              identity = await AuthIdentityModel.create({
                provider,
                providerId,
                userId: user._id,
              });
            } catch (error: any) {
              if (error?.code === 11000 && email) {
                const existing = await UserModel.findOne({ email });
                if (existing) {
                  const hasLocal =
                    !!existing.passwordHash ||
                    !!existing.password ||
                    existing.authProviders.some(
                      (p: any) => p.provider === "email",
                    );

                  if (hasLocal) {
                    throw new AppError(messages.auth.emailUsed, 409, { email });
                  }

                  user = existing;
                  identity = await AuthIdentityModel.findOne({
                    provider,
                    providerId,
                  });
                }
              }

              if (!user) {
                throw error;
              }
            }
          }
        }
      }

      if (!user) {
        throw new AppError(messages.auth.unauthorized, 401);
      }

      const linked = user.authProviders.find(
        (p: any) => p.provider === provider,
      );
      if (!linked) {
        user.authProviders.push({
          provider: provider as any,
          providerId,
          email,
          addedAt: new Date(),
          lastUsedAt: new Date(),
        });
      } else {
        linked.lastUsedAt = new Date();
        if (!linked.providerId && providerId) linked.providerId = providerId;
        if (linked.providerId !== providerId && providerId) {
          linked.providerId = providerId;
        }
        if (!linked.email && email) linked.email = email;
      }

      if (!identity) {
        try {
          identity = await AuthIdentityModel.create({
            provider,
            providerId,
            userId: user._id,
          });
        } catch (error: any) {
          let handled = false;
          if (error?.code === 11000) {
            const existing = await AuthIdentityModel.findOne({
              provider,
              providerId,
            });
            if (existing) {
              if (String(existing.userId) !== String(user._id)) {
                throw new AppError(messages.auth.providerAlreadyLinked, 409, {
                  provider,
                });
              }
              identity = existing;
              handled = true;
            }
          }
          if (!handled) {
            throw error;
          }
        }
      }

    if (!user.name && name) user.name = name;
    if (!user.avatar && avatar && isObjectIdString(avatar)) {
      user.avatar = avatar;
    }
    if (!user.email && email) {
      user.email = email;
    }
    if (email && emailVerified) {
      user.emailVerified = true;
      user.emailVerifiedAt = new Date();
    }
    await user.save();

      if (avatar) {
        await this.ensureAvatarImported(avatar, user);
      }

      const jti = crypto.randomUUID();
      const userId = (user as any).id || String(user._id);
      const planKey = await subscriptionService.getUserCurrentPlanKey(userId);

      const { accessToken, refreshToken } = signTokenPair({
        userId,
        role: user.role,
        plan: planKey,
        jti,
      });

      await RefreshSessionModel.create({
        userId: user._id,
        jti,
        ip: req.ip,
        userAgent: req.headers["user-agent"],
        expiresAt: new Date(
          Date.now() + msToNumber(ENV.JWT_REFRESH_EXPIRES_IN),
        ),
      });

      res.cookie(REFRESH_COOKIE, refreshToken, refreshCookieOptions());
      res.cookie(ACCESS_COOKIE, accessToken, accessCookieOptions());
      return formatAuthResponse(user, accessToken);
    } catch (err) {
      console.log('err auth oauth Finish', err);
      
    }
  }

  /* ----------------------- Credentials auth ----------------------- */

  async register(
    body: {
      email: string;
      password: string;
      name?: string;
      locale?: string;
      theme?: ThemeEnum;
      avatar?: string | null;
      avatarUrl?: string;
    },
    req: RequestWithUser,
    res: Response,
    avatarFile?: Express.Multer.File,
  ) {
    const { email, password, name, locale, theme, avatar, avatarUrl } = body;
    const normalizedEmail = email.trim().toLowerCase();

    const exists = await UserModel.findOne({ email: normalizedEmail });
    if (exists) {
      throw new AppError(messages.auth.emailUsed, 409, {
        email: normalizedEmail,
      });
    }

    const passwordHash = await hashPassword(password);
    const user = new UserModel({
      email: normalizedEmail,
      passwordHash,
      emailVerified: false,
      role: "user",
      name,
      avatar,
      settings: {
        locale: locale || req.lang || ENV.DEFAULT_LANGUAGE,
        theme,
      },
      authProviders: [
        {
          provider: "email",
          providerId: normalizedEmail,
          email: normalizedEmail,
          addedAt: new Date(),
          lastUsedAt: new Date(),
        },
      ],
    });

    if (avatarFile) {
      if (avatarFile.size > MAX_AVATAR_SIZE_BYTES) {
        throw new AppError(
          `${messages.media.tooLarge}|{"limitMb":${
            MAX_AVATAR_SIZE_BYTES / 1024 / 1024
          }}`,
          400,
        );
      }

      const media = await MediaService.upload(avatarFile, String(user._id), {
        name: name || email,
        description: "User avatar uploaded during registration",
      });
      user.avatar = media._id as any;
    } else if (avatarUrl) {
      const media = await MediaService.uploadFromUrl(
        avatarUrl,
        String(user._id),
        {
          name: name || email,
          description: "User avatar imported during registration",
        },
        MAX_AVATAR_SIZE_BYTES,
      );
      user.avatar = media._id as any;
    } else if (avatar) {
      user.avatar = avatar as any;
    }

    await user.save();

    await AuthIdentityModel.create({
      provider: "email",
      providerId: normalizedEmail,
      userId: user._id,
    });

    try {
      await EmailService.send({
        to: normalizedEmail,
        template: emailTemplates.auth.registration.file,
        subjectKey: emailTemplates.auth.registration.subjectKey,
        locale: user.settings.locale || ENV.DEFAULT_LANGUAGE,
        previewTextKey: emailTemplates.auth.registration.previewTextKey,
        data: { name: name || normalizedEmail },
      });
    } catch {}

    const jti = crypto.randomUUID();
    const userId = (user as any).id || String(user._id);
    const planKey = await subscriptionService.getUserCurrentPlanKey(userId);

    const { accessToken, refreshToken } = signTokenPair({
      userId,
      role: user.role,
      plan: planKey,
      jti,
    });

    await RefreshSessionModel.create({
      userId: user._id,
      jti,
      ip: req.ip,
      userAgent: req.headers["user-agent"],
      expiresAt: new Date(Date.now() + msToNumber(ENV.JWT_REFRESH_EXPIRES_IN)),
    });

    res.cookie(REFRESH_COOKIE, refreshToken, refreshCookieOptions());
    res.cookie(ACCESS_COOKIE, accessToken, accessCookieOptions());
    return formatAuthResponse(user, accessToken);
  }

  async login(
    body: { email: string; password: string },
    req: RequestWithUser,
    res: Response,
  ) {
    const { email, password } = body;
    const normalizedEmail = email.trim().toLowerCase();
    const user = await UserModel.findOne({ email: normalizedEmail });
    if (!user) {
      throw new AppError(messages.auth.userWithSuchEmailNotFount, 401, {
        email: normalizedEmail,
      });
    }

    const passwordHash = user.passwordHash || user.password;
    if (!passwordHash && password) {
      throw new AppError(messages.auth.invalidAuthMethond, 401);
    }

    if (passwordHash) {
      const ok = await comparePassword(password, passwordHash);
      if (!ok) throw new AppError(messages.auth.forbidden, 401);
    }

    const emailProvider = user.authProviders.find(
      (p: any) => p.provider === "email",
    );
    if (!emailProvider) {
      user.authProviders.push({
        provider: "email",
        providerId: user.email,
        email: user.email,
        addedAt: new Date(),
        lastUsedAt: new Date(),
      });
    } else {
      emailProvider.lastUsedAt = new Date();
      if (!emailProvider.email) emailProvider.email = user.email;
      if (!emailProvider.providerId) emailProvider.providerId = user.email;
    }

    const existingIdentity = await AuthIdentityModel.findOne({
      provider: "email",
      providerId: user.email,
    });
    if (!existingIdentity) {
      await AuthIdentityModel.create({
        provider: "email",
        providerId: user.email,
        userId: user._id,
      });
    }

    if (user.password && !user.passwordHash) {
      user.passwordHash = user.password;
      user.password = null;
    }

    await user.save();

    const jti = crypto.randomUUID();
    const userId = (user as any).id || String(user._id);
    const planKey = await subscriptionService.getUserCurrentPlanKey(userId);

    const { accessToken, refreshToken } = signTokenPair({
      userId,
      role: user.role,
      plan: planKey,
      jti,
    });

    await RefreshSessionModel.create({
      userId: user._id,
      jti,
      ip: req.ip,
      userAgent: req.headers["user-agent"],
      expiresAt: new Date(Date.now() + msToNumber(ENV.JWT_REFRESH_EXPIRES_IN)),
    });

    res.cookie(REFRESH_COOKIE, refreshToken, refreshCookieOptions());
    res.cookie(ACCESS_COOKIE, accessToken, accessCookieOptions());
    return formatAuthResponse(user, accessToken);
  }

  /* --------------------------- Tokens --------------------------- */

  async refresh(req: RequestWithUser, res: Response) {
    const token = (req as any).cookies?.[REFRESH_COOKIE];
    if (!token) throw new AppError(messages.auth.missingToken, 401);

    const decoded = verifyRefreshToken(token);
    if (!decoded) throw new AppError(messages.auth.invalidToken, 402);

    const session = await RefreshSessionModel.findOne({
      jti: decoded.jti,
      userId: decoded.sub,
    });
    if (!session) throw new AppError(messages.auth.invalidToken, 403);

    const user = await UserModel.findById(decoded.sub);
    if (!user) {
      throw new AppError(messages.crud.notFound, 404, { userId: decoded.sub });
    }

    const newJti = crypto.randomUUID();
    const userId = (user as any).id || String(user._id);
    const planKey = await subscriptionService.getUserCurrentPlanKey(userId);

    const { accessToken, refreshToken } = signTokenPair({
      userId,
      role: user.role,
      plan: planKey,
      jti: newJti,
    });

    session.jti = newJti;
    session.expiresAt = new Date(
      Date.now() + msToNumber(ENV.JWT_REFRESH_EXPIRES_IN),
    );
    session.ip = req.ip;
    session.userAgent = req.headers["user-agent"];
    await session.save();

    res.cookie(REFRESH_COOKIE, refreshToken, refreshCookieOptions());
    res.cookie(ACCESS_COOKIE, accessToken, accessCookieOptions());
    return { accessToken };
  }

  async logout(req: RequestWithUser, res: Response) {
    const token = (req as any).cookies?.[REFRESH_COOKIE];
    if (token) {
      try {
        const decoded = verifyRefreshToken(token);
        if (decoded) {
          await RefreshSessionModel.deleteOne({
            jti: decoded.jti,
            userId: decoded.sub,
          });
        }
      } catch {}
    }
    res.clearCookie(REFRESH_COOKIE, { path: "/" });
    res.clearCookie(ACCESS_COOKIE, { path: "/" });
  }

  /* ------------------------- Password flows ------------------------- */

  async forgotPassword(
    body: ForgotPasswordDTO,
    ctx: { ip?: string; userAgent?: string } = {},
  ) {
    const RESET_TOKEN_TTL_MS = 60 * 60 * 1000;
    const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
    const RATE_LIMIT_MAX_REQUESTS = 15;

    const email = body.email.trim().toLowerCase();

    const user = await UserModel.findOne({ email });
    if (!user) {
      throw new AppError(messages.auth.userWithSuchEmailNotFount, 401, {
        email,
      });
    }

    const providerKeys = Array.isArray(user.authProviders)
      ? user.authProviders.map((provider) => provider.provider)
      : [];
    const hasLocalPassword =
      Boolean((user as any).passwordHash) ||
      Boolean((user as any).password) ||
      providerKeys.includes("email");

    if (!hasLocalPassword) {
      throw new AppError(messages.auth.passwordResetUnavailableForOAuth, 400, {
        providers: providerKeys,
      });
    }

    const since = new Date(Date.now() - RATE_LIMIT_WINDOW_MS);
    const recentCount = await PasswordResetModel.countDocuments({
      userId: user._id,
      createdAt: { $gte: since },
      revokedAt: { $exists: false },
      consumedAt: { $exists: false },
    });
    if (recentCount >= RATE_LIMIT_MAX_REQUESTS) {
      throw new AppError(messages.auth.tooManyResetRequests, 429, {
        windowMs: RATE_LIMIT_WINDOW_MS,
        max: RATE_LIMIT_MAX_REQUESTS,
      });
    }

    await PasswordResetModel.updateMany(
      {
        userId: user._id,
        consumedAt: { $exists: false },
        revokedAt: { $exists: false },
      },
      { $set: { revokedAt: new Date(), revokeReason: "ISSUED_NEW" } },
    );

    const rawToken = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto
      .createHash("sha256")
      .update(rawToken)
      .digest("hex");

    await PasswordResetModel.create({
      userId: user._id,
      tokenHash,
      expiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MS),
      meta: {
        ip: ctx.ip || null,
        ua: ctx.userAgent || null,
      },
    });

    const resetLink = `${ENV.FRONT_URL}/auth/reset-password?token=${rawToken}`;
    await EmailService.send({
      to: user.email,
      template: emailTemplates.auth.resetPassword.file,
      subjectKey: emailTemplates.auth.resetPassword.subjectKey,
      previewTextKey: emailTemplates.auth.resetPassword.previewTextKey,
      data: { name: user.name || user.email, resetLink },
      locale: user.settings?.locale || ENV.DEFAULT_LANGUAGE,
    });

    return { message: messages.auth.resetEmailSent };
  }

  async changePassword(body: { token: string; newPassword: string }) {
    const { token, newPassword } = body;
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

    const record = await PasswordResetModel.findOne({
      tokenHash,
      usedAt: null,
    });
    if (!record || record.expiresAt.getTime() < Date.now()) {
      throw new AppError(messages.auth.invalidToken, 400);
    }

    const user = await UserModel.findById(record.userId);
    if (!user) {
      throw new AppError(messages.crud.notFound, 404, {
        userId: record.userId,
      });
    }

    user.passwordHash = await hashPassword(newPassword);
    user.password = null;
    await user.save();
    await RefreshSessionModel.deleteMany({ userId: user._id });

    record.usedAt = new Date();
    await record.save();

    await EmailService.send({
      to: user.email,
      template: emailTemplates.auth.passwordChanged.file,
      subjectKey: emailTemplates.auth.passwordChanged.subjectKey,
      previewTextKey: emailTemplates.auth.passwordChanged.previewTextKey,
      data: { name: user.name || user.email },
      locale: user.settings?.locale || ENV.DEFAULT_LANGUAGE,
    });
  }

  /* --------------------- Callback redirect helper --------------------- */

  public extractSafeRedirect(args: {
    redirect?: string | null;
    state?: string;
  }) {
    const fromQuery = pickAllowedRedirect(args.redirect);
    if (fromQuery) return fromQuery;
    const { redirect } = parseState(args.state);
    const fromState = pickAllowedRedirect(redirect || undefined);
    return fromState;
  }
}
