import mongoose from "mongoose";
import { ENV } from "@config/env";
import { UserModel } from "@modules/user/user.model";
import { AuthIdentityModel } from "@modules/user/auth/authIdentity.model";
import { logger } from "@utils/common/logger";

async function run() {
  await mongoose.connect(ENV.MONGO_URI);
  logger.info("✅ Connected to MongoDB");

  const users = await UserModel.find({
    email: { $exists: true, $ne: "" },
    authProviders: { $not: { $elemMatch: { provider: "email" } } },
  });

  for (const user of users) {
    const email = user.email?.toLowerCase();
    if (!email) continue;

    user.email = email;
    user.authProviders.push({
      provider: "email",
      providerId: email,
      email,
      addedAt: new Date(),
      lastUsedAt: new Date(),
    });

    await user.save();

    const existing = await AuthIdentityModel.findOne({
      provider: "email",
      providerId: email,
    });
    if (!existing) {
      await AuthIdentityModel.create({
        provider: "email",
        providerId: email,
        userId: user._id,
      });
    }
  }

  logger.info(`✅ Migrated ${users.length} users`);
  await mongoose.disconnect();
}

run().catch((error) => {
  logger.error("❌ Migration failed", error);
  process.exit(1);
});
