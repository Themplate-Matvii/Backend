import { UserModel, User } from "@modules/user/user.model";
import { paginate } from "@utils/common/pagination";
import { PAGINATION } from "@constants/pagination";
import {
  UpdateUserDTO,
  GetAllUsersDTO,
} from "@modules/user/index/user.validation";
import { SubscriptionModel } from "@modules/billing/subscriptions/subscription.model";
import { SubscriptionStatus } from "@modules/billing/subscriptions/types";
import { PlanKey } from "@constants/payments/plans";
import {
  buildUserPayload,
  UserWithPermissions,
  UserDocumentLike,
} from "@utils/auth/userPayload";
import { MediaService } from "@modules/assets/media/media.service";
import { AppError } from "@utils/common/appError";
import { messages } from "@constants/messages";
import Media from "@modules/assets/media/media.model";
import { deleteUserData } from "@modules/user/account/userDeletion.service";

export class UserService {
  async getCurrent(userId: string): Promise<UserWithPermissions | null> {
    const userDoc = await UserModel.findById(userId).exec();
    if (!userDoc) {
      return null;
    }

    return buildUserPayload(userDoc as UserDocumentLike);
  }

  async findById(userId: string): Promise<UserWithPermissions | null> {
    const userDoc = await UserModel.findById(userId).exec();
    if (!userDoc) {
      return null;
    }

    return buildUserPayload(userDoc as UserDocumentLike);
  }

  async findAll(filters: GetAllUsersDTO, currentUserId?: string) {
    const {
      s,
      role,
      plan,
      page = PAGINATION.DEFAULT_PAGE,
      limit = PAGINATION.DEFAULT_LIMIT,
      sort,
    } = filters;

    const baseFilters: Record<string, unknown> = {
      ...(role ? { role } : {}),
      ...(currentUserId ? { _id: { $ne: currentUserId } } : {}),
    };

    let effectiveFilters = baseFilters;

    if (plan) {
      const userIds = await SubscriptionModel.distinct("userId", {
        planKey: plan,
        status: {
          $in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIALING],
        },
      });

      if (userIds.length === 0) {
        effectiveFilters = { _id: { $in: [] } };
      } else {
        effectiveFilters = {
          ...baseFilters,
          _id: { $in: userIds },
        };
      }
    }

    const pageResult = await paginate<User>(UserModel, {
      page,
      limit,
      search: s,
      searchFields: ["email", "name"],
      filters: effectiveFilters,
      sort,
    });

    const userDocs = pageResult.items as (User & {
      _id: unknown;
      toJSON: () => any;
    })[];

    if (userDocs.length === 0) {
      return {
        ...pageResult,
        items: [] as any[],
      };
    }

    const userIdsOnPage = userDocs.map((doc) => String(doc._id));

    const subs = await SubscriptionModel.find({
      userId: { $in: userIdsOnPage },
      status: { $in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIALING] },
    })
      .sort({ createdAt: -1 })
      .lean();

    const planByUserId = new Map<string, PlanKey>();

    for (const sub of subs) {
      const uid = String(sub.userId);
      if (!planByUserId.has(uid)) {
        planByUserId.set(uid, sub.planKey as PlanKey);
      }
    }

    const itemsWithPlan = await Promise.all(
      userDocs.map((doc) => {
        const uid = String(doc._id);
        const preloadedPlanKey = planByUserId.get(uid) ?? null;

        return buildUserPayload(doc as UserDocumentLike, {
          preloadedPlanKey,
        });
      }),
    );

    return {
      ...pageResult,
      items: itemsWithPlan,
    };
  }

  async update(
    userId: string,
    data: UpdateUserDTO,
  ): Promise<UserWithPermissions | null> {
    const { settings, avatar, ...userFields } = data;

    const userDoc = await UserModel.findById(userId).exec();
    if (!userDoc) {
      return null;
    }

    let avatarId: string | null | undefined = undefined;

    if (avatar !== undefined) {
      if (avatar === null) {
        avatarId = null;
      } else if (typeof avatar === "string") {
        const media = await Media.findById(avatar);
        if (!media) {
          throw new AppError(messages.media.notFound, 404, { avatarId: avatar });
        }

        if (String(media.uploadedBy) !== String(userDoc._id)) {
          throw new AppError(messages.media.noPermission, 403, { avatarId: avatar });
        }

        avatarId = avatar;
      } else if (typeof avatar === "object" && avatar?.url) {
        const media = await MediaService.uploadFromUrl(avatar.url, userId, {
          name: userFields.name ?? userDoc.name ?? userDoc.email,
          description: "User avatar",
        });

        avatarId = String(media._id);
      }
    }

    const $set: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(userFields)) {
      if (value !== undefined) {
        $set[key] = value;
      }
    }

    if (avatarId !== undefined) {
      $set.avatar = avatarId;
    }

    if (settings && Object.keys(settings).length > 0) {
      for (const [key, value] of Object.entries(settings)) {
        if (key === "emailPreferences" && value && typeof value === "object") {
          for (const [prefKey, prefValue] of Object.entries(
            value as Record<string, unknown>,
          )) {
            if (prefValue !== undefined) {
              $set[`settings.emailPreferences.${prefKey}`] = prefValue;
            }
          }
          continue;
        }

        $set[`settings.${key}`] = value;
      }
    }

    if (Object.keys($set).length === 0) {
      return buildUserPayload(userDoc as UserDocumentLike);
    }

    const updatedUser = await UserModel.findByIdAndUpdate(
      userId,
      { $set },
      { new: true },
    ).exec();

    if (!updatedUser) {
      return null;
    }

    return buildUserPayload(updatedUser as UserDocumentLike);
  }

  async delete(userId: string): Promise<boolean> {
    return deleteUserData(userId);
  }
}
