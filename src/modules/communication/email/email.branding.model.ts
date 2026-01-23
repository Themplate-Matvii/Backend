import { Schema, model, Document, Types } from "mongoose";
import { applyDefaultSchemaTransform } from "@utils/database/transform";

export interface EmailBrandingDocument extends Document {
  brandName: string;
  logoMediaId?: Types.ObjectId | null;
  darkLogoMediaId?: Types.ObjectId | null;
  primaryColor: string;
  secondaryColor?: string | null;
  accentColor: string;
  backgroundColor: string;
  textColor: string;
  supportEmail?: string | null;
  updatedBy?: Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

const EmailBrandingSchema = new Schema<EmailBrandingDocument>(
  {
    brandName: { type: String, default: "Themplate" },
    logoMediaId: { type: Schema.Types.ObjectId, ref: "Media", default: null },
    darkLogoMediaId: { type: Schema.Types.ObjectId, ref: "Media", default: null },
    primaryColor: { type: String, default: "#2563eb" },
    secondaryColor: { type: String, default: "#111827" },
    accentColor: { type: String, default: "#0ea5e9" },
    backgroundColor: { type: String, default: "#0f172a" },
    textColor: { type: String, default: "#0b1220" },
    supportEmail: { type: String, default: null },
    updatedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true },
);

applyDefaultSchemaTransform(EmailBrandingSchema);

export const EmailBrandingModel = model<EmailBrandingDocument>(
  "EmailBranding",
  EmailBrandingSchema,
  "email_branding",
);

export async function getActiveBranding(): Promise<EmailBrandingDocument | null> {
  return EmailBrandingModel.findOne().sort({ updatedAt: -1 });
}
