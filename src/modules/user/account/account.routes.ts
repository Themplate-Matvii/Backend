import { Router } from "express";
import { requireJwt } from "@middleware/authenticateJwt";
import { validate } from "@middleware/validate";
import {
  getAccountMe,
  updateProfile,
  linkOauthProvider,
  unlinkProvider,
  startEmailLink,
  confirmEmailLink,
  setPassword,
  sendEmailVerification,
  confirmEmailVerification,
  changePassword,
  startEmailChange,
  confirmEmailChange,
  deleteAccount,
} from "@modules/user/account/account.controller";
import {
  updateProfileSchema,
  oauthLinkSchema,
  unlinkProviderSchema,
  emailStartSchema,
  emailConfirmSchema,
  passwordSetSchema,
  verificationConfirmSchema,
  passwordChangeSchema,
  emailChangeStartSchema,
  emailChangeConfirmSchema,
} from "@modules/user/account/account.validation";

const router = Router();

router.get("/me", requireJwt, getAccountMe);
router.patch("/profile", requireJwt, validate(updateProfileSchema), updateProfile);

router.post(
  "/providers/oauth/link",
  requireJwt,
  validate(oauthLinkSchema),
  linkOauthProvider,
);
router.delete(
  "/providers/:provider",
  requireJwt,
  validate(unlinkProviderSchema),
  unlinkProvider,
);

router.post(
  "/providers/email/start",
  requireJwt,
  validate(emailStartSchema),
  startEmailLink,
);
router.post(
  "/providers/email/confirm",
  requireJwt,
  validate(emailConfirmSchema),
  confirmEmailLink,
);

router.post("/password/set", requireJwt, validate(passwordSetSchema), setPassword);
router.post(
  "/password/change",
  requireJwt,
  validate(passwordChangeSchema),
  changePassword,
);

router.post("/email/verification/send", requireJwt, sendEmailVerification);
router.post(
  "/email/verification/confirm",
  requireJwt,
  validate(verificationConfirmSchema),
  confirmEmailVerification,
);

router.post(
  "/email/change/start",
  requireJwt,
  validate(emailChangeStartSchema),
  startEmailChange,
);
router.post(
  "/email/change/confirm",
  requireJwt,
  validate(emailChangeConfirmSchema),
  confirmEmailChange,
);

router.delete("/", requireJwt, deleteAccount);

export default router;
