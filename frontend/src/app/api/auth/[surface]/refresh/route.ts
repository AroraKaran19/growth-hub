import type { NextRequest } from "next/server";
import { REFRESH_COOKIE } from "@/libs/auth/cookies";
import {
  blocked,
  callBackend,
  clearSessionCookies,
  isSameOrigin,
  jsonError,
  notFound,
  sessionResponse,
} from "@/libs/auth/relay";
import { isAuthSurface } from "@/types/auth";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ surface: string }> },
) {
  const { surface } = await params;
  if (!isAuthSurface(surface)) return notFound();
  if (!isSameOrigin(request)) return blocked();

  const refreshToken = request.cookies.get(REFRESH_COOKIE[surface])?.value;
  if (!refreshToken) {
    return clearSessionCookies(
      jsonError(401, { code: "INVALID_REFRESH", message: "Please sign in again." }),
      surface,
    );
  }

  const result = await callBackend(request, "/auth/refresh", { refreshToken, accountType: surface });
  if (result.ok) return sessionResponse(surface, result.data);

  const response = jsonError(result.status, result.error);
  return result.status === 401 || result.status === 403
    ? clearSessionCookies(response, surface)
    : response;
}
