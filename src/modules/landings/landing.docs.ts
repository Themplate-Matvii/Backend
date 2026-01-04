import { API_CONFIG, apiPath } from "@config/api";

export const landingSchemas = {
  LandingResponse: {
    type: "object",
    properties: {
      id: { type: "string", example: "665f1d0b6a98b2d5e1f4f123" },
      userId: { type: "string", example: "665f1d0b6a98b2d5e1f4f123" },
      title: { type: "string", example: "My First Landing" },
      description: { type: "string", example: "Test description" },
      views: { type: "integer", example: 123 },
      clicks: { type: "integer", example: 45 },
      createdAt: { type: "string", format: "date-time" },
      updatedAt: { type: "string", format: "date-time" },
    },
  },

  CreateLandingRequest: {
    type: "object",
    required: ["title"],
    properties: {
      title: { type: "string", example: "My First Landing" },
      description: { type: "string", example: "Test description" },
    },
  },

  LandingsListResponse: {
    type: "array",
    items: { $ref: "#/components/schemas/LandingResponse" },
  },
} as const;

export const landingPaths = {
  [apiPath(`${API_CONFIG.ROUTES.LANDINGS}/`)]: {
    post: {
      tags: ["Landings"],
      summary: "Create new landing (requires landings.create)",
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/CreateLandingRequest" },
          },
        },
      },
      responses: {
        "200": {
          description: "Landing created",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/LandingResponse" },
            },
          },
        },
        "401": { description: "Unauthorized" },
        "403": { description: "Forbidden" },
      },
    },

    get: {
      tags: ["Landings"],
      summary: "Get all landings for current user (requires landings.own.view)",
      responses: {
        "200": {
          description: "List of landings",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/LandingsListResponse" },
            },
          },
        },
        "401": { description: "Unauthorized" },
        "403": { description: "Forbidden" },
      },
    },
  },
} as const;

export const landingTags = [
  {
    name: "Landings",
    description: "Landing management (create, list for user)",
  },
];
