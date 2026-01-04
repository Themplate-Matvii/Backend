import { ENV } from "@config/env";
import {
  AUTH_PROVIDERS,
  isAuthProviderKey,
} from "@constants/auth/providers";

/**
 * Normalized profile returned by all providers.
 */
export interface AuthProfile {
  provider: string;
  providerId: string;
  email?: string;
  emailVerified?: boolean;
  name?: string;
  avatar?: string;
}

/**
 * OAuth/OIDC client credentials and defaults.
 */
export interface OAuthClient {
  clientId: string;
  clientSecret: string; // may be JWT for Apple
  redirectUri: string; // backend callback for this provider
  defaultScopes?: string[]; // provider-specific defaults
  supportsPKCE?: boolean; // true when the provider supports PKCE
}

export interface ProviderEndpoints {
  authorizeUrl: string;
  tokenUrl: string;
  profileUrl?: string; // for pure OAuth2 (e.g., GitHub)
}

export type TokenResponse =
  | { id_token: string; access_token?: string }
  | { access_token: string; id_token?: string };

/**
 * Base class: shared helpers for OAuth/OIDC providers.
 * - getAuthorizationUrl builds an auth URL with optional PKCE and extra params.
 * - getProfileFromIdToken exchanges code -> id_token then decodes profile.
 * - getProfileFromApi exchanges code -> access_token then fetches profile.
 */
export abstract class AuthProvider {
  protected client: OAuthClient;
  protected endpoints: ProviderEndpoints;

  constructor(client: OAuthClient, endpoints: ProviderEndpoints) {
    this.client = {
      ...client,
      defaultScopes: client.defaultScopes ?? [],
      supportsPKCE: client.supportsPKCE ?? true,
    };
    this.endpoints = endpoints;
  }

  /**
   * Returns authorization URL to initiate login flow.
   * You can override redirectUri and state. Extra params are appended as-is.
   */
  getAuthorizationUrl(opts?: {
    redirectUri?: string;
    state?: string;
    scope?: string[]; // override or extend default scopes
    code_challenge?: string;
    code_challenge_method?: "S256" | "plain";
    extra?: Record<string, string | undefined>;
    prompt?: string;
    access_type?: "online" | "offline";
    response_mode?: "query" | "fragment" | "form_post";
    response_type?: "code";
  }): string {
    const redirectUri = opts?.redirectUri ?? this.client.redirectUri;

    console.log("opts?.redirectUri", opts?.redirectUri);
    console.log("this.client.redirectUri", this.client.redirectUri);

    console.log("ENV.OAUTH_ALLOWED_REDIRECTS", ENV.OAUTH_ALLOWED_REDIRECTS);
    const qp = new URLSearchParams({
      response_type: opts?.response_type ?? "code",
      client_id: this.client.clientId,
      redirect_uri: redirectUri,
      state: opts?.state ?? "",
    });

    // scope handling
    const scopes = opts?.scope ?? this.client.defaultScopes ?? [];
    if (scopes.length > 0) qp.set("scope", scopes.join(" "));

    // optional standard params
    if (opts?.prompt) qp.set("prompt", opts.prompt);
    if (opts?.access_type) qp.set("access_type", opts.access_type);
    if (opts?.response_mode) qp.set("response_mode", opts.response_mode);

    // PKCE if requested
    if (opts?.code_challenge && opts?.code_challenge_method) {
      qp.set("code_challenge", opts.code_challenge);
      qp.set("code_challenge_method", opts.code_challenge_method);
    }

    // extra provider-specific params
    if (opts?.extra) {
      for (const [k, v] of Object.entries(opts.extra)) {
        if (v !== undefined) qp.set(k, v);
      }
    }

    const url = new URL(this.endpoints.authorizeUrl);
    url.search = qp.toString();
    return url.toString();
  }

  /** Exchange authorization code for a normalized profile */
  abstract getProfile(
    code: string,
    opts?: {
      redirectUriOverride?: string;
      code_verifier?: string;
      timeoutMs?: number;
    },
  ): Promise<AuthProfile>;

  /**
   * Verify idToken (JWT) and return normalized profile.
   * Concrete providers decide verification strategy (JWKS, Apple private key, etc.).
   */
  abstract verify(idToken: string): Promise<AuthProfile>;

  /**
   * OIDC path: exchange authorization_code -> id_token and decode it.
   * Supports optional PKCE code_verifier.
   */
  async getProfileFromIdToken(
    code: string,
    opts?: {
      redirectUri?: string;
      code_verifier?: string;
      providerName?: string;
      timeoutMs?: number;
    },
  ): Promise<AuthProfile> {
    const body = new URLSearchParams({
      code,
      client_id: this.client.clientId,
      client_secret: this.client.clientSecret,
      redirect_uri: opts?.redirectUri ?? this.client.redirectUri,
      grant_type: "authorization_code",
    });
    if (opts?.code_verifier) body.set("code_verifier", opts.code_verifier);

    const tokenRes = await fetchWithTimeout(
      this.endpoints.tokenUrl,
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: body.toString(),
      },
      opts?.timeoutMs,
    );

