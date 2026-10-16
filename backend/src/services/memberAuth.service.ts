import { env } from "../config/env";
import { MEMBER_SMS_LIMITS } from "../constants/auth";
import { AppError } from "../middlewares/error.middleware";
import { Member, type MemberDoc } from "../models";
import { normalizeEmail } from "../utils/email";
import type { ParsedPhone } from "../utils/phone";
import { parseBody } from "../utils/validate";
import { profileFieldsSchema, type ProfileFieldsInput } from "../validators/member";
import { memberSummary, type MemberAccount } from "./account.service";
import { tellWelcome } from "./memberNotices";
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
  const { authTestPhone, authTestOtp } = env();
  const isReviewLogin = Boolean(authTestPhone) && phone.e164 === authTestPhone;

  if (isReviewLogin) {
    // Both halves, or nothing: the number is public, the code is not.
    if (!authTestOtp || msg91Token !== authTestOtp) throw invalidCode();
    console.warn(`⚠️  Review sign-in used for ${phone.e164}`);
  } else {
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
  input: Record<string, unknown>,
): Promise<MemberAccount> => {
  const changes: { name?: string; email?: string | null } & ProfileFieldsInput = {
    ...parseBody(profileFieldsSchema, input),
  };

  if (input.name !== undefined) {
    const name = String(input.name ?? "").trim().replace(/\s+/g, " ");
    if (!name || name.length > MAX_NAME_LENGTH) {
      throw new AppError("Enter your name.", 400, "NAME_INVALID");
    }
    changes.name = name;
  }

  if (input.email !== undefined) {
    const raw = String(input.email ?? "").trim();
    // Notices go by email only, so a member always keeps one.
    if (!raw) throw new AppError("Enter your email address.", 400, "EMAIL_REQUIRED");
    const email = normalizeEmail(raw);
    if (!email) throw new AppError("Enter a valid email address.", 400, "EMAIL_INVALID");
    changes.email = email;
  }

  // Claimed in one write, so only the member's first saved email brings the welcome.
  const isFirstEmail = changes.email
    ? (await Member.updateOne({ _id: memberId, email: null }, { $set: { email: changes.email } })).modifiedCount === 1
    : false;

  const member = await Member.findByIdAndUpdate(
    memberId,
    { $set: changes },
    { returnDocument: "after" },
  ).lean<MemberDoc>();
  if (!member) throw new AppError("Please sign in again.", 401, "SESSION_REVOKED");
  if (isFirstEmail) await tellWelcome(member._id);
  return memberSummary(member);
};
