export const messages = {
  auth: {
    missingToken: "auth.missingToken",
    invalidToken: "auth.invalidToken",
    forbidden: "auth.forbidden",
    unauthorized: "auth.unauthorized",
    emailUsed: "auth.emailUsed", // {{email}}
    userWithSuchEmailNotFount: "auth.userWithSuchEmailNotFount", // {{email}}
    invalidAuthMethond: "auth.invalidAuthMethond",
    invalidPassword: "auth.invalidPassword",
    invalidProvider: "auth.invalidProvider",
    authRequired: "auth.authRequired",
    passwordResetUnavailableForOAuth: "auth.passwordResetUnavailableForOAuth",
    tooManyResetRequests: "auth.tooManyResetRequests",
    resetEmailSent: "auth.resetEmailSent",
    passwordChangedSuccess: "auth.passwordChangedSuccess",
  },
  validation: {
    required: "validation.required",
    minLength: "validation.minLength", // {{min}}
    maxLength: "validation.maxLength", // {{max}}
    invalidEmail: "validation.invalidEmail",
    passwordLowercase: "validation.lowercase",
    passwordUppercase: "validation.uppercase",
    passwordDigit: "validation.digit",
    passwordSymbol: "validation.symbol",
    tokenInvalid: "validation.invalid",
    tokenRefreshInvalid: "validation.tokenRefreshInvalid",
    tokenResetInvalid: "validation.tokenResetInvalid",
    tokenVerifyInvalid: "validation.tokenVerifyInvalid",
    nameTooShort: "validation.nameTooShort", // {{min}}
    nameTooLong: "validation.nameTooLong", // {{max}}
    invalidDate: "validation.invalidDate",
    invalidUrl: "validation.invalidUrl",
    invalidObjectId: "validation.invalidObjectId",
    userRequired: "validation.userRequired",
  },
  permissions: {
    forbidden: "permissions.forbidden",
    planRestriction: "permissions.planRestriction",
  },
  subscription: {
    noPlan: "subscription.noPlan",
    trialActive: "subscription.trialActive",
    trialExpired: "subscription.trialExpired",
    expired: "subscription.expired",
    paymentRequired: "subscription.paymentRequired",
    notFound: "subscription.notFound",
    canceled: "subscription.canceled",
    fetched: "subscription.fetched",
  },
  crud: {
    created: "crud.created",
    updated: "crud.updated",
    deleted: "crud.deleted",
    notFound: "crud.notFound",
    conflict: "crud.conflict",
  },
  media: {
    notFound: "media.notFound",
    noPermission: "media.noPermission",
    fileRequired: "media.fileRequired",
    invalidType: "media.invalidType", // {{allowed}}
    tooLarge: "media.tooLarge", // {{limitMb}}
    uploadFailed: "media.uploadFailed",
    deleteFailed: "media.deleteFailed",
  },
  server: {
    internalError: "server.internalError",
  },
  modules: {
    notFound: "modules.notFound",
  },
  payments: {
    subscriptionParamsMissing: "payments.subscriptionParamsMissing",
    initFailed: "payments.initFailed",
    notFound: "payments.notFound",
    rawBodyMissing: "payments.rawBodyMissing",
    statusFetched: "payments.statusFetched",
    initSuccess: "payments.initSuccess",
    planNotFound: "payments.planNotFound",
    productNotFound: "payments.productNotFound",
    providerNotSupported: "payments.providerNotSupported",
    subscriptionAlreadyActive: "payments.subscriptionAlreadyActive",
  },

  bonus: {
    historyFetched: "bonus.historyFetched",
    updated: "bonus.updated",
  },

  // ✅ Новый блок для email-шаблонов
  emails: {
    auth: {
      reset: {
        subject: "emails.auth.reset.subject",
        title: "emails.auth.reset.title",
        greeting: "emails.auth.reset.greeting", // {{name}}
        instructions: "emails.auth.reset.instructions",
        button: "emails.auth.reset.button",
        ignore: "emails.auth.reset.ignore",
        preview: "emails.auth.reset.preview",
      },
      welcome: {
        subject: "emails.auth.welcome.subject",
        title: "emails.auth.welcome.title",
        greeting: "emails.auth.welcome.greeting", // {{name}}
        intro: "emails.auth.welcome.intro",
        nextSteps: "emails.auth.welcome.nextSteps",
        button: "emails.auth.welcome.button",
        highlight: "emails.auth.welcome.highlight",
        footer: "emails.auth.welcome.footer",
        preview: "emails.auth.welcome.preview",
      },
      passwordChanged: {
        subject: "emails.auth.passwordChanged.subject",
        title: "emails.auth.passwordChanged.title",
        greeting: "emails.auth.passwordChanged.greeting", // {{name}}
        confirmation: "emails.auth.passwordChanged.confirmation",
        footer: "emails.auth.passwordChanged.footer",
        preview: "emails.auth.passwordChanged.preview",
      },
    },
    billing: {
      paymentSucceededOneTime: {
        subject: "emails.billing.paymentSucceededOneTime.subject",
        preview: "emails.billing.paymentSucceededOneTime.preview",
      },
      paymentSucceededSubscription: {
        subject: "emails.billing.paymentSucceededSubscription.subject",
        preview: "emails.billing.paymentSucceededSubscription.preview",
      },
      cancelAtPeriodEndSet: {
        subject: "emails.billing.cancelAtPeriodEnd.subject",
        preview: "emails.billing.cancelAtPeriodEnd.preview",
      },
      subscriptionResume: {
        subject: "emails.billing.subscriptionResumed.subject",
        preview: "emails.billing.subscriptionResumed.preview",
      },
      subscriptionRenewed: {
        subject: "emails.billing.subscriptionRenewed.subject",
        preview: "emails.billing.subscriptionRenewed.preview",
      },
      paymentFailed: {
        subject: "emails.billing.paymentFailed.subject",
        preview: "emails.billing.paymentFailed.preview",
      },
      subscriptionCanceled: {
        subject: "emails.billing.subscriptionCanceled.subject",
        preview: "emails.billing.subscriptionCanceled.preview",
      },
    },
  },
} as const;

export type MessageTree = typeof messages;
export type MessageKey = {
  [K in keyof MessageTree]: `${K}.${keyof MessageTree[K] & string}`;
}[keyof MessageTree];
