import { Schema, model, Document, Types } from "mongoose";
import { applyDefaultSchemaTransform } from "@utils/database/transform";

export interface EmailBrandingDocument extends Document {
  brandName: string;
  logoUrl?: string | null;
  darkLogoUrl?: string | null;
  primaryColor: string;
  secondaryColor?: string | null;
  accentColor: string;
  backgroundColor: string;
  textColor: string;
  footerText?: string | null;
  supportEmail?: string | null;
  supportUrl?: string | null;
  socialLinks?: Array<{ label: string; url: string }>;
  updatedBy?: Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

const SocialLinkSchema = new Schema<{ label: string; url: string }>(
  {
    label: { type: String, required: true, trim: true },
    url: { type: String, required: true, trim: true },
  },
  { _id: false },
);

const EmailBrandingSchema = new Schema<EmailBrandingDocument>(
  {
    brandName: { type: String, default: "Themplate" },
    logoUrl: { type: String, default: null },
    darkLogoUrl: { type: String, default: null },
    primaryColor: { type: String, default: "#2563eb" },
    secondaryColor: { type: String, default: "#111827" },
    accentColor: { type: String, default: "#0ea5e9" },
    backgroundColor: { type: String, default: "#0f172a" },
    textColor: { type: String, default: "#0b1220" },
    footerText: { type: String, default: null },
    supportEmail: { type: String, default: null },
    supportUrl: { type: String, default: null },
    socialLinks: { type: [SocialLinkSchema], default: [] },
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
  return EmailBrandingModel.findOne().sort({ updatedAt: -1 }).lean();
}
