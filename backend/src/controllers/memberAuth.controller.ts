import type { Request, Response } from "express";
import { AppError, asyncHandler, sendSuccessResponse } from "../middlewares/error.middleware";
import { deviceInfo } from "../middlewares/relay.middleware";
import { claimMemberSms, signInMember, updateMemberProfile } from "../services/memberAuth.service";
import { parsePhone } from "../utils/phone";

const requirePhone = (body: Record<string, unknown>) => {
  const phone = parsePhone(body.countryCode, body.phoneNumber);
  if (!phone) throw new AppError("Enter a valid mobile number.", 400, "PHONE_INVALID");
  return phone;
};

export const claimSms = asyncHandler(async (req: Request, res: Response) => {
  const result = await claimMemberSms(requirePhone(req.body ?? {}));
  sendSuccessResponse(res, result, "Code can be sent");
});

export const verifySms = asyncHandler(async (req: Request, res: Response) => {
  const body = req.body ?? {};
  const result = await signInMember(
    requirePhone(body),
    String(body.msg91Token ?? "").trim(),
    deviceInfo(req),
  );
  sendSuccessResponse(res, result, "Signed in");
});

export const updateMe = asyncHandler(async (req: Request, res: Response) => {
  const account = await updateMemberProfile(req.auth!.accountId, req.body ?? {});
  sendSuccessResponse(res, { account }, "Profile updated");
});
