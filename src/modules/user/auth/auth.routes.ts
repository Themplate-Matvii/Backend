import { Router } from "express";
import multer from "multer";
import {
  registerSchema,
  loginSchema,
  refreshSchema,
  logoutSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from "@modules/user/auth/auth.validation";
import {
  register,
  login,
  refresh,
  logout,
  forgotPassword,
  resetPassword,
  oauthLogin,
  oauthAuthorize,
  oauthCallback,
} from "@modules/user/auth/auth.controller";
import { validate } from "@middleware/validate";

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

router.get("/oauth/:provider/callback", oauthCallback);
router.post("/oauth/:provider/callback", oauthCallback);

router.get("/oauth/:provider/authorize", oauthAuthorize);
router.post("/oauth/:provider", oauthLogin);

router.post("/register", upload.single("avatar"), validate(registerSchema), register);
router.post("/login", validate(loginSchema), login);
router.post("/refresh", validate(refreshSchema), refresh);
router.post("/logout", validate(logoutSchema), logout);
router.post("/forgot-password", validate(forgotPasswordSchema), forgotPassword);
router.post("/reset-password", validate(resetPasswordSchema), resetPassword);

export default router;
