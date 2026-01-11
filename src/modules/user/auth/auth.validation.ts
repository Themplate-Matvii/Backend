import { z } from "zod";
import { messages } from "@constants/messages";
import {
  emailSchema,
  nameSchema,
  providerSchema,
  strongPasswordSchema,
} from "@modules/core/common.validation";
import { ThemeEnum } from "@modules/user/settings/types";

/* ----------------------- Common primitives ----------------------- */

// English-only comments: shared field validators.
const providerParam = providerSchema;

const oauthIntent = z.enum(["login", "register"]).optional();

const safeUrl = z
  .string()
  .url(messages.validation.invalidUrl)
  .max(2048, `${messages.validation.maxLength}|{"max":2048}`);

const oauthRedirectUri = z.union([safeUrl, z.literal("postmessage")]);

const stateStr = z
  .string()
  .trim()
  .max(2048, `${messages.validation.maxLength}|{"max":2048}`)
  .optional();

const codeStr = z
  .string()
  .min(1, messages.validation.required)
  .trim()
  .max(2048, `${messages.validation.maxLength}|{"max":2048}`);

const idTokenStr = z
  .string()
  .min(1, messages.validation.required)
  .trim()
  .max(4096, `${messages.validation.maxLength}|{"max":4096}`);

const codeVerifier = z
  .string()
  .trim()
  // PKCE code_verifier is between 43 and 128 characters when using S256
  .min(43, `${messages.validation.minLength}|{"min":43}`)
  .max(128, `${messages.validation.maxLength}|{"max":128}`)
  .optional();

/* -------------------- Legacy credential flows -------------------- */

/**
 * Strong password validation rule (re-export for backward compatibility)
 */
export const strongPassword = strongPasswordSchema;

/**
 * Display name validation rule (alias to common name schema)
 */
const displayName = nameSchema;

/**
 * Register
 */
export const registerSchema = {
  body: z.object({
    email: emailSchema,
    password: strongPassword,
    name: displayName.optional(),
    avatar: z.string().trim().min(1).nullable().optional(),
    avatarUrl: safeUrl.optional(),
    locale: z.string().trim().optional(),
    theme: z.nativeEnum(ThemeEnum).optional(),
  }),
};
export type RegisterDTO = z.infer<typeof registerSchema.body>;

/**
 * Login
 */
export const loginSchema = {
  body: z.object({
    email: emailSchema,
    password: z.string().min(1, messages.validation.required).trim(),
  }),
};
export type LoginDTO = z.infer<typeof loginSchema.body>;

/**
 * Refresh token
 * Note: supports cookie-based flow; body.refreshToken remains optional for backward compatibility.
 */
export const refreshSchema = {
  body: z.object({
    refreshToken: z
      .string()
      .min(1, messages.validation.required)
      .trim()
      .min(10, messages.validation.tokenRefreshInvalid)
      .optional(),
  }),
};
export type RefreshDTO = z.infer<typeof refreshSchema.body>;

/**
 * Logout
 */
export const logoutSchema = {
  body: z.object({}),
};
export type LogoutDTO = z.infer<typeof logoutSchema.body>;

/**
 * Forgot password
 */
export const forgotPasswordSchema = {
  body: z.object({ email: emailSchema }),
};
export type ForgotPasswordDTO = z.infer<typeof forgotPasswordSchema.body>;

/**
 * Reset password
 */
export const resetPasswordSchema = {
  body: z.object({
    token: z
      .string()
      .min(1, messages.validation.required)
      .trim()
      .min(10, messages.validation.tokenResetInvalid),
    newPassword: strongPassword,
  }),
};
export type ResetPasswordDTO = z.infer<typeof resetPasswordSchema.body>;

/**
 * Verify email
 */
