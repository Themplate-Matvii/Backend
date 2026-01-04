import { z } from "zod";
import { messages } from "@constants/messages";
import { TrafficEventEnum } from "@modules/analytics/traffic/trafficEvent.model";

/**
 * Track event (public, no auth required)
 */
export const trackEventSchema = {
  body: z.object({
    landingId: z.string().optional(),
    userId: z.string().optional(),
    sessionId: z
      .string()
      .min(1, messages.validation.required)
      .max(128, `${messages.validation.maxLength}|{"max":128}`),
    eventType: z.nativeEnum(TrafficEventEnum),
    url: z.string().url().optional(),
    eventName: z.string().max(256).optional(),
    referrer: z.string().url().optional(),
    device: z.string().optional(),
    country: z.string().optional(),
    language: z.string().optional(),
  }),
};

export type TrackEventDTO = z.infer<typeof trackEventSchema.body>;
