import { z } from "zod";
import {
  nameSchema,
  objectIdSchema,
  paginationQueryBase,
} from "@modules/core/common.validation";
import { messages } from "@constants/messages";

export const getMediaQuerySchema = paginationQueryBase.extend({
  userId: objectIdSchema.optional(),
  mime: z.string().trim().max(128).optional(),
});

export const getMediaIdParamsSchema = z.object({
  id: objectIdSchema,
});

export const uploadMediaBodySchema = z.object({
  url: z.string().trim().url(messages.validation.invalidUrl).optional(),
  name: nameSchema.optional(),
  description: z
    .string()
    .trim()
    .max(2000, `${messages.validation.maxLength}|{"max":2000}`)
    .optional(),
});

export type UploadMediaBodyDTO = z.infer<typeof uploadMediaBodySchema>;

// Body for metadata update (name + description only)
export const updateMediaSchema = {
  body: z.object({
    name: nameSchema.optional(),
    description: z
      .string()
      .trim()
      .max(2000, `${messages.validation.maxLength}|{"max":2000}`)
      .optional(),
  }),
};

export type UpdateMediaDTO = z.infer<typeof updateMediaSchema.body>;
