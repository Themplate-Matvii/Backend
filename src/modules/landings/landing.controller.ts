import { Response } from "express";
import { landingService } from "@modules/landings/landing.service";
import { messages } from "@constants/messages";
import { RequestWithUser } from "@modules/core/types/auth";
import { AppError } from "@utils/common/appError";
import { successResponse } from "@utils/common/response";
import { asyncHandler } from "@utils/common/asyncHandler";

/**
 * Create new landing
 */
export const createLanding = asyncHandler<RequestWithUser, Response>(
  async (req, res) => {
    const userId = req.user?.sub;
    if (!userId) throw new AppError(messages.auth.unauthorized, 401);

    const { title, description } = req.body;
    const landing = await landingService.createLanding(
      userId,
      title,
      description,
    );

    return successResponse(res, landing);
  },
);

/**
 * Get all landings for current user
 */
export const getAllLandings = asyncHandler<RequestWithUser, Response>(
  async (req, res) => {
    const userId = req.user?.sub || "";
    const scope = (req as any).permissionScope;

    const landings = await landingService.getAllLandings(scope, userId);
    return successResponse(res, landings);
  },
);
