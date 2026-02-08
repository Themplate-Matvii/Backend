import swaggerJsdoc from "swagger-jsdoc";
import { version } from "../../package.json";
import { ENV } from "@config/env";

// 🔽 single import from a central registry (we'll add it next)
import { docsRegistry } from "@docs/registry";

const serverUrl = ENV.BASE_SWAGGER_URL;

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "SaaS Backend API",
      version,
      description: "API documentation for SaaS Backend",
    },
    servers: [
      {
        url: serverUrl,
        description:
          ENV.NODE_ENV === "production" ? "Production server" : "Local server",
      },
    ],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
    },
    security: [{ BearerAuth: [] }],
  },
  // Optional: still scan JSDoc blocks if you use them
  apis: ["src/modules/**/*.docs.ts", "src/modules/**/**/*.docs.ts"],
};

// 1) Build base spec
const spec: any = swaggerJsdoc(options);

// 2) Ensure containers
spec.paths = spec.paths || {};
spec.components = spec.components || {};
spec.components.schemas = spec.components.schemas || {};
spec.tags = spec.tags || [];

// 3) Merge all module docs from registry
for (const bundle of docsRegistry) {
  if (bundle.paths) {
    spec.paths = { ...spec.paths, ...bundle.paths };
  }
  if (bundle.schemas) {
    spec.components.schemas = {
      ...spec.components.schemas,
      ...bundle.schemas,
    };
  }
  if (bundle.tags && Array.isArray(bundle.tags)) {
    spec.tags = [...spec.tags, ...bundle.tags];
  }
}

export const swaggerSpec = spec;
