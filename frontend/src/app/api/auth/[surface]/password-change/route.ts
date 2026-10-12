import type { NextRequest } from "next/server";
import {
  blocked,
  callBackend,
  isSameOrigin,
  jsonError,
  notFound,
  endOtherSessions,
  sessionResponse,
} from "@/libs/auth/relay";

// Staff only: members sign in by phone and have no password.
const isStaffSurface = (value: string): value is "partner" | "admin" =>
  value === "partner" || value === "admin";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ surface: string }> },
) {
  const { surface } = await params;
  if (!isStaffSurface(surface)) return notFound();
  if (!isSameOrigin(request)) return blocked();

  const payload: unknown = await request.json().catch(() => ({}));
  const result = await callBackend(request, `/auth/${surface}/password/change`, payload);
  return result.ok
    ? endOtherSessions(request, sessionResponse(surface, result.data), surface)
    : jsonError(result.status, result.error);
}
