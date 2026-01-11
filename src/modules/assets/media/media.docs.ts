// comments only in English
import { API_CONFIG, apiPath } from "@config/api";

export const mediaSchemas = {
  /* ------------------------------ Single media item ------------------------------ */
  MediaResponse: {
    type: "object",
    properties: {
      id: { type: "string", example: "677fd83d9d2b8f2c44f3fe99" },
      filename: { type: "string", example: "7d4c82fa-8477-4d89-a234.jpg" },
      storageProvider: { type: "string", example: "b2" },
      bucket: { type: "string", example: "themplate-assets" },
      objectKey: { type: "string", example: "7d4c82fa-8477-4d89-a234.jpg" },
      uploadedBy: {
        type: "object",
        properties: {
          id: { type: "string", example: "665f1d0b6a98b2d5e1f4f123" },
          name: { type: "string", nullable: true, example: "Jane Doe" },
          email: { type: "string", example: "user@example.com" },
        },
      },
      mimeType: { type: "string", example: "image/jpeg" },
      size: { type: "number", example: 512000 },
      name: { type: "string", example: "Homepage hero image" },
      description: {
        type: "string",
        example: "Main hero section background for landing page",
      },
      createdAt: { type: "string", format: "date-time" },
      status: { type: "string", example: "active" },
      url: {
        type: "string",
        example:
          "https://Themplate.s3.eu-central-003.backblazeb2.com/7d4c82fa-8477-4d89-a234.jpg",
      },
    },
  },

  /* ------------------------------- Upload request ------------------------------- */
  UploadMediaRequest: {
    type: "object",
    properties: {
      file: {
        type: "string",
        format: "binary",
      },
      url: {
        type: "string",
        format: "uri",
        description: "Direct image URL to import instead of uploading a file",
        example: "https://example.com/image.png",
      },
      name: {
        type: "string",
        example: "Homepage hero image",
      },
      description: {
        type: "string",
        example: "Main hero section background for landing page",
      },
    },
    description:
      "Send either a binary file or an image URL; the server will store media and respond with id & url",
  },

  /* ------------------------------- Update request ------------------------------- */
  UpdateMediaRequest: {
    type: "object",
    properties: {
      name: {
        type: "string",
        example: "Updated image title",
      },
      description: {
        type: "string",
        example: "Updated description for this media file",
      },
    },
  },

  /* ----------------------------- Paginated response ----------------------------- */
  MediaPaginatedPayload: {
    type: "object",
    properties: {
      items: {
        type: "array",
        items: { $ref: "#/components/schemas/MediaResponse" },
      },
      total: { type: "number", example: 42 },
      page: { type: "number", example: 1 },
      limit: { type: "number", example: 20 },
      pages: { type: "number", example: 3 },
    },
  },
} as const;

/* =============================================================================
 *                                 API PATHS
 * ============================================================================= */

