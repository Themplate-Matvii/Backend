import { Request } from "express";
import { asyncHandler } from "@utils/common/asyncHandler";
import { EmailService, DEFAULT_EMAIL_BRANDING, SendEmailOptions } from "@modules/communication/email/email.service";
import {
  BroadcastEmailDTO,
  CreateMarketingTemplateDTO,
  MarketingDraftPreviewDTO,
  MarketingPreviewDTO,
  MarketingPreviewParamsDTO,
  MarketingTemplateParamsDTO,
  SendEmailDTO,
  TemplatePreviewDTO,
  UpdateBrandingDTO,
  UpdateMarketingTemplateDTO,
  UpdatePreferencesDTO,
  UnsubscribeParamsDTO,
} from "@modules/communication/email/email.validation";
import { ENV } from "@config/env";
import { initI18n, i18n } from "@config/i18n";
import { successResponse } from "@utils/common/response";
import { UserModel } from "@modules/user/user.model";
import { MarketingEmailModel } from "@modules/communication/email/marketingEmail.model";
import { emailTemplates, EmailTemplateDefinition } from "@modules/communication/email/email.templates";
import { EmailBrandingModel, EmailBrandingDocument, getActiveBranding } from "@modules/communication/email/email.branding.model";
import { EmailBrandingPayload, EmailCategory } from "@modules/communication/email/email.types";
import { verifyUnsubscribeToken } from "@modules/communication/email/unsubscribeTokens";
import { AppError } from "@utils/common/appError";
import { resolveUserId } from "@utils/auth/resolveUserId";
import { RequestWithUser } from "@modules/core/types/auth";
import { SYSTEM_TEMPLATE_MOCKS } from "./email.previewData";
import Media from "@modules/assets/media/media.model";

function findSystemTemplate(templatePath: string): (EmailTemplateDefinition & { key: string }) | null {
  for (const [group, templates] of Object.entries(emailTemplates)) {
    const templateEntries = templates as Record<string, EmailTemplateDefinition>;
    for (const [key, value] of Object.entries(templateEntries)) {
      const template = value as EmailTemplateDefinition;
      if (template.file === templatePath) {
        return { ...template, key: `${group}.${key}` };
      }
    }
  }

  return null;
}

function ensureRecipient(body: SendEmailDTO) {
  if (!body.to && !body.userId) {
    throw new AppError("Recipient email or userId is required", 400);
  }
}

type BrandingResponse = EmailBrandingPayload & {
  logoMedia: { id: string; url: string } | null;
  darkLogoMedia: { id: string; url: string } | null;
  headerHtml: string;
  footerHtml: string;
};

async function buildBrandingResponse(
  branding: EmailBrandingPayload | EmailBrandingDocument,
): Promise<BrandingResponse> {
  const logoMediaId = branding.logoMediaId ? String(branding.logoMediaId) : null;
  const darkLogoMediaId = branding.darkLogoMediaId
    ? String(branding.darkLogoMediaId)
    : null;
  const mediaIds = [logoMediaId, darkLogoMediaId].filter(Boolean) as string[];
  const mediaItems = mediaIds.length
    ? await Media.find({ _id: { $in: mediaIds } }, "url").lean()
    : [];
  const mediaMap = new Map(
    mediaItems.map((item) => [String(item._id), item.url] as const),
  );
  const logoUrl = logoMediaId ? mediaMap.get(logoMediaId) ?? null : null;
  const darkLogoUrl = darkLogoMediaId
    ? mediaMap.get(darkLogoMediaId) ?? null
    : null;

  const resolvedBranding: EmailBrandingPayload = {
    brandName: branding.brandName ?? DEFAULT_EMAIL_BRANDING.brandName,
    logoMediaId,
    darkLogoMediaId,
    logoUrl,
    darkLogoUrl,
    primaryColor: branding.primaryColor || DEFAULT_EMAIL_BRANDING.primaryColor,
    secondaryColor: branding.secondaryColor || DEFAULT_EMAIL_BRANDING.secondaryColor,
    accentColor: branding.accentColor || DEFAULT_EMAIL_BRANDING.accentColor,
    backgroundColor: branding.backgroundColor || DEFAULT_EMAIL_BRANDING.backgroundColor,
    textColor: branding.textColor || DEFAULT_EMAIL_BRANDING.textColor,
    supportEmail: branding.supportEmail ?? DEFAULT_EMAIL_BRANDING.supportEmail,
  };

  const preview = EmailService.buildBrandingPreview(resolvedBranding);

  return {
    ...resolvedBranding,
    logoMedia: logoMediaId && logoUrl ? { id: logoMediaId, url: logoUrl } : null,
    darkLogoMedia:
      darkLogoMediaId && darkLogoUrl ? { id: darkLogoMediaId, url: darkLogoUrl } : null,
    headerHtml: preview.headerHtml,
    footerHtml: preview.footerHtml,
  };
}

