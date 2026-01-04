import { API_CONFIG, apiPath } from "@config/api";

export const bonusSchemas = {
  BonusHistoryItem: {
    type: "object",
    properties: {
      id: { type: "string", example: "665f1d0b6a98b2d5e1f4f123" },
      userId: { type: "string", example: "665f1d0b6a98b2d5e1f4f123" },
      sourceType: {
        type: "string",
        example: "subscription",
        description: "Logical source of the bonus (subscription, one_time, etc)",
      },
      sourceId: {
        type: "string",
        nullable: true,
        example: "pay_123",
      },
      targetModel: { type: "string", example: "user" },
      targetId: { type: "string", example: "665f1d0b6a98b2d5e1f4f123" },
      fieldsDelta: {
        type: "object",
        example: { aiCredits: 20, storageGb: 5 },
      },
      createdAt: { type: "string", format: "date-time" },
    },
  },

  BonusHistoryResponse: {
    type: "object",
    properties: {
      success: { type: "boolean", example: true },
      message: {
        type: "string",
        example: "bonus.historyFetched",
      },
      data: {
        type: "array",
        items: { $ref: "#/components/schemas/BonusHistoryItem" },
      },
    },
  },

  BonusAdjustRequest: {
    type: "object",
    properties: {
      aiCredits: {
        type: "integer",
        minimum: 0,
        example: 120,
        description: "Absolute value to set for aiCredits",
      },
    },
  },
} as const;

export const bonusPaths = {
  [apiPath(`${API_CONFIG.ROUTES.BONUS}/history`)]: {
    get: {
      tags: ["Bonus"],
      summary: "Get current user bonus history",
      responses: {
        "200": {
          description: "List of bonus transactions for the current user",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/BonusHistoryResponse" },
            },
          },
        },
        "401": { description: "Unauthorized" },
      },
    },
  },

  [apiPath(`${API_CONFIG.ROUTES.BONUS}/history/{userId}`)]: {
    get: {
      tags: ["Bonus"],
      summary: "Get bonus history for a specific user (admin)",
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
          description: "List of bonus transactions for the user",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/BonusHistoryResponse" },
            },
          },
        },
        "401": { description: "Unauthorized" },
      },
    },
  },

  [apiPath(`${API_CONFIG.ROUTES.BONUS}/{userId}`)]: {
    patch: {
      tags: ["Bonus"],
      summary: "Update bonus fields for a specific user",
      security: [{ BearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/BonusAdjustRequest" },
          },
        },
      },
      responses: {
        "200": {
          description: "Updated user bonus information",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/SuccessEnvelopeData" },
            },
          },
        },
        "401": { description: "Unauthorized" },
        "404": { description: "User not found" },
      },
    },
  },
} as const;

export const bonusTags = [
  {
    name: "Bonus",
    description: "Bonus accrual history",
  },
];
