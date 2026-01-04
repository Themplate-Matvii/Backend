import {
  SubscriptionModel,
  SubscriptionDocument,
} from "@modules/billing/subscriptions/subscription.model";
import { PlanKey } from "@constants/payments/plans";
import { SubscriptionStatus } from "./types";

interface ActivateOptions {
  provider: string;
  providerSubscriptionId: string;
  trialEnd?: Date;
  trialDays?: number;
  currentPeriodStart?: Date;
  currentPeriodEnd?: Date;
  cancelAt?: Date | null;
  cancelAtPeriodEnd?: boolean;
  rawStatus?: string;
  lastPaymentAt?: Date;
  metadata?: Record<string, any>;
}

/**
 * SubscriptionService
 * Handles user subscription lifecycle
 */
class SubscriptionService {
  /**
   * Upsert subscription based on provider data
   * (used both for initial activation and further sync from webhooks)
   */
  async activate(
    userId: string,
    planKey: PlanKey,
    options: ActivateOptions,
  ): Promise<SubscriptionDocument> {
    const now = new Date();

    let status: SubscriptionStatus;
    if (options.rawStatus === "canceled") {
      status = SubscriptionStatus.CANCELED;
    } else if (options.cancelAtPeriodEnd) {
      status = SubscriptionStatus.CANCEL_AT_PERIOD_END;
    } else if (options.rawStatus === "trialing") {
      status = SubscriptionStatus.TRIALING;
    } else {
      status = SubscriptionStatus.ACTIVE;
    }

    let cancelAt: Date | undefined | null = options.cancelAt ?? undefined;
    if (!cancelAt && options.cancelAtPeriodEnd && options.currentPeriodEnd) {
      cancelAt = options.currentPeriodEnd;
    }

    const update: Record<string, any> = {
      userId,
      planKey,
      provider: options.provider,
      providerSubscriptionId: options.providerSubscriptionId,
      status,
      trialEnd: options.trialEnd,
      trialDays: options.trialDays,
      currentPeriodStart: options.currentPeriodStart ?? now,
      currentPeriodEnd: options.currentPeriodEnd,
      cancelAt: options.cancelAtPeriodEnd ? cancelAt : undefined,
      canceledAt:
        status === SubscriptionStatus.CANCELED ? cancelAt ?? now : undefined,
      metadata: options.metadata,
    };

    if (options.lastPaymentAt !== undefined) {
      update.lastPaymentAt = options.lastPaymentAt;
    }

    const subscription = await SubscriptionModel.findOneAndUpdate(
      {
        userId,
        planKey,
        provider: options.provider,
        providerSubscriptionId: options.providerSubscriptionId,
      },
      update,
      { upsert: true, new: true },
    ).exec();

    return subscription;
  }

  /**
   * Get "effective" subscription for user
   * ACTIVE / TRIALING / CANCEL_AT_PERIOD_END are considered active access
   */
  async getUserSubscription(
    userId: string,
  ): Promise<SubscriptionDocument | null> {
    return SubscriptionModel.findOne({
      userId,
      status: {
        $in: [
          SubscriptionStatus.ACTIVE,
          SubscriptionStatus.TRIALING,
          SubscriptionStatus.CANCEL_AT_PERIOD_END,
        ],
      },
    })
      .sort({ createdAt: -1 })
      .exec();
  }

  /**
   * Helper: get current plan key for user (or null if no active subscription)
   */
  async getUserCurrentPlanKey(userId: string): Promise<PlanKey | null> {
    const subscription = await this.getUserSubscription(userId);
    return (subscription?.planKey as PlanKey | undefined) ?? null;
  }

  /**
   * Schedule cancel at period end (used when user clicks "Cancel" in UI)
   */
  async scheduleCancelAtPeriodEnd(
    userId: string,
    provider: string,
    providerSubscriptionId: string,
  ): Promise<SubscriptionDocument | null> {
    const existing = await SubscriptionModel.findOne({
      userId,
      provider,
      providerSubscriptionId,
      status: {
        $in: [
          SubscriptionStatus.ACTIVE,
          SubscriptionStatus.TRIALING,
          SubscriptionStatus.CANCEL_AT_PERIOD_END,
        ],
      },
    }).exec();

    if (!existing) {
      return null;
    }

    const cancelAt =
      existing.currentPeriodEnd ??
      existing.trialEnd ??
      existing.cancelAt ??
      new Date();

    existing.status = SubscriptionStatus.CANCEL_AT_PERIOD_END;
    existing.cancelAt = cancelAt;
    existing.canceledAt = undefined;

    await existing.save();
    return existing;
  }

  /**
   * Resume subscription that was scheduled to cancel at period end
   */
  async resumeScheduledCancellation(
    userId: string,
    provider: string,
    providerSubscriptionId: string,
  ): Promise<SubscriptionDocument | null> {
    const existing = await SubscriptionModel.findOne({
      userId,
      provider,
      providerSubscriptionId,
    }).exec();

    if (!existing) {
      return null;
    }

    if (
      existing.status !== SubscriptionStatus.CANCEL_AT_PERIOD_END &&
      existing.cancelAt == null
    ) {
      return existing;
    }

    const now = new Date();
    let status: SubscriptionStatus;

    if (existing.trialEnd && existing.trialEnd > now) {
      status = SubscriptionStatus.TRIALING;
    } else {
      status = SubscriptionStatus.ACTIVE;
    }

    existing.status = status;
    existing.cancelAt = undefined;
    existing.canceledAt = undefined;

    await existing.save();
    return existing;
  }

  /**
   * Mark subscription as fully canceled (used from provider webhook)
   */
  async markCanceledImmediately(
    userId: string,
    provider: string,
    providerSubscriptionId: string,
    at?: Date,
  ): Promise<SubscriptionDocument | null> {
    const date = at ?? new Date();

    return SubscriptionModel.findOneAndUpdate(
      {
        userId,
        provider,
        providerSubscriptionId,
      },
      {
        status: SubscriptionStatus.CANCELED,
        cancelAt: date,
        canceledAt: date,
      },
      { new: true },
    ).exec();
  }
}

export const subscriptionService = new SubscriptionService();
