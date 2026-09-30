"use client";

import type { AuthSurface } from "@/types/auth";

/**
 * A code request that is still in flight, remembered across a page refresh so
 * the user can finish typing a code they already received instead of being
 * sent back to the start and tempted into another send.
 *
 * Never holds the code itself or any token: only who it was sent to and when
 * the next send becomes allowed.
 */
export type OtpAttempt = {
  surface: AuthSurface;
  /** National mobile digits. */
  identifier: string;
  /** Members only, so the country select can be restored. */
  countryCode?: string;
  cooldownEndsAt: number;
  expiresAt: number;
};

/** How long a sent code stays worth typing. */
export const OTP_ATTEMPT_TTL_MS = 10 * 60 * 1000;

const keyFor = (surface: AuthSurface) => `gh:otp-attempt:${surface}`;

export const secondsUntil = (until: number, now = Date.now()) =>
  Math.max(0, Math.ceil((until - now) / 1000));

export const isRestorable = (
  attempt: OtpAttempt | null,
  surface: AuthSurface,
  now = Date.now(),
): attempt is OtpAttempt =>
  attempt !== null &&
  attempt.surface === surface &&
  typeof attempt.identifier === "string" &&
  attempt.identifier.length > 0 &&
  attempt.expiresAt > now;

export const buildAttempt = (
  surface: AuthSurface,
  identifier: string,
  cooldownSeconds: number,
  countryCode?: string,
  now = Date.now(),
): OtpAttempt => ({
  surface,
  identifier,
  ...(countryCode ? { countryCode } : {}),
  cooldownEndsAt: now + cooldownSeconds * 1000,
  expiresAt: now + OTP_ATTEMPT_TTL_MS,
});

export const readAttempt = (surface: AuthSurface): OtpAttempt | null => {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(keyFor(surface));
    return raw ? (JSON.parse(raw) as OtpAttempt) : null;
  } catch {
    return null;
  }
};

export const writeAttempt = (attempt: OtpAttempt) => {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(keyFor(attempt.surface), JSON.stringify(attempt));
  } catch {
    // Private mode or a full quota: the flow still works, just not across a refresh.
  }
};

export const clearAttempt = (surface: AuthSurface) => {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(keyFor(surface));
  } catch {
    // Nothing to recover from.
  }
};
