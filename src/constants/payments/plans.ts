import {
  BillingProductBase,
  PaymentMode,
} from "@modules/billing/types";
import { permissionKeys } from "../permissions/permissionKeys";
import {
  BonusApplyOn,
  BonusConfig,
  BonusTargetModel,
} from "@modules/bonus/types";

type PlanConfig = BillingProductBase & {
  mode: PaymentMode.SUBSCRIPTION;
  trialDays: number;
  interval: "month" | "year";
  permissions: string[];
  bonus?: BonusConfig[];
};

export const plans: Record<string, PlanConfig> = {
  basic: {
    key: "basic",
    nameKey: "plans.basic.name",
    name: "Basic Plan",
    mode: PaymentMode.SUBSCRIPTION,
    trialDays: 14,
    interval: "month",
    priceCents: 1500,
    currency: "usd",
    permissions: [
      permissionKeys.landings.create,
      permissionKeys.landings.own.view,
      permissionKeys.landings.own.edit,
      permissionKeys.landings.own.delete,
    ],
    bonus: [
      {
        model: BonusTargetModel.USER,
        target: "userId",
        applyOn: BonusApplyOn.FIRST,
        fields: {
          aiCredits: 20,
        },
      },
    ],
  },
} as const;

export type PlanKey = keyof typeof plans;
export type PlanDefinition = (typeof plans)[PlanKey];
