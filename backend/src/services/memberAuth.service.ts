import { env } from "../config/env";
import { MEMBER_SMS_LIMITS } from "../constants/auth";
import { AppError } from "../middlewares/error.middleware";
import { Member, type MemberDoc } from "../models";
import { normalizeEmail } from "../utils/email";
import type { ParsedPhone } from "../utils/phone";
import { memberSummary, type MemberAccount } from "./account.service";
import { verifyWidgetToken } from "./msg91.service";
import { claimSend, clearChallenge, hasLiveChallenge } from "./otpChallenge.service";
import { startSession, type DeviceInfo, type IssuedTokens } from "./session.service";

const MAX_NAME_LENGTH = 80;

const invalidCode = () => new AppError("That code is incorrect or has expired.", 401, "OTP_INVALID");
const providerUnavailable = () =>
  new AppError("Phone sign-in is unavailable right now.", 503, "OTP_PROVIDER_UNAVAILABLE");

export const claimMemberSms = async (phone: ParsedPhone) => {
  const { sendsLeft } = await claimSend("member_sms", phone.e164, MEMBER_SMS_LIMITS);
  return { cooldownSeconds: MEMBER_SMS_LIMITS.cooldownSeconds, sendsLeft };
};

const confirmPhone = async (phone: ParsedPhone, msg91Token: string) => {
  if (!(await hasLiveChallenge("member_sms", phone.e164))) {
    throw new AppError("Request a new code.", 400, "OTP_EXPIRED");
  }
  const { msg91AuthKey, isProduction } = env();
  if (!msg91AuthKey) throw providerUnavailable();
  if (!msg91Token) throw invalidCode();

  const check = await verifyWidgetToken(msg91Token, msg91AuthKey);
  if (!check.ok) throw check.reason === "unavailable" ? providerUnavailable() : invalidCode();

  if (!isProduction) {
    const echo = !check.verifiedDigits
      ? "not returned"
      : check.verifiedDigits === phone.digits
        ? "returned and matches"
        : "returned but differs";
    console.log(`[dev] MSG91 verified number: ${echo}`);
  }
  // Without the number MSG91 confirmed, a token for one phone could sign in as any other.
  if (!check.verifiedDigits) {
    throw new AppError("We couldn't confirm your number.", 401, "PHONE_NOT_CONFIRMED");
  }
  if (check.verifiedDigits !== phone.digits) {
    throw new AppError("We couldn't confirm your number.", 401, "PHONE_MISMATCH");
  }
};

export const signInMember = async (
  phone: ParsedPhone,
  msg91Token: string,
  device: DeviceInfo,
): Promise<IssuedTokens & { account: MemberAccount }> => {
  const { isProduction, authTestPhone } = env();
  if (isProduction || authTestPhone !== phone.e164) {
    await confirmPhone(phone, msg91Token);
  }

  const member = await Member.findOneAndUpdate(
    { phoneE164: phone.e164 },
    { $setOnInsert: { countryCode: phone.countryCode, phoneNumber: phone.phoneNumber } },
    { upsert: true, returnDocument: "after" },
  ).lean<MemberDoc>();
  if (!member) throw new AppError("Sign-in failed. Please try again.", 500);
  if (member.status !== "active") {
    throw new AppError("This account has been disabled.", 403, "ACCOUNT_DISABLED");
  }

  await clearChallenge("member_sms", phone.e164);
  const tokens = await startSession("member", member._id, device);
  return { ...tokens, account: memberSummary(member) };
};

export const updateMemberProfile = async (
  memberId: string,
  input: { name?: unknown; email?: unknown },
): Promise<MemberAccount> => {
  const changes: { name?: string; email?: string | null } = {};

  if (input.name !== undefined) {
    const name = String(input.name ?? "").trim().replace(/\s+/g, " ");
    if (!name || name.length > MAX_NAME_LENGTH) {
      throw new AppError("Enter your name.", 400, "NAME_INVALID");
    }
    changes.name = name;
  }

  if (input.email !== undefined) {
    const raw = String(input.email ?? "").trim();
    const email = raw ? normalizeEmail(raw) : null;
    if (raw && !email) throw new AppError("Enter a valid email address.", 400, "EMAIL_INVALID");
    changes.email = email;
  }

  const member = await Member.findByIdAndUpdate(
    memberId,
    { $set: changes },
    { returnDocument: "after" },
  ).lean<MemberDoc>();
  if (!member) throw new AppError("Please sign in again.", 401, "SESSION_REVOKED");
  return memberSummary(member);
};
