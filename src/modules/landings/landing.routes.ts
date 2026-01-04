import { Router } from "express";
import { requireJwt, optionalJwt } from "@middleware/authenticateJwt";
import { createLanding, getAllLandings } from "@modules/landings/landing.controller";
import { checkPermission } from "@middleware/checkPermission";
import { permissionKeys } from "@constants/permissions/permissionKeys";

const router = Router();

router.post(
  "/",
  requireJwt,
  checkPermission({ any: permissionKeys.landings.create }),
  createLanding,
);
router.get(
  "/",
  optionalJwt,
  checkPermission({
    own: permissionKeys.landings.own.view,
    any: permissionKeys.landings.any?.view,
  }),
  getAllLandings,
);

export default router;
