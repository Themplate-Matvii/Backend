import { ENV } from "@config/env";

export type ProviderKey = "google" | (string & {});

export interface OAuthProviderConfig {
  issuer: string;
  clientId: string;
  clientSecret: string;
  scope: string;
}

export const OAUTH_REDIRECT_BASE_URL = ENV.OAUTH_REDIRECT_BASE_URL;

export const OAUTH_ALLOWED_REDIRECTS = new Set(
  ENV.OAUTH_ALLOWED_REDIRECTS.split(",")
    .map((s) => s.trim())
    .filter(Boolean),
);

// Providers are enabled only if credentials are set
export const OAUTH_PROVIDERS: Partial<
  Record<ProviderKey, OAuthProviderConfig>
> = {
  ...(ENV.GOOGLE_CLIENT_ID && ENV.GOOGLE_CLIENT_SECRET
    ? {
        google: {
          issuer: "https://accounts.google.com",
          clientId: ENV.GOOGLE_CLIENT_ID,
          clientSecret: ENV.GOOGLE_CLIENT_SECRET,
          scope: "openid email profile",
        },
      }
    : {}),
};