    if (!tokenRes.ok) {
      const err = await safeJson(tokenRes);
      throw new Error(
        `token_exchange_failed: ${tokenRes.status} ${JSON.stringify(err)}`,
      );
    }

    const tokenJson = (await tokenRes.json()) as TokenResponse;
    const idToken = (tokenJson as any).id_token as string | undefined;
    if (!idToken) throw new Error("token_exchange_missing_id_token");

    const payload = parseJwt(idToken);
    return {
      provider: opts?.providerName || "oidc",
      providerId: String(payload.sub),
      email: payload.email,
      emailVerified: normalizeEmailVerified(payload.email_verified),
      name: payload.name,
      avatar: payload.picture,
    };
  }

  /**
   * OAuth2 path: exchange authorization_code -> access_token then fetch profile.
   * Used by providers like GitHub that do not issue id_token.
   */
  async getProfileFromApi(
    code: string,
    mapProfile: (raw: any) => AuthProfile,
    opts?: {
      redirectUri?: string;
      code_verifier?: string;
      timeoutMs?: number;
      tokenAccept?: "json" | "form"; // most return JSON; some may return form
      authHeader?: (accessToken: string) => Record<string, string>;
    },
  ): Promise<AuthProfile> {
    const body = new URLSearchParams({
      code,
      client_id: this.client.clientId,
      client_secret: this.client.clientSecret,
      redirect_uri: opts?.redirectUri ?? this.client.redirectUri,
      grant_type: "authorization_code",
    });
    if (opts?.code_verifier) body.set("code_verifier", opts.code_verifier);

    const tokenRes = await fetchWithTimeout(
      this.endpoints.tokenUrl,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Accept:
            opts?.tokenAccept === "form"
              ? "application/x-www-form-urlencoded"
              : "application/json",
        },
        body: body.toString(),
      },
      opts?.timeoutMs,
    );

    if (!tokenRes.ok) {
      const err = await safeJson(tokenRes);
      throw new Error(
        `token_exchange_failed: ${tokenRes.status} ${JSON.stringify(err)}`,
      );
    }

    let accessToken: string | undefined;
    if (opts?.tokenAccept === "form") {
      const text = await tokenRes.text();
      const params = new URLSearchParams(text);
      accessToken = params.get("access_token") ?? undefined;
    } else {
      const tokenJson = (await tokenRes.json()) as { access_token?: string };
      accessToken = tokenJson.access_token;
    }
    if (!accessToken) throw new Error("token_exchange_missing_access_token");

    const profileRes = await fetchWithTimeout(
      this.endpoints.profileUrl!,
      {
        headers: {
          ...(opts?.authHeader
            ? opts.authHeader(accessToken)
            : { Authorization: `Bearer ${accessToken}` }),
          Accept: "application/json",
        },
      },
      opts?.timeoutMs,
    );

    if (!profileRes.ok) {
      const err = await safeJson(profileRes);
      throw new Error(
        `profile_fetch_failed: ${profileRes.status} ${JSON.stringify(err)}`,
      );
    }

    const rawProfile = await profileRes.json();
    return mapProfile(rawProfile);
  }
}

/**
 * Provider registry accessor.
 */
export function getProviderMeta(name: string) {
  if (!isAuthProviderKey(name)) {
    throw new Error(`Unknown provider: ${name}`);
  }
  return AUTH_PROVIDERS[name];
}

/* ---------------------------- helpers ---------------------------- */

/** Safe JSON extraction for error payloads. */
async function safeJson(res: Response) {
  try {
    return await res.json();
  } catch {
    try {
      return { text: await res.text() };
    } catch {
      return { text: "" };
    }
  }
}

/** Decode JWT without verification. For server-side verification use provider.verify. */
function parseJwt(token: string): any {
  const [, payload] = token.split(".");
  const json = Buffer.from(payload, "base64").toString("utf8");
  return JSON.parse(json);
}

/** Normalize common email_verified representations. */
function normalizeEmailVerified(v: unknown): boolean | undefined {
  if (v === true || v === "true" || v === 1 || v === "1") return true;
  if (v === false || v === "false" || v === 0 || v === "0") return false;
  return undefined;
}

/** fetch with optional timeout */
async function fetchWithTimeout(
  input: RequestInfo | URL,
  init?: RequestInit,
  timeoutMs?: number,
): Promise<Response> {
  if (!timeoutMs) return fetch(input, init);
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(input, {
      ...(init || {}),
      signal: controller.signal,
    });
    return res;
  } finally {
    clearTimeout(t);
  }
}
