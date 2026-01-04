import { API_CONFIG, apiPath } from "@config/api";

/**
 * Component Schemas for User
 */
export const userSchemas = {
  UserSettings: {
    type: "object",
    properties: {
      theme: {
        type: "string",
        example: "system",
      },
      locale: {
        type: "string",
        enum: ["ru", "en"],
        example: "ru",
      },
      emailPreferences: {
        type: "object",
        properties: {
          marketing: { type: "boolean", example: true },
          billing: { type: "boolean", example: true },
        },
      },
    },
  },

  UserResponseBase: {
    type: "object",
    properties: {
      id: { type: "string", example: "665f..." },
      email: { type: "string" },
      role: {
        type: "object",
        properties: {
          key: { type: "string", example: "user" },
          name: { type: "string", example: "roles.user.name" },
        },
      },
      plan: { type: "string" },
      name: { type: "string" },
      avatar: {
        type: "object",
        nullable: true,
        description: "Avatar media object (id, meta, url)",
        properties: {
          id: { type: "string", example: "665f1d0b6a98b2d5e1f4f123" },
          filename: { type: "string", example: "avatar.png" },
          mimeType: { type: "string", example: "image/png" },
          size: { type: "integer", example: 24567 },
          url: {
            type: "string",
            example: "https://b2.example.com/bucket/avatar.png",
          },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
        },
      },
      settings: { $ref: "#/components/schemas/UserSettings" },
      createdAt: { type: "string", format: "date-time" },
      updatedAt: { type: "string", format: "date-time" },
    },
  },

  PermissionsTree: {
    type: "object",
    additionalProperties: {
      type: "object",
      additionalProperties: { type: "boolean" },
    },
  },

  /**
   * NOW: full structure returned by service:
   * { ...user, permissions }
   */
  UserWithPermissions: {
    allOf: [
      { $ref: "#/components/schemas/UserResponseBase" },
      {
        type: "object",
        properties: {
          permissions: { $ref: "#/components/schemas/PermissionsTree" },
        },
      },
    ],
  },

  /**
   * Final API envelope:
   * {
   *   success: true,
   *   message: null,
   *   data: { ...user, permissions }
   * }
   */
  CurrentUserResponse: {
    allOf: [
      { $ref: "#/components/schemas/SuccessEnvelopeData" },
      {
        type: "object",
        properties: {
          data: { $ref: "#/components/schemas/UserWithPermissions" },
        },
      },
    ],
  },

  UpdateUserRequest: {
    type: "object",
    properties: {
      name: { type: "string" },
      avatar: {
        oneOf: [
          {
            type: "string",
            description: "Existing media ID uploaded via /media",
            example: "665f1d0b6a98b2d5e1f4f123",
          },
          {
            type: "object",
            properties: {
              url: {
                type: "string",
                format: "uri",
                description: "Direct image URL; server will import to media and store its id",
                example: "https://example.com/avatar.png",
              },
            },
          },
          { type: "null", description: "Pass null to remove avatar" },
        ],
        nullable: true,
        description:
          "Avatar can be a media id, an object with url to import, or null to clear",
      },
      settings: { $ref: "#/components/schemas/UserSettings" },
    },
  },

  PaginatedUsersResponse: {
    type: "object",
    properties: {
      page: { type: "integer" },
      totalPages: { type: "integer" },
      items: {
        type: "array",
        items: { $ref: "#/components/schemas/UserResponseBase" },
      },
    },
  },
} as const;

/**
 * Paths for User (built with apiPath)
 */
export const userPaths = {
  [apiPath(`${API_CONFIG.ROUTES.USER}/me`)]: {
    get: {
      tags: ["User"],
      summary: "Get current user including permissions",
      responses: {
        "200": {
          description: "Full user object with permissions",
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/CurrentUserResponse",
              },
            },
          },
        },
        "401": { description: "Unauthorized" },
      },
    },
  },

  [apiPath(`${API_CONFIG.ROUTES.USER}/all`)]: {
    get: {
      tags: ["User"],
      summary: "Get all users (paginated, with filters)",
      parameters: [
        { name: "page", in: "query", schema: { type: "integer" } },
        { name: "limit", in: "query", schema: { type: "integer" } },
        {
          name: "s",
          in: "query",
          schema: { type: "string" },
          description: "Search",
        },
        { name: "role", in: "query", schema: { type: "string" } },
        { name: "plan", in: "query", schema: { type: "string" } },
      ],
      responses: {
        "200": {
          description: "List of users",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/PaginatedUsersResponse" },
            },
          },
        },
      },
    },
  },

  [apiPath(`${API_CONFIG.ROUTES.USER}/id/{userId}`)]: {
    get: {
      tags: ["User"],
      summary: "Get user by ID",
      parameters: [
        {
          name: "userId",
          in: "path",
          required: true,
          schema: { type: "string" },
        },
      ],
      responses: {
        "200": {
          description: "User found",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/UserResponse" },
            },
          },
        },
        "404": { description: "User not found" },
      },
    },

    put: {
      tags: ["User"],
      summary: "Update user",
      parameters: [
        {
          name: "userId",
          in: "path",
          required: true,
          schema: { type: "string" },
        },
      ],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/UpdateUserRequest" },
          },
        },
      },
      responses: {
        "200": {
          description: "Updated user",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/UserResponse" },
            },
          },
        },
        "403": { description: "Forbidden" },
        "404": { description: "Not found" },
      },
    },

    delete: {
      tags: ["User"],
      summary: "Delete user",
      parameters: [
        {
          name: "userId",
          in: "path",
          required: true,
          schema: { type: "string" },
        },
      ],
      responses: {
        "204": { description: "Deleted" },
        "403": { description: "Forbidden" },
        "404": { description: "Not found" },
      },
    },
  },
} as const;


/**
 * Optional: tag metadata
 */
export const userTags = [
  {
    name: "User",
    description: "User management (CRUD, filters, pagination, current user)",
  },
];
