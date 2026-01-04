import { Response } from "express";
import { asyncHandler } from "@utils/common/asyncHandler";
import { successResponse } from "@utils/common/response";
import { businessService } from "@modules/analytics/business/business.service";
import { GetBusinessAnalyticsDTO } from "@modules/analytics/business/business.validation";
import { RequestWithUser } from "@modules/core/types/auth";
import { AppError } from "@utils/common/appError";
import { messages } from "@constants/messages";

/**
 * Get business analytics (requires permissions)
 */
export const getBusinessAnalytics = asyncHandler<RequestWithUser>(
  async (req, res: Response) => {
    const { dateFrom, dateTo } =
      req.query as unknown as GetBusinessAnalyticsDTO;

    if (!dateFrom || !dateTo) {
      throw new AppError(messages.validation.required, 400);
    }

    const analytics = await businessService.getAnalytics({ dateFrom, dateTo });
    return successResponse(res, analytics);
  },
);
