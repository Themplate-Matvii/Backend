import { API_CONFIG, apiPath } from "@config/api";

export const pricingSchemas = {
  PricingProductResponse: {
    type: "object",
    properties: {
      key: { type: "string", example: "basic" },
      nameKey: { type: "string", example: "plans.basic.name" },
      name: { type: "string", example: "Basic Plan" },
      priceCents: { type: "integer", example: 1500 },
      currency: { type: "string", example: "usd" },
      mode: {
        type: "string",
        example: "subscription",
        description: "Billing mode: subscription or one_time",
      },
      trialDays: {
        type: "integer",
        nullable: true,
        example: 14,
        description: "Trial days for subscription plans",
      },
      interval: {
        type: "string",
        nullable: true,
        example: "month",
        description: "Billing interval for subscription plans",
      },
      permissions: {
        type: "array",
        nullable: true,
        items: { type: "string" },
      },
      bonus: {
        type: "array",
        nullable: true,
        items: { type: "object" },
        description: "Bonus configuration applied on purchase",
      },
      provider: {
        type: "string",
        nullable: true,
        example: "stripe",
      },
      providerProductId: {
        type: "string",
        nullable: true,
        example: "prod_123",
      },
      providerPriceId: {
        type: "string",
        nullable: true,
        example: "price_123",
      },
    },
  },
  PricingListResponse: {
    type: "array",
    items: { $ref: "#/components/schemas/PricingProductResponse" },
  },
} as const;

export const pricingPaths = {
  [apiPath(API_CONFIG.ROUTES.PRICING)]: {
    get: {
      tags: ["Pricing"],
      summary: "List billing products (plans and one-time)",
      parameters: [
        {
          name: "mode",
          in: "query",
          required: false,
          schema: {
            type: "string",
            description: "Filter by billing mode (e.g. subscription, one_time)",
          },
        },
      ],
      responses: {
        "200": {
          description: "List of pricing products",
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/PricingListResponse",
              },
            },
          },
        },
        "401": { description: "Unauthorized" },
        "403": { description: "Forbidden" },
      },
    },
  },
  [apiPath(`${API_CONFIG.ROUTES.PRICING}/{key}`)]: {
    get: {
      tags: ["Pricing"],
      summary: "Get single pricing product by key",
      parameters: [
        {
          name: "key",
          in: "path",
          required: true,
          schema: { type: "string" },
        },
      ],
      responses: {
        "200": {
          description: "Single pricing product",
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/PricingProductResponse",
              },
            },
          },
        },
        "404": { description: "Not found" },
        "401": { description: "Unauthorized" },
        "403": { description: "Forbidden" },
      },
    },
  },
} as const;

export const pricingTags = [
  {
    name: "Pricing",
    description: "Billing products: subscription plans and one-time products",
  },
];
