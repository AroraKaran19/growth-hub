import type { Request, Response } from "express";
import { z } from "zod";
import { AppError, asyncHandler, sendSuccessResponse } from "../middlewares/error.middleware";
import { Admin, PartnerStaff } from "../models";
import { loadAccount } from "../services/account.service";
import { endSession, rotateSession } from "../services/session.service";
import { isAccountType } from "../types/auth";
import { parseBody } from "../utils/validate";
import { nameSchema } from "../validators/common";

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

const profileSchema = z.object({ name: nameSchema });

/** Staff can rename themselves; email, venue and access stay with whoever manages them. */
export const patchMe = asyncHandler(async (req: Request, res: Response) => {
  const { accountType, accountId } = req.auth!;
  if (accountType === "member") throw new AppError("Use your account profile instead.", 403, "PERMISSION_DENIED");
  const { name } = parseBody(profileSchema, req.body);
  const model = accountType === "admin" ? Admin : PartnerStaff;
  await (model as typeof Admin).updateOne({ _id: accountId }, { $set: { name } });
  const loaded = await loadAccount(accountType, accountId);
  if (!loaded) throw new AppError("Please sign in again.", 401, "SESSION_REVOKED");
  sendSuccessResponse(res, { account: loaded.summary }, "Profile saved");
});
