import { Types } from "mongoose";
import { env } from "../config/env";
import { ACCESS_TOKEN_TTL_SECONDS, SESSION_LIFETIMES } from "../constants/auth";
import { AppError } from "../middlewares/error.middleware";
import { RefreshToken, Session, type RefreshTokenDoc, type SessionDoc } from "../models";
import type { AccountType } from "../types/auth";
import { generateRefreshToken, hashToken, signAccessToken } from "../utils/tokens";
import { loadAccount, type AccountSummary } from "./account.service";
import { classifyRefresh, nextIdleExpiry } from "./refreshPolicy";

export type DeviceInfo = { userAgent: string; ipAddress: string };

export type IssuedTokens = {
  accessToken: string;
  accessTokenExpiresAt: string;
  refreshToken: string;
  sessionExpiresAt: string;
};

const signInAgain = (code: string) => new AppError("Please sign in again.", 401, code);

const issueRefreshToken = async (sessionId: Types.ObjectId, expiresAt: Date) => {
  const refreshToken = generateRefreshToken();
  await RefreshToken.create({ tokenHash: hashToken(refreshToken), sessionId, expiresAt });
  return refreshToken;
};

const issueAccessToken = (
  accountType: AccountType,
  accountId: Types.ObjectId,
  sessionId: Types.ObjectId,
  now: Date,
) => ({
  accessToken: signAccessToken(
    { accountId: accountId.toString(), sessionId: sessionId.toString(), accountType },
    env().jwtAccessSecret,
    ACCESS_TOKEN_TTL_SECONDS,
  ),
  accessTokenExpiresAt: new Date(now.getTime() + ACCESS_TOKEN_TTL_SECONDS * 1000).toISOString(),
});

const dropSessionTokens = (sessionId: Types.ObjectId) => RefreshToken.deleteMany({ sessionId });

export const startSession = async (
  accountType: AccountType,
  accountId: Types.ObjectId,
  device: DeviceInfo,
): Promise<IssuedTokens> => {
  const now = new Date();
  const { idleMs, absoluteMs } = SESSION_LIFETIMES[accountType];
  const absoluteExpiresAt = new Date(now.getTime() + absoluteMs);

  const session = await Session.create({
    accountType,
    accountId,
    device,
    lastUsedAt: now,
    idleExpiresAt: nextIdleExpiry(now, idleMs, absoluteExpiresAt),
    absoluteExpiresAt,
  });
  const refreshToken = await issueRefreshToken(session._id, absoluteExpiresAt);

  return {
    ...issueAccessToken(accountType, accountId, session._id, now),
    refreshToken,
    sessionExpiresAt: absoluteExpiresAt.toISOString(),
  };
};

export const rotateSession = async (
  presentedToken: string,
  accountType: AccountType,
): Promise<IssuedTokens & { account: AccountSummary }> => {
  const now = new Date();
  const token = await RefreshToken.findOne({ tokenHash: hashToken(presentedToken) }).lean<RefreshTokenDoc>();
  if (!token) throw signInAgain("INVALID_REFRESH");

  const session = await Session.findById(token.sessionId).lean<SessionDoc>();
  if (session && session.accountType !== accountType) throw signInAgain("INVALID_REFRESH");

  const decision = classifyRefresh(token, session, now);
  if (!session || decision === "expired") {
    await dropSessionTokens(token.sessionId);
    throw signInAgain("SESSION_EXPIRED");
  }
  if (decision === "reuse") {
    await Session.updateOne({ _id: session._id }, { $set: { revokedAt: now, revokedReason: "reuse" } });
    await dropSessionTokens(session._id);
    throw signInAgain("REFRESH_REUSED");
  }

  const account = await loadAccount(accountType, session.accountId);
  if (!account || account.status !== "active") {
    await Session.deleteOne({ _id: session._id });
    await dropSessionTokens(session._id);
    throw account
      ? new AppError("This account has been disabled.", 403, "ACCOUNT_DISABLED")
      : signInAgain("SESSION_EXPIRED");
  }

  if (decision === "ok") {
    await RefreshToken.updateOne({ _id: token._id, rotatedAt: null }, { $set: { rotatedAt: now } });
  }
  const refreshToken = await issueRefreshToken(session._id, session.absoluteExpiresAt);
  await Session.updateOne(
    { _id: session._id },
    {
      $set: {
        lastUsedAt: now,
        idleExpiresAt: nextIdleExpiry(now, SESSION_LIFETIMES[accountType].idleMs, session.absoluteExpiresAt),
      },
    },
  );

  return {
    ...issueAccessToken(accountType, session.accountId, session._id, now),
    refreshToken,
    sessionExpiresAt: session.absoluteExpiresAt.toISOString(),
    account: account.summary,
  };
};

export const endSession = async (presentedToken: string) => {
  const token = await RefreshToken.findOne({ tokenHash: hashToken(presentedToken) }).lean<RefreshTokenDoc>();
  if (!token) return;
  await Session.deleteOne({ _id: token.sessionId });
  await dropSessionTokens(token.sessionId);
};

export const isSessionLive = async (sessionId: string, accountType: AccountType) => {
  if (!Types.ObjectId.isValid(sessionId)) return false;
  const now = new Date();
  const found = await Session.exists({
    _id: sessionId,
    accountType,
    revokedAt: null,
    idleExpiresAt: { $gt: now },
    absoluteExpiresAt: { $gt: now },
  });
  return Boolean(found);
};

export type RevokeReason = "disabled" | "venue-changed" | "password-changed" | "details-changed";

export const revokeAccountSessions = async (
  accountType: AccountType,
  accountId: Types.ObjectId | string,
  reason: RevokeReason,
  keepSessionId?: string,
) => {
  const keep = keepSessionId && Types.ObjectId.isValid(keepSessionId) ? { _id: { $ne: new Types.ObjectId(keepSessionId) } } : {};
  const sessions = await Session.find({ accountType, accountId, revokedAt: null, ...keep }, { _id: 1 }).lean<
    { _id: Types.ObjectId }[]
  >();
  const ids = sessions.map((session) => session._id);
  if (ids.length === 0) return 0;

  await Session.updateMany({ _id: { $in: ids } }, { $set: { revokedAt: new Date(), revokedReason: reason } });
  await RefreshToken.deleteMany({ sessionId: { $in: ids } });
  return ids.length;
};

export const lastActiveAt = async (accountType: AccountType, accountIds: Types.ObjectId[]) => {
  const now = new Date();
  const rows = await Session.aggregate<{ _id: Types.ObjectId; lastActiveAt: Date }>([
    {
      $match: {
        accountType,
        accountId: { $in: accountIds },
        revokedAt: null,
        idleExpiresAt: { $gt: now },
        absoluteExpiresAt: { $gt: now },
      },
    },
    { $group: { _id: "$accountId", lastActiveAt: { $max: "$lastUsedAt" } } },
  ]);
  return new Map(rows.map((row) => [row._id.toString(), row.lastActiveAt]));
};
