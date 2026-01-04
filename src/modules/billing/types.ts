/**
 * ============================================
 *  BILLING PRODUCT BASE TYPE
 * ============================================
 */

/**
 * Base structure for all billable products:
 * - subscription plans
 * - one-time products
 */
export interface BillingProductBase {
  key: string;
  nameKey: string;
  name: string;
  priceCents: number;
  currency: string;
}

/**
 * ============================================
 *  PAYMENT STATUS
 * ============================================
 */

/**
 * ! Normalized payment status used across all providers.
 */
export enum PaymentStatus {
  PENDING = "pending",
  SUCCEEDED = "succeeded",
  FAILED = "failed",
  CANCELED = "canceled",
}

/**
 * ============================================
 *  PAYMENT MODE
 * ============================================
 */

/**
 * * General payment modes:
 * - PAYMENT → one-time purchase
 * - SUBSCRIPTION → recurring billing
 */
export enum PaymentMode {
  ONE_TIME = "one_time",
  SUBSCRIPTION = "subscription",
}

/**
 * ============================================
 *  WEBHOOK EVENTS (PROVIDER-AGNOSTIC)
 * ============================================
 */

/**
 * TODO: These are normalized webhook event types.
 * Providers (Stripe, PayPal, etc.) should map their events to these values.
 */
export enum ProviderWebhookEventType {
  PAYMENT_SUCCEEDED = "payment.succeeded",
  PAYMENT_FAILED = "payment.failed",
  SUBSCRIPTION_ACTIVATED = "subscription.activated",
  SUBSCRIPTION_CANCELED = "subscription.canceled",
  UNKNOWN = "unknown",
}

/**
 * ============================================
 *  BONUS SOURCE TYPES
 * ============================================
 */

/**
 * * Unified sources of bonus/credit application.
 * Used by subscription events, one-time purchases and referral logic.
 */
export enum BonusSourceType {
  SUBSCRIPTION = "subscription",
  ONE_TIME = "one_time",
  REFERRAL_SIGNUP = "referral_signup",
  REFERRAL_PURCHASE = "referral_purchase",
  MANUAL_ADJUST = "manual_adjust",
}
