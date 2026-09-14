import type { Request, Response } from "express";
import { AppError, asyncHandler, sendSuccessResponse } from "../middlewares/error.middleware";
import { endSession, rotateSession } from "../services/session.service";
import { isAccountType } from "../types/auth";

export const refresh = asyncHandler(async (req: Request, res: Response) => {
  const { refreshToken, accountType } = req.body ?? {};
  if (typeof refreshToken !== "string" || !refreshToken || !isAccountType(accountType)) {
    throw new AppError("Please sign in again.", 401, "INVALID_REFRESH");
  }
  sendSuccessResponse(res, await rotateSession(refreshToken, accountType), "Session refreshed");
});

export const logout = asyncHandler(async (req: Request, res: Response) => {
  const { refreshToken } = req.body ?? {};
  if (typeof refreshToken === "string" && refreshToken) await endSession(refreshToken);
  sendSuccessResponse(res, null, "Signed out");
});

export const me = asyncHandler(async (req: Request, res: Response) => {
  sendSuccessResponse(res, { account: req.auth!.account }, "Current account");
});
