import { NextResponse, type NextRequest } from "next/server";
import type { AuthAccount, AuthErrorBody, AuthSurface } from "@/types/auth";
import {
  HINT_COOKIE,
  REFRESH_COOKIE,
  hintCookieOptions,
  refreshCookieOptions,
} from "./cookies";

export type BackendSession = {
  account: AuthAccount;
  accessToken: string;
  accessTokenExpiresAt: string;
  refreshToken: string;
  sessionExpiresAt: string;
};

type BackendResult =
  | { ok: true; status: number; data: BackendSession }
  | { ok: false; status: number; error: AuthErrorBody };

const unavailable = (code: string, message: string): BackendResult => ({
  ok: false,
  status: 503,
  error: { code, message },
});

export const callBackend = async (
  request: NextRequest,
  path: string,
  payload: unknown,
): Promise<BackendResult> => {
  // One variable is enough. API_URL is an optional override for deployments
  // where this server should reach the backend by a private address, such as
  // loopback when both processes sit on the same VPS.
  const apiUrl = process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL;
  const relaySecret = process.env.AUTH_RELAY_SECRET;
  if (!apiUrl || !relaySecret) return unavailable("RELAY_UNCONFIGURED", "Sign-in is not configured.");

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "x-relay-secret": relaySecret,
    "x-client-user-agent": request.headers.get("user-agent") ?? "",
  };
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) headers["x-forwarded-for"] = forwardedFor;

  try {
    const response = await fetch(`${apiUrl}${path}`, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
      cache: "no-store",
    });
    const body = (await response.json()) as {
      success?: boolean;
      data?: BackendSession | null;
      error?: AuthErrorBody;
    };
    if (response.ok && body.success && body.data) {
      return { ok: true, status: response.status, data: body.data };
    }
    return {
      ok: false,
      status: response.status,
      error: {
        message: body.error?.message ?? "Sign-in failed.",
        code: body.error?.code,
        meta: body.error?.meta,
      },
    };
  } catch {
    return unavailable("RELAY_UNAVAILABLE", "Sign-in is unavailable right now.");
  }
};

export const isSameOrigin = (request: NextRequest) => {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  try {
    return new URL(origin).host === request.headers.get("host");
  } catch {
    return false;
  }
};

export const jsonError = (status: number, error: AuthErrorBody) =>
  NextResponse.json({ error }, { status, headers: { "Cache-Control": "no-store" } });

export const notFound = () => jsonError(404, { message: "Not found." });

export const blocked = () => jsonError(403, { code: "ORIGIN_MISMATCH", message: "Request blocked." });

const secondsUntil = (iso: string) => Math.max(0, Math.floor((Date.parse(iso) - Date.now()) / 1000));

export const sessionResponse = (surface: AuthSurface, session: BackendSession) => {
  const response = NextResponse.json(
    {
      account: session.account,
      accessToken: session.accessToken,
      accessTokenExpiresAt: session.accessTokenExpiresAt,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
  const maxAge = secondsUntil(session.sessionExpiresAt);
  response.cookies.set(REFRESH_COOKIE[surface], session.refreshToken, { ...refreshCookieOptions, maxAge });
  response.cookies.set(HINT_COOKIE[surface], "1", { ...hintCookieOptions, maxAge });
  return response;
};

export const clearSessionCookies = (response: NextResponse, surface: AuthSurface) => {
  response.cookies.set(REFRESH_COOKIE[surface], "", { ...refreshCookieOptions, maxAge: 0 });
  response.cookies.set(HINT_COOKIE[surface], "", { ...hintCookieOptions, maxAge: 0 });
  return response;
};

const SURFACES: AuthSurface[] = ["member", "partner", "admin"];

/** One sign-in at a time: a new one ends the other surfaces' sessions. */
export const endOtherSessions = async (request: NextRequest, response: NextResponse, surface: AuthSurface) => {
  for (const other of SURFACES.filter((item) => item !== surface)) {
    const refreshToken = request.cookies.get(REFRESH_COOKIE[other])?.value;
    if (refreshToken) await callBackend(request, "/auth/logout", { refreshToken });
    if (refreshToken || request.cookies.has(HINT_COOKIE[other])) clearSessionCookies(response, other);
  }
  return response;
};
