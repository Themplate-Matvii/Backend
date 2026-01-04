// comments only in English
import Media from "@modules/assets/media/media.model";
import { MediaService } from "@modules/assets/media/media.service";
import { User } from "@modules/user/user.model";
import { isValidObjectId } from "mongoose";
import { getUserPermissionTree } from "@utils/auth/permissions";
import { subscriptionService } from "@modules/billing/subscriptions/subscription.service";
import { PlanKey } from "@constants/payments/plans";
import { RoleKey, roles } from "@constants/permissions/roles";

export type PermissionTree = ReturnType<typeof getUserPermissionTree>;

export type UserDocumentLike = User & {
  _id: unknown;
  toJSON: () => any;
};

export type RoleResponse = {
  key: RoleKey;
  name: string;
};

export type UserWithPermissions = ReturnType<User["toJSON"]> & {
  permissions: PermissionTree;
  plan?: PlanKey | null;
  role: RoleResponse;
};

async function buildAvatarPayload(avatar: User["avatar"]) {
  const avatarId =
    typeof avatar === "string"
      ? avatar
      : (avatar as any)?._id?.toString?.() || (avatar as any)?.id;

  if (!avatarId) return null;

  if (!isValidObjectId(avatarId)) return null;

  const mediaDoc = await Media.findById(avatarId);
  if (!mediaDoc) return null;

  const media = mediaDoc.toJSON();

  return {
    ...media,
    url: MediaService.getUrl(media.filename),
  };
}

/**
 * Build role response from RoleKey.
 */
export function buildRoleResponse(roleKey: RoleKey): RoleResponse {
  const role = roles[roleKey];

  if (!role) {
    return {
      key: roleKey,
      name: roleKey,
    };
  }

  return {
    key: role.key,
    name: role.name,
  };
}

/**
 * Build full user payload for API responses:
 * - plain user JSON (toJSON)
 * - resolved role (RoleResponse)
 * - current plan
 * - permission tree
 */
export async function buildUserPayload(
  userDoc: UserDocumentLike,
  options?: { preloadedPlanKey?: PlanKey | null },
): Promise<UserWithPermissions> {
  const user = userDoc.toJSON();
  const userId = String(userDoc._id);

  const avatar = await buildAvatarPayload((user as any).avatar);

  const planKey =
    options?.preloadedPlanKey ??
    (await subscriptionService.getUserCurrentPlanKey(userId));

  const permissions = getUserPermissionTree({
    id: userId,
    role: user.role as RoleKey,
    plan: planKey,
  } as any);

  const role = buildRoleResponse(user.role as RoleKey);

  return {
    ...user,
    avatar,
    role,
    plan: planKey ?? null,
    permissions,
  };
}
