import { UserDeletionJobModel } from "@modules/user/account/userDeletionJob.model";
import { MediaService } from "@modules/assets/media/media.service";
import Media from "@modules/assets/media/media.model";
import { UserModel } from "@modules/user/user.model";
import { RefreshSessionModel } from "@modules/user/auth/refreshSession.model";
import { PasswordResetModel } from "@modules/user/auth/passwordReset.model";
import { OneTimeCodeModel } from "@modules/user/account/oneTimeCode.model";
import { AuthIdentityModel } from "@modules/user/auth/authIdentity.model";
import { SubscriptionModel } from "@modules/billing/subscriptions/subscription.model";
import { PaymentModel } from "@modules/billing/payments/payment.model";
import { BonusTransactionModel } from "@modules/bonus/bonus.model";
import { LandingModel } from "@modules/landings/landing.model";
import { TrafficEventModel } from "@modules/analytics/traffic/trafficEvent.model";
import { ENV } from "@config/env";
import { logger } from "@utils/common/logger";

const RETRY_DELAY_MS = 5 * 60 * 1000;

export async function processUserDeletionJobs() {
  const now = new Date();
  const job = await UserDeletionJobModel.findOneAndUpdate(
    {
      status: { $in: ["scheduled", "failed"] },
      nextRunAt: { $lte: now },
    },
    { $set: { status: "in_progress", updatedAt: now }, $inc: { attempts: 1 } },
    { sort: { nextRunAt: 1 }, new: true },
  );

  if (!job) return;

  const userId = String(job.userId);

  try {
    const mediaItems = await Media.find({ uploadedBy: userId }).select("_id");
    for (const media of mediaItems) {
      await MediaService.delete(String(media._id));
    }

    await RefreshSessionModel.deleteMany({ userId });
    await PasswordResetModel.deleteMany({ userId });
    await OneTimeCodeModel.deleteMany({ userId });
    await AuthIdentityModel.deleteMany({ userId });
    await SubscriptionModel.deleteMany({ userId });
    await PaymentModel.deleteMany({ userId });
    await BonusTransactionModel.deleteMany({ userId });
    await LandingModel.deleteMany({ userId });
    await TrafficEventModel.deleteMany({ userId });

    await UserModel.deleteOne({ _id: userId });

    job.status = "done";
    job.error = undefined;
    job.updatedAt = new Date();
    await job.save();
  } catch (error: any) {
    job.status = "failed";
    job.error = error?.message || "unknown_error";
    job.nextRunAt = new Date(Date.now() + RETRY_DELAY_MS);
    await job.save();
    logger.error("User deletion job failed", { userId, error });
  }
}

export function startUserDeletionWorker() {
  setInterval(() => {
    processUserDeletionJobs().catch((error) => {
      logger.error("User deletion job processing failed", { error });
    });
  }, ENV.USER_DELETION_JOB_INTERVAL_MS);
}
