import dotenv from "dotenv";
import { validateEnv } from "@utils/common/validateEnv";
import { MsString } from "@modules/core/types/time";

dotenv.config();
validateEnv();

const isProd = process.env.NODE_ENV === "production";
export const IS_PROD = isProd;

// Normalize ports with sensible defaults for dev
const PORT = Number(process.env.PORT) || 5000;
const FRONTEND_PORT = Number(process.env.FRONTEND_PORT) || 5173;

// Backend base URL: in prod take from env, in dev fallback to localhost
const BASE_URL =
  process.env.BASE_URL && process.env.BASE_URL.length > 0
    ? process.env.BASE_URL
    : `http://localhost:${PORT}`;

// Frontend base URL: in prod from FRONTEND_URL, in dev localhost
const FRONTEND_URL =
  isProd && process.env.FRONTEND_URL
    ? process.env.FRONTEND_URL
    : `http://localhost:${FRONTEND_PORT}`;

export const ENV = {
  NODE_ENV: process.env.NODE_ENV || "development",

  // Ports / base URLs
  PORT,
  BASE_URL,
  FRONT_URL: FRONTEND_URL, // keep exported name FRONT_URL for compatibility

  // Database
  MONGO_URI: process.env.MONGO_URI!,

  // JWT
  JWT_SECRET: process.env.JWT_SECRET!,
  JWT_EXPIRES_IN: (process.env.JWT_EXPIRES_IN || "1d") as MsString,
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET!,
  JWT_REFRESH_EXPIRES_IN: (process.env.JWT_REFRESH_EXPIRES_IN ||
    "7d") as MsString,

  // Email
  EMAIL_FROM: process.env.EMAIL_FROM!,
  EMAIL_PASS: process.env.EMAIL_PASS!,
  EMAIL_HOST: process.env.EMAIL_HOST!,
  ADMIN_EMAIL: process.env.ADMIN_EMAIL!,
  DEFAULT_LANGUAGE: process.env.DEFAULT_LANGUAGE!,

  /**
   *? OAuth
   */
  // Must point to BACKEND (Google will call `${OAUTH_REDIRECT_BASE_URL}/:provider/callback`)
  OAUTH_REDIRECT_BASE_URL: `${BASE_URL}/api/auth/oauth`,

  // Allowed FRONTEND redirects after we finish login and set cookies
  OAUTH_ALLOWED_REDIRECTS: `${FRONTEND_URL}/auth/callback`,

  // Google provider (optional: enable only when both are set)
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID || "",
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET || "",

  // Github provider (optional: enable only when both are set)
  GITHUB_CLIENT_ID: process.env.GITHUB_CLIENT_ID || "",
  GITHUB_CLIENT_SECRET: process.env.GITHUB_CLIENT_SECRET || "",

  // Apple provider (optional: enable only when both are set)
  APPLE_CLIENT_ID: process.env.APPLE_CLIENT_ID || "",
  APPLE_TEAM_ID: process.env.APPLE_TEAM_ID || "",
  APPLE_KEY_ID: process.env.APPLE_KEY_ID || "",
  APPLE_PRIVATE_KEY: process.env.APPLE_PRIVATE_KEY || "",

  /**
   *? Payments
   */
  DEFAULT_PAYMENT_PROVIDER: process.env.DEFAULT_PAYMENT_PROVIDER || "",

  // Stripe
  STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY || "",
  STRIPE_PUBLIC_KEY: process.env.STRIPE_PUBLIC_KEY || "",
  STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET || "",

  /**
   *? Media
   */

  // Backblaze B2
  B2_KEY_ID: process.env.B2_KEY_ID || "",
  B2_APP_KEY: process.env.B2_APP_KEY || "",
  B2_BUCKET_NAME: process.env.B2_BUCKET_NAME || "",
  B2_ENDPOINT: process.env.B2_ENDPOINT || "",
};
