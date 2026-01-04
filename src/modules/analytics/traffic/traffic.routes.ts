import { Router } from "express";
import { trackTrafficEvent, getTrafficEvents } from "@modules/analytics/traffic/traffic.controller";
import { validate } from "@middleware/validate";
import { trackEventSchema } from "@modules/analytics/traffic/traffic.validation";
import { requireJwt } from "@middleware/authenticateJwt";
import { checkPermission } from "@middleware/checkPermission";
import { permissionKeys } from "@constants/permissions/permissionKeys";

const router = Router();

/**
 * Public: track event
 */
router.post("/track", validate(trackEventSchema), trackTrafficEvent);

/**
 * Protected: get events (requires analytics_traffic.view)
 */
router.get(
  "/",
  requireJwt,
  checkPermission({ any: permissionKeys.analitycs_traffic.view }),
  getTrafficEvents,
);

export default router;
