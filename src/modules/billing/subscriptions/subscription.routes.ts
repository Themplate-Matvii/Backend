import { Router } from "express";
import { requireJwt } from "@middleware/authenticateJwt";
import { checkPermission } from "@middleware/checkPermission";
import { permissionKeys } from "@constants/permissions/permissionKeys";
import {
  getMySubscription,
  cancelMySubscription,
  resumeMySubscription,
} from "@modules/billing/subscriptions/subscription.controller";

const router = Router();

// Get current user subscription
router.get(
  "/me",
  requireJwt,
  checkPermission({
    own: permissionKeys.subscriptions.own.view,
  }),
  getMySubscription,
);

// Get subscription for any user (admin scope)
router.get(
  "/user/:userId",
  requireJwt,
  checkPermission({
    any: permissionKeys.subscriptions.any.view,
    ownerField: "userId",
  }),
  getMySubscription,
);

// Cancel subscription at period end
router.post(
  "/cancel",
  requireJwt,
  checkPermission({
    own: permissionKeys.subscriptions.own.manage,
  }),
  cancelMySubscription,
);

// Cancel subscription for any user
router.post(
  "/user/:userId/cancel",
  requireJwt,
  checkPermission({
    any: permissionKeys.subscriptions.any.manage,
    ownerField: "userId",
  }),
  cancelMySubscription,
);

// Resume subscription that was scheduled to cancel at period end
router.post(
  "/resume",
  requireJwt,
  checkPermission({
    own: permissionKeys.subscriptions.own.manage,
  }),
  resumeMySubscription,
);

// Resume subscription for any user
router.post(
  "/user/:userId/resume",
  requireJwt,
  checkPermission({
    any: permissionKeys.subscriptions.any.manage,
    ownerField: "userId",
  }),
  resumeMySubscription,
);

export default router;