/**
 * POST /email/send
 */
export const sendEmail = asyncHandler<RequestWithUser>(async (req, res) => {
  const body = req.body as SendEmailDTO;
  ensureRecipient(body);

  let info;

  if (body.marketingTemplateId) {
    const template = await MarketingEmailModel.findById(body.marketingTemplateId);
    if (!template) {
      throw new AppError("Marketing template not found", 404);
    }

    if (body.userId) {
      info = await EmailService.sendToUser(body.userId, {
        templateKind: "marketing",
        marketingTemplate: template,
        category: body.category ?? EmailCategory.MARKETING,
        data: body.data,
        locale: body.locale,
      } as SendEmailOptions);
    } else if (body.to) {
      info = await EmailService.send({
        templateKind: "marketing",
        marketingTemplate: template,
        to: body.to,
        category: body.category ?? EmailCategory.MARKETING,
        data: body.data,
        locale: body.locale,
      } as SendEmailOptions);
    }
  } else {
    const systemTemplate = findSystemTemplate(body.template!);
    const subjectKey = systemTemplate?.subjectKey || body.subjectKey;
    if (!subjectKey) {
      throw new AppError("subjectKey is required for system templates", 400);
    }

    const category =
      body.category ?? systemTemplate?.category ?? EmailCategory.TRANSACTIONAL;

    if (body.userId) {
      info = await EmailService.sendToUser(body.userId, {
        template: body.template!,
        subjectKey,
        previewTextKey: systemTemplate?.previewTextKey,
        category,
        data: body.data,
        locale: body.locale,
      } as SendEmailOptions);
    } else {
      info = await EmailService.send({
        to: body.to!,
        template: body.template!,
        subjectKey,
        previewTextKey: systemTemplate?.previewTextKey,
        category,
        data: body.data,
        locale: body.locale,
      } as SendEmailOptions);
    }
  }

  if (!info) {
    throw new AppError("Unable to send email", 400);
  }

  return successResponse(res, info, "Email sent");
});

/**
 * POST /email/broadcast
 */
export const broadcastEmail = asyncHandler<Request>(async (req, res) => {
  const body = req.body as BroadcastEmailDTO;

  if (body.marketingTemplateId) {
    const template = await MarketingEmailModel.findById(body.marketingTemplateId);
    if (!template) {
      throw new AppError("Marketing template not found", 404);
    }

    const users = body.userIds?.length
      ? await UserModel.find({ _id: { $in: body.userIds } }, "email name settings")
      : await UserModel.find({}, "email name settings");

    for (const user of users) {
      await EmailService.send({
        templateKind: "marketing",
        marketingTemplate: template,
        to: user.email,
        userId: String(user._id),
        locale: user.settings?.locale || body.locale,
        data: { ...(body.data || {}), name: user.name || user.email },
        category: body.category ?? EmailCategory.MARKETING,
      } as SendEmailOptions);
    }

    return successResponse(res, {}, `Broadcast sent to ${users.length} users`);
  }

  const systemTemplate = findSystemTemplate(body.template!);
  const subjectKey = systemTemplate?.subjectKey || body.subjectKey;
  if (!subjectKey) {
    throw new AppError("subjectKey is required for system templates", 400);
  }

  const result = await EmailService.broadcast(
    body.template!,
    subjectKey,
    body.data,
    body.userIds,
    {
      category: body.category ?? systemTemplate?.category ?? EmailCategory.MARKETING,
      previewTextKey: systemTemplate?.previewTextKey,
    },
  );

  successResponse(res, result, `Broadcast sent to ${result.total} users`);
});

