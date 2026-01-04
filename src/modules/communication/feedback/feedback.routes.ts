import { Router } from "express";
import { createFeedback, getAllFeedback } from "@modules/communication/feedback/feedback.controller";
import { requireJwt } from "@middleware/authenticateJwt";
import { checkPermission } from "@middleware/checkPermission";
import { permissionKeys } from "@constants/permissions/permissionKeys";
import { validate } from "@middleware/validate";
import { createFeedbackSchema, getAllFeedbackSchema } from "@modules/communication/feedback/feedback.validation";

const router = Router();

// Public route — anyone can submit feedback
router.post("/", validate(createFeedbackSchema), createFeedback);

// Protected route — only roles with feedback.view
router.get(
  "/all",
  requireJwt,
  checkPermission({ any: permissionKeys.feedback.view }),
  validate(getAllFeedbackSchema),
  getAllFeedback,
);

export default router;
