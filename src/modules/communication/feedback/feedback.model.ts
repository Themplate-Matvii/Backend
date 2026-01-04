import { Schema, model, Document } from "mongoose";
import { applyDefaultSchemaTransform } from "@utils/database/transform";

export interface FeedbackDocument extends Document {
  name?: string;
  email?: string;
  phone: string;
  comment?: string;
  createdAt: Date;
}

const feedbackSchema = new Schema<FeedbackDocument>(
  {
    name: { type: String },
    email: { type: String },
    phone: { type: String, required: true },
    comment: { type: String },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

applyDefaultSchemaTransform(feedbackSchema);

export const FeedbackModel = model<FeedbackDocument>(
  "Feedback",
  feedbackSchema,
);
