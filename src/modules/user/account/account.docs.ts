import { API_CONFIG, apiPath } from "@config/api";

export const accountSchemas = {
  AuthProvider: {
    type: "object",
    properties: {
      provider: { type: "string", example: "google" },
      providerId: { type: "string", example: "1134567890" },
      email: { type: "string", example: "user@example.com" },
      addedAt: { type: "string", format: "date-time" },
      lastUsedAt: { type: "string", format: "date-time" },
    },
  },
  AccountMeResponse: {
    type: "object",
    properties: {
      _id: { type: "string" },
      email: { type: "string", example: "user@example.com" },
      name: { type: "string", example: "Alex" },
      birthday: { type: "string", format: "date", nullable: true },
      phone: { type: "string", example: "+12025550123", nullable: true },
      country: { type: "string", example: "PL", nullable: true },
      timezone: { type: "string", example: "Europe/Warsaw", nullable: true },
      authProviders: {
        type: "array",
        items: { $ref: "#/components/schemas/AuthProvider" },
      },
      emailVerified: { type: "boolean", example: false },
      hasPassword: { type: "boolean", example: true },
      enabledAuthProviders: {
        type: "array",
        items: { type: "string" },
        example: ["email", "google", "apple", "github"],
      },
    },
  },
  UpdateAccountProfileRequest: {
    type: "object",
    properties: {
      birthday: { type: "string", format: "date" },
      phone: { type: "string", example: "+12025550123" },
      country: { type: "string", example: "PL" },
      timezone: { type: "string", example: "Europe/Warsaw" },
    },
  },
  OAuthLinkRequest: {
    type: "object",
    properties: {
      provider: { type: "string", example: "google" },
      idToken: { type: "string", example: "eyJhbGciOi..." },
      code: { type: "string", example: "4/0AdLk..." },
      redirect_uri: { type: "string", example: "https://app.example.com/auth/callback" },
      code_verifier: { type: "string", example: "pkce_verifier" },
    },
  },
  EmailStartRequest: {
    type: "object",
    properties: { email: { type: "string", example: "user@example.com" } },
    required: ["email"],
  },
  EmailConfirmRequest: {
    type: "object",
    properties: {
      email: { type: "string", example: "user@example.com" },
      code: { type: "string", example: "123456" },
    },
    required: ["email", "code"],
  },
  PasswordSetRequest: {
    type: "object",
    properties: { newPassword: { type: "string", example: "P@ssw0rd!" } },
    required: ["newPassword"],
  },
  VerificationConfirmRequest: {
    type: "object",
    properties: { code: { type: "string", example: "123456" } },
    required: ["code"],
  },
  PasswordChangeRequest: {
    type: "object",
    properties: {
      currentPassword: { type: "string", example: "OldP@ssw0rd!" },
      newPassword: { type: "string", example: "NewP@ssw0rd!" },
    },
    required: ["currentPassword", "newPassword"],
  },
  EmailChangeStartRequest: {
    type: "object",
    properties: { newEmail: { type: "string", example: "new@example.com" } },
    required: ["newEmail"],
  },
  EmailChangeConfirmRequest: {
    type: "object",
    properties: {
      newEmail: { type: "string", example: "new@example.com" },
      code: { type: "string", example: "123456" },
    },
    required: ["newEmail", "code"],
  },
};

