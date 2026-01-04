import { Response } from "express";
import { asyncHandler } from "@utils/common/asyncHandler";
import { successResponse } from "@utils/common/response";
import { messages } from "@constants/messages";
import { RequestWithUser } from "@modules/core/types/auth";
import { bonusService } from "@modules/bonus/bonus.service";
import { AppError } from "@utils/common/appError";
import { resolveUserId } from "@utils/auth/resolveUserId";

export const getMyBonusHistory = asyncHandler<RequestWithUser, Response>(
  async (req, res) => {
    const userId = resolveUserId(req);

    if (!userId) {
      throw new AppError(messages.auth.unauthorized, 401);
    }
    const history = await bonusService.getUserHistory(userId);

    return successResponse(res, history, messages.bonus.historyFetched);
  },
);

export const adjustUserBonus = asyncHandler<
  RequestWithUser,
  Response
>(async (req, res) => {
  const userId = resolveUserId(req, "userId");

  if (!userId) {
    throw new AppError(messages.auth.unauthorized, 401);
  }

  const result = await bonusService.adjustUserBonus(userId, req.body);

  if (!result) {
    throw new AppError(messages.crud.notFound, 404);
  }

  return successResponse(res, result, messages.bonus.updated);
});
