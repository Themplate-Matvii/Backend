import { Schema, model } from "mongoose";
import { applyDefaultSchemaTransform } from "@utils/database/transform";
import { ENV } from "@config/env";

const mediaSchema = new Schema(
  {
    filename: { type: String, required: true },
    storageProvider: {
      type: String,
      enum: ["b2", "s3", "local"],
      required: true,
      default: "b2",
    },
    bucket: { type: String, required: true, default: ENV.B2_BUCKET_NAME },
    objectKey: { type: String, required: true },
    url: { type: String, required: true },
    uploadedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    size: { type: Number },
    mimeType: { type: String },
    contentHash: { type: String, index: true },
    name: { type: String, trim: true },
    description: { type: String, trim: true },
    status: {
      type: String,
      enum: ["active", "deleting", "deleted"],
      default: "active",
    },
  },
  { timestamps: true },
);

mediaSchema.index({ uploadedBy: 1, contentHash: 1 }, { unique: true, sparse: true });

mediaSchema.pre("validate", function (next) {
  if (!this.bucket) {
    this.bucket = ENV.B2_BUCKET_NAME;
  }
  if (!this.objectKey && this.filename) {
    this.objectKey = this.filename;
  }
  if (!this.url && this.bucket && this.objectKey) {
    this.url = `${ENV.B2_ENDPOINT}/${this.bucket}/${this.objectKey}`;
  }
  if (!this.storageProvider) {
    this.storageProvider = "b2";
  }
  next();
});

applyDefaultSchemaTransform(mediaSchema);

export default model("Media", mediaSchema);
