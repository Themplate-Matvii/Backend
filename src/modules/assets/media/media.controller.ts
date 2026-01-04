import { Response } from "express";
import { MediaService } from "@modules/assets/media/media.service";
import { asyncHandler } from "@utils/common/asyncHandler";
import { successResponse } from "@utils/common/response";
import { AppError } from "@utils/common/appError";
import { messages } from "@constants/messages";
import {
  getMediaQuerySchema,
  getMediaIdParamsSchema,
  UpdateMediaDTO,
  uploadMediaBodySchema,
} from "@modules/assets/media/media.validation";
import { RequestWithUser } from "@modules/core/types/auth";

// 5 MB file limit (dynamic, reusable)
const MAX_MEDIA_SIZE_MB = 5;
const MAX_MEDIA_SIZE_BYTES = MAX_MEDIA_SIZE_MB * 1024 * 1024;

/**
 * Upload media file
 */
export const uploadMedia = asyncHandler<RequestWithUser>(
  async (req, res: Response) => {
    const parsedBody = uploadMediaBodySchema.safeParse(req.body ?? {});
    if (!parsedBody.success) {
      throw new AppError(messages.validation.invalidUrl, 400, parsedBody.error);
    }

    const { name, description, url: providedUrl } = parsedBody.data;

    try {
      const userId = (req.user as any).sub;
      let media;

      if (req.file) {
        // Size validation (5MB now)
        if (req.file.size > MAX_MEDIA_SIZE_BYTES) {
          throw new AppError(
            `${messages.media.tooLarge}|{"limitMb":${MAX_MEDIA_SIZE_MB}}`,
            400,
          );
        }

        media = await MediaService.upload(req.file, userId, {
          name,
          description,
        });
      } else if (providedUrl) {
        try {
          new URL(providedUrl);
        } catch {
          throw new AppError(messages.validation.invalidUrl, 400, {
            reason: "invalid_url",
          });
        }

        media = await MediaService.uploadFromUrl(
          providedUrl,
          userId,
          {
            name,
            description,
          },
          MAX_MEDIA_SIZE_BYTES,
        );
      } else {
        throw new AppError(messages.media.fileRequired, 400, {
          reason: "file_or_url_required",
        });
      }

      const mediaResponse = MediaService.buildResponse(media);

      return successResponse(res, { media: mediaResponse, url: mediaResponse.url });
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }

      throw new AppError(messages.media.uploadFailed, 500);
    }
  },
);

/**
 * Update media meta (name, description)
 */
export const updateMediaMeta = asyncHandler<RequestWithUser>(
  async (req, res: Response) => {
    const { id } = req.params;
    const { name, description } = req.body as UpdateMediaDTO;

    const media = await MediaService.updateMeta(id, {
      name,
      description,
    });

    const mediaResponse = MediaService.buildResponse(media);
    return successResponse(res, { media: mediaResponse, url: mediaResponse.url });
  },
);

/**
 * Delete media
 */
export const deleteMedia = asyncHandler<RequestWithUser>(
  async (req, res: Response) => {
    await MediaService.delete(req.params.id);
    return successResponse(res, { message: messages.crud.deleted });
  },
);

/**
 * List paginated media
 */
export const getAllMedia = asyncHandler<RequestWithUser>(
  async (req, res: Response) => {
    const parsed = getMediaQuerySchema.safeParse(req.query);

    if (!parsed.success) {
      throw new AppError(
        messages.validation.invalidObjectId,
        400,
        parsed.error,
      );
    }

    const filters = parsed.data;

    // Apply ownership filtering automatically
    if ((req as any).permissionScope === "own") {
      filters.userId = (req.user as any).sub;
    }

    const data = await MediaService.getAll(filters);
    return successResponse(res, data);
  },
);

/**
 * Get media by id
 */
export const getMediaById = asyncHandler<RequestWithUser>(
  async (req, res: Response) => {
    const parsedParams = getMediaIdParamsSchema.safeParse(req.params);
    if (!parsedParams.success) {
      throw new AppError(messages.validation.invalidObjectId, 400, parsedParams.error);
    }

    const media = await MediaService.getById(parsedParams.data.id);

    if (
      (req as any).permissionScope === "own" &&
      (req.user as any)?.sub &&
      media.uploadedBy?.id &&
      media.uploadedBy.id !== (req.user as any).sub
    ) {
      throw new AppError(messages.media.noPermission, 403);
    }

    return successResponse(res, media);
  },
);

/**
 * Download media file by id
 */
export const downloadMediaById = asyncHandler<RequestWithUser>(
  async (req, res: Response) => {
    const parsedParams = getMediaIdParamsSchema.safeParse(req.params);
    if (!parsedParams.success) {
      throw new AppError(messages.validation.invalidObjectId, 400, parsedParams.error);
    }

    const { media, file } = await MediaService.getFile(parsedParams.data.id);

    if (
      (req as any).permissionScope === "own" &&
      (req.user as any)?.sub &&
      media.uploadedBy?.toString?.() &&
      media.uploadedBy.toString() !== (req.user as any).sub
    ) {
      throw new AppError(messages.media.noPermission, 403);
    }

    const stream = file.Body as any;

    if (!stream || typeof stream.pipe !== "function") {
      throw new AppError(messages.media.notFound, 404);
    }

    res.setHeader("Content-Type", file.ContentType || "application/octet-stream");
    if (file.ContentLength) {
      res.setHeader("Content-Length", file.ContentLength.toString());
    }
    res.setHeader("Content-Disposition", `inline; filename="${media.filename}"`);

    stream.pipe(res);
  },
);
