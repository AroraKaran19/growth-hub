import type { AccountType } from "../types/auth";

const MINUTE_MS = 60 * 1000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;

export const ACCESS_TOKEN_TTL_SECONDS = 15 * 60;
export const REFRESH_GRACE_MS = 60 * 1000;

export const SESSION_LIFETIMES: Record<AccountType, { idleMs: number; absoluteMs: number }> = {
  member: { idleMs: 30 * DAY_MS, absoluteMs: 90 * DAY_MS },
  partner: { idleMs: 7 * DAY_MS, absoluteMs: 30 * DAY_MS },
  admin: { idleMs: 12 * HOUR_MS, absoluteMs: 7 * DAY_MS },
};

export const MEMBER_SMS_LIMITS = {
  cooldownSeconds: 60,
  maxSends: 5,
  windowMs: 60 * MINUTE_MS,
};

export const PASSWORD_RULES = {
  minLength: 10,
  // bcrypt ignores everything past 72 bytes.
  maxBytes: 72,
  bcryptRounds: 12,
};

export const SIGN_IN_LIMITS = { maxAttempts: 5, windowMs: 15 * MINUTE_MS };

export const RESET_LIMITS = {
  cooldownSeconds: 60,
  maxSends: 3,
  windowMs: 15 * MINUTE_MS,
  linkTtlMs: 30 * MINUTE_MS,
};
