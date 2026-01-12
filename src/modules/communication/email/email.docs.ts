import { API_CONFIG, apiPath } from "@config/api";

/**
 * =========================
 * Component Schemas (Email)
 * =========================
 */
export const emailSchemas = {
  /**
   * ---------- Requests ----------
   */
  SendEmailRequest: {
    type: "object",
    properties: {
      to: { type: "string", format: "email", example: "user@example.com" },
      userId: { type: "string", example: "64e1a3..." },

      /** system template key (from backend list) */
      template: {
        type: "string",
        example: "billing.paymentSucceededOneTime",
      },

      /** only for marketing templates */
      marketingTemplateId: { type: "string", example: "65a9f2..." },

      subjectKey: {
        type: "string",
        example: "emails.billing.paymentSucceededOneTime.subject",
      },

      category: {
        type: "string",
        enum: ["transactional", "marketing", "billing"],
      },

      locale: { type: "string", example: "en" },

      data: {
        type: "object",
        additionalProperties: true,
        example: {
          userName: "Alex",
          amount: "29.00",
          currency: "USD",
          dashboardUrl: "https://app.example.com",
        },
      },
    },
  },

  BroadcastEmailRequest: {
    type: "object",
    properties: {
      template: {
        type: "string",
        example: "billing.subscriptionRenewed",
      },

      marketingTemplateId: { type: "string" },

      subjectKey: {
        type: "string",
        example: "emails.billing.subscriptionRenewed.subject",
      },

      userIds: {
        type: "array",
        items: { type: "string" },
      },

      category: {
        type: "string",
        enum: ["transactional", "marketing", "billing"],
      },

      data: {
        type: "object",
        additionalProperties: true,
        example: {
          amount: "39.00",
          currency: "USD",
          periodEnd: "2025-02-03",
        },
      },
    },
  },

  /**
   * ---------- Branding ----------
   */
  Branding: {
    type: "object",
    properties: {
      brandName: { type: "string" },
      logoMediaId: { type: "string", nullable: true },
      darkLogoMediaId: { type: "string", nullable: true },
      logoMedia: {
        type: "object",
        nullable: true,
        properties: {
          id: { type: "string" },
          url: { type: "string" },
        },
      },
      darkLogoMedia: {
        type: "object",
        nullable: true,
        properties: {
          id: { type: "string" },
          url: { type: "string" },
        },
      },
      primaryColor: { type: "string" },
      secondaryColor: { type: "string" },
      accentColor: { type: "string" },
      backgroundColor: { type: "string" },
      textColor: { type: "string" },
      supportEmail: { type: "string" },
      headerHtml: { type: "string" },
      footerHtml: { type: "string" },
    },
  },

  /**
   * ---------- Templates ----------
   */
  SystemTemplate: {
    type: "object",
    properties: {
      key: {
        type: "string",
        example: "billing.paymentSucceededOneTime",
      },
      file: {
        type: "string",
        example: "billing/paymentOneTimeSuccess",
      },
      category: {
        type: "string",
        enum: ["transactional", "marketing", "billing"],
      },
      subject: { type: "string" },
      previewText: { type: "string" },
      group: { type: "string", example: "auth" },
      previewData: {
        type: "object",
        additionalProperties: true,
        example: {
          userName: "Alex",
          amount: "29.00",
          currency: "USD",
        },
      },
      type: {
        type: "string",
        enum: ["system"],
      },
    },
  },

  MarketingTemplate: {
    type: "object",
    properties: {
      id: { type: "string" },
      name: { type: "string" },
      description: { type: "string" },
      subjectKey: { type: "string" },
      translations: { type: "object", additionalProperties: true },
      previewData: { type: "object", additionalProperties: true },
      locales: {
        type: "array",
        items: { type: "string" },
      },
      type: {
        type: "string",
        enum: ["marketing"],
      },
    },
  },

  CreateMarketingTemplateRequest: {
    type: "object",
    required: ["name", "subjectKey", "translations", "hbs"],
    properties: {
      name: { type: "string" },
      description: { type: "string" },
      subjectKey: { type: "string" },
      translations: { type: "object", additionalProperties: true },
      hbs: { type: "string" },
      previewData: { type: "object", additionalProperties: true },
    },
  },

  UpdateMarketingTemplateRequest: {
    type: "object",
    properties: {
      name: { type: "string" },
      description: { type: "string" },
      subjectKey: { type: "string" },
      translations: { type: "object", additionalProperties: true },
      hbs: { type: "string" },
      previewData: { type: "object", additionalProperties: true },
    },
  },

  TemplatePreviewRequest: {
    type: "object",
    required: ["template"],
    properties: {
      template: {
        type: "string",
        example: "billing.paymentSucceededOneTime",
      },
      data: {
        type: "object",
        additionalProperties: true,
      },
      locale: { type: "string", example: "en" },
    },
  },

  MarketingPreviewRequest: {
    type: "object",
    properties: {
      data: { type: "object", additionalProperties: true },
      locale: { type: "string", example: "en" },
    },
  },

  MarketingDraftPreviewRequest: {
    type: "object",
    required: ["name", "subjectKey", "translations", "hbs"],
    properties: {
      name: { type: "string" },
      description: { type: "string" },
      subjectKey: { type: "string" },
      translations: { type: "object", additionalProperties: true },
      hbs: { type: "string" },
      previewData: { type: "object", additionalProperties: true },
      data: { type: "object", additionalProperties: true },
      locale: { type: "string", example: "en" },
    },
  },

  /**
   * ---------- Responses ----------
   */
  TemplateListResponse: {
    type: "object",
    properties: {
      branding: { $ref: "#/components/schemas/Branding" },
      systemTemplates: {
        type: "array",
        items: { $ref: "#/components/schemas/SystemTemplate" },
      },
      marketingTemplates: {
        type: "array",
        items: { $ref: "#/components/schemas/MarketingTemplate" },
      },
    },
  },

  UnsubscribePreferences: {
    type: "object",
    properties: {
      email: { type: "string" },
      name: { type: "string" },
      preferences: {
        type: "object",
        properties: {
          marketing: { type: "boolean" },
          billing: { type: "boolean" },
        },
      },
      categories: {
        type: "array",
        items: { type: "string" },
      },
    },
  },

  UpdatePreferencesRequest: {
    type: "object",
    properties: {
      marketing: { type: "boolean" },
      billing: { type: "boolean" },
    },
  },

  EmailResponse: {
    type: "object",
    properties: {
      success: { type: "boolean", example: true },
      message: { type: "string" },
      data: { type: "object", additionalProperties: true },
    },
  },
} as const;

