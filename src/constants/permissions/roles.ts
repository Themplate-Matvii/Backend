import { permissionKeys } from "@constants/permissions/permissionKeys";

/**
 * ! SYSTEM ROLES
 * * Defines fixed roles used across the backend.
 * * Each role has:
 * * - name: UI display label
 * * - permissions: list of permission keys
 */

const flattenPermissionKeys = (tree: unknown, acc: string[] = []): string[] => {
  if (!tree || typeof tree !== "object") return acc;

  for (const value of Object.values(tree as Record<string, unknown>)) {
    if (typeof value === "string") {
      acc.push(value);
    } else if (value && typeof value === "object") {
      flattenPermissionKeys(value, acc);
    }
  }

  return acc;
};

const adminPermissionDenylist = new Set<string>([
  permissionKeys.subscriptions.own.view,
  permissionKeys.subscriptions.own.manage,
  permissionKeys.payments.own.view,
  permissionKeys.bonus.history.own.view,
]);

const adminPermissions = flattenPermissionKeys(permissionKeys).filter(
  (key) => !adminPermissionDenylist.has(key),
);

export const roles = {
  admin: {
    key: "admin",
    name: "roles.admin.name",
    permissions: adminPermissions,
  },
  user: {
    key: "user",
    name: "roles.user.name",
    permissions: [
      // ? Users — only self
      permissionKeys.users.own.view,
      permissionKeys.users.own.edit,
      permissionKeys.users.own.delete,

      // ? Media — only self
      permissionKeys.media.own.create,
      permissionKeys.media.own.view,
      permissionKeys.media.own.update,
      permissionKeys.media.own.delete,

      // ? Landings — only own
      permissionKeys.landings.create,
      permissionKeys.landings.own.view,
      permissionKeys.landings.own.edit,
      permissionKeys.landings.own.delete,

      // ? Subscription — only own
      permissionKeys.subscriptions.own.view,
      permissionKeys.subscriptions.own.manage,

      // ? Payments & bonus — only own
      permissionKeys.payments.own.view,
      permissionKeys.bonus.history.own.view,
    ],
  },
} as const;

export type RoleKey = keyof typeof roles;
