import nodemailer from "nodemailer";
import { readFileSync } from "fs";
import { join } from "path";
import Handlebars from "handlebars";
import { initI18n, i18n, LangEnum } from "@config/i18n";
import { ENV } from "@config/env";
import { UserModel } from "@modules/user/user.model";
import { EmailBrandingDocument, getActiveBranding } from "./email.branding.model";
import { MarketingEmailDocument } from "./marketingEmail.model";
import { EmailBrandingPayload, EmailCategory } from "./email.types";
import { signUnsubscribeToken } from "./unsubscribeTokens";
import { EmailPreferences } from "@modules/user/settings/settings.model";
import { emailTemplates } from "@modules/communication/email/email.templates";
import { HydratedDocument } from "mongoose";

export type SendEmailBaseOptions = {
  to: string;
  locale?: LangEnum | string;
  data?: Record<string, any>;
  category?: EmailCategory;
  userId?: string;
  previewTextKey?: string;
};

export type SendEmailOptions =
  | (SendEmailBaseOptions & {
      template: string;
      subjectKey: string;
      templateKind?: "system";
    })
  | (SendEmailBaseOptions & {
      templateKind: "marketing";
      marketingTemplate:
        | MarketingEmailDocument
        | HydratedDocument<MarketingEmailDocument>;
    });

export type SendEmailResult = {
  skipped?: boolean;
  reason?: string;
  info?: any;
  html?: string;
  subject?: string;
  unsubscribeUrl?: string;
};

export const DEFAULT_EMAIL_BRANDING: EmailBrandingPayload = {
  brandName: "Themplate",
  logoUrl: null,
  darkLogoUrl: null,
  primaryColor: "#2563eb",
  secondaryColor: "#0b1220",
  accentColor: "#0ea5e9",
  backgroundColor: "#0f172a",
  textColor: "#0b1220",
  footerText: "Thank you for trusting us to power your work.",
  supportEmail: ENV.ADMIN_EMAIL,
  supportUrl: ENV.FRONT_URL,
  socialLinks: [],
};

function buildDefaultPreferences(): EmailPreferences {
  return { marketing: true, billing: true };
}

function buildTranslatorFromDict(
  translations: Record<string, string>,
  locale: string,
) {
  return (key: string, params: Record<string, any> = {}) => {
    const template = translations[key] ?? translations[`emails.${key}`] ?? key;
    const compiled = Handlebars.compile(template);
    return compiled(params);
  };
}

function resolveTranslationDict(
  translations: Record<string, Record<string, string>> | undefined,
  locale: string,
  fallbackLocale: string,
): Record<string, string> {
  return (
    translations?.[locale] ||
    translations?.[fallbackLocale] ||
    translations?.[Object.keys(translations || {})[0] || ""] ||
    {}
  );
}

type RecipientResolution = {
  allowed: boolean;
  reason?: string;
  email?: string;
  name?: string | null;
  locale: string;
  preferences?: EmailPreferences;
  userId?: string;
};

/**
 * EmailService handles all outgoing email logic
 */
export class EmailService {
  private static getTransporter() {
    return nodemailer.createTransport({
      service: "gmail",
      port: 587,
      secure: false,
      auth: {
        user: ENV.EMAIL_FROM,
        pass: ENV.EMAIL_PASS,
      },
    });
  }

  private static async resolveBranding(): Promise<EmailBrandingPayload> {
    const doc: EmailBrandingDocument | null = await getActiveBranding();
    if (!doc) return DEFAULT_EMAIL_BRANDING;

    return {
      brandName: doc.brandName ?? DEFAULT_EMAIL_BRANDING.brandName,
      logoUrl: doc.logoUrl ?? DEFAULT_EMAIL_BRANDING.logoUrl,
      darkLogoUrl: doc.darkLogoUrl ?? DEFAULT_EMAIL_BRANDING.darkLogoUrl,
      primaryColor: doc.primaryColor || DEFAULT_EMAIL_BRANDING.primaryColor,
      secondaryColor: doc.secondaryColor || DEFAULT_EMAIL_BRANDING.secondaryColor,
      accentColor: doc.accentColor || DEFAULT_EMAIL_BRANDING.accentColor,
      backgroundColor: doc.backgroundColor || DEFAULT_EMAIL_BRANDING.backgroundColor,
      textColor: doc.textColor || DEFAULT_EMAIL_BRANDING.textColor,
      footerText: doc.footerText ?? DEFAULT_EMAIL_BRANDING.footerText,
      supportEmail: doc.supportEmail ?? DEFAULT_EMAIL_BRANDING.supportEmail,
      supportUrl: doc.supportUrl ?? DEFAULT_EMAIL_BRANDING.supportUrl,
      socialLinks: doc.socialLinks?.length ? doc.socialLinks : DEFAULT_EMAIL_BRANDING.socialLinks,
    };
  }

