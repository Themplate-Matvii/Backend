import { z } from "zod";
import { messages } from "@constants/messages";
import {
  emailSchema,
  nameSchema,
  phoneSchema,
  paginationQueryBase,
} from "@modules/core/common.validation";

/* ---------------------------- Create feedback ---------------------------- */

// English-only comments: public feedback submit body.
export const createFeedbackSchema = {
  body: z.object({
    name: nameSchema.optional(),
    email: emailSchema.optional(),
    phone: phoneSchema, // required as before
    comment: z
      .string()
      .trim()
      .max(2000, `${messages.validation.maxLength}|{"max":2000}`)
      .optional(),
  }),
};
export type CreateFeedbackDTO = z.infer<typeof createFeedbackSchema.body>;

/* ---------------------------- List feedback ---------------------------- */

// English-only comments: paginated feedback list query.
export const getAllFeedbackSchema = {
  query: paginationQueryBase,
};

export type GetAllFeedbackDTO = z.infer<typeof getAllFeedbackSchema.query>;
