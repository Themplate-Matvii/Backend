import { PaymentModel } from "@modules/billing/payments/payment.model";
import { pricingService } from "@modules/billing/pricing/pricing.service";
import { stripeProvider } from "@modules/billing/payments/providers/stripe/provider";
import { messages } from "@constants/messages";
import { PlanKey } from "@constants/payments/plans";
import { AppError } from "@utils/common/appError";
import { OneTimeProductKey } from "@constants/payments/oneTimeProducts";

/**
 * PaymentService
 * Handles all payment and checkout related logic
 */
class PaymentService {
  /**
   * Create a checkout session for a given subscription plan.
   */
  async createCheckoutSession(
    planKey: PlanKey,
    userId: string,
  ): Promise<string> {
    const plan = await pricingService.findByKey(planKey);

    if (!plan) {
      throw new AppError(messages.payments.planNotFound, 404);
    }

    const checkoutUrl = await stripeProvider.createCheckoutSession(
      planKey,
      userId,
    );

    return checkoutUrl;
  }

  /**
   * Create a checkout session for a one-time product.
   */
  async createOneTimeCheckoutSession(
    productKey: OneTimeProductKey,
    userId: string,
  ): Promise<string> {
    const product = await pricingService.findByKey(
      productKey,
    );

    if (!product) {
      throw new AppError("One-time product not found", 404);
    }

    const checkoutUrl = await stripeProvider.createOneTimeCheckoutSession(
      productKey,
      userId,
    );

    return checkoutUrl;
  }

  /**
   * Process provider webhook (Stripe).
   */
  async processWebhook(
    provider: string,
    payload: Buffer,
    signature: string | string[] | undefined,
  ): Promise<void> {
    if (provider !== stripeProvider.name) {
      throw new AppError(messages.payments.providerNotSupported, 400);
    }

    const event = stripeProvider.verifyWebhook(payload, signature);

    await stripeProvider.handleWebhook(event);
  }

  /**
   * Get all payments for a user (history).
   */
  async getUserPayments(userId: string) {
    return PaymentModel.find({ userId }).sort({ createdAt: -1 }).lean();
  }
}

export const paymentService = new PaymentService();
