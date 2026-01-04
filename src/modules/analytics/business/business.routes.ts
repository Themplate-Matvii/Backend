import { Router } from "express";
import { getBusinessAnalytics } from "@modules/analytics/business/business.controller";
import { requireJwt } from "@middleware/authenticateJwt";
import { checkPermission } from "@middleware/checkPermission";
import { permissionKeys } from "@constants/permissions/permissionKeys";
import { validate } from "@middleware/validate";
import { getBusinessAnalyticsSchema } from "@modules/analytics/business/business.validation";

const router = Router();

/**
 * GET /analytics/business
 * Requires: analitycs_business.view
 */
router.get(
  "/",
  requireJwt,
  checkPermission({ any: permissionKeys.analitycs_business.view }),
  validate(getBusinessAnalyticsSchema),
  getBusinessAnalytics,
);

export default router;
