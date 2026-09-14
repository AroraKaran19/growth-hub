import type { NextFunction, Request, Response } from "express";
import { env } from "../config/env";
import { loadAccount } from "../services/account.service";
import { isSessionLive } from "../services/session.service";
import type { AccountType } from "../types/auth";
import { AccessTokenError, verifyAccessToken } from "../utils/tokens";
import { AppError } from "./error.middleware";

export const requireAuth =
  (...allowed: AccountType[]) =>
  async (req: Request, _res: Response, next: NextFunction) => {
    const authorization = req.headers.authorization ?? "";
    if (!authorization.startsWith("Bearer ")) {
      next(new AppError("Sign in to continue.", 401, "ACCESS_TOKEN_INVALID"));
      return;
    }

    try {
      const claims = verifyAccessToken(authorization.slice(7), env().jwtAccessSecret, allowed);
      const account = (await isSessionLive(claims.sessionId, claims.accountType))
        ? await loadAccount(claims.accountType, claims.accountId)
        : null;

      if (!account) {
        next(new AppError("Please sign in again.", 401, "SESSION_REVOKED"));
        return;
      }
      if (account.status !== "active") {
        next(new AppError("This account has been disabled.", 403, "ACCOUNT_DISABLED"));
        return;
      }

      req.auth = { ...claims, account: account.summary };
      next();
    } catch (error) {
      if (error instanceof AccessTokenError) {
        const code = error.reason === "expired" ? "ACCESS_TOKEN_EXPIRED" : "ACCESS_TOKEN_INVALID";
        next(new AppError("Please sign in again.", 401, code));
        return;
      }
      next(error);
    }
  };
