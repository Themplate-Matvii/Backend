// src/modules/user/auth/oauth/constants.ts

// Supported auth provider keys
export const AUTH_PROVIDER_KEYS = [
  "email",
  "google",
  "github",
  "apple",
] as const;

export type AuthProviderKey = (typeof AUTH_PROVIDER_KEYS)[number];

// Distinguish between local login, OpenID Connect and plain OAuth2
export type ProviderKind = "email" | "oidc" | "oauth2";

export interface AuthProviderMeta {
  key: AuthProviderKey;
  title: string; // Human-readable name
  kind: ProviderKind; // How the provider works
  mayOmitEmail: boolean; // Provider may not return email
  requireVerifiedEmailToLink: boolean; // Require verified email before linking
}

export const AUTH_PROVIDERS: Record<AuthProviderKey, AuthProviderMeta> = {
  email: {
    key: "email",
    title: "Email & Password",
    kind: "email",
    mayOmitEmail: false,
    requireVerifiedEmailToLink: false,
  },
  google: {
    key: "google",
    title: "Google",
    kind: "oidc", // returns id_token
    mayOmitEmail: false,
    requireVerifiedEmailToLink: true,
  },
  github: {
    key: "github",
    title: "GitHub",
    kind: "oauth2", // access_token only
    mayOmitEmail: true, // requires extra call to get verified email
    requireVerifiedEmailToLink: true,
  },
  apple: {
    key: "apple",
    title: "Apple",
    kind: "oidc",
    mayOmitEmail: true,
    requireVerifiedEmailToLink: true,
  },
};

/** Type guard for provider key coming from params/query */
export function isAuthProviderKey(v: string): v is AuthProviderKey {
  return (AUTH_PROVIDER_KEYS as readonly string[]).includes(v);
}
