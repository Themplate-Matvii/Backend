import axios from "axios";
import Media from "@modules/assets/media/media.model";
import { b2 } from "@config/b2";
import crypto from "crypto";
import { ENV } from "@config/env";
import { AppError } from "@utils/common/appError";
import { messages } from "@constants/messages";
import { Readable } from "stream";
import { Types } from "mongoose";

interface MediaMeta {
  name?: string;
  description?: string;
}

export class MediaService {
  private static serializeUploader(uploadedBy: any) {
    if (!uploadedBy) return null;

    // Already serialized shape: { id: string, name?, email? }
    if (
      typeof uploadedBy === "object" &&
      uploadedBy !== null &&
      typeof (uploadedBy as any).id === "string" &&
      ("name" in uploadedBy || "email" in uploadedBy)
    ) {
      return {
        id: (uploadedBy as any).id,
        name:
          typeof (uploadedBy as any).name === "string"
            ? (uploadedBy as any).name
            : null,
        email:
          typeof (uploadedBy as any).email === "string"
            ? (uploadedBy as any).email
            : null,
      };
    }

    // Plain ObjectId or something that Types.ObjectId.isValid understands
    if (Types.ObjectId.isValid(uploadedBy)) {
      return { id: (uploadedBy as any).toString() };
    }

    // Plain string id
    if (typeof uploadedBy === "string") {
      return { id: uploadedBy };
    }

    // Populated document case
    const rawId = (uploadedBy as any)?._id;
    let id: string | null = null;

    if (typeof rawId === "string") {
      id = rawId;
    } else if (Types.ObjectId.isValid(rawId)) {
      id = (rawId as any).toString();
    }

    return {
      id,
      name:
        typeof (uploadedBy as any).name === "string"
          ? (uploadedBy as any).name
          : null,
      email:
        typeof (uploadedBy as any).email === "string"
          ? (uploadedBy as any).email
          : null,
    };
  }

  static buildResponse(media: any) {
    const mediaObj = media.toObject();

    return {
      ...mediaObj,
      uploadedBy: this.serializeUploader(
        mediaObj.uploadedBy ?? (media as any).uploadedBy,
      ),
      url: MediaService.getUrl(mediaObj.filename),
    };
  }

  private static computeContentHash(buffer: Buffer) {
    return crypto.createHash("sha256").update(buffer).digest("hex");
  }

  private static async uploadBuffer(
    buffer: Buffer,
    mimeType: string,
    originalname: string,
    userId: string,
    meta: MediaMeta = {},
  ) {
    const contentHash = this.computeContentHash(buffer);

    const existing = await Media.findOne({ uploadedBy: userId, contentHash });
    if (existing) {
      if (meta.name !== undefined) existing.name = meta.name;
      if (meta.description !== undefined)
        existing.description = meta.description;
      if (meta.name !== undefined || meta.description !== undefined) {
        await existing.save();
      }

      return existing;
    }

    const ext = originalname.split(".").pop();
    const filename = crypto.randomUUID() + (ext ? `.${ext}` : "");

    await b2.putObject({
      Bucket: ENV.B2_BUCKET_NAME,
      Key: filename,
      Body: buffer,
      ContentType: mimeType,
    });

    return Media.create({
      filename,
      uploadedBy: userId,
      size: buffer.length,
      mimeType,
      name: meta.name,
      description: meta.description,
      contentHash,
    });
  }

  // Upload file to Backblaze B2
  static async upload(
    file: Express.Multer.File,
    userId: string,
    meta: MediaMeta = {},
  ) {
    return this.uploadBuffer(
      file.buffer,
      file.mimetype,
      file.originalname,
      userId,
      meta,
    );
  }

  // Upload file from URL and store as Media
  static async uploadFromUrl(
    url: string,
    userId: string,
    meta: MediaMeta = {},
    maxSizeBytes?: number,
  ) {
    try {
      const response = await axios.get<ArrayBuffer>(url, {
        responseType: "arraybuffer",
      });
      const contentType =
        response.headers["content-type"] || "application/octet-stream";

      const buffer = Buffer.from(response.data);
      if (maxSizeBytes && buffer.length > maxSizeBytes) {
        throw new AppError(
          `${messages.media.tooLarge}|{"limitMb":${
            maxSizeBytes / 1024 / 1024
          }}`,
          400,
        );
      }

      const fallbackExt = contentType.split("/")[1] || "bin";
      const urlExt = url.split("?")[0].split(".").pop();
      const ext = (urlExt && urlExt.length <= 5 ? urlExt : fallbackExt).replace(
        /[^a-zA-Z0-9]/g,
        "",
      );

      const file: Express.Multer.File = {
        buffer,
        originalname: meta.name || `avatar.${ext || "jpg"}`,
        mimetype: contentType,
        size: buffer.length,
        fieldname: "file",
        encoding: "7bit",
        stream: Readable.from(buffer),
        destination: "",
        filename: "",
        path: "",
      };

      return this.upload(file, userId, meta);
    } catch (error) {
      throw new AppError(messages.media.uploadFailed, 500, {
        reason: "avatar_download_failed",
        url,
      });
    }
  }

  // Update only name and description
  static async updateMeta(id: string, meta: MediaMeta) {
    const media = await Media.findById(id);
    if (!media) {
      throw new AppError(messages.media.notFound, 404);
    }

    if (meta.name !== undefined) media.name = meta.name;
    if (meta.description !== undefined) media.description = meta.description;

    await media.save();
    return media;
  }

  // Delete file from storage and DB
  static async delete(id: string) {
    const media = await Media.findById(id);
    if (!media) {
      throw new AppError(messages.media.notFound, 404);
    }

    await b2.deleteObject({
      Bucket: ENV.B2_BUCKET_NAME,
      Key: media.filename,
    });

    await media.deleteOne();
    return true;
  }

  // Generate download URL for B2
  static getUrl(filename: string) {
    return `${ENV.B2_ENDPOINT}/${ENV.B2_BUCKET_NAME}/${filename}`;
  }

  // Paginated media list
  static async getAll(query: any) {
    const { page = 1, limit = 20, sort = "desc", s, userId, mime } = query;

    const filter: any = {};

    if (userId) filter.uploadedBy = userId;
    if (mime) filter.mimeType = { $regex: mime, $options: "i" };

    if (s) {
      filter.$or = [
        { filename: { $regex: s, $options: "i" } },
        { name: { $regex: s, $options: "i" } },
        { description: { $regex: s, $options: "i" } },
      ];
    }

    const skip = (page - 1) * limit;

    const items = await Media.find(filter)
      .sort({ createdAt: sort === "asc" ? 1 : -1 })
      .skip(skip)
      .limit(limit)
      .populate("uploadedBy", "name email");

    const total = await Media.countDocuments(filter);

    return {
      items: items.map((item) => this.buildResponse(item)),
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    };
  }

  static async getById(id: string) {
    const media = await Media.findById(id).populate("uploadedBy", "name email");
    if (!media) {
      throw new AppError(messages.media.notFound, 404);
    }

    return this.buildResponse(media);
  }

  static async getFile(id: string) {
    const media = await Media.findById(id);

    if (!media) {
      throw new AppError(messages.media.notFound, 404);
    }

    const file = await b2.getObject({
      Bucket: ENV.B2_BUCKET_NAME,
      Key: media.filename,
    });

    return { media, file };
  }
}
