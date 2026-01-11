import crypto from "crypto";
import { Types } from "mongoose";
import { ENV } from "@config/env";
import { AppError } from "@utils/common/appError";
import { messages } from "@constants/messages";
import {
  OneTimeCodeDocument,
  OneTimeCodeModel,
  OneTimeCodePurpose,
} from "@modules/user/account/oneTimeCode.model";

export class OneTimeCodeService {
  private static hashCode(raw: string) {
    return crypto.createHash("sha256").update(raw).digest("hex");
  }

  private static normalizeEmail(email?: string) {
    return email?.trim().toLowerCase();
  }

  static async createCode(input: {
    userId: string;
    purpose: OneTimeCodePurpose;
    targetEmail?: string;
  }) {
    const targetEmail = this.normalizeEmail(input.targetEmail);
    const userId = new Types.ObjectId(input.userId);

    const windowMs = ENV.OTP_RATE_LIMIT_WINDOW_MINUTES * 60 * 1000;
    const since = new Date(Date.now() - windowMs);
    const recentCount = await OneTimeCodeModel.countDocuments({
      userId,
      purpose: input.purpose,
      createdAt: { $gte: since },
    });

    if (recentCount >= ENV.OTP_RATE_LIMIT_MAX) {
      throw new AppError(messages.auth.tooManyOtpRequests, 429, {
        purpose: input.purpose,
        windowMs,
        max: ENV.OTP_RATE_LIMIT_MAX,
      });
    }

    await OneTimeCodeModel.updateMany(
      {
        userId,
        purpose: input.purpose,
        consumedAt: { $exists: false },
      },
      { $set: { consumedAt: new Date() } },
    );

    const code = String(Math.floor(100000 + Math.random() * 900000));
    const codeHash = this.hashCode(code);
    const expiresAt = new Date(
      Date.now() + ENV.OTP_CODE_TTL_MINUTES * 60 * 1000,
    );

    await OneTimeCodeModel.create({
      userId,
      purpose: input.purpose,
      targetEmail,
      codeHash,
      expiresAt,
      attemptsLeft: 5,
    });

    return { code, expiresAt };
  }

  static async verifyCode(input: {
    userId: string;
    purpose: OneTimeCodePurpose;
    targetEmail?: string;
    code: string;
  }): Promise<OneTimeCodeDocument> {
    const targetEmail = this.normalizeEmail(input.targetEmail);
    const now = new Date();
    const record = await OneTimeCodeModel.findOne({
      userId: input.userId,
      purpose: input.purpose,
      ...(targetEmail ? { targetEmail } : {}),
      consumedAt: { $exists: false },
      expiresAt: { $gt: now },
    });

    if (!record) {
      throw new AppError(messages.auth.invalidOneTimeCode, 400);
    }

    const codeHash = this.hashCode(input.code.trim());
    if (codeHash !== record.codeHash) {
      record.attemptsLeft = Math.max(0, record.attemptsLeft - 1);
      if (record.attemptsLeft <= 0) {
        record.consumedAt = new Date();
      }
      await record.save();
      throw new AppError(messages.auth.invalidOneTimeCode, 400, {
        attemptsLeft: record.attemptsLeft,
      });
    }

    record.consumedAt = new Date();
    await record.save();
    return record;
  }
}
