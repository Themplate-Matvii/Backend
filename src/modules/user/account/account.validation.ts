import { z } from "zod";
import { messages } from "@constants/messages";
import {
  emailSchema,
  phoneSchema,
  strongPasswordSchema,
} from "@modules/core/common.validation";

const e164Phone = phoneSchema.regex(/^\+[1-9]\d{1,14}$/, {
  message: messages.validation.invalidPhone,
});

const countrySchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z]{2}$/, messages.validation.invalidCountry);

const timezoneSchema = z.string().trim().max(64).refine((value) => {
  try {
    Intl.DateTimeFormat("en-US", { timeZone: value });
    return true;
  } catch {
    return false;
  }
}, messages.validation.invalidTimezone);

const dateSchema = z.preprocess(
  (value) => {
    if (value === null || value === undefined || value === "") return undefined;
    return new Date(String(value));
  },
  z
    .date({ invalid_type_error: messages.validation.invalidDate })
    .refine((date) => !Number.isNaN(date.getTime()), {
      message: messages.validation.invalidDate,
    }),
);

export const updateProfileSchema = {
  body: z
    .object({
      birthday: dateSchema.optional(),
      phone: e164Phone.optional(),
      country: countrySchema.optional(),
      timezone: timezoneSchema.optional(),
    })
    .partial(),
};
export type UpdateProfileDTO = z.infer<typeof updateProfileSchema.body>;

export const oauthLinkSchema = {
  body: z.object({
    provider: z.enum(["google", "apple", "github"]),
    idToken: z.string().trim().min(1).optional(),
    code: z.string().trim().min(1).optional(),
    redirect_uri: z.string().trim().url().optional(),
    code_verifier: z.string().trim().optional(),
  }),
};
export type OauthLinkDTO = z.infer<typeof oauthLinkSchema.body>;

export const unlinkProviderSchema = {
  params: z.object({
    provider: z.enum(["email", "google", "apple", "github"]),
  }),
};
export type UnlinkProviderDTO = z.infer<typeof unlinkProviderSchema.params>;

export const emailStartSchema = {
  body: z.object({ email: emailSchema }),
};
export type EmailStartDTO = z.infer<typeof emailStartSchema.body>;

export const emailConfirmSchema = {
  body: z.object({
    email: emailSchema,
    code: z.string().trim().min(1, messages.validation.required),
  }),
};
export type EmailConfirmDTO = z.infer<typeof emailConfirmSchema.body>;

export const passwordSetSchema = {
  body: z.object({
    newPassword: strongPasswordSchema,
  }),
};
export type PasswordSetDTO = z.infer<typeof passwordSetSchema.body>;

export const verificationConfirmSchema = {
  body: z.object({
    code: z.string().trim().min(1, messages.validation.required),
  }),
};
export type VerificationConfirmDTO = z.infer<
  typeof verificationConfirmSchema.body
>;

export const passwordChangeSchema = {
  body: z.object({
    currentPassword: z.string().min(1, messages.validation.required),
    newPassword: strongPasswordSchema,
  }),
};
export type PasswordChangeDTO = z.infer<typeof passwordChangeSchema.body>;

export const emailChangeStartSchema = {
  body: z.object({ newEmail: emailSchema }),
};
export type EmailChangeStartDTO = z.infer<typeof emailChangeStartSchema.body>;

export const emailChangeConfirmSchema = {
  body: z.object({
    newEmail: emailSchema,
    code: z.string().trim().min(1, messages.validation.required),
  }),
};
export type EmailChangeConfirmDTO = z.infer<
  typeof emailChangeConfirmSchema.body
>;
