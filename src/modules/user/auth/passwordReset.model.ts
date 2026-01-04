import { Schema, model, Types, Document } from "mongoose";
import { applyDefaultSchemaTransform } from "@utils/database/transform";

export interface PasswordReset extends Document {
  userId: Types.ObjectId;
  tokenHash: string;
  expiresAt: Date;
  usedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const PasswordResetSchema = new Schema<PasswordReset>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    tokenHash: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    expiresAt: {
      type: Date,
      required: true,
      // TTL index: automatically removes unused expired tokens
      // (keeps used tokens if usedAt is set)
      index: {
        expireAfterSeconds: 0,
        partialFilterExpression: { usedAt: null },
      },
    },
    usedAt: {
      type: Date,
      default: null,
      index: true,
    },
  },
  { timestamps: true },
);

// Optional: safety index to prevent multiple active tokens for the same user
// PasswordResetSchema.index({ userId: 1, usedAt: 1 }, { partialFilterExpression: { usedAt: null }, unique: true });

applyDefaultSchemaTransform(PasswordResetSchema);

export const PasswordResetModel = model<PasswordReset>(
  "PasswordReset",
  PasswordResetSchema,
  "password_resets",
);
