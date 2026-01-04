// ! PERMISSIONS STRUCTURE
// * This structure defines all permission keys used across the system.
// * Use it to assign rights to roles and evaluate access through helpers like `can()`.
// ? Scopes:
// ? - any: Access to all items (admin-like roles)
// ? - own: Access to only owned items (based on ownership, e.g., createdBy === user.id)
// ? - flat: Global actions that don't relate to ownership (e.g. view all logs)

export const permissionKeys = {
  users: {
    any: {
      view: "users.view.any",
      edit: "users.edit.any",
      delete: "users.delete.any",
    },
    own: {
      view: "users.view.own",
      edit: "users.edit.own",
      delete: "users.delete.own",
    },
  },
  media: {
    any: {
      create: "media.create.any",
      update: "media.update.any",
      view: "media.view.any",
      delete: "media.delete.any",
    },
    own: {
      create: "media.create.own",
      update: "media.update.own",
      view: "media.view.own",
      delete: "media.delete.own",
    },
  },
  landings: {
    create: "landings.create",
    any: {
      view: "landings.view.any",
      edit: "landings.edit.any",
      delete: "landings.delete.any",
    },
    own: {
      view: "landings.view.own",
      edit: "landings.edit.own",
      delete: "landings.delete.own",
    },
  },
  analitycs_traffic: {
    view: "analitycs_traffic.view",
  },
  analitycs_business: {
    view: "analitycs_business.view",
  },
  payments: {
    any: {
      view: "payments.view.any",
    },
    own: {
      view: "payments.view.own",
    },
  },
  subscriptions: {
    any: {
      view: "subscriptions.view.any",
      manage: "subscriptions.manage.any",
    },
    own: {
      view: "subscriptions.view.own",
      manage: "subscriptions.manage.own",
    },
  },
  feedback: {
    view: "feedback.view",
  },
  bonus: {
    history: {
      any: {
        view: "bonus_history.view.any",
      },
      own: {
        view: "bonus_history.view.own",
      },
    },
    adjust: "bonus.adjust.any",
  },
  email: {
    one: "emails.send.one",
    broadcast: "emails.send.broadcast",
    templates: {
      view: "emails.templates.view",
      manage: "emails.templates.manage",
    },
    branding: {
      manage: "emails.branding.manage",
    },
  },
} as const;
