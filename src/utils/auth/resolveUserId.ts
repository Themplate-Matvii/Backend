import { RequestWithUser } from "@modules/core/types/auth";

/**
 * Resolve target user id for handlers that support both own/any scopes.
 * - If permissionScope === "any" and path/body/query contains ownerField → use it
 * - Otherwise fallback to current authenticated user id
 */
export function resolveUserId(
  req: RequestWithUser,
  ownerField = "userId",
): string | undefined {
  if ((req as any).permissionScope === "any") {
    const params = req.params as any;
    const body = req.body as any;
    const query = req.query as any;

    const fromRequest = params?.[ownerField] ?? body?.[ownerField] ?? query?.[ownerField];
    if (fromRequest) return fromRequest;
  }

  const user = req.user as any;
  return user?.id ?? user?.sub;
}
