import { AuthProvider } from "@modules/user/auth/providers/base/provider";
import { GoogleAuthProvider } from "@modules/user/auth/providers/google/provider";
import { AppleAuthProvider } from "@modules/user/auth/providers/apple/provider";
import { GithubAuthProvider } from "@modules/user/auth/providers/github/provider";
import { ENV } from "@config/env";

const providers: Record<string, AuthProvider> = {};

// Google
if (ENV.GOOGLE_CLIENT_ID && ENV.GOOGLE_CLIENT_SECRET) {
  providers.google = new GoogleAuthProvider();
}

// Apple
if (
  ENV.APPLE_CLIENT_ID &&
  ENV.APPLE_TEAM_ID &&
  ENV.APPLE_KEY_ID &&
  ENV.APPLE_PRIVATE_KEY
) {
  providers.apple = new AppleAuthProvider();
}

// GitHub
if (ENV.GITHUB_CLIENT_ID && ENV.GITHUB_CLIENT_SECRET) {
  providers.github = new GithubAuthProvider();
}

export function getAuthProvider(name: string): AuthProvider {
  const provider = providers[name];
  if (!provider)
    throw new Error(`Auth provider "${name}" not found or not configured`);
  return provider;
}

export const availableProviders = Object.keys(providers);