/** Branding **/
export const getBranding = asyncHandler<Request>(async (_req, res) => {
  const branding = (await getActiveBranding()) || DEFAULT_EMAIL_BRANDING;
  const response = await buildBrandingResponse(branding);
  return successResponse(res, response);
});

export const updateBranding = asyncHandler<RequestWithUser>(async (req, res) => {
  const body = req.body as UpdateBrandingDTO;
  const userId = resolveUserId(req);

  const branding = await EmailBrandingModel.findOneAndUpdate(
    {},
    { ...body, updatedBy: userId || null },
    { new: true, upsert: true },
  );

  const response = await buildBrandingResponse(branding);
  return successResponse(res, response);
});

/** Marketing templates CRUD **/
export const createMarketingTemplate = asyncHandler<RequestWithUser>(
  async (req, res) => {
    const body = req.body as CreateMarketingTemplateDTO;
    const userId = resolveUserId(req);

    const created = await MarketingEmailModel.create({
      ...body,
      createdBy: userId || undefined,
      updatedBy: userId || undefined,
    });

    return successResponse(res, created, "Marketing template created");
  },
);

export const listMarketingTemplates = asyncHandler<Request>(async (_req, res) => {
  const templates = await MarketingEmailModel.find({}, "name description subjectKey translations updatedAt createdAt")
    .sort({ updatedAt: -1 })
    .lean();

  const data = templates.map((tpl) => ({
    ...tpl,
    locales: Object.keys(tpl.translations || {}),
  }));

  return successResponse(res, data);
});

export const getMarketingTemplate = asyncHandler<Request>(async (req, res) => {
  const { id } = req.params as MarketingTemplateParamsDTO;
  const template = await MarketingEmailModel.findById(id).lean();

  if (!template) {
    throw new AppError("Marketing template not found", 404);
  }

  return successResponse(res, template);
});

export const updateMarketingTemplate = asyncHandler<RequestWithUser>(
  async (req, res) => {
    const body = req.body as UpdateMarketingTemplateDTO;
    const { id } = req.params as MarketingTemplateParamsDTO;
    const userId = resolveUserId(req);

    const updated = await MarketingEmailModel.findByIdAndUpdate(
      id,
      { $set: { ...body, updatedBy: userId || undefined } },
      { new: true },
    );

    if (!updated) {
      throw new AppError("Marketing template not found", 404);
    }

    return successResponse(res, updated, "Marketing template updated");
  },
);

/** Previews **/
export const previewMarketingTemplate = asyncHandler<Request>(async (req, res) => {
  const { id } = req.params as MarketingPreviewParamsDTO;
  const body = req.body as MarketingPreviewDTO;

  const template = await MarketingEmailModel.findById(id);
  if (!template) {
    throw new AppError("Marketing template not found", 404);
  }

  const preview = await EmailService.preview({
    templateKind: "marketing",
    marketingTemplate: template,
    to: body.data?.email || ENV.ADMIN_EMAIL,
    data: body.data,
    locale: body.locale,
    category: body.category ?? EmailCategory.MARKETING,
  } as SendEmailOptions);

  return successResponse(res, preview);
});

export const previewMarketingDraft = asyncHandler<Request>(async (req, res) => {
  const body = req.body as MarketingDraftPreviewDTO;

  const preview = await EmailService.preview({
    templateKind: "marketing",
    marketingTemplate: {
      name: body.name,
      description: body.description,
      subjectKey: body.subjectKey,
      translations: body.translations,
      hbs: body.hbs,
      previewData: body.previewData,
    } as any,
    to: body.data?.email || ENV.ADMIN_EMAIL,
    data: body.data ?? body.previewData ?? {},
    locale: body.locale,
    category: EmailCategory.MARKETING,
  } as SendEmailOptions);

  return successResponse(res, preview);
});

