import { NextResponse, type NextRequest } from "next/server";
import { REFRESH_COOKIE } from "@/libs/auth/cookies";
import type { AuthSurface } from "@/types/auth";

const LOGIN_PATH: Record<AuthSurface, string> = {
  member: "/login",
  partner: "/partner/login",
  admin: "/admin/login",
};

const surfaceFor = (pathname: string): AuthSurface => {
  if (pathname === "/partner" || pathname.startsWith("/partner/")) return "partner";
  if (pathname === "/admin" || pathname.startsWith("/admin/")) return "admin";
  return "member";
};

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const surface = surfaceFor(pathname);

  // A revoked cookie on a login page would redirect in a loop. The login page
  // sends signed-in visitors on itself, once a refresh has actually succeeded.
  if (pathname === LOGIN_PATH[surface]) return NextResponse.next();
  if (request.cookies.has(REFRESH_COOKIE[surface])) return NextResponse.next();

  const login = new URL(LOGIN_PATH[surface], request.url);
  login.searchParams.set("next", `${pathname}${search}`);
  return NextResponse.redirect(login);
}

// Checkout is deliberately absent: a visitor configures and prices a booking
// as a guest, and verifies their number on the payment page itself.
export const config = {
  matcher: ["/account/:path*", "/partner/:path*", "/admin/:path*"],
};
