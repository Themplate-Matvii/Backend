import { paymentPaths, paymentSchemas, paymentTags } from '@modules/billing/payments/payments.docs';
// Central registry for programmatic OpenAPI docs bundles.
// Each module can export a bundle with `paths`, `schemas`, and optional `tags`.

export type DocsBundle = {
  paths?: Record<string, any>;
  schemas?: Record<string, any>;
  tags?: Array<{ name: string; description?: string }>;
};

import {
  emailPaths,
  emailSchemas,
  emailTags,
} from '@modules/communication/email/email.docs';
import {
  pricingPaths,
  pricingSchemas,
  pricingTags,
} from "@modules/billing/pricing/pricing.docs";
import {
  subscriptionPaths,
  subscriptionSchemas,
  subscriptionTags,
} from "@modules/billing/subscriptions/subscription.docs";
// Auth module
import {
  authPaths,
  authSchemas,
  authTags,
} from '@modules/user/auth/auth.docs';

// User module
import {
  userPaths,
  userSchemas,
  userTags,
} from '@modules/user/index/user.docs';

import { landingPaths, landingSchemas, landingTags } from '@modules/landings/landing.docs';
import {
  feedbackPaths,
  feedbackSchemas,
  feedbackTags,
} from '@modules/communication/feedback/feedback.docs';
import { trafficPaths, trafficSchemas, trafficTags } from '@modules/analytics/traffic/traffic.docs';
import { businessPaths, businessSchemas, businessTags } from '@modules/analytics/business/business.docs';
import { mediaPaths, mediaSchemas, mediaTags } from '@modules/assets/media/media.docs';
import { bonusPaths, bonusSchemas, bonusTags } from "@modules/bonus/bonus.docs";

export const docsRegistry: DocsBundle[] = [
  // User
  {
    paths: authPaths,
    schemas: authSchemas,
    tags: authTags,
  },
  {
    paths: userPaths,
    schemas: userSchemas,
    tags: userTags,
  },

  // Communication
  {
    paths: emailPaths,
    schemas: emailSchemas,
    tags: emailTags,
  },
  {
    paths: feedbackPaths,
    schemas: feedbackSchemas,
    tags: feedbackTags,
  },

  // Assets
  {
    paths: mediaPaths,
    schemas: mediaSchemas,
    tags: mediaTags,
  },

  // Billing
  {
    paths: paymentPaths,
    schemas: paymentSchemas,
    tags: paymentTags,
  },
  {
    paths: pricingPaths,
    schemas: pricingSchemas,
    tags: pricingTags,
  },
  {
    paths: subscriptionPaths,
    schemas: subscriptionSchemas,
    tags: subscriptionTags,
  },

  // Analitycs
  {
    paths: trafficPaths,
    schemas: trafficSchemas,
    tags: trafficTags,
  },
  {
    paths: businessPaths,
    schemas: businessSchemas,
    tags: businessTags,
  },

  // Bonus
  {
    paths: bonusPaths,
    schemas: bonusSchemas,
    tags: bonusTags,
  },

  // Models
  {
    paths: landingPaths,
    schemas: landingSchemas,
    tags: landingTags,
  },
  // future: landings, products, etc.
];
