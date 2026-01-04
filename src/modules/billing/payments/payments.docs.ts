import { API_CONFIG, apiPath } from "@config/api";

/**
 * Component Schemas for Payments
 */
export const paymentSchemas = {
  PaymentResponse: {
    type: "object",
    properties: {
      id: { type: "string", example: "665f1d0b6a98b2d5e1f4f123" },
      userId: { type: "string", example: "665f1d0b6a98b2d5e1f4f123" },
      planKey: {
        type: "string",
        nullable: true,
        example: "basic",
        description: "Plan key for subscription payments",
      },
      productKey: {
        type: "string",
        nullable: true,
        example: "tokens_30",
        description: "One-time product key for non-subscription payments",
      },
      provider: { type: "string", example: "stripe" },
      providerPaymentId: { type: "string", example: "pi_3OzT..." },
      amount: { type: "integer", example: 1000 },
      currency: { type: "string", example: "usd" },
      status: {
        type: "string",
        example: "succeeded",
        description:
          "Normalized payment status (pending, succeeded, failed, canceled)",
      },
      sourceType: {
        type: "string",
        nullable: true,
        description: "Logical source of the payment/bonus",
        example: "subscription",
        enum: [
          "subscription",
          "one_time",
          "referral_signup",
          "referral_purchase",
        ],
      },
      createdAt: { type: "string", format: "date-time" },
      updatedAt: { type: "string", format: "date-time" },
    },
  },

  PaymentsListResponse: {
    type: "array",
    items: { $ref: "#/components/schemas/PaymentResponse" },
  },

  CheckoutRequest: {
    type: "object",
    required: ["planKey"],
    properties: {
      planKey: { type: "string", example: "basic" },
    },
  },

  OneTimeCheckoutRequest: {
    type: "object",
    required: ["productKey"],
    properties: {
      productKey: { type: "string", example: "tokens_30" },
    },
  },

  CheckoutResponse: {
    type: "object",
    properties: {
      url: {
        type: "string",
        example: "https://checkout.stripe.com/c/pay_123",
      },
    },
  },
} as const;

/**
 * Paths for Payments
 */
export const paymentPaths = {
  // Create subscription checkout session
  [apiPath(`${API_CONFIG.ROUTES.PAYMENTS}/checkout`)]: {
    post: {
      tags: ["Payments"],
      summary: "Create checkout session for subscription plan",
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/CheckoutRequest" },
          },
        },
      },
      responses: {
        "200": {
          description: "Checkout URL created",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/CheckoutResponse" },
            },
          },
        },
      },
    },
  },

  // Create one-time checkout session
  [apiPath(`${API_CONFIG.ROUTES.PAYMENTS}/checkout/one-time`)]: {
    post: {
      tags: ["Payments"],
      summary: "Create checkout session for one-time product",
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/OneTimeCheckoutRequest" },
          },
        },
      },
      responses: {
        "200": {
          description: "Checkout URL created",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/CheckoutResponse" },
            },
          },
        },
      },
    },
  },

  // Stripe webhook endpoint
  [apiPath(`${API_CONFIG.ROUTES.PAYMENTS}/webhook`)]: {
    post: {
      tags: ["Payments"],
      summary: "Stripe webhook endpoint",
      responses: {
        "200": { description: "Webhook processed" },
      },
    },
  },

  // User payment history
  [apiPath(`${API_CONFIG.ROUTES.PAYMENTS}/my`)]: {
    get: {
      tags: ["Payments"],
      summary: "Get user payment history",
      responses: {
        "200": {
          description: "List of user payments",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/PaymentsListResponse" },
            },
          },
        },
      },
    },
  },

  // Payment history for specific user (admin)
  [apiPath(`${API_CONFIG.ROUTES.PAYMENTS}/user/{userId}`)]: {
    get: {
      tags: ["Payments"],
      summary: "Get payment history for any user (admin)",
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
          description: "List of user payments",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/PaymentsListResponse" },
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
export const paymentTags = [
  {
    name: "Payments",
    description:
      "Payment flow (subscription, one-time checkout, webhook, history)",
  },
];
