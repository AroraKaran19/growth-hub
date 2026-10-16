import type { Request, Response } from "express";
import { z } from "zod";
import { AppError, asyncHandler, sendSuccessResponse } from "../middlewares/error.middleware";
import { loadAccount } from "../services/account.service";
import { endSession, rotateSession } from "../services/session.service";
import { updateOwnStaffProfile } from "../services/staffProfile.service";
import { isAccountType } from "../types/auth";
import { parseBody } from "../utils/validate";
import { emailSchema, nameSchema } from "../validators/common";

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

const profileSchema = z
  .object({ name: nameSchema.optional(), email: emailSchema.optional(), currentPassword: z.string().max(200).optional() })
  .refine((body) => body.name !== undefined || body.email !== undefined, "Send a name or an email.");

/** Staff can rename themselves and, with their password, change their email; venue and access stay with admins. */
export const patchMe = asyncHandler(async (req: Request, res: Response) => {
  const { accountType, accountId, sessionId } = req.auth!;
  if (accountType === "member") throw new AppError("Use your account profile instead.", 403, "PERMISSION_DENIED");
  await updateOwnStaffProfile(accountType, accountId, sessionId, parseBody(profileSchema, req.body));
  const loaded = await loadAccount(accountType, accountId);
  if (!loaded) throw new AppError("Please sign in again.", 401, "SESSION_REVOKED");
  sendSuccessResponse(res, { account: loaded.summary }, "Profile saved");
});
