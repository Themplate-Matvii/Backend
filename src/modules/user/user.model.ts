import { Schema, model, Document, Types } from "mongoose";
import { RoleKey, roles } from "@constants/permissions/roles";
import { PlanKey, plans } from "@constants/payments/plans";
import {
  UserSettings,
  UserSettingsSchema,
} from "@modules/user/settings/settings.model";
import { applyDefaultSchemaTransform } from "@utils/database/transform";

export interface AuthProvider {
  provider: "email" | "google" | "apple" | "github";
  providerId?: string;
  email?: string;
  addedAt: Date;
  lastUsedAt?: Date;
}

export interface User extends Document {
  _id: string;
  email: string;
  emailVerified: boolean;
  emailVerifiedAt?: Date;
  birthday?: Date;
  phone?: string;
  country?: string;
  timezone?: string;
  passwordHash?: string | null;
  password?: string | null;
  role: RoleKey;
  plan?: PlanKey | null;
  name?: string | null;
  avatar?: Types.ObjectId | string | null;
  authProviders: AuthProvider[];
  settings: UserSettings;
  aiCredits: number;
  createdAt: Date;
  updatedAt: Date;
  toJSON(): Record<string, unknown>;
}

const AuthProviderSchema = new Schema<AuthProvider>(
  {
    provider: { type: String, required: true },
    providerId: { type: String, required: false },
    email: { type: String, required: false },
    addedAt: { type: Date, default: () => new Date() },
    lastUsedAt: { type: Date, required: false },
  },
  { _id: false },
);

const UserSchema = new Schema<User>(
  {
    email: {
      type: String,
      required: false,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    emailVerified: { type: Boolean, default: false },
    emailVerifiedAt: { type: Date, required: false },
    birthday: { type: Date, required: false },
    phone: { type: String, required: false },
    country: { type: String, required: false },
    timezone: { type: String, required: false },
    passwordHash: { type: String, required: false, default: null },
    password: { type: String, required: false },
    role: {
      type: String,
      enum: Object.keys(roles),
      default: "user",
      index: true,
    },
    name: { type: String, trim: true, default: null },
    avatar: { type: Schema.Types.ObjectId, ref: "Media", default: null },
    authProviders: { type: [AuthProviderSchema], default: [] },
    settings: { type: UserSettingsSchema, default: {} },
    aiCredits: { type: Number, default: 0 },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

applyDefaultSchemaTransform(UserSchema, {
  removeFields: ["password", "passwordHash"],
});

export const UserModel = model<User>("User", UserSchema, "users");
