import { UserModel } from "@modules/user/user.model";
import { AppError } from "@utils/common/appError";
import { messages } from "@constants/messages";
import { OneTimeCodeService } from "@modules/user/account/oneTimeCode.service";
import { EmailService } from "@modules/communication/email/email.service";
import { emailTemplates } from "@modules/communication/email/email.templates";
import { ENV } from "@config/env";
import { RefreshSessionModel } from "@modules/user/auth/refreshSession.model";
import { getAuthProvider } from "@modules/user/auth/providers";
import { getEnabledAuthProviders } from "@modules/user/auth/auth.config";
import { comparePassword, hashPassword } from "@utils/auth/hash";
import { UserDeletionJobModel } from "@modules/user/account/userDeletionJob.model";
import { deleteUserAuthData } from "@modules/user/account/userDeletion.service";

export class AccountService {
  async getMe(userId: string) {
    const user = await UserModel.findById(userId);
    if (!user) {
      throw new AppError(messages.crud.notFound, 404, { userId });
    }

    return {
      ...user.toJSON(),
      authProviders: user.authProviders,
      emailVerified: user.emailVerified,
      hasPassword: Boolean(user.passwordHash || user.password),
      enabledAuthProviders: getEnabledAuthProviders(),
    };
  }

  async updateProfile(
    userId: string,
    data: {
      birthday?: Date;
      phone?: string;
      country?: string;
      timezone?: string;
    },
  ) {
    const user = await UserModel.findById(userId);
    if (!user) {
      throw new AppError(messages.crud.notFound, 404, { userId });
    }

    if (data.birthday !== undefined) user.birthday = data.birthday;
    if (data.phone !== undefined) user.phone = data.phone;
    if (data.country !== undefined) user.country = data.country;
    if (data.timezone !== undefined) user.timezone = data.timezone;

    await user.save();
    return user.toJSON();
  }

  async linkOauthProvider(userId: string, input: {
    provider: "google" | "apple" | "github";
    idToken?: string;
    code?: string;
    redirect_uri?: string;
    code_verifier?: string;
  }) {
    const enabled = getEnabledAuthProviders();
    if (!enabled.includes(input.provider)) {
      throw new AppError(messages.auth.providerDisabled, 400, {
        provider: input.provider,
      });
    }

    const providerImpl = getAuthProvider(input.provider);

    const profile = input.idToken
      ? await providerImpl.verify(input.idToken)
      : input.code
        ? await providerImpl.getProfile(input.code, {
            redirectUriOverride:
              input.redirect_uri ||
              (input.provider === "google" ? "postmessage" : undefined),
            code_verifier: input.code_verifier,
          })
        : null;

    if (!profile) {
      throw new AppError(messages.auth.invalidToken, 400, {
        reason: "idToken_or_code_required",
      });
    }

    const normalizedEmail = profile.email?.toLowerCase();
    const existingIdentity = await AuthIdentityModel.findOne({
      provider: input.provider,
      providerId: profile.providerId,
    });
    if (existingIdentity && String(existingIdentity.userId) !== userId) {
      throw new AppError(messages.auth.providerAlreadyLinked, 409, {
        provider: input.provider,
      });
    }

    const user = await UserModel.findById(userId);
    if (!user) {
      throw new AppError(messages.crud.notFound, 404, { userId });
    }

    const existingProvider = user.authProviders.find(
      (provider) => provider.provider === input.provider,
    );
    if (existingProvider) {
      existingProvider.providerId = profile.providerId;
      existingProvider.email = normalizedEmail;
      existingProvider.lastUsedAt = new Date();
    } else {
      user.authProviders.push({
        provider: input.provider,
        providerId: profile.providerId,
        email: normalizedEmail,
        addedAt: new Date(),
        lastUsedAt: new Date(),
      });
    }

    if (!user.email && normalizedEmail) {
      user.email = normalizedEmail;
    }
    if (normalizedEmail && profile.emailVerified) {
      user.emailVerified = true;
      user.emailVerifiedAt = new Date();
    }

    await user.save();

    if (!existingIdentity) {
      await AuthIdentityModel.create({
        provider: input.provider,
        providerId: profile.providerId,
        userId: user._id,
      });
    }

    return {
      authProviders: user.authProviders,
    };
  }

  async unlinkProvider(userId: string, provider: string) {
    const user = await UserModel.findById(userId);
    if (!user) {
      throw new AppError(messages.crud.notFound, 404, { userId });
    }

    const providers = user.authProviders.filter((item) => item.provider !== provider);

    if (providers.length === user.authProviders.length) {
      throw new AppError(messages.auth.providerNotLinked, 404, { provider });
    }

    if (providers.length === 0) {
      throw new AppError(messages.auth.lastProviderRequired, 400);
    }

    user.authProviders = providers as any;

    if (provider === "email") {
      user.passwordHash = null;
      user.password = null;
    }

    await user.save();

    const identityFilter =
      provider === "email"
        ? { provider: "email", userId: user._id }
        : { provider, userId: user._id };
    await AuthIdentityModel.deleteMany(identityFilter);

    return { authProviders: user.authProviders };
  }

