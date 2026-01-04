import { Schema, model, Document } from "mongoose";
import { PlanKey } from "@constants/payments/plans";
import { OneTimeProductKey } from "@constants/payments/oneTimeProducts";
import { PaymentMode } from "@modules/billing/types";
import { applyDefaultSchemaTransform } from "@utils/database/transform";

export type BillingProductKey = PlanKey | OneTimeProductKey;

export interface BillingProductDocument extends Document {
  key: BillingProductKey;
  mode: PaymentMode;
  provider: string;
  currency: string;

  providerProductId: string;
  providerPriceId: string;

  amount: number;
  interval?: string;
  trialDays?: number;

  createdAt: Date;
  updatedAt: Date;
}

const billingProductSchema = new Schema<BillingProductDocument>(
  {
    key: { type: String, required: true },
    mode: { type: String, required: true },
    provider: { type: String, required: true },
    currency: { type: String, required: true },

    providerProductId: { type: String, required: true },
    providerPriceId: { type: String, required: true },

    amount: { type: Number, required: true },
    interval: { type: String, required: false },
    trialDays: { type: Number, required: false },
  },
  { timestamps: true },
);

billingProductSchema.index(
  { key: 1, mode: 1, provider: 1, currency: 1 },
  { unique: true },
);

applyDefaultSchemaTransform(billingProductSchema);

export const BillingProductModel = model<BillingProductDocument>(
  "BillingProduct",
  billingProductSchema,
  "billing_product",
);