  private static async resolveRecipient(
    options: SendEmailOptions,
    respectPreferences = true,
  ): Promise<RecipientResolution> {
    const category = options.category ?? EmailCategory.TRANSACTIONAL;
    const baseLocale = (options.locale as string) || ENV.DEFAULT_LANGUAGE;

    if (options.userId) {
      const user = await UserModel.findById(options.userId, "email name settings")
        .lean<{ email: string; name?: string | null; settings?: { locale?: string; emailPreferences?: EmailPreferences } } | null>();

      if (!user) {
        return { allowed: false, reason: "user_not_found", locale: baseLocale };
      }

      const prefs = user.settings?.emailPreferences || buildDefaultPreferences();
      const locale = user.settings?.locale || baseLocale;

      if (
        respectPreferences &&
        category === EmailCategory.MARKETING &&
        prefs?.marketing === false
      ) {
        return {
          allowed: false,
          reason: "unsubscribed_marketing",
          email: user.email,
          name: user.name,
          locale,
          userId: options.userId,
          preferences: prefs,
        };
      }

      if (
        respectPreferences &&
        category === EmailCategory.BILLING &&
        prefs?.billing === false
      ) {
        return {
          allowed: false,
          reason: "unsubscribed_billing",
          email: user.email,
          name: user.name,
          locale,
          userId: options.userId,
          preferences: prefs,
        };
      }

      return {
        allowed: true,
        email: user.email,
        name: user.name,
        locale,
        userId: options.userId,
        preferences: prefs,
      };
    }

    // Resolve by email if possible for locale/preferences
    const user = await UserModel.findOne(
      { email: options.to },
      "name settings",
    ).lean<{ name?: string | null; settings?: { locale?: string; emailPreferences?: EmailPreferences } } | null>();

    const locale = user?.settings?.locale || baseLocale;

    return {
      allowed: true,
      email: options.to,
      name: user?.name,
      locale,
      preferences: user?.settings?.emailPreferences,
    };
  }

  private static buildUnsubscribeLinks(category: EmailCategory, userId?: string) {
    if (!userId) return null;
    if (category === EmailCategory.TRANSACTIONAL) return null;

    const token = signUnsubscribeToken({
      userId,
      categories:
        category === EmailCategory.MARKETING
          ? [EmailCategory.MARKETING]
          : [EmailCategory.BILLING],
    });

    const base = ENV.BASE_URL.endsWith("/")
      ? ENV.BASE_URL.slice(0, -1)
      : ENV.BASE_URL;
    const apiUrl = `${base}/api/email/unsubscribe/${token}`;
    const pageUrl = `${ENV.FRONT_URL}/unsubscribe?token=${token}`;

    return { apiUrl, pageUrl, token };
  }

