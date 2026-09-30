import type { Request, Response } from "express";
import { AppError, asyncHandler, sendSuccessResponse } from "../middlewares/error.middleware";
import { deviceInfo } from "../middlewares/relay.middleware";
import {
  changePassword,
  requestPasswordReset,
  resetPassword,
  signIn,
  type StaffAccountType,
} from "../services/staffAuth.service";
import { normalizeEmail } from "../utils/email";

const requireEmail = (value: unknown) => {
  const email = normalizeEmail(value);
  if (!email) throw new AppError("Enter a valid email address.", 400, "EMAIL_INVALID");
  return email;
};

const text = (value: unknown) => (typeof value === "string" ? value : "");

export const postSignIn = (accountType: StaffAccountType) =>
  asyncHandler(async (req: Request, res: Response) => {
    const body = req.body ?? {};
    const result = await signIn(accountType, requireEmail(body.email), text(body.password), deviceInfo(req));
    sendSuccessResponse(res, result, "Signed in");
  });

export const postChangePassword = (accountType: StaffAccountType) =>
  asyncHandler(async (req: Request, res: Response) => {
    const body = req.body ?? {};
    const result = await changePassword(
      accountType,
      requireEmail(body.email),
      text(body.password),
      text(body.newPassword),
      deviceInfo(req),
    );
    sendSuccessResponse(res, result, "Password changed");
  });

export const postForgotPassword = (accountType: StaffAccountType) =>
  asyncHandler(async (req: Request, res: Response) => {
    const result = await requestPasswordReset(accountType, requireEmail(req.body?.email));
    sendSuccessResponse(res, result, "If this email has an account, a reset link is on its way");
  });

export const postResetPassword = (accountType: StaffAccountType) =>
  asyncHandler(async (req: Request, res: Response) => {
    const body = req.body ?? {};
    const result = await resetPassword(accountType, text(body.token), text(body.newPassword));
    sendSuccessResponse(res, result, "Password updated");
  });