export const mediaPaths = {
  /* --------------------------------------------------------------------------
   *  POST /media/upload  — upload a file or import by URL
   * -------------------------------------------------------------------------- */
  [apiPath(`${API_CONFIG.ROUTES.MEDIA}/upload`)]: {
    post: {
      tags: ["Media"],
      summary:
        "Upload a media file or import from URL (requires media.create.own or media.create.any)",
      security: [{ BearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          "multipart/form-data": {
            schema: {
              $ref: "#/components/schemas/UploadMediaRequest",
            },
          },
        },
      },
      responses: {
        "200": {
          description: "File uploaded successfully",
          content: {
            "application/json": {
              schema: {
                allOf: [
                  { $ref: "#/components/schemas/SuccessEnvelopeData" },
                  {
                    properties: {
                      data: {
                        type: "object",
                        properties: {
                          media: {
                            $ref: "#/components/schemas/MediaResponse",
                          },
                          url: { type: "string" },
                        },
                      },
                    },
                  },
                ],
              },
            },
          },
        },
        "400": {
          description:
            "File or URL required, invalid payload or file is larger than allowed limit",
        },
        "401": { description: "Unauthorized" },
        "403": { description: "Forbidden (missing permissions)" },
      },
    },
  },

  /* --------------------------------------------------------------------------
   *  GET /media  — list media (paginated)
   * -------------------------------------------------------------------------- */
  [apiPath(`${API_CONFIG.ROUTES.MEDIA}/`)]: {
    get: {
      tags: ["Media"],
      summary:
        "Get media list (requires media.view.any or media.view.own — automatically filtered)",
      security: [{ BearerAuth: [] }],
      parameters: [
        {
          name: "page",
          in: "query",
          schema: { type: "integer", example: 1 },
        },
        {
          name: "limit",
          in: "query",
          schema: { type: "integer", example: 20 },
        },
        {
          name: "mime",
          in: "query",
          schema: { type: "string", example: "image" },
          description: "Filter media by MIME type (contains match)",
        },
        {
          name: "s",
          in: "query",
          schema: { type: "string", example: "logo" },
          description:
            "Search by filename, name or description (case-insensitive contains match)",
        },
      ],
      responses: {
        "200": {
          description: "Paginated media list",
          content: {
            "application/json": {
              schema: {
                allOf: [
                  { $ref: "#/components/schemas/SuccessEnvelopeData" },
                  {
                    properties: {
                      data: {
                        $ref: "#/components/schemas/MediaPaginatedPayload",
                      },
                    },
                  },
                ],
              },
            },
          },
        },
        "400": { description: "Validation error" },
        "401": { description: "Unauthorized" },
        "403": { description: "Forbidden" },
      },
    },
  },

  /* --------------------------------------------------------------------------
   *  GET /media/:id/file — download media content
   * -------------------------------------------------------------------------- */
  [apiPath(`${API_CONFIG.ROUTES.MEDIA}/:id`)]: {
    get: {
      tags: ["Media"],
      summary: "Download media file by id (media.view.any or media.view.own)",
      security: [{ BearerAuth: [] }],
      parameters: [
        {
          name: "id",
          in: "path",
          required: true,
          schema: { type: "string", example: "677fd83d9d2b8f2c44f3fe99" },
        },
      ],
      responses: {
        "200": {
          description: "Binary media content",
          content: {
            "application/octet-stream": {
              schema: { type: "string", format: "binary" },
            },
          },
        },
        "400": { description: "Validation error" },
        "401": { description: "Unauthorized" },
        "403": { description: "Forbidden" },
        "404": { description: "Media not found" },
      },
    },
  },

  /* --------------------------------------------------------------------------
   *  GET /media/:id    — get media details
   *  PATCH /media/:id  — update media meta
   *  DELETE /media/:id — delete media file
   * -------------------------------------------------------------------------- */
  [apiPath(`${API_CONFIG.ROUTES.MEDIA}/:id`)]: {
    get: {
      tags: ["Media"],
      summary: "Get media by id (media.view.any or media.view.own)",
      security: [{ BearerAuth: [] }],
      parameters: [
        {
          name: "id",
          in: "path",
          required: true,
          schema: { type: "string", example: "677fd83d9d2b8f2c44f3fe99" },
        },
      ],
      responses: {
        "200": {
          description: "Media details",
          content: {
            "application/json": {
              schema: {
                allOf: [
                  { $ref: "#/components/schemas/SuccessEnvelopeData" },
                  {
                    properties: {
                      data: {
                        type: "object",
                        properties: {
                          media: { $ref: "#/components/schemas/MediaResponse" },
                        },
                      },
                    },
                  },
                ],
              },
            },
          },
        },
        "400": { description: "Validation error" },
        "401": { description: "Unauthorized" },
        "403": { description: "Forbidden" },
        "404": { description: "Media not found" },
      },
    },

    patch: {
      tags: ["Media"],
      summary:
        "Update media meta (name and description) (media.delete.any or media.delete.own for now)",
      security: [{ BearerAuth: [] }],
      parameters: [
        {
          name: "id",
          in: "path",
          required: true,
          schema: { type: "string", example: "677fd83d9d2b8f2c44f3fe99" },
        },
      ],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              $ref: "#/components/schemas/UpdateMediaRequest",
            },
          },
        },
      },
      responses: {
        "200": {
          description: "Media meta updated",
          content: {
            "application/json": {
              schema: {
                allOf: [
                  { $ref: "#/components/schemas/SuccessEnvelopeData" },
                  {
                    properties: {
                      data: {
                        type: "object",
                        properties: {
                          media: {
                            $ref: "#/components/schemas/MediaResponse",
                          },
                          url: { type: "string" },
                        },
                      },
                    },
                  },
                ],
              },
            },
          },
        },
        "400": { description: "Validation error" },
        "401": { description: "Unauthorized" },
        "403": { description: "Forbidden" },
        "404": { description: "Media not found" },
      },
    },

    delete: {
      tags: ["Media"],
      summary: "Delete a file (media.delete.any or media.delete.own)",
      security: [{ BearerAuth: [] }],
      parameters: [
        {
          name: "id",
          in: "path",
          required: true,
          schema: { type: "string", example: "677fd83d9d2b8f2c44f3fe99" },
        },
      ],
      responses: {
        "200": {
          description: "Media deleted",
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/SuccessEnvelopeMessage",
              },
            },
          },
        },
        "401": { description: "Unauthorized" },
        "403": { description: "Forbidden" },
        "404": { description: "Media not found" },
      },
    },
  },
} as const;

/* =============================================================================
 *                                 TAGS
 * ============================================================================= */

export const mediaTags = [
  {
    name: "Media",
    description:
      "Media file upload, listing, update of meta information and deletion",
  },
];
