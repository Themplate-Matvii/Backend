import { landingPaths } from '@modules/landings/landing.docs';
import { Application } from "express";
import { API_CONFIG, apiPath } from '@config/api';

// Routers
import authRoutes from '@modules/user/auth/auth.routes';
import userRoutes from '@modules/user/index/user.routes';
import accountRoutes from "@modules/user/account/account.routes";
import emailRoutes from '@modules/communication/email/email.routes';
import mediaRoutes from '@modules/assets/media/media.routes';
import paymentRoutes from '@modules/billing/payments/payments.routes';
import pricingRoutes from "@modules/billing/pricing/pricing.routes";
import subscriptionRoutes from '@modules/billing/subscriptions/subscription.routes';
import bonusRoutes from "@modules/bonus/bonus.routes";
import trafficRoutes from '@modules/analytics/traffic/traffic.routes';
import businessRoutes from '@modules/analytics/business/business.routes';
import landingRoutes from '@modules/landings/landing.routes';
import feedbackRoutes from '@modules/communication/feedback/feedback.routes';

export function registerRoutes(app: Application) {
  app.use(apiPath(API_CONFIG.ROUTES.AUTH), authRoutes);
  app.use(apiPath(API_CONFIG.ROUTES.USER), userRoutes);
  app.use(apiPath(API_CONFIG.ROUTES.ACCOUNT), accountRoutes);

  // Communication
  app.use(apiPath(API_CONFIG.ROUTES.EMAIL), emailRoutes);
  app.use(apiPath(API_CONFIG.ROUTES.FEEDBACK), feedbackRoutes);

  // Assets
  app.use(apiPath(API_CONFIG.ROUTES.MEDIA), mediaRoutes);

  // Billing
  app.use(apiPath(API_CONFIG.ROUTES.PRICING), pricingRoutes);
  app.use(apiPath(API_CONFIG.ROUTES.PAYMENTS), paymentRoutes);
  app.use(apiPath(API_CONFIG.ROUTES.SUBSCRIPTIONS), subscriptionRoutes);
  app.use(apiPath(API_CONFIG.ROUTES.BONUS), bonusRoutes);

  // Analitycs
  app.use(apiPath(API_CONFIG.ROUTES.ANALYTICS_TRAFFIC), trafficRoutes);
  app.use(apiPath(API_CONFIG.ROUTES.ANALYTICS_BUSINESS), businessRoutes);

  // Models
  app.use(apiPath(API_CONFIG.ROUTES.LANDINGS), landingRoutes);
}
