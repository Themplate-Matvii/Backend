import { Schema, model, Document } from "mongoose";
import { PlanKey } from "@constants/payments/plans";
import { SubscriptionStatus } from "./types";
import { applyDefaultSchemaTransform } from "@utils/database/transform";

export interface SubscriptionDocument extends Document {
  userId: Schema.Types.ObjectId;
  planKey: PlanKey;
  provider: string;
  providerSubscriptionId: string;

  status: SubscriptionStatus;

  trialEnd?: Date;
  trialDays?: number;
  currentPeriodStart?: Date;
  currentPeriodEnd?: Date;

  cancelAt?: Date;
  canceledAt?: Date;
  lastPaymentAt?: Date;

  metadata?: Record<string, any>;

  createdAt: Date;
  updatedAt: Date;
}

const subscriptionSchema = new Schema<SubscriptionDocument>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    planKey: { type: String, required: true },
    provider: { type: String, required: true },
    providerSubscriptionId: { type: String, required: true, index: true },

    status: {
      type: String,
      enum: Object.values(SubscriptionStatus),
      required: true,
    },

    trialEnd: { type: Date },
    trialDays: { type: Number },
    currentPeriodStart: { type: Date },
    currentPeriodEnd: { type: Date },

    cancelAt: { type: Date },
    canceledAt: { type: Date },
    lastPaymentAt: { type: Date },

    metadata: { type: Object },
  },
  { timestamps: true },
);

subscriptionSchema.index({ userId: 1, status: 1 });

applyDefaultSchemaTransform(subscriptionSchema);

export const SubscriptionModel = model<SubscriptionDocument>(
  "Subscription",
  subscriptionSchema,
);
