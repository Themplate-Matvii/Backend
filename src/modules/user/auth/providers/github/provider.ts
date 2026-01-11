import {
  AuthProvider,
  AuthProfile,
  OAuthClient,
  ProviderEndpoints,
} from "@modules/user/auth/providers/base/provider";
import { ENV } from "@config/env";

/**
 * GitHub OAuth2 provider using Authorization Code.
 * Uses access_token + profile API (no id_token).
 */
export class GithubAuthProvider extends AuthProvider {
  constructor() {
    const client: OAuthClient = {
      clientId: ENV.GITHUB_CLIENT_ID,
      clientSecret: ENV.GITHUB_CLIENT_SECRET,
      redirectUri: `${ENV.OAUTH_REDIRECT_BASE_URL}/github/callback`,
      defaultScopes: ["read:user", "user:email"], // user:email to fetch primary email if public email is null
      supportsPKCE: true,
    };

    const endpoints: ProviderEndpoints = {
      authorizeUrl: "https://github.com/login/oauth/authorize",
      tokenUrl: "https://github.com/login/oauth/access_token",
      profileUrl: "https://api.github.com/user",
    };

    super(client, endpoints);
  }

  // Build authorization URL; PKCE optional on GitHub
  getAuthorizationUrl(opts?: {
    redirectUri?: string;
    state?: string;
    scope?: string[];
    code_challenge?: string;
    code_challenge_method?: "S256" | "plain";
    extra?: Record<string, string | undefined>;
  }): string {
    return super.getAuthorizationUrl({
      ...opts,
      response_mode: "query",
      response_type: "code",
    });
  }

  // Exchange code -> access_token -> fetch profile
  async getProfile(
    code: string,
    opts?: {
      redirectUriOverride?: string;
      code_verifier?: string;
      timeoutMs?: number;
    },
  ): Promise<AuthProfile> {
    return this.getProfileFromApi(
      code,
      // Map GitHub user payload to AuthProfile
      (raw: any): AuthProfile => ({
        provider: "github",
        providerId: String(raw.id),
        email: raw.email || undefined, // may be null; add /user/emails call in service if required
        emailVerified: undefined,
        name: raw.name || raw.login || undefined,
        avatar: raw.avatar_url || undefined,
      }),
      {
        redirectUri: opts?.redirectUriOverride ?? this.client.redirectUri,
        code_verifier: opts?.code_verifier,
        timeoutMs: opts?.timeoutMs,
        tokenAccept: "json",
        authHeader: (token) => ({ Authorization: `Bearer ${token}` }),
      },
    );
  }

  // GitHub does not issue id_token; direct verify is not supported
  async verify(): Promise<AuthProfile> {
    throw new Error("github_verify_not_supported_use_code_flow");
  }
}
