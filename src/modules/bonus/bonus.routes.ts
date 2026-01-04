import { Router } from "express";
import { requireJwt } from "@middleware/authenticateJwt";
import { adjustUserBonus, getMyBonusHistory } from "@modules/bonus/bonus.controller";
import { checkPermission } from "@middleware/checkPermission";
import { permissionKeys } from "@constants/permissions/permissionKeys";
import { validate } from "@middleware/validate";
import { updateBonusSchema } from "@modules/bonus/bonus.validation";

const router = Router();

router.get(
  "/history",
  requireJwt,
  checkPermission({
    own: permissionKeys.bonus.history.own.view,
  }),
  getMyBonusHistory,
);

router.get(
  "/history/:userId",
  requireJwt,
  checkPermission({
    any: permissionKeys.bonus.history.any.view,
    ownerField: "userId",
  }),
  getMyBonusHistory,
);

router.patch(
  "/:userId",
  requireJwt,
  checkPermission({
    any: permissionKeys.bonus.adjust,
    ownerField: "userId",
  }),
  validate(updateBonusSchema),
  adjustUserBonus,
);

export default router;
