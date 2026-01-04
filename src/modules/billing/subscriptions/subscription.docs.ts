import { API_CONFIG, apiPath } from "@config/api";

/**
 * Component Schemas for Subscriptions
 */
export const subscriptionSchemas = {
  SubscriptionResponse: {
    type: "object",
    properties: {
      id: { type: "string", example: "665f1d0b6a98b2d5e1f4f123" },
      userId: { type: "string", example: "665f1d0b6a98b2d5e1f4f123" },
      planKey: { type: "string", example: "pro" },
      provider: { type: "string", example: "stripe" },
      providerSubscriptionId: {
        type: "string",
        example: "sub_1PqLmYJasd9123123",
      },
      status: {
        type: "string",
        example: "active",
        description:
          "Subscription status: active, trialing, cancel_at_period_end, canceled, expired",
      },
      trialDays: { type: "number", example: 14 },
      trialEnd: {
        type: "string",
        format: "date-time",
        example: "2025-09-01T00:00:00Z",
      },
      currentPeriodStart: {
        type: "string",
        format: "date-time",
        example: "2025-09-01T00:00:00Z",
      },
      currentPeriodEnd: {
        type: "string",
        format: "date-time",
        example: "2025-10-01T00:00:00Z",
      },
      cancelAt: { type: "string", format: "date-time", nullable: true },
      canceledAt: { type: "string", format: "date-time", nullable: true },
      lastPaymentAt: {
        type: "string",
        format: "date-time",
        example: "2025-09-01T00:00:00Z",
      },
      metadata: { type: "object" },
      createdAt: { type: "string", format: "date-time" },
      updatedAt: { type: "string", format: "date-time" },
    },
  },
} as const;

/**
 * Paths for Subscriptions
 */
export const subscriptionPaths = {
  [apiPath(`${API_CONFIG.ROUTES.SUBSCRIPTIONS}/me`)]: {
    get: {
      tags: ["Subscriptions"],
      summary: "Get current user subscription",
      responses: {
        "200": {
          description: "Current user subscription",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/SubscriptionResponse" },
            },
          },
        },
        "404": { description: "Subscription not found" },
      },
    },
  },

  [apiPath(`${API_CONFIG.ROUTES.SUBSCRIPTIONS}/cancel`)]: {
    post: {
      tags: ["Subscriptions"],
      summary: "Schedule cancel at period end for current user subscription",
      responses: {
        "200": {
          description: "Subscription scheduled to cancel at period end",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/SubscriptionResponse" },
            },
          },
        },
        "404": { description: "Subscription not found" },
      },
    },
  },

  [apiPath(`${API_CONFIG.ROUTES.SUBSCRIPTIONS}/user/{userId}/cancel`)]: {
    post: {
      tags: ["Subscriptions"],
      summary: "Schedule cancel at period end for a specific user (admin)",
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
          description: "Subscription scheduled to cancel at period end",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/SubscriptionResponse" },
            },
          },
        },
        "404": { description: "Subscription not found" },
      },
    },
  },

  [apiPath(`${API_CONFIG.ROUTES.SUBSCRIPTIONS}/resume`)]: {
    post: {
      tags: ["Subscriptions"],
      summary: "Resume subscription that was scheduled to cancel at period end",
      responses: {
        "200": {
          description: "Subscription resumed",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/SubscriptionResponse" },
            },
          },
        },
        "404": { description: "Subscription not found" },
      },
    },
  },

  [apiPath(`${API_CONFIG.ROUTES.SUBSCRIPTIONS}/user/{userId}/resume`)]: {
    post: {
      tags: ["Subscriptions"],
      summary:
        "Resume subscription scheduled to cancel at period end for a specific user (admin)",
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
          description: "Subscription resumed",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/SubscriptionResponse" },
            },
          },
        },
        "404": { description: "Subscription not found" },
      },
    },
  },

  [apiPath(`${API_CONFIG.ROUTES.SUBSCRIPTIONS}/user/{userId}`)]: {
    get: {
      tags: ["Subscriptions"],
      summary: "Get subscription for a specific user (admin)",
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
          description: "Current user subscription",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/SubscriptionResponse" },
            },
          },
        },
        "404": { description: "Subscription not found" },
      },
    },
  },
} as const;

/**
 * Optional: tag metadata
 */
export const subscriptionTags = [
  {
    name: "Subscriptions",
    description:
      "User subscriptions (view, schedule cancel at period end, resume)",
  },
];
