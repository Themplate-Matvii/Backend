import {
  AuthProvider,
  AuthProfile,
  OAuthClient,
  ProviderEndpoints,
} from "@modules/user/auth/providers/base/provider";
import { ENV } from "@config/env";
import { messages } from "@constants/messages";
import { AppError } from "@utils/common/appError";

/**
 * Google OAuth/OIDC provider using Authorization Code (with optional PKCE).
 * - Single backend callback: `${ENV.OAUTH_REDIRECT_BASE_URL}/google/callback`
 * - Uses OIDC id_token from the token endpoint to build the profile
 */
export class GoogleAuthProvider extends AuthProvider {
  constructor() {
    const client: OAuthClient = {
      clientId: ENV.GOOGLE_CLIENT_ID,
      clientSecret: ENV.GOOGLE_CLIENT_SECRET,
      redirectUri: `${ENV.OAUTH_REDIRECT_BASE_URL}/google/callback`,
      defaultScopes: ["openid", "email", "profile"],
      supportsPKCE: true,
    };

    const endpoints: ProviderEndpoints = {
      authorizeUrl: "https://accounts.google.com/o/oauth2/v2/auth",
      tokenUrl: "https://oauth2.googleapis.com/token",
      // profileUrl not required for OIDC path (we parse id_token)
    };

    super(client, endpoints);
  }

  /**
   * Build authorization URL. Caller may pass state, PKCE, prompt, etc.
   */
  getAuthorizationUrl(opts?: {
    redirectUri?: string;
    state?: string;
    scope?: string[];
    code_challenge?: string;
    code_challenge_method?: "S256" | "plain";
    prompt?: "none" | "consent" | "select_account";
    access_type?: "online" | "offline";
    extra?: Record<string, string | undefined>;
  }): string {
    // Google commonly uses access_type and prompt; do not force them
    return super.getAuthorizationUrl({
      ...opts,
      response_mode: "query",
      response_type: "code",
    });
  }

  /**
   * OIDC path: exchange code -> id_token and decode claims.
   * PKCE is supported via opts.code_verifier.
   */
  async getProfile(
    code: string,
    opts?: {
      redirectUriOverride?: string;
      code_verifier?: string;
      timeoutMs?: number;
    },
  ): Promise<AuthProfile> {
    return this.getProfileFromIdToken(code, {
      redirectUri: opts?.redirectUriOverride ?? this.client.redirectUri,
      code_verifier: opts?.code_verifier,
      providerName: "google",
      timeoutMs: opts?.timeoutMs,
    });
  }

  /**
   * Direct id_token verification path (One Tap / implicit). Uses Google tokeninfo.
   * For server-side high-assurance verification prefer JWKS validation if needed.
   */
  async verify(idToken: string): Promise<AuthProfile> {
    const url = new URL("https://oauth2.googleapis.com/tokeninfo");
    url.searchParams.set("id_token", idToken);

    const res = await fetch(url.toString(), { method: "GET" });
    if (!res.ok) {
      throw new AppError(messages.auth.invalidToken, 401, {
        reason: "tokeninfo_failed",
      });
    }
    const data = (await res.json()) as any;

    // Audience check
    if (!ENV.GOOGLE_CLIENT_ID || data.aud !== ENV.GOOGLE_CLIENT_ID) {
      throw new AppError(messages.auth.invalidToken, 401, {
        reason: "aud_mismatch",
      });
    }

    const emailVerified =
      data.email_verified === true ||
      data.email_verified === "true" ||
      data.email_verified === 1 ||
      data.email_verified === "1";

    return {
      provider: "google",
      providerId: String(data.sub),
      email: data.email as string | undefined,
      emailVerified,
      name: (data.name as string | undefined) || undefined,
      avatar: (data.picture as string | undefined) || undefined,
    };
  }
}
