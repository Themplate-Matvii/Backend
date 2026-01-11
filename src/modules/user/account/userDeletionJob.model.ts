import { Schema, model, Document, Types } from "mongoose";
import { applyDefaultSchemaTransform } from "@utils/database/transform";

export type UserDeletionStatus = "scheduled" | "in_progress" | "done" | "failed";

export interface UserDeletionJobDocument extends Document {
  userId: Types.ObjectId;
  status: UserDeletionStatus;
  error?: string;
  attempts: number;
  nextRunAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const UserDeletionJobSchema = new Schema<UserDeletionJobDocument>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    status: {
      type: String,
      enum: ["scheduled", "in_progress", "done", "failed"],
      default: "scheduled",
      index: true,
    },
    error: { type: String },
    attempts: { type: Number, default: 0 },
    nextRunAt: { type: Date, required: true, index: true },
  },
  { timestamps: true },
);

UserDeletionJobSchema.index({ userId: 1, status: 1 });

applyDefaultSchemaTransform(UserDeletionJobSchema);

export const UserDeletionJobModel = model<UserDeletionJobDocument>(
  "UserDeletionJob",
  UserDeletionJobSchema,
  "user_deletion_jobs",
);
