import { API_CONFIG, apiPath } from "@config/api";

export const businessSchemas = {
  BusinessKPI: {
    type: "object",
    properties: {
      currency: { type: "string", example: "USD" },

      totalRevenue: {
        type: "number",
        example: 1200.5,
        description: "Total revenue in dollars for the selected period",
      },
      subscriptionRevenue: {
        type: "number",
        example: 950.25,
        description: "Subscription revenue in dollars for the selected period",
      },
      oneTimeRevenue: {
        type: "number",
        example: 250.25,
        description: "One-time revenue in dollars for the selected period",
      },

      mrr: {
        type: "number",
        example: 800,
        description:
          "Monthly Recurring Revenue in dollars at the end of the period",
      },
      arr: {
        type: "number",
        example: 9600,
        description:
          "Annual Recurring Revenue in dollars at the end of the period",
      },

      churnRate: {
        type: "number",
        example: 4.5,
        description:
          "Churn rate in percent based on average active-like subscriptions",
      },
      arpu: {
        type: "number",
        example: 12.5,
        description: "Average Revenue Per User (all users) in dollars",
      },
      arppu: {
        type: "number",
        example: 35.7,
        description: "Average Revenue Per Paying User in dollars",
      },
      conversionToPaid: {
        type: "number",
        example: 18.3,
        description: "Percent of new users in the period who became paying",
      },

      averageSubscriptionLifetimeDays: {
        type: "number",
        example: 84,
        description:
          "Average lifetime in days for ended subscriptions (canceled/expired)",
      },

      totalUsersAtEnd: {
        type: "integer",
        example: 420,
        description: "Total users created at or before dateTo",
      },
      newUsersInRange: {
        type: "integer",
        example: 80,
        description: "New users created in the selected period",
      },
      payingUsersInRange: {
        type: "integer",
        example: 20,
        description:
          "Users with at least one succeeded payment in the selected period",
      },

      activeLikeSubscriptionsAtStart: {
        type: "integer",
        example: 100,
        description:
          "Active-like subscriptions at the start of the period (ACTIVE/TRIALING/CANCEL_AT_PERIOD_END)",
      },
      activeLikeSubscriptionsAtEnd: {
        type: "integer",
        example: 120,
        description:
          "Active-like subscriptions at the end of the period (from dailySubscriptions series)",
      },
    },
  },

  DailyRevenue: {
    type: "object",
    properties: {
      date: { type: "string", example: "2025-08-21" },
      totalAmount: {
        type: "number",
        example: 59.99,
        description: "Total revenue in dollars for this day",
      },
      subscriptionAmount: {
        type: "number",
        example: 49.99,
        description: "Subscription revenue in dollars for this day",
      },
      oneTimeAmount: {
        type: "number",
        example: 10,
        description: "One-time revenue in dollars for this day",
      },
    },
  },

  DailySubscriptions: {
    type: "object",
    properties: {
      date: { type: "string", example: "2025-08-21" },
      new: {
        type: "integer",
        example: 10,
        description: "Subscriptions created on this day",
      },
      canceled: {
        type: "integer",
        example: 2,
        description: "Subscriptions canceled or expired on this day",
      },
      activeLike: {
        type: "integer",
        example: 105,
        description:
          "Active-like subscriptions on this day (ACTIVE/TRIALING/CANCEL_AT_PERIOD_END, running total)",
      },
    },
  },

  DailyRegistrations: {
    type: "object",
    properties: {
      date: { type: "string", example: "2025-08-21" },
      count: { type: "integer", example: 25 },
    },
  },

  DailySubscriptionsByStatus: {
    type: "object",
    properties: {
      date: { type: "string", example: "2025-08-21" },
      active: {
        type: "integer",
        example: 80,
        description: "Subscriptions in ACTIVE status at the end of this day",
      },
      trialing: {
        type: "integer",
        example: 10,
        description: "Subscriptions in TRIALING status at the end of this day",
      },
      cancel_at_period_end: {
        type: "integer",
        example: 5,
        description:
          "Subscriptions in CANCEL_AT_PERIOD_END status at the end of this day",
      },
      canceled: {
        type: "integer",
        example: 15,
        description:
          "Subscriptions in CANCELED status (not yet past canceledAt) for this day",
      },
      expired: {
        type: "integer",
        example: 7,
        description:
          "Subscriptions in EXPIRED status (not yet past canceledAt) for this day",
      },
    },
  },

  SubscriptionStatusTotals: {
    type: "object",
    properties: {
      active: {
        type: "integer",
        example: 120,
        description: "Total ACTIVE subscriptions at dateTo",
      },
      trialing: {
        type: "integer",
        example: 15,
        description: "Total TRIALING subscriptions at dateTo",
      },
      cancel_at_period_end: {
        type: "integer",
        example: 8,
        description: "Total CANCEL_AT_PERIOD_END subscriptions at dateTo",
      },
      canceled: {
        type: "integer",
        example: 40,
        description: "Total CANCELED subscriptions at dateTo",
      },
      expired: {
        type: "integer",
        example: 25,
        description: "Total EXPIRED subscriptions at dateTo",
      },
    },
  },

  BusinessAnalyticsResponse: {
    type: "object",
    properties: {
      kpi: { $ref: "#/components/schemas/BusinessKPI" },
      dailyRevenue: {
        type: "array",
        items: { $ref: "#/components/schemas/DailyRevenue" },
      },
      dailySubscriptions: {
        type: "array",
        items: { $ref: "#/components/schemas/DailySubscriptions" },
      },
      dailySubscriptionsByStatus: {
        type: "array",
        items: { $ref: "#/components/schemas/DailySubscriptionsByStatus" },
      },
      subscriptionStatusTotals: {
        $ref: "#/components/schemas/SubscriptionStatusTotals",
      },
      dailyRegistrations: {
        type: "array",
        items: { $ref: "#/components/schemas/DailyRegistrations" },
      },
    },
  },
} as const;

export const businessPaths = {
  [apiPath(`${API_CONFIG.ROUTES.ANALYTICS_BUSINESS}/`)]: {
    get: {
      tags: ["Business Analytics"],
      summary: "Get business analytics (requires analitycs_business.view)",
      parameters: [
        {
          name: "dateFrom",
          in: "query",
          required: true,
          schema: { type: "string", format: "date-time" },
        },
        {
          name: "dateTo",
          in: "query",
          required: true,
          schema: { type: "string", format: "date-time" },
        },
      ],
      responses: {
        "200": {
          description: "Business analytics data",
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/BusinessAnalyticsResponse",
              },
            },
          },
        },
        "401": { description: "Unauthorized" },
        "403": { description: "Forbidden" },
        "400": { description: "Validation error" },
      },
    },
  },
} as const;

export const businessTags = [
  {
    name: "Business Analytics",
    description:
      "Business-level analytics: revenue (in dollars), subscriptions, status breakdowns, registrations, and KPIs",
  },
];
