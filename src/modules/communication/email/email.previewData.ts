export type SystemTemplateMock = {
  name?: string;
  description?: string;
  previewData?: Record<string, any>;
};

export const SYSTEM_TEMPLATE_MOCKS: Record<string, SystemTemplateMock> = {
  "auth.oneTimeCode": {
    name: "ONE_TIME_CODE",
    description: "Sends a one-time verification code for email-based flows.",
    previewData: {
      titleKey: "emails.auth.oneTimeCode.verifyEmailTitle",
      subtitleKey: "emails.auth.oneTimeCode.verifyEmailSubtitle",
      code: "123456",
      expiresInMinutes: 10,
      ignoreKey: "emails.auth.oneTimeCode.ignore",
    },
  },
  "auth.emailChanged": {
    name: "EMAIL_CHANGED",
    description: "Notifies that the account email was updated.",
    previewData: {
      name: "Alex",
      newEmail: "new@example.com",
    },
  },
  "billing.paymentSucceededOneTime": {
    name: "PAYMENT_SUCCEEDED_ONE_TIME",
    description:
      "Confirms a successful one-time purchase with receipt details and access links.",
    previewData: {
      userName: "Alex",
      amount: "29.00",
      currency: "USD",
      itemName: "Pro add-on",
      purchasedAt: "2025-01-03",
      receiptUrl: "https://example.com/receipt",
      dashboardUrl: "https://app.example.com",
      supportEmail: "support@example.com",
    },
  },
  "billing.paymentSucceededSubscription": {
    name: "PAYMENT_SUCCEEDED_SUBSCRIPTION",
    description:
      "Welcomes a new subscriber, outlines the plan and highlights onboarding actions.",
    previewData: {
      userName: "Alex",
      planName: "Startup",
      amount: "39.00",
      currency: "USD",
      periodEnd: "2025-02-03",
      billingPortalUrl: "https://example.com/billing",
      dashboardUrl: "https://app.example.com",
      supportEmail: "support@example.com",
    },
  },
  "billing.cancelAtPeriodEndSet": {
    name: "CANCEL_AT_PERIOD_END_SET",
    description:
      "Confirms cancellation at period end with the final access date and upsell call-to-action.",
    previewData: {
      userName: "Alex",
      planName: "Startup",
      periodEnd: "2025-02-03",
      billingPortalUrl: "https://example.com/billing",
      feedbackFormUrl: "https://example.com/feedback",
      supportEmail: "support@example.com",
    },
  },
  "billing.subscriptionResume": {
    name: "SUBSCRIPTION_RESUME",
    description:
      "Notifies the user that automatic billing was resumed and reiterates plan benefits.",
    previewData: {
      userName: "Alex",
      planName: "Startup",
      nextChargeDate: "2025-02-03",
      amount: "39.00",
      currency: "USD",
      billingPortalUrl: "https://example.com/billing",
      supportEmail: "support@example.com",
    },
  },
  "billing.subscriptionRenewed": {
    name: "SUBSCRIPTION_RENEWED",
    description:
      "Confirms a renewal charge, summarizes the invoice and links to the receipt.",
    previewData: {
      userName: "Alex",
      planName: "Startup",
      amount: "39.00",
      currency: "USD",
      periodEnd: "2025-03-03",
      receiptUrl: "https://example.com/receipt",
      billingPortalUrl: "https://example.com/billing",
    },
  },
  "billing.paymentFailed": {
    name: "PAYMENT_FAILED",
    description:
      "Warns about a failed renewal attempt with next retry date and update-payment call-to-action.",
    previewData: {
      userName: "Alex",
      planName: "Startup",
      amount: "39.00",
      currency: "USD",
      retryDate: "2025-01-07",
      billingPortalUrl: "https://example.com/billing",
      supportEmail: "support@example.com",
    },
  },
  "billing.subscriptionCanceled": {
    name: "SUBSCRIPTION_CANCELED",
    description:
      "Confirms that the subscription ended after retries and highlights how to restart.",
    previewData: {
      userName: "Alex",
      planName: "Startup",
      finalAccessDate: "2025-01-03",
      resumeUrl: "https://example.com/upgrade",
      billingPortalUrl: "https://example.com/billing",
      supportEmail: "support@example.com",
    },
  },
};
