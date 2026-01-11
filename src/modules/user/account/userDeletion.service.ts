import { MediaService } from "@modules/assets/media/media.service";
import Media from "@modules/assets/media/media.model";
import { AuthIdentityModel } from "@modules/user/auth/authIdentity.model";
import { RefreshSessionModel } from "@modules/user/auth/refreshSession.model";
import { PasswordResetModel } from "@modules/user/auth/passwordReset.model";
import { OneTimeCodeModel } from "@modules/user/account/oneTimeCode.model";
import { SubscriptionModel } from "@modules/billing/subscriptions/subscription.model";
import { PaymentModel } from "@modules/billing/payments/payment.model";
import { BonusTransactionModel } from "@modules/bonus/bonus.model";
import { LandingModel } from "@modules/landings/landing.model";
import { TrafficEventModel } from "@modules/analytics/traffic/trafficEvent.model";
import { UserModel } from "@modules/user/user.model";

export async function deleteUserAuthData(userId: string): Promise<void> {
  await RefreshSessionModel.deleteMany({ userId });
  await AuthIdentityModel.deleteMany({ userId });
}

export async function deleteUserData(userId: string): Promise<boolean> {
  const mediaItems = await Media.find({ uploadedBy: userId }).select("_id");
  for (const media of mediaItems) {
    await MediaService.delete(String(media._id));
  }

  await deleteUserAuthData(userId);
  await PasswordResetModel.deleteMany({ userId });
  await OneTimeCodeModel.deleteMany({ userId });
  await SubscriptionModel.deleteMany({ userId });
  await PaymentModel.deleteMany({ userId });
  await BonusTransactionModel.deleteMany({ userId });
  await LandingModel.deleteMany({ userId });
  await TrafficEventModel.deleteMany({ userId });

  const result = await UserModel.deleteOne({ _id: userId });
  return result.deletedCount > 0;
}
