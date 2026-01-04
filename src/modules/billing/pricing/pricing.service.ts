import {
  BillingProductModel,
  BillingProductDocument,
} from "@modules/billing/pricing/pricing.model";
import { plans, PlanDefinition } from "@constants/payments/plans";
import {
  oneTimeProducts,
  OneTimeProductDefinition,
} from "@constants/payments/oneTimeProducts";
import { PaymentMode } from "@modules/billing/types";

export type PricingProduct = (PlanDefinition | OneTimeProductDefinition) & {
  mode: PaymentMode;
  provider?: string | null;
  providerProductId?: string | null;
  providerPriceId?: string | null;
};

class PricingService {
  private buildKey(
    productKey: string,
    mode: PaymentMode,
    currency: string,
  ): string {
    return `${productKey}:${mode}:${currency}`;
  }

  private mapProviderProducts(
    docs: BillingProductDocument[],
  ): Map<string, BillingProductDocument> {
    const map = new Map<string, BillingProductDocument>();

    for (const doc of docs) {
      const key = this.buildKey(doc.key, doc.mode, doc.currency);
      map.set(key, doc);
    }

    return map;
  }

  async getAllProducts(options?: {
    mode?: PaymentMode;
  }): Promise<PricingProduct[]> {
    const providerDocs = await BillingProductModel.find().lean<
      BillingProductDocument[]
    >();
    const providerMap = this.mapProviderProducts(providerDocs);

    const items: PricingProduct[] = [];

    const pushWithProvider = (
      base: PlanDefinition | OneTimeProductDefinition,
      mode: PaymentMode,
    ) => {
      const provider = providerMap.get(
        this.buildKey(base.key, mode, base.currency),
      );

      items.push({
        ...base,
        mode,
        provider: provider?.provider ?? null,
        providerProductId: provider?.providerProductId ?? null,
        providerPriceId: provider?.providerPriceId ?? null,
      } as PricingProduct);
    };

    if (!options?.mode || options.mode === PaymentMode.SUBSCRIPTION) {
      (Object.values(plans) as PlanDefinition[]).forEach((plan) =>
        pushWithProvider(plan, PaymentMode.SUBSCRIPTION),
      );
    }

    if (!options?.mode || options.mode === PaymentMode.ONE_TIME) {
      (Object.values(oneTimeProducts) as OneTimeProductDefinition[]).forEach(
        (product) => pushWithProvider(product, PaymentMode.ONE_TIME),
      );
    }

    return items;
  }

  async findByKey(key: string): Promise<PricingProduct | null> {
    const all = await this.getAllProducts();

    const found = all.find((item) => item.key === key);

    return found ?? null;
  }
}

export const pricingService = new PricingService();
