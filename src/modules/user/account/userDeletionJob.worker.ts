import { UserDeletionJobModel } from "@modules/user/account/userDeletionJob.model";
import { deleteUserData } from "@modules/user/account/userDeletion.service";
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
    await deleteUserData(userId);

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
