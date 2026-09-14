import { NextResponse, type NextRequest } from "next/server";
import { REFRESH_COOKIE } from "@/libs/auth/cookies";
import { blocked, callBackend, clearSessionCookies, isSameOrigin, notFound } from "@/libs/auth/relay";
import { isAuthSurface } from "@/types/auth";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ surface: string }> },
) {
  const { surface } = await params;
  if (!isAuthSurface(surface)) return notFound();
  if (!isSameOrigin(request)) return blocked();

  const refreshToken = request.cookies.get(REFRESH_COOKIE[surface])?.value;
  if (refreshToken) await callBackend(request, "/auth/logout", { refreshToken });

  return clearSessionCookies(NextResponse.json({ success: true }), surface);
}
