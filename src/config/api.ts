export const API_CONFIG = {
  BASE_PATH: "/api",
  VERSION: "",
  ROUTES: {
    // Docs
    DOCS: "/docs",
    DOCS_JSON: "/docs-json",

    // Common
    EMAIL: "/email",
    MEDIA: "/media",

    // User
    AUTH: "/auth",
    USER: "/users",
    ACCOUNT: "/account",

    // Payment
    PRICING: "/pricing",
    PAYMENTS: "/payments",
    SUBSCRIPTIONS: "/subscriptions",
    BONUS: "/bonus",

    // Analitycs
    ANALYTICS_TRAFFIC: "/analytics/traffic",
    ANALYTICS_BUSINESS: "/analytics/business",

    // Models
    FEEDBACK: "/feedback",
    LANDINGS: "/landings",
  },
};

export const apiPath = (path: string) =>
  [API_CONFIG.BASE_PATH, API_CONFIG.VERSION, path].filter(Boolean).join("");
