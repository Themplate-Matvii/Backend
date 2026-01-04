import { PlanKey, PlanDefinition } from "@constants/payments/plans";
import {
  OneTimeProductKey,
  OneTimeProductDefinition,
} from "@constants/payments/oneTimeProducts";
import { ProviderWebhookEventType } from "@modules/billing/types";

export abstract class BasePaymentProvider {
  public abstract name: string;

  abstract syncPlans(allPlans: Record<PlanKey, PlanDefinition>): Promise<void>;

  abstract syncOneTimeProducts(
    allProducts: Record<OneTimeProductKey, OneTimeProductDefinition>,
  ): Promise<void>;

  abstract createCheckoutSession(
    planKey: PlanKey,
    userId: string,
  ): Promise<string>;

  abstract createOneTimeCheckoutSession(
    productKey: OneTimeProductKey,
    userId: string,
  ): Promise<string>;

  abstract cancelSubscriptionAtPeriodEnd(
    providerSubscriptionId: string,
  ): Promise<void>;

  abstract resumeSubscription(providerSubscriptionId: string): Promise<void>;

  abstract mapToProviderEventType(eventType: string): ProviderWebhookEventType;

  abstract verifyWebhook(
    payload: Buffer,
    signature: string | string[] | undefined,
  ): any;

  abstract handleWebhook(event: any): Promise<void>;
}
