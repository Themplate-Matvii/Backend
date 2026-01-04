import { Schema, model, Types, Document } from "mongoose";
import { applyDefaultSchemaTransform } from "@utils/database/transform";

export interface RefreshSession extends Document {
  userId: Types.ObjectId;
  jti: string;
  ip?: string | null;
  userAgent?: string | null;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const RefreshSessionSchema = new Schema<RefreshSession>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    jti: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    ip: { type: String, default: null },
    userAgent: { type: String, default: null },
    expiresAt: {
      type: Date,
      required: true,
      // TTL index to auto-remove expired sessions
      index: { expireAfterSeconds: 0 },
    },
  },
  { timestamps: true },
);

// Optional compound index if you plan to query by both user and jti often
// RefreshSessionSchema.index({ userId: 1, jti: 1 }, { unique: true });

applyDefaultSchemaTransform(RefreshSessionSchema);

export const RefreshSessionModel = model<RefreshSession>(
  "RefreshSession",
  RefreshSessionSchema,
  "refresh_sessions",
);