/**
 * =========================
 * Paths
 * =========================
 */
export const emailPaths = {
  [apiPath(`${API_CONFIG.ROUTES.EMAIL}/send`)]: {
    post: {
      tags: ["Email"],
      summary: "Send a single email",
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/SendEmailRequest" },
          },
        },
      },
      responses: {
        "200": {
          description: "Email sent",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/EmailResponse" },
            },
          },
        },
      },
    },
  },

  [apiPath(`${API_CONFIG.ROUTES.EMAIL}/broadcast`)]: {
    post: {
      tags: ["Email"],
      summary: "Broadcast email",
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/BroadcastEmailRequest" },
          },
        },
      },
      responses: {
        "200": {
          description: "Broadcast completed",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/EmailResponse" },
            },
          },
        },
      },
    },
  },

  [apiPath(`${API_CONFIG.ROUTES.EMAIL}/branding`)]: {
    get: {
      tags: ["Email"],
      summary: "Get email branding",
      responses: {
        "200": {
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/Branding" },
            },
          },
        },
      },
    },
    put: {
      tags: ["Email"],
      summary: "Update email branding",
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/Branding" },
          },
        },
      },
      responses: { "200": { description: "Updated" } },
    },
  },

  [apiPath(`${API_CONFIG.ROUTES.EMAIL}/templates`)]: {
    get: {
      tags: ["Email"],
      summary: "List all templates (system + marketing)",
      responses: {
        "200": {
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/TemplateListResponse" },
            },
          },
        },
      },
    },
  },

  [apiPath(`${API_CONFIG.ROUTES.EMAIL}/templates/preview`)]: {
    post: {
      tags: ["Email"],
      summary: "Preview system template",
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/TemplatePreviewRequest" },
          },
        },
      },
      responses: { "200": { description: "Preview rendered" } },
    },
  },

  [apiPath(`${API_CONFIG.ROUTES.EMAIL}/marketing/{id}/preview`)]: {
    post: {
      tags: ["Email"],
      summary: "Preview marketing template",
      parameters: [
        { in: "path", name: "id", required: true, schema: { type: "string" } },
      ],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/MarketingPreviewRequest" },
          },
        },
      },
      responses: { "200": { description: "Preview rendered" } },
    },
  },

  [apiPath(`${API_CONFIG.ROUTES.EMAIL}/marketing/preview`)]: {
    post: {
      tags: ["Email"],
      summary: "Preview marketing template draft",
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/MarketingDraftPreviewRequest" },
          },
        },
      },
      responses: { "200": { description: "Preview rendered" } },
    },
  },

  [apiPath(`${API_CONFIG.ROUTES.EMAIL}/unsubscribe/{token}`)]: {
    get: {
      tags: ["Email"],
      summary: "Get unsubscribe preferences",
      parameters: [
        {
          in: "path",
          name: "token",
          required: true,
          schema: { type: "string" },
        },
      ],
      responses: {
        "200": {
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/UnsubscribePreferences" },
            },
          },
        },
      },
    },
    post: {
      tags: ["Email"],
      summary: "Update unsubscribe preferences",
      parameters: [
        {
          in: "path",
          name: "token",
          required: true,
          schema: { type: "string" },
        },
      ],
      requestBody: {
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/UpdatePreferencesRequest" },
          },
        },
      },
      responses: { "200": { description: "Updated" } },
    },
  },
} as const;

/**
 * =========================
 * Tags
 * =========================
 */
export const emailTags = [
  {
    name: "Email",
    description:
      "Email templates, branding, previews, sending and unsubscribe management",
  },
];
