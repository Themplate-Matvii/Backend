import { Router } from "express";
import {
  broadcastEmail,
  createMarketingTemplate,
  getBranding,
  getMarketingTemplate,
  getUnsubscribePreferences,
  listAllTemplates,
  listMarketingTemplates,
  previewMarketingTemplate,
  previewSystemTemplate,
  sendEmail,
  updateBranding,
  updateMarketingTemplate,
  updateUnsubscribePreferences,
} from "@modules/communication/email/email.controller";
import { validate } from "@middleware/validate";
import {
  broadcastEmailSchema,
  createMarketingTemplateSchema,
  marketingPreviewSchema,
  sendEmailSchema,
  templatePreviewSchema,
  updateBrandingSchema,
  updateMarketingTemplateSchema,
  unsubscribeParamsSchema,
  updatePreferencesSchema,
} from "@modules/communication/email/email.validation";
import { requireJwt } from "@middleware/authenticateJwt";
import { checkPermission } from "@middleware/checkPermission";
import { permissionKeys } from "@constants/permissions/permissionKeys";

const router = Router();

router.post(
  "/send",
  requireJwt,
  checkPermission({ any: permissionKeys.email.one }),
  validate(sendEmailSchema),
  sendEmail,
);

router.post(
  "/broadcast",
  requireJwt,
  checkPermission({ any: permissionKeys.email.broadcast }),
  validate(broadcastEmailSchema),
  broadcastEmail,
);

router.get(
  "/branding",
  requireJwt,
  checkPermission({ any: permissionKeys.email.templates.view }),
  getBranding,
);

router.put(
  "/branding",
  requireJwt,
  checkPermission({ any: permissionKeys.email.branding.manage }),
  validate(updateBrandingSchema),
  updateBranding,
);

router.get(
  "/templates",
  requireJwt,
  checkPermission({ any: permissionKeys.email.templates.view }),
  listAllTemplates,
);

router.post(
  "/templates/preview",
  requireJwt,
  checkPermission({ any: permissionKeys.email.templates.view }),
  validate(templatePreviewSchema),
  previewSystemTemplate,
);

router.post(
  "/marketing",
  requireJwt,
  checkPermission({ any: permissionKeys.email.templates.manage }),
  validate(createMarketingTemplateSchema),
  createMarketingTemplate,
);

router.get(
  "/marketing",
  requireJwt,
  checkPermission({ any: permissionKeys.email.templates.view }),
  listMarketingTemplates,
);

router.post(
  "/marketing/:id/preview",
  requireJwt,
  checkPermission({ any: permissionKeys.email.templates.view }),
  validate(marketingPreviewSchema),
  previewMarketingTemplate,
);

router.get(
  "/marketing/:id",
  requireJwt,
  checkPermission({ any: permissionKeys.email.templates.view }),
  getMarketingTemplate,
);

router.put(
  "/marketing/:id",
  requireJwt,
  checkPermission({ any: permissionKeys.email.templates.manage }),
  validate(updateMarketingTemplateSchema),
  updateMarketingTemplate,
);

router.get(
  "/unsubscribe/:token",
  validate(unsubscribeParamsSchema),
  getUnsubscribePreferences,
);

router.post(
  "/unsubscribe/:token",
  validate(updatePreferencesSchema),
  updateUnsubscribePreferences,
);

export default router;
