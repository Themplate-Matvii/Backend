import {
  BonusSourceType,
  BillingProductBase,
  PaymentStatus,
} from "@modules/billing/types";
import { plans, PlanKey } from "@constants/payments/plans";
import {
  oneTimeProducts,
  OneTimeProductKey,
} from "@constants/payments/oneTimeProducts";
import {
  BonusApplyOn,
  BonusConfig,
  BonusTargetModel,
} from "@modules/bonus/types";
import { PaymentModel } from "@modules/billing/payments/payment.model";
import { User, UserModel } from "@modules/user/user.model";
import { BonusTransactionModel } from "./bonus.model";
import { UpdateBonusDTO } from "@modules/bonus/bonus.validation";

type ApplyBonusOnPaymentInput = {
  userId: string;
  sourceType: BonusSourceType;
  planKey?: PlanKey;
  productKey?: OneTimeProductKey;
  isFirstPayment?: boolean;
  paymentId?: string;
};

export const bonusService = {
  async applyBonusOnPayment(input: ApplyBonusOnPaymentInput) {

    console.log("applyBonusOnPayment input", input);
    

    const isFirstPayment =
      input.isFirstPayment ??
      (await isFirstSuccessfulPayment({
        userId: input.userId,
        sourceType: input.sourceType,
        planKey: input.planKey,
        productKey: input.productKey,
        paymentId: input.paymentId,
      }));

    switch (input.sourceType) {
      case BonusSourceType.SUBSCRIPTION: {
        if (!input.planKey) return;
        const plan = plans[input.planKey];
        if (!plan?.bonus?.length) return;

        await applyBonusRules({
          userId: input.userId,
          sourceType: input.sourceType,
          sourceId: input.paymentId,
          rules: plan.bonus,
          product: plan,
          isFirstPayment,
        });
        break;
      }

      case BonusSourceType.ONE_TIME: {
        if (!input.productKey) return;
        const product = oneTimeProducts[input.productKey];
        if (!product?.bonus?.length) return;

        await applyBonusRules({
          userId: input.userId,
          sourceType: input.sourceType,
          sourceId: input.paymentId,
          rules: product.bonus,
          product,
          isFirstPayment,
        });
        break;
      }

      case BonusSourceType.REFERRAL_SIGNUP:
      case BonusSourceType.REFERRAL_PURCHASE:
        // Referral-specific bonus rules can be implemented later.
        break;

      default:
        break;
    }
  },

  async getUserHistory(userId: string) {
    return BonusTransactionModel.find({ userId })
      .sort({ createdAt: -1 })
      .lean()
      .exec();
  },

  async adjustUserBonus(userId: string, payload: UpdateBonusDTO) {
    const user = await UserModel.findById(userId);

    if (!user) return null;

    const updates: Partial<User> = {};
    const fieldsDelta: Record<string, number> = {};

    if (payload.aiCredits !== undefined) {
      updates.aiCredits = payload.aiCredits;
      fieldsDelta.aiCredits = payload.aiCredits - (user.aiCredits ?? 0);
    }

    if (!Object.keys(updates).length) {
      return null;
    }

    await UserModel.updateOne({ _id: userId }, { $set: updates });

    await BonusTransactionModel.create({
      userId,
      sourceType: BonusSourceType.MANUAL_ADJUST,
      targetModel: BonusTargetModel.USER,
      targetId: userId,
      fieldsDelta,
    });

    return UserModel.findById(userId).lean();
  },
};

type ApplyBonusRulesInput = {
  userId: string;
  sourceType: BonusSourceType;
  sourceId?: string;
  rules: BonusConfig[];
  product: BillingProductBase;
  isFirstPayment: boolean;
};

async function applyBonusRules(input: ApplyBonusRulesInput) {
  for (const rule of input.rules) {
    if (rule.applyOn === BonusApplyOn.FIRST && !input.isFirstPayment) continue;
    if (rule.applyOn === BonusApplyOn.RECURRING && input.isFirstPayment)
      continue;

    const fieldsDelta = rule.fields;

    if (rule.model === BonusTargetModel.USER && rule.target === "userId") {
      await UserModel.updateOne(
        { _id: input.userId },
        {
          $inc: fieldsDelta,
        },
      );

      await BonusTransactionModel.create({
        userId: input.userId,
        sourceType: input.sourceType,
        sourceId: input.sourceId,
        targetModel: rule.model,
        targetId: input.userId,
        fieldsDelta,
      });
    }

    // Additional models (Workspace etc.) can be added here later.
  }
}

type IsFirstSuccessfulPaymentInput = {
  userId: string;
  sourceType: BonusSourceType;
  planKey?: PlanKey;
  productKey?: OneTimeProductKey;
  paymentId?: string;
};

async function isFirstSuccessfulPayment(input: IsFirstSuccessfulPaymentInput) {
  const filter: Record<string, unknown> = {
    userId: input.userId,
    status: PaymentStatus.SUCCEEDED,
    sourceType: input.sourceType,
  };

  if (input.planKey) filter.planKey = input.planKey;
  if (input.productKey) filter.productKey = input.productKey;
  if (input.paymentId) filter._id = { $ne: input.paymentId };

  const count = await PaymentModel.countDocuments(filter);

  return count === 0;
}
