import bcrypt from "bcrypt";
import crypto from "crypto";
import { env } from "../config/env";
import { PASSWORD_RULES, RESET_LIMITS, SIGN_IN_LIMITS } from "../constants/auth";
import { PASSWORD_RESET_TEMPLATE_ID } from "../constants/notifications";
import { AppError } from "../middlewares/error.middleware";
import { Admin, PartnerStaff, type AdminDoc, type OtpPurpose, type PartnerStaffDoc } from "../models";
import { adminSummary, partnerSummary, type AdminAccount, type PartnerAccount } from "./account.service";
import { sendTemplateEmail } from "./msg91.service";
import { passwordProblem } from "../utils/password";
import { claimSend, clearChallenge, reserveSignIn } from "./otpChallenge.service";
import { revokeAccountSessions, startSession, type DeviceInfo, type IssuedTokens } from "./session.service";

export type StaffAccountType = "partner" | "admin";

type StaffDoc = AdminDoc | PartnerStaffDoc;

const SIGN_IN: Record<StaffAccountType, OtpPurpose> = { partner: "partner_sign_in", admin: "admin_sign_in" };
const RESET: Record<StaffAccountType, OtpPurpose> = { partner: "partner_reset", admin: "admin_reset" };
const RESET_MINUTES = RESET_LIMITS.linkTtlMs / 60_000;

// Compared when there is no hash, so a missing account takes as long as a wrong password.
const placeholderHash = bcrypt.hash("no account placeholder", PASSWORD_RULES.bcryptRounds);

const invalidCredentials = () => new AppError("That email and password don't match.", 401, "INVALID_CREDENTIALS");
const invalidLink = () =>
  new AppError("This link has expired or was already used. Ask for a new one.", 400, "RESET_LINK_INVALID");

const checkPassword = (password: string) => {
  const problem = passwordProblem(password);
  if (problem) throw new AppError(problem, 400, "PASSWORD_WEAK");
};

export const hashPassword = (password: string) => bcrypt.hash(password, PASSWORD_RULES.bcryptRounds);

const hashToken = (token: string) => crypto.createHash("sha256").update(token).digest("hex");

const findStaff = (accountType: StaffAccountType, filter: Record<string, unknown>): Promise<StaffDoc | null> =>
  accountType === "admin"
    ? Admin.findOne(filter).lean<AdminDoc>()
    : PartnerStaff.findOne(filter).lean<PartnerStaffDoc>();

const updateStaff = (
  accountType: StaffAccountType,
  filter: Record<string, unknown>,
  update: Record<string, unknown>,
): Promise<StaffDoc | null> =>
  accountType === "admin"
    ? Admin.findOneAndUpdate(filter, update).lean<AdminDoc>()
    : PartnerStaff.findOneAndUpdate(filter, update).lean<PartnerStaffDoc>();

const summaryOf = (accountType: StaffAccountType, staff: StaffDoc): PartnerAccount | AdminAccount =>
  accountType === "admin" ? adminSummary(staff as AdminDoc) : partnerSummary(staff as PartnerStaffDoc);

/** Checks the password under the attempt limit; the answer never says whether the email exists. */
export const verifyStaffPassword = (accountType: StaffAccountType, email: string, password: string) =>
  verify(accountType, email, password);

const verify = async (accountType: StaffAccountType, email: string, password: string) => {
  await reserveSignIn(SIGN_IN[accountType], email, SIGN_IN_LIMITS);
  const staff = await findStaff(accountType, { email });
  const hash = staff?.passwordHash ?? null;
  const matches = await bcrypt.compare(password, hash ?? (await placeholderHash));
  if (!staff || !hash || !matches) throw invalidCredentials();

  await clearChallenge(SIGN_IN[accountType], email);
  if (staff.status !== "active") throw new AppError("This account has been disabled.", 403, "ACCOUNT_DISABLED");
  return staff;
};

