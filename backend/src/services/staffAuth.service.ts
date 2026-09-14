import bcrypt from "bcrypt";
import crypto from "crypto";
import type { Types } from "mongoose";
import { env } from "../config/env";
import { EMAIL_OTP_LIMITS } from "../constants/auth";
import { AppError } from "../middlewares/error.middleware";
import { Admin, PartnerStaff, type AdminDoc, type OtpPurpose, type PartnerStaffDoc } from "../models";
import type { AccountStatus } from "../types/auth";
import { adminSummary, partnerSummary, type AdminAccount, type PartnerAccount } from "./account.service";
import { sendTemplateEmail } from "./msg91.service";
import { claimSend, consumeChallenge, reserveAttempt } from "./otpChallenge.service";
import { startSession, type DeviceInfo, type IssuedTokens } from "./session.service";

export type StaffAccountType = "partner" | "admin";

const PURPOSES: Record<StaffAccountType, OtpPurpose> = {
  partner: "partner_email",
  admin: "admin_email",
};
const CODE_PATTERN = new RegExp(`^\\d{${EMAIL_OTP_LIMITS.codeLength}}$`);
// Compared when no code exists, so a missing account takes as long as a wrong code.
const placeholderHash = bcrypt.hash("0".repeat(EMAIL_OTP_LIMITS.codeLength), EMAIL_OTP_LIMITS.bcryptRounds);

type StaffRecord = {
  id: Types.ObjectId;
  status: AccountStatus;
  account: PartnerAccount | AdminAccount;
};

const findStaff = async (accountType: StaffAccountType, email: string): Promise<StaffRecord | null> => {
  if (accountType === "partner") {
    const staff = await PartnerStaff.findOne({ email }).lean<PartnerStaffDoc>();
    return staff ? { id: staff._id, status: staff.status, account: partnerSummary(staff) } : null;
  }
  const admin = await Admin.findOne({ email }).lean<AdminDoc>();
  return admin ? { id: admin._id, status: admin.status, account: adminSummary(admin) } : null;
};

const generateCode = () =>
  String(crypto.randomInt(0, 10 ** EMAIL_OTP_LIMITS.codeLength)).padStart(EMAIL_OTP_LIMITS.codeLength, "0");

const deliverCode = (email: string, code: string) => {
  const { email: settings, msg91AuthKey, isProduction } = env();
  if (!settings || !msg91AuthKey) {
    if (!isProduction) console.log(`[dev] sign-in code for ${email}: ${code}`);
    return;
  }
  sendTemplateEmail(
    {
      authKey: msg91AuthKey,
      domain: settings.domain,
      from: settings.from,
      fromName: settings.fromName,
      templateId: settings.otpTemplateId,
    },
    email,
    { code, expiry_minutes: String(EMAIL_OTP_LIMITS.codeTtlMs / 60_000) },
  ).catch((error: unknown) => {
    console.error("Sign-in code email failed:", error instanceof Error ? error.message : error);
  });
};

export const requestStaffCode = async (accountType: StaffAccountType, email: string) => {
  const staff = await findStaff(accountType, email);
  const canSignIn = staff?.status === "active";
  const code = generateCode();
  const codeHash = await bcrypt.hash(code, EMAIL_OTP_LIMITS.bcryptRounds);

  await claimSend(PURPOSES[accountType], email, EMAIL_OTP_LIMITS, {
    codeHash: canSignIn ? codeHash : null,
    codeExpiresAt: canSignIn ? new Date(Date.now() + EMAIL_OTP_LIMITS.codeTtlMs) : null,
  });
  if (canSignIn) deliverCode(email, code);

  return {
    cooldownSeconds: EMAIL_OTP_LIMITS.cooldownSeconds,
    codeLength: EMAIL_OTP_LIMITS.codeLength,
    expiresInMinutes: EMAIL_OTP_LIMITS.codeTtlMs / 60_000,
  };
};

const invalidCode = () => new AppError("That code is incorrect or has expired.", 401, "OTP_INVALID");

export const verifyStaffCode = async (
  accountType: StaffAccountType,
  email: string,
  code: string,
  device: DeviceInfo,
): Promise<IssuedTokens & { account: PartnerAccount | AdminAccount }> => {
  const challenge = await reserveAttempt(PURPOSES[accountType], email, EMAIL_OTP_LIMITS.maxAttempts);
  const matches =
    CODE_PATTERN.test(code) && (await bcrypt.compare(code, challenge.codeHash ?? (await placeholderHash)));
  const current =
    challenge.codeHash !== null &&
    challenge.codeExpiresAt !== null &&
    challenge.codeExpiresAt.getTime() > Date.now();
  if (!matches || !current || !(await consumeChallenge(challenge))) throw invalidCode();

  const staff = await findStaff(accountType, email);
  if (!staff) throw invalidCode();
  if (staff.status !== "active") {
    throw new AppError("This account has been disabled.", 403, "ACCOUNT_DISABLED");
  }

  const tokens = await startSession(accountType, staff.id, device);
  return { ...tokens, account: staff.account };
};
