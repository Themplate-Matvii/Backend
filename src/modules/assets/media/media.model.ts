import { Schema, model } from "mongoose";
import { applyDefaultSchemaTransform } from "@utils/database/transform";

const mediaSchema = new Schema(
  {
    filename: { type: String, required: true },
    uploadedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    size: { type: Number },
    mimeType: { type: String },
    contentHash: { type: String, index: true },
    name: { type: String, trim: true },
    description: { type: String, trim: true },
  },
  { timestamps: true },
);

mediaSchema.index({ uploadedBy: 1, contentHash: 1 }, { unique: true, sparse: true });

applyDefaultSchemaTransform(mediaSchema);

export default model("Media", mediaSchema);
