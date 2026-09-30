import { AuthRequestError } from "./requests";

export type AuthErrorInfo = {
  code?: string;
  message?: string;
  meta?: Record<string, unknown>;
  status?: number;
};

const GENERIC = "Something went wrong. Try again.";
const BAD_CODE = "That code is incorrect or has expired.";
const SIGN_IN_AGAIN = "Please sign in again.";
const BAD_NUMBER = "We couldn't verify your number. Try again.";

export const SESSION_ENDED_CODES = [
  "SESSION_EXPIRED",
  "REFRESH_REUSED",
  "INVALID_REFRESH",
  "SESSION_REVOKED",
];

export const readAuthError = (error: unknown): AuthErrorInfo => {
  if (error instanceof AuthRequestError) {
    return { code: error.code, message: error.message, meta: error.meta, status: error.status };
  }
  return { message: GENERIC };
};

const count = (meta: Record<string, unknown> | undefined, key: string, fallback: number) => {
  const value = meta?.[key];
  return typeof value === "number" && Number.isFinite(value) ? Math.max(1, Math.ceil(value)) : fallback;
};

export const authErrorMessage = (info: AuthErrorInfo): string => {
  switch (info.code) {
    case "OTP_THROTTLED":
      return `You can request a new code in ${count(info.meta, "retryAfterSeconds", 60)}s.`;
    case "OTP_SEND_LIMIT":
      return `Too many codes requested. Try again in ${count(info.meta, "retryAfterMinutes", 15)} minutes.`;
    case "OTP_INVALID":
    case "OTP_EXPIRED":
      return BAD_CODE;
    case "OTP_ATTEMPTS_EXCEEDED":
      return "Too many incorrect codes. Request a new one.";
    case "PHONE_NOT_CONFIRMED":
    case "PHONE_MISMATCH":
    case "OTP_PROVIDER_UNAVAILABLE":
      return BAD_NUMBER;
    case "PHONE_INVALID":
      return "Enter a valid mobile number.";
    case "EMAIL_INVALID":
      return "Enter a valid email address.";
    case "NAME_INVALID":
      return "Enter your name.";
    case "ACCOUNT_DISABLED":
      return "This account has been disabled. Contact support.";
    case "INVALID_CREDENTIALS":
      return "That email and password don't match.";
    case "SIGN_IN_LOCKED":
      return `Too many attempts. Try again in ${count(info.meta, "retryAfterMinutes", 15)} minutes, or reset your password.`;
    // The server names the exact rule that failed.
    case "PASSWORD_WEAK":
      return info.message || "Use at least 10 characters.";
    case "PASSWORD_REUSED":
      return "Pick a password different from the temporary one.";
    case "RESET_LINK_INVALID":
      return "This link has expired or was already used. Ask for a new one.";
    case "RATE_LIMITED":
      return "Too many requests. Please try again shortly.";
    // The widget's own failure text is more useful than anything generic.
    case "SMS_SEND_FAILED":
      return info.message || "We couldn't send the code. Try again.";
    default:
      break;
  }
  if (info.code && SESSION_ENDED_CODES.includes(info.code)) return SIGN_IN_AGAIN;
  return GENERIC;
};

export const messageFor = (error: unknown) => authErrorMessage(readAuthError(error));

/** The server's own wait, so a countdown can run live rather than as frozen copy. */
export const retryAfterSeconds = (info: AuthErrorInfo, fallback = 60) =>
  count(info.meta, "retryAfterSeconds", fallback);

export const retryAfterMinutes = (info: AuthErrorInfo, fallback = 15) =>
  count(info.meta, "retryAfterMinutes", fallback);
