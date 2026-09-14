import type { AuthSurface } from "@/types/auth";

export const REFRESH_COOKIE: Record<AuthSurface, string> = {
  member: "gh_member_rt",
  partner: "gh_partner_rt",
  admin: "gh_admin_rt",
};

export const MEMBER_HINT_COOKIE = "gh_member_signed_in";

const secure = process.env.NODE_ENV === "production";

export const refreshCookieOptions = { httpOnly: true, secure, sameSite: "lax", path: "/" } as const;
export const hintCookieOptions = { httpOnly: false, secure, sameSite: "lax", path: "/" } as const;

export const hasMemberHint = () =>
  typeof document !== "undefined" &&
  document.cookie.split("; ").some((entry) => entry.startsWith(`${MEMBER_HINT_COOKIE}=`));
