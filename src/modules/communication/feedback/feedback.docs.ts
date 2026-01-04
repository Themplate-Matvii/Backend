// comments only in English
import { API_CONFIG, apiPath } from "@config/api";

export const feedbackSchemas = {
  // Single feedback item
  FeedbackResponse: {
    type: "object",
    properties: {
      id: { type: "string", example: "665f1d0b6a98b2d5e1f4f123" },
      name: { type: "string", example: "John Doe" },
      email: { type: "string", example: "john@example.com" },
      phone: { type: "string", example: "+123456789" },
      comment: { type: "string", example: "Great service!" },
      createdAt: { type: "string", format: "date-time" },
    },
  },

  // Create request body
  CreateFeedbackRequest: {
    type: "object",
    required: ["phone"],
    properties: {
      name: { type: "string", example: "John Doe" },
      email: { type: "string", example: "john@example.com" },
      phone: { type: "string", example: "+123456789" },
      comment: { type: "string", example: "Great service!" },
    },
  },

  // Paginated list result
  FeedbackPaginatedPayload: {
    type: "object",
    properties: {
      items: {
        type: "array",
        items: { $ref: "#/components/schemas/FeedbackResponse" },
      },
      total: { type: "number", example: 42 },
      page: { type: "number", example: 1 },
      limit: { type: "number", example: 20 },
      totalPages: { type: "number", example: 3 },
    },
  },
} as const;

export const feedbackPaths = {
  /* ------------------------------------------------------
   *  POST /feedback  — public feedback submit
   *  Router: router.post("/", ...)
   * ------------------------------------------------------ */
  [apiPath(`${API_CONFIG.ROUTES.FEEDBACK}/`)]: {
    post: {
      tags: ["Feedback"],
      summary: "Submit feedback (public, no auth required)",
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              $ref: "#/components/schemas/CreateFeedbackRequest",
            },
          },
        },
      },
      responses: {
        "200": {
          // successResponse wraps data in common envelope
          description: "Feedback created",
          content: {
            "application/json": {
              schema: {
                allOf: [
                  { $ref: "#/components/schemas/SuccessEnvelopeData" },
                  {
                    properties: {
                      data: {
                        $ref: "#/components/schemas/FeedbackResponse",
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
                    data: {
                      id: "665f1d0b6a98b2d5e1f4f123",
                      name: "John Doe",
                      email: "john@example.com",
                      phone: "+123456789",
                      comment: "Great service!",
                      createdAt: "2025-01-01T00:00:00.000Z",
                    },
                  },
                },
              },
            },
          },
        },
        "400": {
          description: "Validation error (e.g. phone missing)",
        },
      },
    },
  },

  /* ------------------------------------------------------
   *  GET /feedback/all — paginated feedback list (protected)
   *  Router: router.get("/all", requireJwt, checkPermission(...), ...)
   * ------------------------------------------------------ */
  [apiPath(`${API_CONFIG.ROUTES.FEEDBACK}/all`)]: {
    get: {
      tags: ["Feedback"],
      summary: "Get feedback list with pagination (requires feedback.view)",
      parameters: [
        {
          name: "page",
          in: "query",
          required: false,
          schema: { type: "integer", example: 1 },
        },
        {
          name: "limit",
          in: "query",
          required: false,
          schema: { type: "integer", example: 20 },
        },
        {
          name: "s",
          in: "query",
          required: false,
          schema: { type: "string", example: "bug" },
          description:
            "Search query applied to name / email / comment / phone (implementation depends on pagination helper)",
        },
        {
          name: "sort",
          in: "query",
          required: false,
          schema: {
            type: "string",
            example: "-createdAt",
          },
          description:
            "Sort expression, e.g. '-createdAt' for newest first or 'createdAt' for oldest first",
        },
      ],
      responses: {
        "200": {
          description: "Paginated feedback list",
          content: {
            "application/json": {
              schema: {
                allOf: [
                  { $ref: "#/components/schemas/SuccessEnvelopeData" },
                  {
                    properties: {
                      data: {
                        $ref: "#/components/schemas/FeedbackPaginatedPayload",
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
                    data: {
                      items: [
                        {
                          id: "665f1d0b6a98b2d5e1f4f123",
                          name: "John Doe",
                          email: "john@example.com",
                          phone: "+123456789",
                          comment: "Great service!",
                          createdAt: "2025-01-01T00:00:00.000Z",
                        },
                      ],
                      total: 1,
                      page: 1,
                      limit: 20,
                      totalPages: 1,
                    },
                  },
                },
              },
            },
          },
        },
        "400": {
          description: "Validation error",
        },
        "401": {
          description: "Unauthorized (missing or invalid JWT)",
        },
        "403": {
          description: "Forbidden (missing feedback.view permission)",
        },
      },
    },
  },
} as const;

export const feedbackTags = [
  {
    name: "Feedback",
    description: "Feedback form (public submit + paginated admin list)",
  },
];