export const verifyEmailSchema = {
  body: z.object({
    token: z
      .string()
      .min(1, messages.validation.required)
      .trim()
      .min(10, messages.validation.tokenVerifyInvalid),
  }),
};
export type VerifyEmailDTO = z.infer<typeof verifyEmailSchema.body>;

/* ----------------------- OAuth: new structure ----------------------- */

/**
 * GET /api/auth/oauth/:provider/authorize
 * Builds provider authorization URL.
 */
export const oauthAuthorizeSchema = {
  params: z.object({
    provider: providerParam,
  }),
  query: z
    .object({
      // final front-end redirect after server completes login
      redirect: safeUrl.optional(),
      // optional OIDC/OAuth extras
      state: stateStr,
      intent: oauthIntent,
      scope: z
        .string()
        .trim()
        .max(1024, `${messages.validation.maxLength}|{"max":1024}`)
        .optional(),
      code_challenge: z
        .string()
        .trim()
        .max(256, `${messages.validation.maxLength}|{"max":256}`)
        .optional(),
      code_challenge_method: z.enum(["S256", "plain"]).optional(),
      prompt: z
        .string()
        .trim()
        .max(64, `${messages.validation.maxLength}|{"max":64}`)
        .optional(),
      access_type: z.enum(["online", "offline"]).optional(),
      // allow provider-specific params without failing validation
    })
    .passthrough(),
};
export type OauthAuthorizeParams = z.infer<typeof oauthAuthorizeSchema.params>;
export type OauthAuthorizeQuery = z.infer<typeof oauthAuthorizeSchema.query>;

/**
 * GET /api/auth/oauth/:provider/callback
 * Accepts authorization code via query.
 */
export const oauthCallbackGetSchema = {
  params: z.object({
    provider: providerParam,
  }),
  query: z
    .object({
      code: codeStr,
      state: stateStr,
      redirect: safeUrl.optional(),
      // optional override for token exchange if provider requires exact URI
      redirect_uri: oauthRedirectUri.optional(),
      intent: oauthIntent,
      theme: z.nativeEnum(ThemeEnum).optional(),
    })
    .passthrough(),
};
export type OauthCallbackGetParams = z.infer<
  typeof oauthCallbackGetSchema.params
>;
export type OauthCallbackGetQuery = z.infer<
  typeof oauthCallbackGetSchema.query
>;

/**
 * POST /api/auth/oauth/:provider/callback
 * Accepts code via POST (e.g., Apple response_mode=form_post).
 */
export const oauthCallbackPostSchema = {
  params: z.object({
    provider: providerParam,
  }),
  body: z
    .object({
      code: codeStr,
      state: stateStr,
      redirect: safeUrl.optional(),
      redirect_uri: oauthRedirectUri.optional(),
      intent: oauthIntent,
      theme: z.nativeEnum(ThemeEnum).optional(),
    })
    .passthrough(),
};
export type OauthCallbackPostParams = z.infer<
  typeof oauthCallbackPostSchema.params
>;
export type OauthCallbackPostBody = z.infer<
  typeof oauthCallbackPostSchema.body
>;

/**
 * POST /api/auth/oauth/:provider
 * SPA alternative: client sends idToken or code directly.
 * Enforces presence of at least one credential.
 */
export const oauthDirectSchema = {
  params: z.object({
    provider: providerParam,
  }),
  body: z
    .object({
      idToken: idTokenStr.optional(),
      code: codeStr.optional(),
      redirect_uri: oauthRedirectUri.optional(),
      code_verifier: codeVerifier,
      intent: oauthIntent,
      theme: z.nativeEnum(ThemeEnum).optional(),
      // optional locale, device info, etc., tolerated via passthrough
    })
    .passthrough()
    .refine((v) => Boolean(v.idToken || v.code), {
      message: messages.validation.required,
      path: ["code"],
    }),
};
export type OauthDirectParams = z.infer<typeof oauthDirectSchema.params>;
export type OauthDirectBody = z.infer<typeof oauthDirectSchema.body>;
