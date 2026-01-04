// comments only in English
import { API_CONFIG, apiPath } from "@config/api";
import { AUTH_PROVIDER_KEYS } from "@constants/auth/providers";

/**
 * Component Schemas for Auth
 */
export const authSchemas = {
  // Generic success envelope with arbitrary data payload
  SuccessEnvelopeData: {
    type: "object",
    properties: {
      success: { type: "boolean", example: true },
      message: { type: "string", nullable: true, example: "OK" },
      data: { type: "object" },
    },
    required: ["success", "data"],
  },

  // Success envelope when only a message is returned (data is null)
  SuccessEnvelopeMessageOnly: {
    type: "object",
    properties: {
      success: { type: "boolean", example: true },
      message: {
        type: "string",
        example: "A password reset link has been sent to your email.",
      },
      data: { type: "null", example: null },
    },
    required: ["success", "data"],
  },

  // Error envelope used by errorResponse()
  ErrorEnvelope: {
    type: "object",
    properties: {
      success: { type: "boolean", example: false },
      message: {
        type: "string",
        example: "User with email user@example.com not found",
      },
      errors: { type: "object", nullable: true },
    },
    required: ["success", "message"],
  },

  // Accept either idToken or code. code_verifier for PKCE. redirect_uri is optional override for token exchange.
  OauthLoginRequest: {
    type: "object",
    oneOf: [{ required: ["idToken"] }, { required: ["code"] }],
    properties: {
      idToken: {
        type: "string",
        description: "OIDC id_token from provider (e.g., Google One Tap).",
        example: "eyJhbGciOi...",
      },
      code: {
        type: "string",
        description: "Authorization code from provider.",
        example: "4/0AdLk...xyz",
      },
      code_verifier: {
        type: "string",
        description: "PKCE code_verifier if used.",
        minLength: 43,
        maxLength: 128,
      },
      redirect_uri: {
        type: "string",
        description:
          "Exact redirect_uri used during provider authorization if override is required.",
        example: "https://api.example.com/api/auth/oauth/google/callback",
      },
      locale: {
        type: "string",
        description: "Optional user locale/language.",
        example: "en",
      },
      theme: {
        type: "string",
        description:
          "Optional UI theme preference to store during registration (e.g., dark, light, system).",
        example: "dark",
      },
      intent: {
        type: "string",
        enum: ["login", "register"],
        nullable: true,
        description:
          "OAuth flow mode. Use 'login' for sign-in and 'register' for sign-up. Defaults to 'login' if omitted.",
        example: "login",
      },
    },
  },

  // Callback GET query schema (doc-only)
  OauthCallbackGetQuery: {
    type: "object",
    required: ["code"],
    properties: {
      code: { type: "string", example: "4/0AdLk...xyz" },
      state: { type: "string", example: "eyJ...base64url" },
      redirect: {
        type: "string",
        description:
          "Final front-end URL. Must be whitelisted in OAUTH_ALLOWED_REDIRECTS.",
        example: "https://app.example.com/auth/callback",
      },
      redirect_uri: {
        type: "string",
        description: "Optional exact redirect_uri for token exchange.",
      },
      intent: {
        type: "string",
        enum: ["login", "register"],
        nullable: true,
        description:
          "OAuth flow mode. The server may use it to distinguish login vs register behavior.",
        example: "login",
      },
      theme: {
        type: "string",
        description:
          "Optional UI theme preference to persist on newly created accounts (light, dark, system).",
        example: "dark",
      },
    },
  },

  // Callback POST body schema (doc-only, e.g., Apple form_post)
  OauthCallbackPostBody: {
    type: "object",
    required: ["code"],
    properties: {
      code: { type: "string", example: "4/0AdLk...xyz" },
      state: { type: "string", example: "eyJ...base64url" },
      redirect: {
        type: "string",
        description:
          "Final front-end URL. Must be whitelisted in OAUTH_ALLOWED_REDIRECTS.",
        example: "https://app.example.com/auth/callback",
      },
      redirect_uri: {
        type: "string",
        description: "Optional exact redirect_uri for token exchange.",
      },
      intent: {
        type: "string",
        enum: ["login", "register"],
        nullable: true,
        description:
          "OAuth flow mode. The server may use it to distinguish login vs register behavior.",
        example: "register",
      },
      theme: {
        type: "string",
        description:
          "Optional UI theme preference to persist on newly created accounts (light, dark, system).",
        example: "dark",
      },
    },
  },

  // Recursive boolean permission tree.
  PermissionTreeBoolean: {
    type: "object",
    description:
      "Full permission tree mirroring permissionKeys. Each leaf is boolean.",
    additionalProperties: {
      oneOf: [
        { type: "boolean" },
        { $ref: "#/components/schemas/PermissionTreeBoolean" },
      ],
    },
    example: {
      users: {
        any: { view: false, edit: false, delete: false },
        own: { view: true, edit: true, delete: false },
      },
      landings: {
        create: true,
        any: { view: false, edit: false, delete: false },
        own: { view: true, edit: true, delete: true },
      },
      feedback: { view: true },
      email: { one: false, broadcast: false },
    },
  },

  // Auth payload to embed into the success envelope's data field
  AuthPayload: {
    type: "object",
    properties: {
      accessToken: { type: "string", example: "eyJhbGciOi..." },
      user: {
        type: "object",
        description: "Full user object (excluding password) with permissions.",
        properties: {
          id: { type: "string", example: "665f1d0b6a98b2d5e1f4f123" },
          email: { type: "string", example: "user@example.com" },
          name: { type: "string", example: "Jane Doe" },
          avatar: {
            type: "object",
            nullable: true,
            description: "Avatar media object (id, meta, url)",
            properties: {
              id: { type: "string", example: "677fd83d9d2b8f2c44f3fe99" },
              filename: { type: "string", example: "avatar.png" },
              mimeType: { type: "string", example: "image/png" },
              size: { type: "integer", example: 34567 },
              url: {
                type: "string",
                example: "https://b2.example.com/bucket/avatar.png",
              },
              createdAt: { type: "string", format: "date-time" },
              updatedAt: { type: "string", format: "date-time" },
            },
          },
          role: {
            type: "object",
            properties: {
              key: { type: "string", example: "user" },
              name: { type: "string", example: "roles.user.name" },
            },
          },
          plan: { type: "string", nullable: true, example: "basic" },
          locale: { type: "string", example: "en" },
          authProviders: {
            type: "array",
            items: {
              type: "object",
              properties: {
                provider: { type: "string", example: "google" },
                providerId: { type: "string", example: "1234567890" },
              },
            },
          },
          settings: { type: "object" },
          permissions: { $ref: "#/components/schemas/PermissionTreeBoolean" },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
        },
      },
    },
    example: {
      accessToken: "eyJhbGciOi...",
      user: {
        id: "665f1d0b6a98b2d5e1f4f123",
        email: "user@example.com",
        name: "Jane Doe",
        avatar: {
          id: "677fd83d9d2b8f2c44f3fe99",
          filename: "avatar.png",
          mimeType: "image/png",
          size: 34567,
          url: "https://b2.example.com/bucket/avatar.png",
          createdAt: "2025-01-01T00:00:00.000Z",
          updatedAt: "2025-01-01T00:00:00.000Z",
        },
        role: {
          key: "user",
          name: "roles.user.name",
        },
        plan: "pro",
        locale: "en",
        authProviders: [{ provider: "google", providerId: "1234567890" }],
        settings: {},
        permissions: {
          users: {
            any: { view: false, edit: false, delete: false },
            own: { view: true, edit: true, delete: true },
          },
          landings: {
            create: true,
            any: { view: false, edit: false, delete: false },
            own: { view: true, edit: true, delete: true },
          },
          feedback: { view: true },
          email: { one: false, broadcast: false },
        },
        createdAt: "2025-01-01T00:00:00.000Z",
        updatedAt: "2025-01-01T00:00:00.000Z",
      },
    },
  },

    RegisterRequest: {
      type: "object",
      required: ["email", "password"],
      properties: {
        email: { type: "string", format: "email", example: "user@example.com" },
        password: { type: "string", minLength: 8, example: "P@ssw0rd!" },
        name: { type: "string", example: "Jane Doe" },
        locale: { type: "string", example: "en" },
        theme: {
          type: "string",
          description: "Optional UI theme preference (light, dark, system).",
          example: "dark",
        },
        avatar: {
          type: "string",
          nullable: true,
          description:
            "Optional existing media ID for the avatar (if already uploaded via /media)",
        },
        avatarUrl: {
          type: "string",
          format: "uri",
          description: "Direct image URL to import as avatar during registration",
          example: "https://example.com/avatar.png",
        },
      },
    },

    RegisterMultipartRequest: {
      type: "object",
      required: ["email", "password"],
      properties: {
        email: { type: "string", format: "email", example: "user@example.com" },
        password: { type: "string", minLength: 8, example: "P@ssw0rd!" },
        name: { type: "string", example: "Jane Doe" },
        locale: { type: "string", example: "en" },
        theme: {
          type: "string",
          description: "Optional UI theme preference (light, dark, system).",
          example: "dark",
        },
        avatarUrl: {
          type: "string",
          format: "uri",
          description: "Direct image URL to import as avatar during registration",
          example: "https://example.com/avatar.png",
        },
        avatar: {
          type: "string",
          format: "binary",
          description: "Avatar file to be stored as media during registration",
        },
      },
    },

  LoginRequest: {
    type: "object",
    required: ["email", "password"],
    properties: {
      email: { type: "string", format: "email", example: "user@example.com" },
      password: { type: "string", example: "P@ssw0rd!" },
    },
  },

  RefreshRequest: {
    type: "object",
    properties: {
      refreshToken: {
        type: "string",
        description:
          "Optional fallback if cookie is not available. Prefer HttpOnly cookie 'rt'.",
      },
    },
  },

  // Refresh returns only accessToken inside envelope->data
  RefreshPayload: {
    type: "object",
    properties: {
      accessToken: { type: "string", example: "eyJhbGciOi..." },
    },
  },

  ForgotPasswordRequest: {
    type: "object",
    required: ["email"],
    properties: {
      email: { type: "string", format: "email", example: "user@example.com" },
    },
  },

  ResetPasswordRequest: {
    type: "object",
    required: ["token", "newPassword"],
    properties: {
      token: { type: "string", example: "a1b2c3..." },
      newPassword: { type: "string", example: "NewP@ssw0rd!" },
    },
  },

  // Authorize response with redirect URL to provider
  OauthAuthorizeResponse: {
    type: "object",
    properties: {
      url: {
        type: "string",
        example: "https://accounts.google.com/o/oauth2/v2/auth?...",
      },
    },
  },
} as const;

