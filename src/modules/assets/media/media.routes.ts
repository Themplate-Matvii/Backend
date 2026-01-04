// comments only in English
import { Router } from "express";
import multer from "multer";

import {
  uploadMedia,
  deleteMedia,
  getAllMedia,
  updateMediaMeta,
  getMediaById,
  downloadMediaById,
} from "@modules/assets/media/media.controller";
import { requireJwt } from "@middleware/authenticateJwt";
import { checkPermission } from "@middleware/checkPermission";
import { permissionKeys } from "@constants/permissions/permissionKeys";
import { validate } from "@middleware/validate";
import {
  getMediaIdParamsSchema,
  getMediaQuerySchema,
  updateMediaSchema,
} from "@modules/assets/media/media.validation";

const router = Router();

// Use memory storage because we upload directly to B2
const upload = multer({ storage: multer.memoryStorage() });

/**
 * Upload media
 * Permissions:
 * - media.create.own
 * - media.create.any
 */
router.post(
  "/upload",
  requireJwt,
  checkPermission({
    any: permissionKeys.media.any.create,
    own: permissionKeys.media.own.create,
  }),
  upload.single("file"),
  uploadMedia,
);

/**
 * Update media meta (name, description)
 * Permissions:
 * - media.update.any
 * - media.update.own
 */
router.patch(
  "/:id",
  requireJwt,
  checkPermission({
    any: permissionKeys.media.any.update,
    own: permissionKeys.media.own.update,
    ownerField: "uploadedBy",
  }),
 validate(updateMediaSchema),
  updateMediaMeta,
);

/**
 * Delete media
 * Permissions:
 * - media.delete.any
 * - media.delete.own
 */
router.delete(
  "/:id",
  requireJwt,
  checkPermission({
    any: permissionKeys.media.any.delete,
    own: permissionKeys.media.own.delete,
    ownerField: "uploadedBy",
  }),
  deleteMedia,
);

/**
 * Get all media
 * Permissions:
 * - media.view.any
 * - media.view.own (will filter by userId automatically)
 */
router.get(
  "/", 
  requireJwt,
  checkPermission({
    any: permissionKeys.media.any.view,
    own: permissionKeys.media.own.view,
    ownerField: "uploadedBy",
  }),
  validate({ query: getMediaQuerySchema }),
  getAllMedia,
);

/**
 * Download media file by id
 * Permissions:
 * - media.view.any
 * - media.view.own
 */
router.get(
  "",
  requireJwt,
  checkPermission({
    any: permissionKeys.media.any.view,
    own: permissionKeys.media.own.view,
    ownerField: "uploadedBy",
  }),
  validate({ params: getMediaIdParamsSchema }),
  downloadMediaById,
);

/**
 * Get media by id
 * Permissions:
 * - media.view.any
 * - media.view.own
 */
router.get(
  "/:id",
  requireJwt,
  checkPermission({
    any: permissionKeys.media.any.view,
    own: permissionKeys.media.own.view,
    ownerField: "uploadedBy",
  }),
  validate({ params: getMediaIdParamsSchema }),
  getMediaById,
);

export default router;
