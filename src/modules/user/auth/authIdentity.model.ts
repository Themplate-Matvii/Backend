import { Schema, model, Document, Types } from "mongoose";
import { applyDefaultSchemaTransform } from "@utils/database/transform";

export interface AuthIdentityDocument extends Document {
  provider: string;
  providerId: string;
  userId: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const AuthIdentitySchema = new Schema<AuthIdentityDocument>(
  {
    provider: { type: String, required: true },
    providerId: { type: String, required: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true },
);

AuthIdentitySchema.index({ provider: 1, providerId: 1 }, { unique: true });

applyDefaultSchemaTransform(AuthIdentitySchema);

export const AuthIdentityModel = model<AuthIdentityDocument>(
  "AuthIdentity",
  AuthIdentitySchema,
  "auth_identities",
);
