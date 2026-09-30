import { PASSWORD_RULES } from "../constants/auth";

/** Why a password can't be used, or null when it can. */
export const passwordProblem = (password: string) => {
  if (password.length < PASSWORD_RULES.minLength) return `Use at least ${PASSWORD_RULES.minLength} characters.`;
  if (Buffer.byteLength(password) > PASSWORD_RULES.maxBytes) {
    return `Keep it under ${PASSWORD_RULES.maxBytes} characters.`;
  }
  return null;
};
