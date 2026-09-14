import { AppError } from "../middlewares/error.middleware";
import { OtpChallenge, type OtpChallengeDoc, type OtpPurpose } from "../models";

export type SendLimits = { cooldownSeconds: number; maxSends: number; windowMs: number };
export type CodeFields = { codeHash: string | null; codeExpiresAt: Date | null };

const NO_CODE: CodeFields = { codeHash: null, codeExpiresAt: null };

const isDuplicateKey = (error: unknown) =>
  typeof error === "object" && error !== null && (error as { code?: number }).code === 11000;

const refusal = async (purpose: OtpPurpose, identifier: string, limits: SendLimits) => {
  const current = await OtpChallenge.findOne({ purpose, identifier }).lean<OtpChallengeDoc>();
  const now = Date.now();
  if (current && current.sendCount >= limits.maxSends) {
    const retryAfterMinutes = Math.max(1, Math.ceil((current.expiresAt.getTime() - now) / 60_000));
    return new AppError("Too many codes requested.", 429, "OTP_SEND_LIMIT", { retryAfterMinutes });
  }
  const readyAt = (current?.lastSentAt.getTime() ?? now) + limits.cooldownSeconds * 1000;
  return new AppError("Please wait before requesting another code.", 429, "OTP_THROTTLED", {
    retryAfterSeconds: Math.max(1, Math.ceil((readyAt - now) / 1000)),
  });
};

export const claimSend = async (
  purpose: OtpPurpose,
  identifier: string,
  limits: SendLimits,
  code: CodeFields = NO_CODE,
) => {
  const now = new Date();
  // The TTL reaper can lag a minute behind expiresAt.
  await OtpChallenge.deleteOne({ purpose, identifier, expiresAt: { $lte: now } });

  try {
    const saved = await OtpChallenge.findOneAndUpdate(
      {
        purpose,
        identifier,
        lastSentAt: { $lte: new Date(now.getTime() - limits.cooldownSeconds * 1000) },
        sendCount: { $lt: limits.maxSends },
      },
      {
        $set: {
          ...code,
          attempts: 0,
          lastSentAt: now,
          expiresAt: new Date(now.getTime() + limits.windowMs),
        },
        $inc: { sendCount: 1 },
      },
      { upsert: true, returnDocument: "after" },
    ).lean<OtpChallengeDoc>();
    return { sendsLeft: Math.max(0, limits.maxSends - (saved?.sendCount ?? limits.maxSends)) };
  } catch (error) {
    if (isDuplicateKey(error)) throw await refusal(purpose, identifier, limits);
    throw error;
  }
};

export const hasLiveChallenge = async (purpose: OtpPurpose, identifier: string) =>
  Boolean(await OtpChallenge.exists({ purpose, identifier, expiresAt: { $gt: new Date() } }));

export const clearChallenge = async (purpose: OtpPurpose, identifier: string) => {
  await OtpChallenge.deleteOne({ purpose, identifier });
};

export const reserveAttempt = async (purpose: OtpPurpose, identifier: string, maxAttempts: number) => {
  const reserved = await OtpChallenge.findOneAndUpdate(
    { purpose, identifier, attempts: { $lt: maxAttempts } },
    { $inc: { attempts: 1 } },
    { returnDocument: "after" },
  ).lean<OtpChallengeDoc>();
  if (reserved) return reserved;

  const exists = await OtpChallenge.exists({ purpose, identifier });
  throw exists
    ? new AppError("Too many incorrect codes. Request a new one.", 429, "OTP_ATTEMPTS_EXCEEDED")
    : new AppError("That code is incorrect or has expired.", 401, "OTP_INVALID");
};

export const consumeChallenge = async (challenge: OtpChallengeDoc) =>
  Boolean(await OtpChallenge.findOneAndDelete({ _id: challenge._id, codeHash: challenge.codeHash }));
