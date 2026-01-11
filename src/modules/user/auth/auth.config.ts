import { ENV } from "@config/env";
import { availableProviders } from "@modules/user/auth/providers";

export function getEnabledAuthProviders(): Array<
  "email" | "google" | "apple" | "github"
> {
  const providers = new Set<"email" | "google" | "apple" | "github">();
  if (ENV.EMAIL_AUTH_ENABLED) {
    providers.add("email");
  }

  for (const provider of availableProviders) {
    if (provider === "google" || provider === "apple" || provider === "github") {
      providers.add(provider);
    }
  }

  return Array.from(providers);
}

export function getOAuthClientConfig() {
  return {
    googleClientId: ENV.GOOGLE_CLIENT_ID || undefined,
  };
}