export const accountPaths = {
  [apiPath(`${API_CONFIG.ROUTES.ACCOUNT}/me`)]: {
    get: {
      summary: "Get account profile",
      tags: ["Account"],
      responses: {
        "200": {
          description: "Account profile",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/AccountMeResponse" },
            },
          },
        },
      },
    },
  },
  [apiPath(`${API_CONFIG.ROUTES.ACCOUNT}/profile`)]: {
    patch: {
      summary: "Update account profile",
      tags: ["Account"],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/UpdateAccountProfileRequest" },
          },
        },
      },
      responses: { "200": { description: "Profile updated" } },
    },
  },
  [apiPath(`${API_CONFIG.ROUTES.ACCOUNT}/providers/oauth/link`)]: {
    post: {
      summary: "Link OAuth provider",
      tags: ["Account"],
      requestBody: {
        required: true,
        content: {
          "application/json": { schema: { $ref: "#/components/schemas/OAuthLinkRequest" } },
        },
      },
      responses: { "200": { description: "Provider linked" } },
    },
  },
  [apiPath(`${API_CONFIG.ROUTES.ACCOUNT}/providers/{provider}`)]: {
    delete: {
      summary: "Unlink provider",
      tags: ["Account"],
      parameters: [
        {
          name: "provider",
          in: "path",
          required: true,
          schema: { type: "string", enum: ["email", "google", "apple", "github"] },
        },
      ],
      responses: { "200": { description: "Provider unlinked" } },
    },
  },
  [apiPath(`${API_CONFIG.ROUTES.ACCOUNT}/providers/email/start`)]: {
    post: {
      summary: "Start email provider link",
      tags: ["Account"],
      requestBody: {
        required: true,
        content: {
          "application/json": { schema: { $ref: "#/components/schemas/EmailStartRequest" } },
        },
      },
      responses: { "200": { description: "Code sent" } },
    },
  },
  [apiPath(`${API_CONFIG.ROUTES.ACCOUNT}/providers/email/confirm`)]: {
    post: {
      summary: "Confirm email provider link",
      tags: ["Account"],
      requestBody: {
        required: true,
        content: {
          "application/json": { schema: { $ref: "#/components/schemas/EmailConfirmRequest" } },
        },
      },
      responses: { "200": { description: "Email linked" } },
    },
  },
  [apiPath(`${API_CONFIG.ROUTES.ACCOUNT}/password/set`)]: {
    post: {
      summary: "Set password for email provider",
      tags: ["Account"],
      requestBody: {
        required: true,
        content: {
          "application/json": { schema: { $ref: "#/components/schemas/PasswordSetRequest" } },
        },
      },
      responses: { "200": { description: "Password set" } },
    },
  },
  [apiPath(`${API_CONFIG.ROUTES.ACCOUNT}/password/change`)]: {
    post: {
      summary: "Change password",
      tags: ["Account"],
      requestBody: {
        required: true,
        content: {
          "application/json": { schema: { $ref: "#/components/schemas/PasswordChangeRequest" } },
        },
      },
      responses: { "200": { description: "Password changed" } },
    },
  },
  [apiPath(`${API_CONFIG.ROUTES.ACCOUNT}/email/verification/send`)]: {
    post: {
      summary: "Send email verification code",
      tags: ["Account"],
      responses: { "200": { description: "Verification code sent" } },
    },
  },
  [apiPath(`${API_CONFIG.ROUTES.ACCOUNT}/email/verification/confirm`)]: {
    post: {
      summary: "Confirm email verification",
      tags: ["Account"],
      requestBody: {
        required: true,
        content: {
          "application/json": { schema: { $ref: "#/components/schemas/VerificationConfirmRequest" } },
        },
      },
      responses: { "200": { description: "Email verified" } },
    },
  },
  [apiPath(`${API_CONFIG.ROUTES.ACCOUNT}/email/change/start`)]: {
    post: {
      summary: "Start email change",
      tags: ["Account"],
      requestBody: {
        required: true,
        content: {
          "application/json": { schema: { $ref: "#/components/schemas/EmailChangeStartRequest" } },
        },
      },
      responses: { "200": { description: "Change email code sent" } },
    },
  },
  [apiPath(`${API_CONFIG.ROUTES.ACCOUNT}/email/change/confirm`)]: {
    post: {
      summary: "Confirm email change",
      tags: ["Account"],
      requestBody: {
        required: true,
        content: {
          "application/json": { schema: { $ref: "#/components/schemas/EmailChangeConfirmRequest" } },
        },
      },
      responses: { "200": { description: "Email changed" } },
    },
  },
  [apiPath(`${API_CONFIG.ROUTES.ACCOUNT}`)]: {
    delete: {
      summary: "Schedule account deletion",
      tags: ["Account"],
      responses: { "202": { description: "Deletion scheduled" } },
    },
  },
};

export const accountTags = [
  { name: "Account", description: "Account management and security flows" },
];
