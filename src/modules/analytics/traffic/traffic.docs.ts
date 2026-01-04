import { API_CONFIG, apiPath } from "@config/api";

export const trafficSchemas = {
  TrafficEventResponse: {
    type: "object",
    properties: {
      id: { type: "string", example: "66a1f9d2b1234c5678abc901" },
      landingId: { type: "string", example: "landing123" },
      userId: { type: "string", example: "665f1d0b6a98b2d5e1f4f123" },
      sessionId: { type: "string", example: "session-uuid-xyz" },
      eventType: { type: "string", example: "pageView" },
      isUnique: { type: "boolean", example: true },
      url: { type: "string", example: "https://example.com/pricing" },
      eventName: { type: "string", example: "buy_now_button" },
      referrer: { type: "string", example: "https://google.com" },
      device: { type: "string", example: "desktop" },
      country: { type: "string", example: "PL" },
      language: { type: "string", example: "pl-PL" },
      createdAt: { type: "string", format: "date-time" },
    },
  },

  TrackEventRequest: {
    type: "object",
    required: ["sessionId", "eventType"],
    properties: {
      landingId: { type: "string", example: "landing123" },
      userId: { type: "string", example: "665f1d0b6a98b2d5e1f4f123" },
      sessionId: { type: "string", example: "session-uuid-xyz" },
      eventType: { type: "string", enum: ["pageView", "click", "formSubmit"] },
      url: { type: "string", example: "https://example.com/signup" },
      eventName: { type: "string", example: "signup_cta" },
      referrer: { type: "string", example: "https://google.com" },
      device: { type: "string", example: "desktop" },
      country: { type: "string", example: "PL" },
      language: { type: "string", example: "pl-PL" },
    },
  },

  TrafficEventsListResponse: {
    type: "array",
    items: { $ref: "#/components/schemas/TrafficEventResponse" },
  },

  TrafficTotals: {
    type: "object",
    properties: {
      pageView: {
        type: "object",
        properties: { total: { type: "number", example: 150 }, unique: { type: "number", example: 80 } },
      },
      click: {
        type: "object",
        properties: { total: { type: "number", example: 200 }, unique: { type: "number", example: 120 } },
      },
      formSubmit: {
        type: "object",
        properties: { total: { type: "number", example: 20 }, unique: { type: "number", example: 15 } },
      },
    },
  },

  FeedbackByDate: {
    type: "object",
    properties: {
      date: { type: "string", example: "2024-12-01" },
      count: { type: "number", example: 5 },
    },
  },

  TrafficAnalyticsResponse: {
    type: "object",
    properties: {
      events: { $ref: "#/components/schemas/TrafficEventsListResponse" },
      stats: {
        type: "object",
        properties: {
          totals: { $ref: "#/components/schemas/TrafficTotals" },
          feedbackByDate: {
            type: "array",
            items: { $ref: "#/components/schemas/FeedbackByDate" },
          },
        },
      },
    },
  },
} as const;

export const trafficPaths = {
  [apiPath(`${API_CONFIG.ROUTES.ANALYTICS_TRAFFIC}/track`)]: {
    post: {
      tags: ["Traffic"],
      summary: "Track traffic event (public, no auth required)",
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/TrackEventRequest" },
          },
        },
      },
      responses: {
        "201": {
          description: "Traffic event recorded",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/TrafficEventResponse" },
            },
          },
        },
        "400": { description: "Validation error" },
      },
    },
  },

  [apiPath(`${API_CONFIG.ROUTES.ANALYTICS_TRAFFIC}/`)]: {
    get: {
      tags: ["Traffic"],
      summary: "Get traffic events (requires analitycs_traffic.view)",
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
        {
          name: "landingId",
          in: "query",
          schema: { type: "string" },
        },
        {
          name: "userId",
          in: "query",
          schema: { type: "string" },
        },
      ],
      responses: {
        "200": {
          description:
            "Traffic analytics with detailed events, unique/non-unique counts, and feedback series",
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/TrafficAnalyticsResponse",
              },
            },
          },
        },
        "401": { description: "Unauthorized" },
        "403": { description: "Forbidden" },
      },
    },
  },
} as const;

export const trafficTags = [
  {
    name: "Traffic",
    description: "Traffic analytics (public tracking, protected viewing)",
  },
];
