export const MSG91_VERIFY_URL =
  "https://control.msg91.com/api/v5/widget/verifyAccessToken";

export const MSG91_EMAIL_URL = "https://control.msg91.com/api/v5/email/send";

/** MSG91 echoes the verified number as the message body on some widgets. */
export const PHONE_MESSAGE_PATTERN = /^\+?\d{8,15}$/;

export const MSG91_TIMEOUT_MS = 10_000;

