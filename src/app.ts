import { plans } from "@constants/payments/plans";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import swaggerUi from "swagger-ui-express";
import { swaggerSpec } from "@config/swagger";
import { API_CONFIG, apiPath } from "@config/api";
import { i18nPerRequest } from "@middleware/i18n";
import { errorMiddleware } from "@middleware/errorMiddleware";
import { registerRoutes } from "@modules/routes";
import { handleWebhook } from "@modules/billing/payments/payments.controller";
import morgan from "morgan";

export const app = express();

// --- Core middlewares ---
app.use(cors({ origin: true, credentials: true }));
app.use(cookieParser());
app.use(i18nPerRequest);

// --- Logs api ---
app.use(morgan("dev"));

// --- Stripe webhook must use raw body ---
// ⚠️ Important: put BEFORE express.json()
app.post(
  "/api/payments/webhook",
  express.raw({ type: "application/json" }),
  handleWebhook,
);

// --- Standard JSON parser for all other routes ---
app.use(express.json());

// --- Routes ---
registerRoutes(app);

// --- Swagger UI ---
app.use(
  apiPath(API_CONFIG.ROUTES.DOCS),
  swaggerUi.serve,
  swaggerUi.setup(swaggerSpec),
);
app.get(apiPath(API_CONFIG.ROUTES.DOCS_JSON), (_, res) => {
  res.setHeader("Content-Type", "application/json");
  res.send(swaggerSpec);
});

// --- ERROR HANDLER: must be the last one ---
app.use(errorMiddleware);
