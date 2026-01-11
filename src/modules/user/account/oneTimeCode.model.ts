import { Schema, model, Document, Types } from "mongoose";
import { applyDefaultSchemaTransform } from "@utils/database/transform";

export type OneTimeCodePurpose =
  | "verify_email"
  | "link_email"
  | "change_email"
  | "reset_password";

export interface OneTimeCodeDocument extends Document {
  userId: Types.ObjectId;
  purpose: OneTimeCodePurpose;
  targetEmail?: string;
  codeHash: string;
  expiresAt: Date;
  attemptsLeft: number;
  createdAt: Date;
  consumedAt?: Date;
}

const OneTimeCodeSchema = new Schema<OneTimeCodeDocument>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    purpose: {
      type: String,
      enum: ["verify_email", "link_email", "change_email", "reset_password"],
      required: true,
    },
    targetEmail: { type: String, required: false },
    codeHash: { type: String, required: true },
    expiresAt: { type: Date, required: true },
    attemptsLeft: { type: Number, required: true, default: 5 },
    consumedAt: { type: Date, required: false },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

OneTimeCodeSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
OneTimeCodeSchema.index({ userId: 1, purpose: 1, consumedAt: 1 });

applyDefaultSchemaTransform(OneTimeCodeSchema, { removeFields: ["codeHash"] });

export const OneTimeCodeModel = model<OneTimeCodeDocument>(
  "OneTimeCode",
  OneTimeCodeSchema,
  "one_time_codes",
);
