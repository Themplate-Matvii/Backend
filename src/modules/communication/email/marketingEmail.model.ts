import { Schema, model, Document, Types } from "mongoose";
import { applyDefaultSchemaTransform } from "@utils/database/transform";

export interface MarketingEmailTranslations {
  [locale: string]: Record<string, string>;
}

export interface MarketingEmailDocument extends Document {
  name: string;
  description?: string | null;
  subjectKey: string;
  translations: MarketingEmailTranslations;
  hbs: string;
  previewData?: Record<string, unknown> | null;
  createdBy?: Types.ObjectId | null;
  updatedBy?: Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

const TranslationsSchema = new Schema<Record<string, Record<string, string>>>(
  {},
  { _id: false, strict: false },
);

const MarketingEmailSchema = new Schema<MarketingEmailDocument>(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, default: null },
    subjectKey: { type: String, required: true, trim: true },
    translations: { type: TranslationsSchema, default: {} },
    hbs: { type: String, required: true },
    previewData: { type: Object, default: null },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
    updatedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true },
);

MarketingEmailSchema.index({ subjectKey: 1 });

applyDefaultSchemaTransform(MarketingEmailSchema);

export const MarketingEmailModel = model<MarketingEmailDocument>(
  "MarketingEmail",
  MarketingEmailSchema,
  "marketing_emails",
);
