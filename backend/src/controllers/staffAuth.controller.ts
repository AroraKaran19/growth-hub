import type { Request, Response } from "express";
import { AppError, asyncHandler, sendSuccessResponse } from "../middlewares/error.middleware";
import { deviceInfo } from "../middlewares/relay.middleware";
import { requestStaffCode, verifyStaffCode, type StaffAccountType } from "../services/staffAuth.service";
import { normalizeEmail } from "../utils/email";

const requireEmail = (value: unknown) => {
  const email = normalizeEmail(value);
  if (!email) throw new AppError("Enter a valid email address.", 400, "EMAIL_INVALID");
  return email;
};

export const requestCode = (accountType: StaffAccountType) =>
  asyncHandler(async (req: Request, res: Response) => {
    const result = await requestStaffCode(accountType, requireEmail(req.body?.email));
    sendSuccessResponse(res, result, "If this email has an account, a code is on its way");
  });

export const verifyCode = (accountType: StaffAccountType) =>
  asyncHandler(async (req: Request, res: Response) => {
    const body = req.body ?? {};
    const result = await verifyStaffCode(
      accountType,
      requireEmail(body.email),
      String(body.code ?? "").trim(),
      deviceInfo(req),
    );
    sendSuccessResponse(res, result, "Signed in");
  });
