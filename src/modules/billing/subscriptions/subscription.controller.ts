import { Response } from "express";
import { subscriptionService } from "@modules/billing/subscriptions/subscription.service";
import { messages } from "@constants/messages";
import { RequestWithUser } from "@modules/core/types/auth";
import { successResponse } from "@utils/common/response";
import { AppError } from "@utils/common/appError";
import { asyncHandler } from "@utils/common/asyncHandler";
import { stripeProvider } from "@modules/billing/payments/providers/stripe/provider";
import { SubscriptionStatus } from "@modules/billing/subscriptions/types";
import { resolveUserId } from "@utils/auth/resolveUserId";
import { EmailService } from "@modules/communication/email/email.service";
import { plans } from "@constants/payments/plans";
import { ENV } from "@config/env";

const formatDate = (date?: Date) =>
  date ? date.toISOString().split("T")[0] : undefined;

/**
 * Get current user subscription
 */
export const getMySubscription = asyncHandler<RequestWithUser, Response>(
  async (req, res) => {
    const userId = resolveUserId(req);

    if (!userId) {
      throw new AppError(messages.auth.unauthorized, 401);
    }
    const subscription = await subscriptionService.getUserSubscription(userId);

    if (!subscription) {
      throw new AppError(messages.subscription.notFound, 404);
    }

    return successResponse(res, subscription);
  },
);

/**
 * Schedule cancel at period end for current subscription
 */
export const cancelMySubscription = asyncHandler<RequestWithUser, Response>(
  async (req, res) => {
    const userId = resolveUserId(req);

    if (!userId) {
      throw new AppError(messages.auth.unauthorized, 401);
    }
    const subscription = await subscriptionService.getUserSubscription(userId);

    if (!subscription) {
      throw new AppError(messages.subscription.notFound, 404);
    }

    if (subscription.provider !== stripeProvider.name) {
      throw new AppError(messages.payments.providerNotSupported, 400);
    }

    if (subscription.status === SubscriptionStatus.CANCEL_AT_PERIOD_END) {
      return successResponse(res, subscription);
    }

    await stripeProvider.cancelSubscriptionAtPeriodEnd(
      subscription.providerSubscriptionId,
    );

    const updated = await subscriptionService.scheduleCancelAtPeriodEnd(
      userId,
      subscription.provider,
      subscription.providerSubscriptionId,
    );

    if (!updated) {
      throw new AppError(messages.subscription.notFound, 404);
    }

    try {
      await EmailService.sendBillingTemplate(userId, "cancelAtPeriodEndSet", {
        planName: plans[subscription.planKey]?.name ?? subscription.planKey,
        cancelAt: formatDate(updated.cancelAt),
        resumeUrl: `${ENV.FRONT_URL}/dashboard/subscription`,
      });
    } catch {}

    return successResponse(res, updated);
  },
);

/**
 * Resume subscription that was scheduled to cancel at period end
 */
export const resumeMySubscription = asyncHandler<RequestWithUser, Response>(
  async (req, res) => {
    const userId = resolveUserId(req);

    if (!userId) {
      throw new AppError(messages.auth.unauthorized, 401);
    }

    const subscription = await subscriptionService.getUserSubscription(userId);

    if (!subscription) {
      throw new AppError(messages.subscription.notFound, 404);
    }

    if (subscription.provider !== stripeProvider.name) {
      throw new AppError(messages.payments.providerNotSupported, 400);
    }

    const hasScheduledCancel =
      subscription.status === SubscriptionStatus.CANCEL_AT_PERIOD_END ||
      subscription.cancelAt != null;

    if (!hasScheduledCancel) {
      return successResponse(res, subscription);
    }

    await stripeProvider.resumeSubscription(
      subscription.providerSubscriptionId,
    );

    const updated = await subscriptionService.resumeScheduledCancellation(
      userId,
      subscription.provider,
      subscription.providerSubscriptionId,
    );

    if (!updated) {
      throw new AppError(messages.subscription.notFound, 404);
    }

    try {
      await EmailService.sendBillingTemplate(userId, "subscriptionResume", {
        planName: plans[subscription.planKey]?.name ?? subscription.planKey,
        periodEnd: formatDate(updated.currentPeriodEnd),
        manageUrl: `${ENV.FRONT_URL}/dashboard/subscription`,
      });
    } catch {}

    return successResponse(res, updated);
  },
);
