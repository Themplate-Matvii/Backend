import { z } from "zod";
import { messages } from "@constants/messages";

/**
 * Validation schema for business analytics request
 */
export const getBusinessAnalyticsSchema = {
  query: z.object({
    dateFrom: z
      .string()
      .min(1, messages.validation.required)
      .datetime({ message: messages.validation.invalidDate }),

    dateTo: z
      .string()
      .min(1, messages.validation.required)
      .datetime({ message: messages.validation.invalidDate }),
  }),
};

export type GetBusinessAnalyticsDTO = z.infer<
  typeof getBusinessAnalyticsSchema.query
>;
