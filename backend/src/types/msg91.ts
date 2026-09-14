export type WidgetTokenCheck =
  | { ok: true; verifiedDigits: string | null }
  | { ok: false; reason: "rejected" | "unavailable" };

export type TemplateEmailSettings = {
  authKey: string;
  domain: string;
  from: string;
  fromName: string;
  templateId: string;
};