export const previewSystemTemplate = asyncHandler<Request>(async (req, res) => {
  const body = req.body as TemplatePreviewDTO;
  const template = findSystemTemplate(body.template);
  if (!template) {
    throw new AppError("Template not found", 404);
  }

  const preview = await EmailService.preview({
    to: body.data?.email || ENV.ADMIN_EMAIL,
    template: template.file,
    subjectKey: template.subjectKey,
    previewTextKey: template.previewTextKey,
    data: body.data,
    locale: body.locale,
    category: body.category ?? template.category ?? EmailCategory.TRANSACTIONAL,
  } as SendEmailOptions);

  return successResponse(res, preview);
});

/** Templates overview **/
export const listAllTemplates = asyncHandler<Request>(async (req, res) => {
  const locale =
    (typeof req.query.locale === "string" && req.query.locale) ||
    ENV.DEFAULT_LANGUAGE;

  await initI18n();
  await i18n.changeLanguage(locale);

  const branding = (await getActiveBranding()) || DEFAULT_EMAIL_BRANDING;
  const brandingResponse = await buildBrandingResponse(branding);

  const systemTemplates = Object.entries(emailTemplates).flatMap(
    ([group, templates]) =>
      Object.entries(templates as Record<string, EmailTemplateDefinition>).map(
        ([key, value]) => {
          const fullKey = `${group}.${key}`;
          const mock = SYSTEM_TEMPLATE_MOCKS[fullKey];

          const previewData = mock?.previewData ?? {};
          const subject = i18n.t(value.subjectKey, previewData) as string;
          const previewText = value.previewTextKey
            ? (i18n.t(value.previewTextKey, previewData) as string)
            : undefined;

          return {
            key: fullKey,
            file: value.file,
            category: value.category,
            type: "system",
            name: mock?.name,
            description: mock?.description,
            previewData: mock?.previewData,
            subject,
            previewText,
            group,
          };
        },
      ),
  );

  const marketing = await MarketingEmailModel.find(
    {},
    "name description subjectKey translations updatedAt createdAt",
  )
    .sort({ updatedAt: -1 })
    .lean();

  const marketingTemplates = marketing.map((tpl) => ({
    ...tpl,
    type: "marketing",
    locales: Object.keys(tpl.translations || {}),
  }));

  return successResponse(res, {
    branding: brandingResponse,
    systemTemplates,
    marketingTemplates,
  });
});

/** Unsubscribe **/
export const getUnsubscribePreferences = asyncHandler<Request>(
  async (req, res) => {
    const { token } = req.params as UnsubscribeParamsDTO;
    const payload = verifyUnsubscribeToken(token);

    if (!payload) {
      throw new AppError("Invalid unsubscribe token", 400);
    }

    const user = await UserModel.findById(payload.userId, "settings email name").lean();
    if (!user) {
      throw new AppError("User not found", 404);
    }

    const prefs = user.settings?.emailPreferences ?? { marketing: true, billing: true };

    return successResponse(res, {
      email: user.email,
      name: user.name,
      preferences: prefs,
      categories: payload.categories,
    });
  },
);

export const updateUnsubscribePreferences = asyncHandler<Request>(
  async (req, res) => {
    const { token } = req.params as UnsubscribeParamsDTO;
    const body = req.body as UpdatePreferencesDTO;
    const payload = verifyUnsubscribeToken(token);

    if (!payload) {
      throw new AppError("Invalid unsubscribe token", 400);
    }

    const updates: Record<string, any> = {};

    if (body.marketing !== undefined) {
      updates["settings.emailPreferences.marketing"] = body.marketing;
    }
    if (body.billing !== undefined) {
      updates["settings.emailPreferences.billing"] = body.billing;
    }

    if (Object.keys(updates).length === 0) {
      for (const category of payload.categories) {
        updates[`settings.emailPreferences.${category}`] = false;
      }
    }

    const user = await UserModel.findByIdAndUpdate(
      payload.userId,
      { $set: updates },
      { new: true },
    ).lean();

    if (!user) {
      throw new AppError("User not found", 404);
    }

    return successResponse(res, {
      email: user.email,
      preferences: user.settings?.emailPreferences,
    });
  },
);
