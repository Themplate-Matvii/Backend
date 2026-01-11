import { messages } from "@constants/messages";
import { EmailCategory } from "./email.types";

type TemplateDefinition = {
  file: string;
  subjectKey: string;
  previewTextKey?: string;
  category?: EmailCategory;
};

// src/modules/email/email.templates.ts
export const emailTemplates = {
  auth: {
    registration: {
      file: "auth/welcome",
      subjectKey: messages.emails.auth.welcome.subject,
      previewTextKey: messages.emails.auth.welcome.preview,
    },
    resetPassword: {
      file: "auth/resetPassword",
      subjectKey: messages.emails.auth.reset.subject,
      previewTextKey: messages.emails.auth.reset.preview,
    },
    passwordChanged: {
      file: "auth/passwordChanged",
      subjectKey: messages.emails.auth.passwordChanged.subject,
      previewTextKey: messages.emails.auth.passwordChanged.preview,
    },
    oneTimeCode: {
      file: "auth/oneTimeCode",
      subjectKey: messages.emails.auth.oneTimeCode.subject,
      previewTextKey: messages.emails.auth.oneTimeCode.preview,
    },
    emailChanged: {
      file: "auth/emailChanged",
      subjectKey: messages.emails.auth.emailChanged.subject,
      previewTextKey: messages.emails.auth.emailChanged.preview,
    },
  },
  billing: {
    paymentSucceededOneTime: {
      file: "billing/paymentOneTimeSuccess",
      subjectKey: messages.emails.billing.paymentSucceededOneTime.subject,
      previewTextKey: messages.emails.billing.paymentSucceededOneTime.preview,
      category: EmailCategory.BILLING,
    },
    paymentSucceededSubscription: {
      file: "billing/paymentSubscriptionSuccess",
      subjectKey:
        messages.emails.billing.paymentSucceededSubscription.subject,
      previewTextKey:
        messages.emails.billing.paymentSucceededSubscription.preview,
      category: EmailCategory.BILLING,
    },
    cancelAtPeriodEndSet: {
      file: "billing/subscriptionCancelAtEnd",
      subjectKey: messages.emails.billing.cancelAtPeriodEndSet.subject,
      previewTextKey: messages.emails.billing.cancelAtPeriodEndSet.preview,
      category: EmailCategory.BILLING,
    },
    subscriptionResume: {
      file: "billing/subscriptionResumed",
      subjectKey: messages.emails.billing.subscriptionResume.subject,
      previewTextKey: messages.emails.billing.subscriptionResume.preview,
      category: EmailCategory.BILLING,
    },
    subscriptionRenewed: {
      file: "billing/subscriptionRenewed",
      subjectKey: messages.emails.billing.subscriptionRenewed.subject,
      previewTextKey: messages.emails.billing.subscriptionRenewed.preview,
      category: EmailCategory.BILLING,
    },
    paymentFailed: {
      file: "billing/paymentFailed",
      subjectKey: messages.emails.billing.paymentFailed.subject,
      previewTextKey: messages.emails.billing.paymentFailed.preview,
      category: EmailCategory.BILLING,
    },
    subscriptionCanceled: {
      file: "billing/subscriptionCanceled",
      subjectKey: messages.emails.billing.subscriptionCanceled.subject,
      previewTextKey: messages.emails.billing.subscriptionCanceled.preview,
      category: EmailCategory.BILLING,
    },
  },
  marketing: {},
} as const;

export type EmailTemplateGroup = keyof typeof emailTemplates;
export type EmailTemplateName<G extends EmailTemplateGroup> =
  keyof (typeof emailTemplates)[G];
export type EmailTemplateDefinition = TemplateDefinition;
