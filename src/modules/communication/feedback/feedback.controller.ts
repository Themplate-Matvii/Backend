import { Response } from "express";
import { feedbackService } from "@modules/communication/feedback/feedback.service";
import { asyncHandler } from "@utils/common/asyncHandler";
import { successResponse } from "@utils/common/response";
import { RequestWithUser } from "@modules/core/types/auth";

/**
 * Public: Create feedback
 */
export const createFeedback = asyncHandler(async (req, res: Response) => {
  const { name, email, phone, comment } = req.body;

  const feedback = await feedbackService.create({
    name,
    email,
    phone,
    comment,
  });
  return successResponse(res, feedback);
});

/**
 * Protected: Get all feedbacks (requires feedback.view)
 */
export const getAllFeedback = asyncHandler<RequestWithUser>(
  async (req, res: Response) => {
    const filters = (req as any).validatedQuery || (req.query as any);
    const result = await feedbackService.findAll(filters);

    return successResponse(res, result);
  },
);
