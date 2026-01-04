import { Request, Response } from "express";
import { paymentService } from "@modules/billing/payments/payments.service";
import { RequestWithUser } from "@modules/core/types/auth";
import { successResponse } from "@utils/common/response";
import { asyncHandler } from "@utils/common/asyncHandler";
import { AppError } from "@utils/common/appError";
import { messages } from "@constants/messages";
import { resolveUserId } from "@utils/auth/resolveUserId";

/**
 * Create a checkout session for subscription plan.
 */
export const createCheckoutSession = asyncHandler<RequestWithUser, Response>(
  async (req, res) => {
    const { planKey } = req.body;
    const userId = (req.user as any).sub;

    const checkoutUrl = await paymentService.createCheckoutSession(
      planKey,
      userId,
    );

    return successResponse(res, { url: checkoutUrl });
  },
);

/**
 * Create a checkout session for one-time product.
 */
export const createOneTimeCheckoutSession = asyncHandler<
  RequestWithUser,
  Response
>(async (req, res) => {
  const { productKey } = req.body;
  const userId = (req.user as any).sub;

  const checkoutUrl = await paymentService.createOneTimeCheckoutSession(
    productKey,
    userId,
  );

  return successResponse(res, { url: checkoutUrl });
});

/**
 * Stripe webhook endpoint.
 */
export const handleWebhook = asyncHandler<Request, Response>(
  async (req, res) => {
    const signature = req.headers["stripe-signature"];
    const payload = req.body as Buffer;

    await paymentService.processWebhook("stripe", payload, signature);

    return res.status(200).send("ok");
  },
);

/**
 * Get user payment history.
 */
export const getUserPayments = asyncHandler<RequestWithUser, Response>(
  async (req, res) => {
    const userId = resolveUserId(req);

    if (!userId) {
      throw new AppError(messages.auth.unauthorized, 401);
    }

    const payments = await paymentService.getUserPayments(userId);
    return successResponse(res, payments);
  },
);
