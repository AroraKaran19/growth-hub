import type { AccountFor, AuthErrorBody, AuthSurface, SessionPayload } from "@/types/auth";

export class AuthRequestError extends Error {
  code?: string;
  meta?: Record<string, unknown>;
  status?: number;

  constructor(body: AuthErrorBody, status?: number) {
    super(body.message);
    this.name = "AuthRequestError";
    this.code = body.code;
    this.meta = body.meta;
    this.status = status;
  }
}

const relayFetch = async (surface: AuthSurface, action: string, payload?: unknown) => {
  let response: Response;
  try {
    response = await fetch(`/api/auth/${surface}/${action}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload ?? {}),
      cache: "no-store",
    });
  } catch {
    throw new AuthRequestError({ code: "NETWORK", message: "Something went wrong. Try again." });
  }

  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const error = (body as { error?: AuthErrorBody } | null)?.error;
    throw new AuthRequestError(error ?? { message: "Something went wrong. Try again." }, response.status);
  }
  return body;
};

export const signInThroughRelay = async <S extends AuthSurface>(
  surface: S,
  payload: unknown,
): Promise<SessionPayload<AccountFor<S>>> =>
  (await relayFetch(surface, "verify", payload)) as SessionPayload<AccountFor<S>>;

export const refreshThroughRelay = async <S extends AuthSurface>(
  surface: S,
): Promise<SessionPayload<AccountFor<S>>> =>
  (await relayFetch(surface, "refresh")) as SessionPayload<AccountFor<S>>;

export const logoutThroughRelay = async (surface: AuthSurface) => {
  await relayFetch(surface, "logout").catch(() => null);
};
