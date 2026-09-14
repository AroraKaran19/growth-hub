import crypto from "crypto";
import jwt from "jsonwebtoken";
import { isAccountType, type AccountType } from "../types/auth";

const ISSUER = "growth-hub-api";

export type AccessClaims = {
  accountId: string;
  sessionId: string;
  accountType: AccountType;
};

export class AccessTokenError extends Error {
  constructor(public readonly reason: "expired" | "invalid") {
    super(`Access token ${reason}`);
  }
}

export const generateRefreshToken = () => crypto.randomBytes(32).toString("base64url");

export const hashToken = (token: string) =>
  crypto.createHash("sha256").update(token).digest("hex");

export const signAccessToken = (claims: AccessClaims, secret: string, ttlSeconds: number) =>
  jwt.sign({ sid: claims.sessionId }, secret, {
    algorithm: "HS256",
    subject: claims.accountId,
    audience: claims.accountType,
    issuer: ISSUER,
    expiresIn: ttlSeconds,
  });

export const verifyAccessToken = (
  token: string,
  secret: string,
  allowed: readonly AccountType[],
): AccessClaims => {
  let payload: string | jwt.JwtPayload;
  try {
    payload = jwt.verify(token, secret, { algorithms: ["HS256"], issuer: ISSUER });
  } catch (error) {
    throw new AccessTokenError(error instanceof jwt.TokenExpiredError ? "expired" : "invalid");
  }

  if (
    typeof payload === "string" ||
    typeof payload.sub !== "string" ||
    typeof payload.sid !== "string" ||
    !isAccountType(payload.aud) ||
    !allowed.includes(payload.aud)
  ) {
    throw new AccessTokenError("invalid");
  }

  return { accountId: payload.sub, sessionId: payload.sid, accountType: payload.aud };
};
