import { Schema, model, Document } from "mongoose";
import { applyDefaultSchemaTransform } from "@utils/database/transform";

export interface LandingDocument extends Document {
  userId: Schema.Types.ObjectId; // owner
  title: string;
  description?: string;
  views: number;
  clicks: number;
  createdAt: Date;
  updatedAt: Date;
}

const landingSchema = new Schema<LandingDocument>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    title: { type: String, required: true },
    description: { type: String },
    views: { type: Number, default: 0 },
    clicks: { type: Number, default: 0 },
  },
  { timestamps: true },
);

applyDefaultSchemaTransform(landingSchema);

export const LandingModel = model<LandingDocument>("Landing", landingSchema);
