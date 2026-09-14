import { REFRESH_GRACE_MS } from "../constants/auth";

export type RefreshDecision = "ok" | "grace" | "reuse" | "expired";

type TokenState = { rotatedAt: Date | null };
type SessionState = { revokedAt: Date | null; idleExpiresAt: Date; absoluteExpiresAt: Date };

export const classifyRefresh = (
  token: TokenState,
  session: SessionState | null,
  now: Date,
): RefreshDecision => {
  const at = now.getTime();
  if (
    !session ||
    session.revokedAt ||
    session.idleExpiresAt.getTime() <= at ||
    session.absoluteExpiresAt.getTime() <= at
  ) {
    return "expired";
  }
  if (!token.rotatedAt) return "ok";
  return at - token.rotatedAt.getTime() <= REFRESH_GRACE_MS ? "grace" : "reuse";
};

export const nextIdleExpiry = (now: Date, idleMs: number, absoluteExpiresAt: Date) =>
  new Date(Math.min(now.getTime() + idleMs, absoluteExpiresAt.getTime()));