/**
 * Paths for Auth
 */
export const authPaths = {
  // Start OAuth code flow
  [apiPath(`${API_CONFIG.ROUTES.AUTH}/oauth/{provider}/authorize`)]: {
    get: {
      tags: ["Auth"],
      summary: "Build provider authorization URL",
      parameters: [
        {
          name: "provider",
          in: "path",
          required: true,
          schema: {
            type: "string",
            enum: AUTH_PROVIDER_KEYS.filter((e) => e !== "local"),
          },
          description: "OAuth provider",
        },
        {
          name: "redirect",
          in: "query",
          required: false,
          schema: { type: "string" },
        },
        {
          name: "state",
          in: "query",
          required: false,
          schema: { type: "string" },
        },
        {
          name: "intent",
          in: "query",
          required: false,
          schema: {
            type: "string",
            enum: ["login", "register"],
          },
          description:
            "OAuth flow mode. Use 'login' for sign-in and 'register' for sign-up.",
        },
        {
          name: "scope",
          in: "query",
          required: false,
          schema: { type: "string" },
        },
        {
          name: "code_challenge",
          in: "query",
          required: false,
          schema: { type: "string" },
        },
        {
          name: "code_challenge_method",
          in: "query",
          required: false,
          schema: { type: "string", enum: ["S256", "plain"] },
        },
        {
          name: "prompt",
          in: "query",
          required: false,
          schema: { type: "string" },
        },
        {
          name: "access_type",
          in: "query",
          required: false,
          schema: { type: "string", enum: ["online", "offline"] },
        },
      ],
      responses: {
        "200": {
          description: "Provider authorization URL",
          content: {
            "application/json": {
              schema: {
                allOf: [
                  { $ref: "#/components/schemas/SuccessEnvelopeData" },
                  // place 'url' under data
                  {
                    properties: {
                      data: {
                        $ref: "#/components/schemas/OauthAuthorizeResponse",
                      },
                    },
                  },
                ],
              },
              examples: {
                ok: {
                  value: {
                    success: true,
                    message: null,
                    data: { url: "https://..." },
                  },
                },
              },
            },
          },
        },
        "400": {
          description: "Validation error",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ErrorEnvelope" },
            },
          },
        },
      },
    },
  },

  // OAuth callback: GET
  [apiPath(`${API_CONFIG.ROUTES.AUTH}/oauth/{provider}/callback`)]: {
    get: {
      tags: ["Auth"],
      summary: "OAuth callback (GET, e.g., Google/GitHub)",
      parameters: [
        {
          name: "provider",
          in: "path",
          required: true,
          schema: {
            type: "string",
            enum: AUTH_PROVIDER_KEYS.filter((e) => e !== "local"),
          },
          description: "OAuth provider",
        },
        {
          name: "code",
          in: "query",
          required: true,
          schema: { type: "string" },
        },
        {
          name: "state",
          in: "query",
          required: false,
          schema: { type: "string" },
        },
        {
          name: "redirect",
          in: "query",
          required: false,
          schema: { type: "string" },
        },
        {
          name: "redirect_uri",
          in: "query",
          required: false,
          schema: { type: "string" },
        },
        {
          name: "intent",
          in: "query",
          required: false,
          schema: {
            type: "string",
            enum: ["login", "register"],
          },
          description:
            "OAuth flow mode. Matches the original intent used to start the flow.",
        },
      ],
      responses: {
        "200": {
          description: "Fallback JSON when no safe redirect was provided",
          headers: {
            "Set-Cookie": {
              schema: { type: "string" },
              description: "HttpOnly refresh token cookie 'rt'",
            },
          },
          content: {
            "application/json": {
              schema: {
                allOf: [
                  { $ref: "#/components/schemas/SuccessEnvelopeData" },
                  {
                    properties: {
                      data: { $ref: "#/components/schemas/AuthPayload" },
                    },
                  },
                ],
              },
            },
          },
        },
        "302": { description: "Redirect to the front-end callback URL" },
        "400": {
          description: "Validation error",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ErrorEnvelope" },
            },
          },
        },
        "401": {
          description: "Invalid or expired code",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ErrorEnvelope" },
            },
          },
        },
      },
    },

    // OAuth callback: POST (Apple form_post)
    post: {
      tags: ["Auth"],
      summary: "OAuth callback (POST, e.g., Apple form_post)",
      requestBody: {
        required: true,
        content: {
          "application/x-www-form-urlencoded": {
            schema: { $ref: "#/components/schemas/OauthCallbackPostBody" },
          },
          "application/json": {
            schema: { $ref: "#/components/schemas/OauthCallbackPostBody" },
          },
        },
      },
      parameters: [
        {
          name: "provider",
          in: "path",
          required: true,
          schema: {
            type: "string",
            enum: AUTH_PROVIDER_KEYS.filter((e) => e !== "local"),
          },
          description: "OAuth provider",
        },
      ],
      responses: {
        "200": {
          description: "Fallback JSON when no safe redirect was provided",
          headers: {
            "Set-Cookie": {
              schema: { type: "string" },
              description: "HttpOnly refresh token cookie 'rt'",
            },
          },
          content: {
            "application/json": {
              schema: {
                allOf: [
                  { $ref: "#/components/schemas/SuccessEnvelopeData" },
                  {
                    properties: {
                      data: { $ref: "#/components/schemas/AuthPayload" },
                    },
                  },
                ],
              },
            },
          },
        },
        "302": { description: "Redirect to the front-end callback URL" },
        "400": {
          description: "Validation error",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ErrorEnvelope" },
            },
          },
        },
        "401": {
          description: "Invalid or expired code",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ErrorEnvelope" },
            },
          },
        },
      },
    },
  },

  // SPA direct OAuth post (code or idToken)
  [apiPath(`${API_CONFIG.ROUTES.AUTH}/oauth/{provider}`)]: {
    post: {
      tags: ["Auth"],
      summary: "OAuth login (SPA direct): send idToken or code",
      parameters: [
        {
          name: "provider",
          in: "path",
          required: true,
          schema: {
            type: "string",
            enum: AUTH_PROVIDER_KEYS.filter((e) => e !== "local"),
          },
          description: "OAuth provider",
        },
      ],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/OauthLoginRequest" },
          },
        },
      },
      responses: {
        "200": {
          description: "Logged in via OAuth",
          headers: {
            "Set-Cookie": {
              schema: { type: "string" },
              description: "HttpOnly refresh token cookie 'rt'",
            },
          },
          content: {
            "application/json": {
              schema: {
                allOf: [
                  { $ref: "#/components/schemas/SuccessEnvelopeData" },
                  {
                    properties: {
                      data: { $ref: "#/components/schemas/AuthPayload" },
                    },
                  },
                ],
              },
            },
          },
        },
        "400": {
          description: "Validation error",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ErrorEnvelope" },
            },
          },
        },
        "401": {
          description: "Invalid token or code",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ErrorEnvelope" },
            },
          },
        },
      },
    },
  },

  [apiPath(`${API_CONFIG.ROUTES.AUTH}/register`)]: {
    post: {
      tags: ["Auth"],
      summary:
        "Register a new user, optionally upload/import avatar, and return tokens",
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/RegisterRequest" },
          },
          "multipart/form-data": {
            schema: { $ref: "#/components/schemas/RegisterMultipartRequest" },
          },
        },
      },
      responses: {
        "201": {
          description: "User created and authenticated",
          headers: {
            "Set-Cookie": {
              schema: { type: "string" },
              description: "HttpOnly refresh token cookie 'rt'",
            },
          },
          content: {
            "application/json": {
              schema: {
                allOf: [
                  { $ref: "#/components/schemas/SuccessEnvelopeData" },
                  {
                    properties: {
                      data: { $ref: "#/components/schemas/AuthPayload" },
                    },
                  },
                ],
              },
            },
          },
        },
        "409": {
          description: "Email already exists",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ErrorEnvelope" },
            },
          },
        },
        "400": {
          description: "Validation error",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ErrorEnvelope" },
            },
          },
        },
      },
    },
  },

  [apiPath(`${API_CONFIG.ROUTES.AUTH}/login`)]: {
    post: {
      tags: ["Auth"],
      summary: "Login and receive tokens",
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/LoginRequest" },
          },
        },
      },
      responses: {
        "200": {
          description: "Logged in",
          headers: {
            "Set-Cookie": {
              schema: { type: "string" },
              description: "HttpOnly refresh token cookie 'rt'",
            },
          },
          content: {
            "application/json": {
              schema: {
                allOf: [
                  { $ref: "#/components/schemas/SuccessEnvelopeData" },
                  {
                    properties: {
                      data: { $ref: "#/components/schemas/AuthPayload" },
                    },
                  },
                ],
              },
            },
          },
        },
        "401": {
          description: "Invalid credentials",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ErrorEnvelope" },
            },
          },
        },
        "400": {
          description: "Validation error",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ErrorEnvelope" },
            },
          },
        },
      },
    },
  },

  [apiPath(`${API_CONFIG.ROUTES.AUTH}/refresh`)]: {
    post: {
      tags: ["Auth"],
      summary:
        "Refresh access token (reads HttpOnly cookie 'rt'; body.refreshToken is optional fallback)",
      requestBody: {
        required: false,
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/RefreshRequest" },
          },
        },
      },
      responses: {
        "200": {
          description: "New access token issued",
          headers: {
            "Set-Cookie": {
              schema: { type: "string" },
              description: "HttpOnly refresh token cookie 'rt' rotated",
            },
          },
          content: {
            "application/json": {
              schema: {
                allOf: [
                  { $ref: "#/components/schemas/SuccessEnvelopeData" },
                  {
                    properties: {
                      data: { $ref: "#/components/schemas/RefreshPayload" },
                    },
                  },
                ],
              },
              examples: {
                ok: {
                  value: {
                    success: true,
                    message: null,
                    data: { accessToken: "eyJ..." },
                  },
                },
              },
            },
          },
        },
        "401": {
          description: "Missing or invalid refresh token",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ErrorEnvelope" },
            },
          },
        },
      },
    },
  },

  [apiPath(`${API_CONFIG.ROUTES.AUTH}/logout`)]: {
    post: {
      tags: ["Auth"],
      summary: "Logout and revoke refresh session",
      responses: { "204": { description: "No Content" } },
    },
  },

  // Forgot password: now uses successResponse/errorResponse envelope
  [apiPath(`${API_CONFIG.ROUTES.AUTH}/forgot-password`)]: {
    post: {
      tags: ["Auth"],
      summary: "Send password reset email",
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/ForgotPasswordRequest" },
          },
        },
      },
      responses: {
        "200": {
          description: "Reset email sent",
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/SuccessEnvelopeMessageOnly",
              },
              examples: {
                success: {
                  value: {
                    success: true,
                    message:
                      "A password reset link has been sent to your email.",
                    data: null,
                  },
                },
              },
            },
          },
        },
        "400": {
          description: "Account uses OAuth only; password reset unavailable",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ErrorEnvelope" },
            },
          },
        },
        "401": {
          description: "User with such email not found",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ErrorEnvelope" },
            },
          },
        },
        "429": {
          description: "Too many reset requests",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ErrorEnvelope" },
            },
          },
        },
      },
    },
  },

  [apiPath(`${API_CONFIG.ROUTES.AUTH}/reset-password`)]: {
    post: {
      tags: ["Auth"],
      summary: "Reset password using emailed token",
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/ResetPasswordRequest" },
          },
        },
      },
      responses: {
        "200": {
          description: "Password reset OK",
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/SuccessEnvelopeMessageOnly",
              },
              examples: {
                success: {
                  value: {
                    success: true,
                    message: "Password updated successfully.",
                    data: null,
                  },
                },
              },
            },
          },
        },
        "400": {
          description: "Invalid or expired token",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ErrorEnvelope" },
            },
          },
        },
      },
    },
  },
} as const;

/**
 * Optional: tag metadata
 */
export const authTags = [
  { name: "Auth", description: "Authentication and token management" },
];
