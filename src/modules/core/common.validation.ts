// comments only in English
import { z } from "zod";
import { messages } from "@constants/messages";
import { sortEnum } from "@modules/core/types/pagination";

/* ------------------------ Common field schemas ------------------------ */

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .email(messages.validation.invalidEmail)
  .max(254, `${messages.validation.maxLength}|{"max":254}`);

export const nameSchema = z
  .string()
  .trim()
  .min(2, `${messages.validation.nameTooShort}|{"min":2}`)
  .max(64, `${messages.validation.nameTooLong}|{"max":64}`);

export const phoneSchema = z
  .string()
  .trim()
  .min(3, `${messages.validation.minLength}|{"min":3}`)
  .max(32, `${messages.validation.maxLength}|{"max":32}`);

/* ------------------------ Strong password ------------------------ */

export const strongPasswordSchema = z
  .string()
  .trim()
  .min(8, `${messages.validation.minLength}|{"min":8}`)
  .max(128, `${messages.validation.maxLength}|{"max":128}`)
  .regex(/[a-z]/, messages.validation.passwordLowercase)
  .regex(/[A-Z]/, messages.validation.passwordUppercase)
  .regex(/[0-9]/, messages.validation.passwordDigit)
  .regex(
    /[!@#$%^&*(),.?":{}|<>_\-+=\\[\]\\/~`';]/,
    messages.validation.passwordSymbol,
  );

/* ------------------------ Locale ------------------------ */

export const localeSchema = z.string().trim().min(2).max(10).optional();

/* ------------------------ ObjectId param ------------------------ */

export const objectIdSchema = z
  .string()
  .trim()
  .regex(/^[0-9a-fA-F]{24}$/, messages.validation.invalidObjectId);

/* ------------------------ OAuth provider ------------------------ */

export const providerSchema = z
  .string()
  .trim()
  .min(1, messages.validation.required);

/* ------------------------ Pagination ------------------------ */

export const paginationQueryBase = z.object({
  s: z
    .string()
    .trim()
    .max(256, `${messages.validation.maxLength}|{"max":256}`)
    .optional(),
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  sort: z.nativeEnum(sortEnum).optional(),
});
