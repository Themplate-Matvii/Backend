import { Response } from "express";
import { asyncHandler } from "@utils/common/asyncHandler";
import { successResponse } from "@utils/common/response";
import { AppError } from "@utils/common/appError";
import { messages } from "@constants/messages";
import { trafficService } from "@modules/analytics/traffic/traffic.service";
import { RequestWithUser } from "@modules/core/types/auth";
import { TrackEventDTO } from "@modules/analytics/traffic/traffic.validation";

/**
 * Public: Track new traffic event
 */
export const trackTrafficEvent = asyncHandler(async (req, res: Response) => {
  const data = req.body as TrackEventDTO;

  if (!data.sessionId || !data.eventType) {
    throw new AppError(messages.validation.required, 400);
  }

  const event = await trafficService.trackEvent(data);
  return successResponse(res.status(201), event);
});

/**
 * Protected: Get traffic events by date range
 */
export const getTrafficEvents = asyncHandler<RequestWithUser>(
  async (req, res: Response) => {
    const { dateFrom, dateTo, landingId, userId } = req.query as {
      dateFrom?: string;
      dateTo?: string;
      landingId?: string;
      userId?: string;
    };

    if (!dateFrom || !dateTo) {
      throw new AppError(messages.validation.required, 400);
    }

    const from = new Date(dateFrom);
    const to = new Date(dateTo);

    const eventsSummary = await trafficService.getEvents(from, to, {
      landingId,
      userId,
    });
    return successResponse(res, eventsSummary);
  },
);
