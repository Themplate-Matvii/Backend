import { NextFunction, Response } from "express";
import { RequestWithUser } from "@modules/core/types/auth";
import { messages } from "@constants/messages";
import { AppError } from "@utils/common/appError";
import {
  PermissionKey,
  userHasPermission,
  userHasPermissionWithOwnership,
} from "@utils/auth/permissions";

interface PermissionOptions {
  // Exact permission keys like "users.view.any" or "users.view.own"
  own?: PermissionKey;
  any?: PermissionKey;
  // Field name that contains owner id in params/body/query. Default "userId"
  ownerField?: string;
}

/**
 * Unified permission middleware for boolean-tree resolver.
 * Sets req.permissionScope = "own" | "any"
 * English-only comments inside code.
 */
export function checkPermission(options: PermissionOptions) {
  const { own, any, ownerField = "userId" } = options;

  return (req: RequestWithUser, _res: Response, next: NextFunction) => {
    if (!req.user) {
      // No user in context; leave decision to upstream auth layer if needed.
      (req as any).permissionScope = "any";
      return next();
    }

    // Normalize user for helpers: ensure .id is present
    const userForPerm = {
      ...req.user,
      id: (req.user as any).id ?? req.user.sub,
    } as any;

    // 1) Check "any" scoped permission first
    if (any && userHasPermission(userForPerm, any)) {
      (req as any).permissionScope = "any";
      return next();
    }

    // 2) Check "own" scoped permission with ownership
    if (own) {
      // Try to locate owner id from request, fallback to current user
      let resourceUserId =
        (req.params as any)[ownerField] ??
        (req.body as any)[ownerField] ??
        (req.query as any)[ownerField] ??
        req.user.sub;

      if (resourceUserId != null) {
        const ok = userHasPermissionWithOwnership(userForPerm, own, {
          ownerId: resourceUserId,
        });
        if (ok) {
          (req as any).permissionScope = "own";
          return next();
        }
      }
    }

    // 3) Deny by default
    return next(new AppError(messages.auth.forbidden, 403));
  };
}
