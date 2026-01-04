import mongoose from "mongoose";
import dotenv from "dotenv";
import { app } from "./app";
import { initI18n } from "@config/i18n";
import { logger } from "@utils/common/logger";
import { ENV } from "@config/env";
import { plans } from "@constants/payments/plans";
import { stripeProvider } from "@modules/billing/payments/providers/stripe/provider";
import { API_CONFIG, apiPath } from "@config/api";
import { oneTimeProducts } from "@constants/payments/oneTimeProducts";

dotenv.config();
initI18n();

const { PORT, MONGO_URI, BASE_URL, NODE_ENV } = ENV;

async function start() {
  try {
    // connect to MongoDB
    await mongoose.connect(MONGO_URI);
    logger.info("✅ MongoDB connected");

    await stripeProvider.syncPlans(plans);
    logger.info("✅ Subscription plans synced with Stripe");

    await stripeProvider.syncOneTimeProducts(oneTimeProducts);
    logger.info("✅ One-time products synced with Stripe");

    // start server
    app.listen(Number(PORT), () => {
      const serverUrl =
        NODE_ENV === "production" && BASE_URL
          ? BASE_URL
          : `http://localhost:${PORT}${apiPath(API_CONFIG.ROUTES.DOCS)}`;

      logger.info(`🚀 Server running in ${NODE_ENV} mode at ${serverUrl}`);
    });
  } catch (error) {
    logger.error("❌ Failed to start server:", error);
    process.exit(1);
  }
}

start();
