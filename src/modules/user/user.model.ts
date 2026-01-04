import { Schema, model, Document, Types } from "mongoose";
import { RoleKey, roles } from "@constants/permissions/roles";
import { PlanKey, plans } from "@constants/payments/plans";
import {
  UserSettings,
  UserSettingsSchema,
} from "@modules/user/settings/settings.model";
import { applyDefaultSchemaTransform } from "@utils/database/transform";

export interface AuthProvider {
  provider: string; // e.g. "local", "google", "apple"
  providerId: string; // e.g. email for local or sub/id from OAuth
}

export interface User extends Document {
  _id: string;
  email: string;
  password?: string;
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
    providerId: { type: String, required: true },
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

applyDefaultSchemaTransform(UserSchema, { removeFields: ["password"] });

export const UserModel = model<User>("User", UserSchema, "users");