  private static wrapWithLayout(params: {
    bodyHtml: string;
    branding: EmailBrandingPayload;
    previewText?: string;
    unsubscribeUrl?: string | null;
    locale: string;
  }) {
    const { branding, bodyHtml, previewText, unsubscribeUrl } = params;
    const accent = branding.accentColor || branding.primaryColor;
    const textColor = branding.textColor || "#0b1220";
    const background = branding.backgroundColor || "#0f172a";
    const primary = branding.primaryColor || "#2563eb";

    const socialLinks = (branding.socialLinks || [])
      .map(
        (link) =>
          `<a href="${link.url}" style="color:${accent}; text-decoration:none; margin-right:12px; font-weight:600;">${link.label}</a>`,
      )
      .join("");

    const unsubBlock = unsubscribeUrl
      ? `<p style="color:#6b7280; font-size:13px; margin: 8px 0 0;">
            <a href="${unsubscribeUrl}" style="color:${accent}; text-decoration:none;">Unsubscribe</a> or manage email preferences.</p>`
      : "";

    const preview = previewText
      ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${previewText}</div>`
      : "";

    return `<!doctype html>
<html lang="${params.locale}">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${branding.brandName}</title>
    <style>
      .btn-primary { background:${primary}; color:#fff; padding:12px 18px; border-radius:12px; font-weight:700; text-decoration:none; display:inline-block; box-shadow:0 10px 25px rgba(37,99,235,0.25); }
      .card { background:#ffffff; border-radius:20px; padding:32px; box-shadow:0 20px 60px rgba(15,23,42,0.18); }
      .muted { color:#6b7280; }
    </style>
  </head>
  <body style="margin:0; padding:32px 0; background:${background}; font-family:'Inter', system-ui, -apple-system, 'Segoe UI', sans-serif; color:${textColor};">
    ${preview}
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;">
      <tr>
        <td align="center">
          <table role="presentation" width="640" cellspacing="0" cellpadding="0" style="width:640px; max-width:640px; padding:0 20px; box-sizing:border-box;">
            <tr>
              <td style="padding:0 0 16px;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                  <tr>
                    <td style="padding:12px 20px; background:#0f172a; border-radius:16px; color:#e5e7eb; display:flex; align-items:center; gap:12px;">
                      ${
                        branding.logoUrl
                          ? `<img src="${branding.logoUrl}" alt="${branding.brandName}" style="height:36px; width:auto; display:block;" />`
                          : `<div style="width:42px; height:42px; border-radius:12px; background:${accent}; display:flex; align-items:center; justify-content:center; color:#fff; font-weight:800;">${branding.brandName?.[0] ?? "T"}</div>`
                      }
                      <div>
                        <div style="font-weight:800; font-size:16px; color:#e5e7eb;">${branding.brandName}</div>
                        <div style="font-size:13px; color:#cbd5e1;">Modern communication for your SaaS customers</div>
                      </div>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td>
                <div class="card" style="background:#fff; border-radius:20px; padding:32px; box-shadow:0 20px 60px rgba(15,23,42,0.18);">
                  ${bodyHtml}
                </div>
              </td>
            </tr>
            <tr>
              <td style="padding:18px 12px 0; text-align:center;">
                <p style="margin:0; color:#e5e7eb; font-size:13px;">${branding.footerText ?? ""}</p>
                ${branding.supportEmail ? `<p style="margin:6px 0 0; color:#cbd5e1; font-size:13px;">Need help? <a href="mailto:${branding.supportEmail}" style="color:${accent}; text-decoration:none; font-weight:600;">${branding.supportEmail}</a></p>` : ""}
                ${branding.supportUrl ? `<p style="margin:6px 0 0; color:#cbd5e1; font-size:13px;"><a href="${branding.supportUrl}" style="color:${accent}; text-decoration:none; font-weight:600;">Visit dashboard</a></p>` : ""}
                ${socialLinks ? `<p style="margin:8px 0 0;">${socialLinks}</p>` : ""}
                ${unsubBlock}
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
  }

  private static async renderSystemTemplate(params: {
    template: string;
    data: Record<string, any>;
    locale: string;
    subjectKey: string;
    previewTextKey?: string;
  }) {
    const { template, data, locale, subjectKey, previewTextKey } = params;

    await initI18n();
    await i18n.changeLanguage(locale);

    const renderer = Handlebars.create();
    renderer.registerHelper("t", function (key: string, options: any) {
      const hash = (options && options.hash) || {};
      return i18n.t(key, hash);
    });

    const [group, file] = template.split("/");
    const templatePath = join(__dirname, "templates", group, `${file}.hbs`);
    const source = readFileSync(templatePath, "utf8");
    const compile = renderer.compile(source);

    const bodyHtml = compile({ ...data });
    const subject = i18n.t(subjectKey, data) as string;
    const previewText = previewTextKey
      ? ((i18n.t(previewTextKey, data) as string) || undefined)
      : undefined;

    return { bodyHtml, subject, previewText };
  }

  private static renderMarketingTemplate(params: {
    template: MarketingEmailDocument;
    locale: string;
    data: Record<string, any>;
    previewTextKey?: string;
  }) {
    const { template, locale, data, previewTextKey } = params;
    const translations = resolveTranslationDict(
      template.translations,
      locale,
      ENV.DEFAULT_LANGUAGE,
    );

    const translator = buildTranslatorFromDict(translations, locale);

    const renderer = Handlebars.create();
    renderer.registerHelper("t", function (key: string, options: any) {
      const hash = (options && options.hash) || {};
      return translator(key, hash);
    });

    const compile = renderer.compile(template.hbs);
    const bodyHtml = compile({ ...data });
    const subject = translator(template.subjectKey, data);
    const previewText = previewTextKey
      ? translator(previewTextKey, data)
      : undefined;

    return { bodyHtml, subject, previewText };
  }

  private static async composeEmail(
    options: SendEmailOptions,
    respectPreferences = true,
  ) {
    const category = options.category ?? EmailCategory.TRANSACTIONAL;
    const recipient = await this.resolveRecipient(options, respectPreferences);

    if (!recipient.allowed || !recipient.email) {
      return {
        skipped: true,
        reason: recipient.reason || "recipient_not_found",
      };
    }

    const data = {
      name: recipient.name || recipient.email,
      ...options.data,
    };

    const templateKind = options.templateKind ?? "system";

    let rendered: { bodyHtml: string; subject: string; previewText?: string };
    if (templateKind === "marketing") {
      rendered = this.renderMarketingTemplate({
        template: (options as any).marketingTemplate,
        locale: recipient.locale,
        data,
        previewTextKey: options.previewTextKey,
      });
    } else {
      rendered = await this.renderSystemTemplate({
        template: (options as any).template,
        data,
        locale: recipient.locale,
        subjectKey: (options as any).subjectKey,
        previewTextKey: options.previewTextKey,
      });
    }

    const branding = await this.resolveBranding();
    const unsubscribe = this.buildUnsubscribeLinks(category, recipient.userId);
    const html = this.wrapWithLayout({
      bodyHtml: rendered.bodyHtml,
      branding,
      previewText: rendered.previewText,
      unsubscribeUrl: unsubscribe?.pageUrl,
      locale: recipient.locale,
    });

    return {
      recipient,
      rendered,
      branding,
      unsubscribeUrl: unsubscribe?.pageUrl,
      unsubscribeApiUrl: unsubscribe?.apiUrl,
      html,
      skipped: false,
    };
  }

  /**
   * Send a single email to recipient
   */
  static async send(options: SendEmailOptions): Promise<SendEmailResult> {
    const composed = await this.composeEmail(options, true);

    if (composed.skipped) {
      return composed as SendEmailResult;
    }

    const transporter = this.getTransporter();

    const headers: Record<string, any> = {};
    if (composed.unsubscribeUrl && (composed as any).unsubscribeApiUrl) {
      headers["List-Unsubscribe-Post"] = "List-Unsubscribe=One-Click";
      headers["List-Unsubscribe"] = `<${(composed as any).unsubscribeApiUrl}>`;
    }

    const info = await transporter.sendMail({
      from: ENV.EMAIL_FROM,
      to: (composed.recipient as any).email,
      subject: (composed as any).rendered.subject,
      html: composed.html,
      headers,
    });

    return {
      info,
      html: composed.html,
      subject: (composed as any).rendered.subject,
      skipped: false,
      unsubscribeUrl: composed.unsubscribeUrl,
    };
  }

  static async preview(options: SendEmailOptions): Promise<SendEmailResult> {
    const composed = await this.composeEmail(options, false);
    return {
      html: composed.html,
      subject: (composed as any).rendered?.subject,
      skipped: composed.skipped,
      reason: composed.skipped ? composed.reason : undefined,
      unsubscribeUrl: composed.unsubscribeUrl,
    };
  }

  /**
   * Send email to a known userId
   */
  static async sendToUser(
    userId: string,
    options: Omit<SendEmailOptions, "to" | "userId">,
  ): Promise<SendEmailResult> {
    const user = await UserModel.findById(userId, "email name settings")
      .lean<{ email: string; name?: string | null; settings?: { locale?: string } } | null>();

    if (!user) {
      return { skipped: true, reason: "user_not_found" };
    }

    return this.send({
      ...options,
      to: user.email,
      userId,
      locale: user.settings?.locale || options.locale,
      data: { name: user.name || user.email, ...(options as any).data },
    } as SendEmailOptions);
  }

  static async sendBillingTemplate(
    userId: string,
    templateKey: keyof (typeof emailTemplates)["billing"],
    data: Record<string, any>,
  ) {
    const template = emailTemplates.billing[templateKey];

    return this.sendToUser(userId, {
      template: template.file,
      subjectKey: template.subjectKey,
      previewTextKey: template.previewTextKey,
      category: template.category ?? EmailCategory.BILLING,
      data,
    } as SendEmailOptions);
  }

  /**
   * Broadcast email to selected or all users
   */
  static async broadcast(
    template: string,
    subjectKey: string,
    data?: Record<string, any>,
    userIds?: string[],
    options?: { category?: EmailCategory; previewTextKey?: string },
  ) {
    const category = options?.category ?? EmailCategory.MARKETING;
    const query = userIds?.length
      ? { _id: { $in: userIds } }
      : {};

    const users = await UserModel.find(query, "email settings name").exec();

    const results: Array<{ email: string; success: boolean; reason?: string }> = [];

    for (const user of users) {
      try {
        const result = await this.send({
          to: user.email,
          userId: String(user._id),
          locale: user.settings?.locale || ENV.DEFAULT_LANGUAGE,
          template,
          subjectKey,
          data: { ...data, name: user.name || user.email },
          category,
          previewTextKey: options?.previewTextKey,
        } as SendEmailOptions);

        if (result.skipped) {
          results.push({
            email: user.email,
            success: false,
            reason: result.reason || "skipped",
          });
          continue;
        }

        results.push({ email: user.email, success: true });
      } catch (err: any) {
        results.push({ email: user.email, success: false, reason: err?.message });
      }
    }

    return {
      sent: results.filter((r) => r.success).length,
      total: users.length,
      results,
    };
  }
}