  async startEmailLink(userId: string, email: string) {
    const enabled = getEnabledAuthProviders();
    if (!enabled.includes("email")) {
      throw new AppError(messages.auth.providerDisabled, 400, {
        provider: "email",
      });
    }

    const user = await UserModel.findById(userId);
    if (!user) {
      throw new AppError(messages.crud.notFound, 404, { userId });
    }

    const existing = await UserModel.findOne({ email });
    if (existing && String(existing._id) !== userId) {
      throw new AppError(messages.auth.emailUsed, 409, { email });
    }

    const { code, expiresAt } = await OneTimeCodeService.createCode({
      userId,
      purpose: "link_email",
      targetEmail: email,
    });

    await EmailService.send({
      to: email,
      template: emailTemplates.auth.oneTimeCode.file,
      subjectKey: emailTemplates.auth.oneTimeCode.subjectKey,
      previewTextKey: emailTemplates.auth.oneTimeCode.previewTextKey,
      data: {
        titleKey: messages.emails.auth.oneTimeCode.linkEmailTitle,
        subtitleKey: messages.emails.auth.oneTimeCode.linkEmailSubtitle,
        code,
        expiresInMinutes: ENV.OTP_CODE_TTL_MINUTES,
        ignoreKey: messages.emails.auth.oneTimeCode.ignore,
      },
      locale: user.settings?.locale || ENV.DEFAULT_LANGUAGE,
    });

    return { expiresAt };
  }

  async confirmEmailLink(userId: string, email: string, code: string) {
    await OneTimeCodeService.verifyCode({
      userId,
      purpose: "link_email",
      targetEmail: email,
      code,
    });

    const user = await UserModel.findById(userId);
    if (!user) {
      throw new AppError(messages.crud.notFound, 404, { userId });
    }

    const existingIdentity = await AuthIdentityModel.findOne({
      provider: "email",
      providerId: email,
    });
    if (existingIdentity && String(existingIdentity.userId) !== userId) {
      throw new AppError(messages.auth.emailUsed, 409, { email });
    }

    user.email = email;
    user.emailVerified = true;
    user.emailVerifiedAt = new Date();

    const providerEntry = user.authProviders.find(
      (item) => item.provider === "email",
    );
    if (providerEntry) {
      providerEntry.email = email;
      providerEntry.providerId = email;
      providerEntry.lastUsedAt = new Date();
    } else {
      user.authProviders.push({
        provider: "email",
        providerId: email,
        email,
        addedAt: new Date(),
        lastUsedAt: new Date(),
      });
    }

    await user.save();

    await AuthIdentityModel.findOneAndUpdate(
      { provider: "email", userId: user._id },
      { providerId: email },
      { upsert: true, new: true },
    );

    return { ok: true };
  }

  async sendEmailVerification(userId: string) {
    const user = await UserModel.findById(userId);
    if (!user?.email) {
      throw new AppError(messages.auth.emailRequired, 400);
    }
    const hasEmailProvider = user.authProviders.some(
      (provider) => provider.provider === "email",
    );
    if (!hasEmailProvider) {
      throw new AppError(messages.auth.emailProviderRequired, 403);
    }

    const { code, expiresAt } = await OneTimeCodeService.createCode({
      userId,
      purpose: "verify_email",
      targetEmail: user.email,
    });

    await EmailService.send({
      to: user.email,
      template: emailTemplates.auth.oneTimeCode.file,
      subjectKey: emailTemplates.auth.oneTimeCode.subjectKey,
      previewTextKey: emailTemplates.auth.oneTimeCode.previewTextKey,
      data: {
        titleKey: messages.emails.auth.oneTimeCode.verifyEmailTitle,
        subtitleKey: messages.emails.auth.oneTimeCode.verifyEmailSubtitle,
        code,
        expiresInMinutes: ENV.OTP_CODE_TTL_MINUTES,
        ignoreKey: messages.emails.auth.oneTimeCode.ignore,
      },
      locale: user.settings?.locale || ENV.DEFAULT_LANGUAGE,
      userId,
    });

    return { expiresAt };
  }

  async confirmEmailVerification(userId: string, code: string) {
    const user = await UserModel.findById(userId);
    if (!user?.email) {
      throw new AppError(messages.auth.emailRequired, 400);
    }
    const hasEmailProvider = user.authProviders.some(
      (provider) => provider.provider === "email",
    );
    if (!hasEmailProvider) {
      throw new AppError(messages.auth.emailProviderRequired, 403);
    }

    await OneTimeCodeService.verifyCode({
      userId,
      purpose: "verify_email",
      targetEmail: user.email,
      code,
    });

    user.emailVerified = true;
    user.emailVerifiedAt = new Date();
    await user.save();
    return { ok: true };
  }

