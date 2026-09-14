import type { NextRequest } from "next/server";
import {
  blocked,
  callBackend,
  isSameOrigin,
  jsonError,
  notFound,
  sessionResponse,
} from "@/libs/auth/relay";
import { isAuthSurface, type AuthSurface } from "@/types/auth";

const VERIFY_PATHS: Record<AuthSurface, string> = {
  member: "/auth/member/otp/verify",
  partner: "/auth/partner/email/verify",
  admin: "/auth/admin/email/verify",
};

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ surface: string }> },
) {
  const { surface } = await params;
  if (!isAuthSurface(surface)) return notFound();
  if (!isSameOrigin(request)) return blocked();

  const payload: unknown = await request.json().catch(() => ({}));
  const result = await callBackend(request, VERIFY_PATHS[surface], payload);
  return result.ok ? sessionResponse(surface, result.data) : jsonError(result.status, result.error);
}
