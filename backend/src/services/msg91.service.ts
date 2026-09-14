import {
  MSG91_EMAIL_URL,
  MSG91_TIMEOUT_MS,
  MSG91_VERIFY_URL,
  PHONE_MESSAGE_PATTERN,
} from "../constants/msg91";
import type { TemplateEmailSettings, WidgetTokenCheck } from "../types/msg91";

const readJson = async <T>(response: Response): Promise<T | null> => {
  try {
    return (await response.json()) as T;
  } catch {
    return null;
  }
};

export const verifyWidgetToken = async (
  accessToken: string,
  authKey: string,
  fetchImpl: typeof fetch = fetch,
): Promise<WidgetTokenCheck> => {
  let response: Response;
  try {
    response = await fetchImpl(MSG91_VERIFY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ authkey: authKey, "access-token": accessToken }),
      signal: AbortSignal.timeout(MSG91_TIMEOUT_MS),
    });
  } catch {
    return { ok: false, reason: "unavailable" };
  }
  if (response.status >= 500) return { ok: false, reason: "unavailable" };

  // MSG91 answers HTTP 200 with type "error" for bad or spent tokens.
  const body = await readJson<{ type?: string; success?: boolean; message?: unknown }>(response);
  if (!body || !(body.type === "success" || body.success === true)) {
    return { ok: false, reason: "rejected" };
  }

  const message = typeof body.message === "string" ? body.message.trim() : "";
  return {
    ok: true,
    verifiedDigits: PHONE_MESSAGE_PATTERN.test(message) ? message.replace(/\D/g, "") : null,
  };
};

export const sendTemplateEmail = async (
  settings: TemplateEmailSettings,
  to: string,
  variables: Record<string, string>,
  fetchImpl: typeof fetch = fetch,
) => {
  const response = await fetchImpl(MSG91_EMAIL_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", authkey: settings.authKey },
    body: JSON.stringify({
      recipients: [{ to: [{ email: to }], variables }],
      from: { email: settings.from, name: settings.fromName },
      domain: settings.domain,
      template_id: settings.templateId,
    }),
    signal: AbortSignal.timeout(MSG91_TIMEOUT_MS),
  });
  const body = await readJson<{ hasError?: boolean }>(response);
  if (!response.ok || body?.hasError) {
    throw new Error(`MSG91 email send failed with HTTP ${response.status}`);
  }
};
