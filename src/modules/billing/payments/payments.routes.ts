import { Router } from "express";
import {
  createCheckoutSession,
  createOneTimeCheckoutSession,
  getUserPayments,
} from "@modules/billing/payments/payments.controller";
import { requireJwt } from "@middleware/authenticateJwt";
import { checkPermission } from "@middleware/checkPermission";
import { permissionKeys } from "@constants/permissions/permissionKeys";

const router = Router();

// Create checkout session for subscription (requires auth)
router.post("/checkout", requireJwt, createCheckoutSession);

// Create checkout session for one-time product (requires auth)
router.post("/checkout/one-time", requireJwt, createOneTimeCheckoutSession);

// Get user payments (requires auth)
router.get(
  "/my",
  requireJwt,
  checkPermission({
    own: permissionKeys.payments.own.view,
  }),
  getUserPayments,
);

// Get payments for any user (admin scope)
router.get(
  "/user/:userId",
  requireJwt,
  checkPermission({
    any: permissionKeys.payments.any.view,
    ownerField: "userId",
  }),
  getUserPayments,
);

export default router;
