// permissionAccess.ts
// Resolve user permissions into a full boolean tree mirroring permissionKeys.
// Leaves are boolean flags. Admin or "*" → all true.
// Comments in English only.

import { plans } from "@constants/payments/plans";
import { roles } from "@constants/permissions/roles";
import { permissionKeys } from "@constants/permissions/permissionKeys";
import type { RequestWithUser } from "@modules/core/types/auth";

/* ---------------------------------- Types --------------------------------- */

// Deep value union of a const object that stores string leaves.
type DeepValueOf<T> = T extends string
  ? T
  : T extends Record<string, unknown>
  ? DeepValueOf<T[keyof T]>
  : never;

export type PermissionKey = DeepValueOf<typeof permissionKeys>;

// Pattern supports exact keys, segment wildcard "prefix.*", and global "*".
export type PermissionPattern = "*" | `${string}.*` | PermissionKey;

// Same shape as permissionKeys, but with boolean leaves.
type BooleanTree<T> = T extends string
  ? boolean
  : { [K in keyof T]: BooleanTree<T[K]> };

export type PermissionTreeBoolean = BooleanTree<typeof permissionKeys>;

/* ------------------------------ Flatten helpers --------------------------- */

function flattenPermissionTree(o: unknown, acc: string[] = []): string[] {
  if (!o || typeof o !== "object") return acc;
  for (const v of Object.values(o as Record<string, unknown>)) {
    if (typeof v === "string") {
      acc.push(v);
    } else if (v && typeof v === "object") {
      flattenPermissionTree(v, acc);
    }
  }
  return acc;
}

const ALL_KEYS = Object.freeze(
  flattenPermissionTree(permissionKeys) as PermissionKey[],
);

/* --------------------------- Matching and expansion ----------------------- */

function matchPermission(
  patterns: readonly PermissionPattern[],
  key: string,
): boolean {
  for (const p of patterns) {
    if (p === "*") return true;
    if (p === key) return true;
    if (p.endsWith(".*")) {
      const prefix = p.slice(0, -2);
      if (key.startsWith(prefix)) return true;
    }
  }
  return false;
}

function expandAllowedSet(
  patterns: readonly PermissionPattern[],
): Set<PermissionKey> {
  if (patterns.includes("*")) return new Set<PermissionKey>(ALL_KEYS);
  const out = new Set<PermissionKey>();
  for (const key of ALL_KEYS) {
    if (matchPermission(patterns, key)) out.add(key);
  }
  return out;
}

/* ------------------------------ Tree builders ----------------------------- */

function buildBooleanTreeFromSet<T>(
  sourceTree: T,
  allowed: Set<string>,
): BooleanTree<T> {
  if (typeof sourceTree === "string") {
    return allowed.has(sourceTree) as BooleanTree<T>;
  }
  const result: any = Array.isArray(sourceTree) ? [] : {};
  for (const [k, v] of Object.entries(sourceTree as Record<string, unknown>)) {
    result[k] = buildBooleanTreeFromSet(v, allowed);
  }
  return result as BooleanTree<T>;
}

/* ------------------------------- Public API -------------------------------- */

export function getUserPermissionPatterns(
  user: RequestWithUser["user"],
): PermissionPattern[] {
  if (!user) return [];

  const role = roles[user.role];
  const plan = user.plan ? plans[user.plan] : null;

  // Cast to patterns to allow "*" and "segment.*"
  const rolePermissions = (role?.permissions ??
    []) as readonly PermissionPattern[];
  const planPermissions = (plan?.permissions ??
    []) as readonly PermissionPattern[];

  if (rolePermissions.includes("*")) return ["*"];

  return Array.from(
    new Set<PermissionPattern>([...rolePermissions, ...planPermissions]),
  );
}

export function getUserPermissionTree(
  user: RequestWithUser["user"],
): PermissionTreeBoolean {
  const patterns = getUserPermissionPatterns(user);
  if (patterns.includes("*")) {
    const all = new Set<string>(ALL_KEYS);
    return buildBooleanTreeFromSet(permissionKeys, all);
  }
  const allowed = expandAllowedSet(patterns);
  return buildBooleanTreeFromSet(permissionKeys, allowed);
}

export function userHasPermission(
  user: RequestWithUser["user"],
  permissionKey: PermissionKey,
): boolean {
  if (!user) return false;
  const patterns = getUserPermissionPatterns(user);
  if (patterns.includes("*")) return true;
  return matchPermission(patterns, permissionKey);
}

export function userHasPermissionWithOwnership(
  user: RequestWithUser["user"],
  permissionKey: PermissionKey,
  ctx?: { ownerId?: string | number | null },
): boolean {
  if (!user) return false;
  if (!userHasPermission(user, permissionKey)) return false;

  if (permissionKey.includes(".own.")) {
    if (ctx?.ownerId == null || user.id == null) return false;
    return String(ctx.ownerId) === String(user.id);
  }
  return true;
}
