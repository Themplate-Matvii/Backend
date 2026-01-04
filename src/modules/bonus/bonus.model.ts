import { Schema, model, Document } from "mongoose";
import { BonusSourceType } from "@modules/billing/types";
import { BonusTargetModel } from "@modules/bonus/types";
import { applyDefaultSchemaTransform } from "@utils/database/transform";

export interface BonusTransactionDocument extends Document {
  userId: string;
  sourceType: BonusSourceType;
  sourceId?: string;
  targetModel: BonusTargetModel;
  targetId: string;
  fieldsDelta: Record<string, number>;
  createdAt: Date;
}

const BonusTransactionSchema = new Schema<BonusTransactionDocument>(
  {
    userId: { type: String, required: true },
    sourceType: {
      type: String,
      enum: Object.values(BonusSourceType),
      required: true,
    },
    sourceId: { type: String },
    targetModel: {
      type: String,
      enum: Object.values(BonusTargetModel),
      required: true,
    },
    targetId: { type: String, required: true },
    fieldsDelta: { type: Schema.Types.Mixed, required: true },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  },
);

applyDefaultSchemaTransform(BonusTransactionSchema);

export const BonusTransactionModel = model<BonusTransactionDocument>(
  "BonusTransaction",
  BonusTransactionSchema,
  "bonus_transaction",
);
