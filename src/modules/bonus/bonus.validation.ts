import { z } from "zod";
import { messages } from "@constants/messages";
import { objectIdSchema } from "@modules/core/common.validation";

export const updateBonusSchema = {
  params: z.object({
    userId: objectIdSchema,
  }),
  body: z
    .object({
      aiCredits: z.number().int().min(0).optional(),
    })
    .refine((data) => Object.values(data).some((value) => value !== undefined), {
      message: messages.validation.required,
      path: ["aiCredits"],
    }),
};

export type UpdateBonusDTO = z.infer<typeof updateBonusSchema.body>;