  async setPassword(userId: string, newPassword: string) {
    const user = await UserModel.findById(userId);
    if (!user) {
      throw new AppError(messages.crud.notFound, 404, { userId });
    }

    const hasEmailProvider = user.authProviders.some(
      (provider) => provider.provider === "email",
    );
    if (!hasEmailProvider) {
      throw new AppError(messages.auth.emailProviderRequired, 403);
    }

    if (user.passwordHash || user.password) {
      throw new AppError(messages.auth.passwordAlreadySet, 400);
    }

    user.passwordHash = await hashPassword(newPassword);
    user.password = null;
    await user.save();

    await RefreshSessionModel.deleteMany({ userId: user._id });
    return { ok: true };
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await UserModel.findById(userId);
    if (!user) {
      throw new AppError(messages.crud.notFound, 404, { userId });
    }

    const hasEmailProvider = user.authProviders.some(
      (provider) => provider.provider === "email",
    );
    if (!hasEmailProvider) {
      throw new AppError(messages.auth.emailProviderRequired, 403);
    }

    const passwordHash = user.passwordHash || user.password;
    if (!passwordHash) {
      throw new AppError(messages.auth.passwordNotSet, 400);
    }

    const ok = await comparePassword(currentPassword, passwordHash);
    if (!ok) {
      throw new AppError(messages.auth.invalidPassword, 401);
    }

    user.passwordHash = await hashPassword(newPassword);
    user.password = null;
    await user.save();

    await RefreshSessionModel.deleteMany({ userId: user._id });
    return { ok: true };
  }

  async startEmailChange(userId: string, newEmail: string) {
    const user = await UserModel.findById(userId);
    if (!user) {
      throw new AppError(messages.crud.notFound, 404, { userId });
    }

    const hasEmailProvider = user.authProviders.some(
      (provider) => provider.provider === "email",
    );
    if (!hasEmailProvider) {
      throw new AppError(messages.auth.emailProviderRequired, 403);
    }

    const existing = await UserModel.findOne({ email: newEmail });
    if (existing && String(existing._id) !== userId) {
      throw new AppError(messages.auth.emailUsed, 409, { email: newEmail });
    }

    const { code, expiresAt } = await OneTimeCodeService.createCode({
      userId,
      purpose: "change_email",
      targetEmail: newEmail,
    });

    await EmailService.send({
      to: newEmail,
      template: emailTemplates.auth.oneTimeCode.file,
      subjectKey: emailTemplates.auth.oneTimeCode.subjectKey,
      previewTextKey: emailTemplates.auth.oneTimeCode.previewTextKey,
      data: {
        titleKey: messages.emails.auth.oneTimeCode.changeEmailTitle,
        subtitleKey: messages.emails.auth.oneTimeCode.changeEmailSubtitle,
        code,
        expiresInMinutes: ENV.OTP_CODE_TTL_MINUTES,
        ignoreKey: messages.emails.auth.oneTimeCode.ignore,
      },
      locale: user.settings?.locale || ENV.DEFAULT_LANGUAGE,
    });

    return { expiresAt };
  }

  async confirmEmailChange(userId: string, newEmail: string, code: string) {
    const user = await UserModel.findById(userId);
    if (!user) {
      throw new AppError(messages.crud.notFound, 404, { userId });
    }

    const hasEmailProvider = user.authProviders.some(
      (provider) => provider.provider === "email",
    );
    if (!hasEmailProvider) {
      throw new AppError(messages.auth.emailProviderRequired, 403);
    }

    await OneTimeCodeService.verifyCode({
      userId,
      purpose: "change_email",
      targetEmail: newEmail,
      code,
    });

    const existingIdentity = await AuthIdentityModel.findOne({
      provider: "email",
      providerId: newEmail,
    });
    if (existingIdentity && String(existingIdentity.userId) !== userId) {
      throw new AppError(messages.auth.emailUsed, 409, { email: newEmail });
    }

    const oldEmail = user.email;

    user.email = newEmail;
    user.emailVerified = true;
    user.emailVerifiedAt = new Date();

    const providerEntry = user.authProviders.find(
      (item) => item.provider === "email",
    );
    if (providerEntry) {
      providerEntry.email = newEmail;
      providerEntry.providerId = newEmail;
      providerEntry.lastUsedAt = new Date();
    }

    await user.save();

    await AuthIdentityModel.findOneAndUpdate(
      { provider: "email", userId: user._id },
      { providerId: newEmail },
      { upsert: true, new: true },
    );

    if (oldEmail) {
      await EmailService.send({
        to: oldEmail,
        template: emailTemplates.auth.emailChanged.file,
        subjectKey: emailTemplates.auth.emailChanged.subjectKey,
        previewTextKey: emailTemplates.auth.emailChanged.previewTextKey,
        data: {
          name: user.name || oldEmail,
          newEmail,
        },
        locale: user.settings?.locale || ENV.DEFAULT_LANGUAGE,
      });
    }

    return { ok: true };
  }

  async scheduleDeletion(userId: string) {
    await UserDeletionJobModel.create({
      userId,
      status: "scheduled",
      attempts: 0,
      nextRunAt: new Date(),
    });

    await deleteUserAuthData(userId);
  }
}
