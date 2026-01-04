import { logger } from "@utils/common/logger";

const required = [
  "NODE_ENV",
  "PORT",
  "BASE_URL",
  "MONGO_URI",
  "JWT_SECRET",
  "JWT_REFRESH_SECRET",
  "EMAIL_FROM",
  "EMAIL_PASS",
  "EMAIL_HOST",
  "ADMIN_EMAIL",
  "DEFAULT_PAYMENT_PROVIDER",
  "STRIPE_SECRET_KEY",
  "STRIPE_PUBLIC_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "B2_KEY_ID",
  "B2_APP_KEY",
  "B2_BUCKET_NAME",
  "B2_ENDPOINT",
] as const;

export function validateEnv() {
  const missing = required.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    logger.error("❌ Missing env variables:", missing);
    process.exit(1);
  }
  logger.info("✅ All required env variables are set");
}
