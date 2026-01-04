import { BillingProductBase, PaymentMode } from "@modules/billing/types";
import {
  BonusApplyOn,
  BonusConfig,
  BonusTargetModel,
} from "@modules/bonus/types";

type OneTimeProductConfig = BillingProductBase & {
  mode: PaymentMode.ONE_TIME;
  bonus?: BonusConfig[];
};

export const oneTimeProducts: Record<string, OneTimeProductConfig> = {
  tokens_30: {
    key: "tokens_30",
    nameKey: "oneTime.tokens_30.name",
    name: "30 AI Tokens",
    mode: PaymentMode.ONE_TIME,
    priceCents: 500,
    currency: "usd",
    bonus: [
      {
        model: BonusTargetModel.USER,
        target: "userId",
        applyOn: BonusApplyOn.ALWAYS,
        fields: {
          aiCredits: 30,
        },
      },
    ],
  },
} as const;

export type OneTimeProductKey = keyof typeof oneTimeProducts;
export type OneTimeProductDefinition =
  (typeof oneTimeProducts)[OneTimeProductKey];
