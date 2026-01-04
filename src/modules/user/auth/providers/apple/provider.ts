import {
  AuthProvider,
  AuthProfile,
  OAuthClient,
  ProviderEndpoints,
} from "@modules/user/auth/providers/base/provider";
import { ENV } from "@config/env";
import jwt from "jsonwebtoken";
import jwksClient from "jwks-rsa";

/**
 * Apple OIDC provider using Authorization Code + ES256 client_secret.
 * Profile is derived from id_token claims.
 */
export class AppleAuthProvider extends AuthProvider {
  private jwks = jwksClient({ jwksUri: "https://appleid.apple.com/auth/keys" });

  constructor() {
    const client: OAuthClient = {
      clientId: ENV.APPLE_CLIENT_ID,
      clientSecret: buildAppleClientSecret({
        teamId: ENV.APPLE_TEAM_ID,
        clientId: ENV.APPLE_CLIENT_ID,
        keyId: ENV.APPLE_KEY_ID,
        privateKey: (ENV.APPLE_PRIVATE_KEY || "").replace(/\\n/g, "\n"),
        expiresIn: "180d",
      }),
      redirectUri: ENV.OAUTH_REDIRECT_BASE_URL,
      defaultScopes: ["openid", "email", "name"],
      supportsPKCE: true,
    };

    const endpoints: ProviderEndpoints = {
      authorizeUrl: "https://appleid.apple.com/auth/authorize",
      tokenUrl: "https://appleid.apple.com/auth/token",
      // profileUrl not required for OIDC path
    };

    super(client, endpoints);
  }

  // Apple prefers response_mode=form_post to POST the code back
  getAuthorizationUrl(opts?: {
    redirectUri?: string;
    state?: string;
    scope?: string[];
    code_challenge?: string;
    code_challenge_method?: "S256" | "plain";
    extra?: Record<string, string | undefined>;
    prompt?: "login" | "consent";
  }): string {
    return super.getAuthorizationUrl({
      ...opts,
      response_mode: "form_post",
      response_type: "code",
    });
  }

  // Exchange code -> id_token and decode claims
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
      providerName: "apple",
      timeoutMs: opts?.timeoutMs,
    });
  }

  // Optional high-assurance path: verify an arbitrary id_token using JWKS
  async verify(idToken: string): Promise<AuthProfile> {
    const payload: any = await this.verifyIdToken(idToken);
    const emailVerified =
      payload.email_verified === true ||
      payload.email_verified === "true" ||
      payload.email_verified === 1 ||
      payload.email_verified === "1" ||
      undefined;

    return {
      provider: "apple",
      providerId: String(payload.sub),
      email: payload.email as string | undefined,
      emailVerified,
      name: (payload.name as string | undefined) || undefined,
    };
  }

  // Verify Apple ID token using JWKS
  private async verifyIdToken(idToken: string): Promise<any> {
    const decoded: any = jwt.decode(idToken, { complete: true });
    if (!decoded || !decoded.header?.kid) {
      throw new Error("invalid_apple_id_token");
    }
    const key = await this.jwks.getSigningKey(decoded.header.kid);
    const signingKey = key.getPublicKey();
    return jwt.verify(idToken, signingKey, { algorithms: ["RS256"] });
  }
}

/* ---------------- Apple client_secret (ES256) ---------------- */
function buildAppleClientSecret(args: {
  teamId: string;
  clientId: string;
  keyId: string;
  privateKey: string; // PKCS8 '-----BEGIN PRIVATE KEY-----'
  expiresIn?: string; // e.g., "180d"
}): string {
  // Apple requires ES256 JWT as client_secret
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: args.teamId,
    iat: now,
    exp: now + toSeconds(args.expiresIn ?? "180d"),
    aud: "https://appleid.apple.com",
    sub: args.clientId,
  };
  return jwt.sign(payload, args.privateKey, {
    algorithm: "ES256",
    keyid: args.keyId,
    header: { alg: "ES256", kid: args.keyId, typ: "JWT" },
  });
}

function toSeconds(s: string): number {
  const m = /^(\d+)d$/.exec(s);
  if (m) return parseInt(m[1], 10) * 24 * 60 * 60;
  return 180 * 24 * 60 * 60;
}