export const signIn = async (
  accountType: StaffAccountType,
  email: string,
  password: string,
  device: DeviceInfo,
): Promise<IssuedTokens & { account: PartnerAccount | AdminAccount }> => {
  const staff = await verify(accountType, email, password);
  if (staff.mustChangePassword) {
    throw new AppError("Choose a new password to finish signing in.", 403, "PASSWORD_CHANGE_REQUIRED");
  }
  const tokens = await startSession(accountType, staff._id, device);
  return { ...tokens, account: summaryOf(accountType, staff) };
};

/** Replaces a password the account holder knows, signs every other device out and starts a session. */
export const changePassword = async (
  accountType: StaffAccountType,
  email: string,
  currentPassword: string,
  newPassword: string,
  device: DeviceInfo,
) => {
  checkPassword(newPassword);
  if (newPassword === currentPassword) {
    throw new AppError("Pick a password different from the current one.", 400, "PASSWORD_REUSED");
  }
  const staff = await verify(accountType, email, currentPassword);
  const changed = await updateStaff(
    accountType,
    { _id: staff._id, passwordHash: staff.passwordHash },
    {
      $set: {
        passwordHash: await hashPassword(newPassword),
        mustChangePassword: false,
        passwordResetHash: null,
        passwordResetExpiresAt: null,
      },
    },
  );
  if (!changed) throw invalidCredentials();

  await revokeAccountSessions(accountType, staff._id, "password-changed");
  const tokens = await startSession(accountType, staff._id, device);
  return { ...tokens, account: summaryOf(accountType, staff) };
};

const deliverResetLink = (accountType: StaffAccountType, staff: StaffDoc, token: string) => {
  const { email: settings, msg91AuthKey, isProduction, frontendUrl } = env();
  const link = `${frontendUrl.replace(/\/+$/, "")}/${accountType}/reset-password#token=${token}`;
  if (!isProduction) console.log(`[dev] password reset link for ${staff.email}: ${link}`);
  if (!settings || !msg91AuthKey) {
    if (isProduction) console.error("Password reset email is not configured.");
    return;
  }
  sendTemplateEmail(
    { authKey: msg91AuthKey, ...settings, templateId: PASSWORD_RESET_TEMPLATE_ID },
    staff.email,
    { name: staff.name, reset_link: link, expiry_minutes: String(RESET_MINUTES) },
  ).catch((error: unknown) => {
    console.error("Password reset email failed:", error instanceof Error ? error.message : error);
  });
};

/** Emails a reset link to an active account; every email gets the same answer and the same throttle. */
export const requestPasswordReset = async (accountType: StaffAccountType, email: string) => {
  await claimSend(RESET[accountType], email, RESET_LIMITS);
  const staff = await findStaff(accountType, { email, status: "active" });
  if (staff) {
    const token = crypto.randomBytes(32).toString("base64url");
    await updateStaff(
      accountType,
      { _id: staff._id },
      {
        $set: {
          passwordResetHash: hashToken(token),
          passwordResetExpiresAt: new Date(Date.now() + RESET_LIMITS.linkTtlMs),
        },
      },
    );
    deliverResetLink(accountType, staff, token);
  }
  return { expiresInMinutes: RESET_MINUTES, cooldownSeconds: RESET_LIMITS.cooldownSeconds };
};

export const resetPassword = async (accountType: StaffAccountType, token: string, newPassword: string) => {
  checkPassword(newPassword);
  if (!token) throw invalidLink();
  const passwordHash = await hashPassword(newPassword);
  const staff = await updateStaff(
    accountType,
    { passwordResetHash: hashToken(token), passwordResetExpiresAt: { $gt: new Date() }, status: "active" },
    { $set: { passwordHash, mustChangePassword: false, passwordResetHash: null, passwordResetExpiresAt: null } },
  );
  if (!staff) throw invalidLink();

  await revokeAccountSessions(accountType, staff._id, "password-changed");
  await clearChallenge(SIGN_IN[accountType], staff.email);
  return { email: staff.email };
};
