import { Schema } from "mongoose";
import { LangEnum } from "@config/i18n";
import { ENV } from "@config/env";
import { ThemeEnum } from "./types";

/**
 * TypeScript interface for user settings
 */
export interface UserSettings {
  theme?: ThemeEnum;
  locale?: LangEnum;
  emailPreferences?: EmailPreferences;
}

export interface EmailPreferences {
  marketing: boolean;
  billing: boolean;
}

/**
 * Embedded Mongoose schema for user settings
 */
export const UserSettingsSchema = new Schema<UserSettings>(
  {
    theme: {
      type: String,
      enum: ThemeEnum,
      default: ThemeEnum.SYSTEM,
    },
    locale: {
      type: String,
      enum: LangEnum,
      default: ENV.DEFAULT_LANGUAGE,
      lowercase: true,
      trim: true,
    },
    emailPreferences: {
      type: new Schema<EmailPreferences>(
        {
          marketing: { type: Boolean, default: true },
          billing: { type: Boolean, default: true },
        },
        { _id: false },
      ),
      default: {},
    },
  },
  { _id: false },
);
