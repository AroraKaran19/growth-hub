import type { MemberAccount, MemberBilling } from "@/types/auth";
import { gstinStateCode, isValidGstin, tidyGstin } from "@/utils/gstin";

export type BillingDraft = Record<keyof MemberBilling, string>;

export type BillingErrors = Partial<Record<keyof MemberBilling, string>>;

const MAX_COMPANY = 120;
const MAX_ADDRESS = 300;

export const toBillingDraft = (account: MemberAccount): BillingDraft => ({
  companyName: account.billing?.companyName ?? "",
  gstin: account.billing?.gstin ?? "",
  address: account.billing?.address ?? "",
  state: account.billing?.state ?? "",
});

export const hasBilling = (account: MemberAccount) =>
  Object.values(toBillingDraft(account)).some(Boolean);

/** The whole block; the API clears any field sent blank. */
export const toBillingBody = (draft: BillingDraft): BillingDraft => ({
  companyName: draft.companyName.trim(),
  gstin: tidyGstin(draft.gstin),
  address: draft.address.trim(),
  state: draft.state,
});

export const isSameBilling = (draft: BillingDraft, account: MemberAccount) => {
  const saved = toBillingDraft(account);
  const next = toBillingBody(draft);
  return (Object.keys(saved) as (keyof BillingDraft)[]).every((key) => saved[key] === next[key]);
};

export const validateBilling = (draft: BillingDraft): BillingErrors => {
  const errors: BillingErrors = {};
  const { companyName, gstin, address, state } = toBillingBody(draft);
  if (companyName.length > MAX_COMPANY) errors.companyName = `Keep it under ${MAX_COMPANY} characters.`;
  if (address.length > MAX_ADDRESS) errors.address = `Keep it under ${MAX_ADDRESS} characters.`;
  if (gstin && !isValidGstin(gstin)) errors.gstin = "Enter a valid 15-character GSTIN.";
  else if (gstin && state && gstinStateCode(gstin) !== state) {
    errors.state = "Pick the state your GSTIN is registered in.";
  }
  return errors;
};

type ApiErrorInfo = { code?: string; message: string; fields: Record<string, string> };

export const billingErrorsFromApi = (info: ApiErrorInfo): BillingErrors => {
  if (info.code !== "VALIDATION_FAILED") return {};
  const errors: BillingErrors = {};
  for (const [path, message] of Object.entries(info.fields)) {
    const key = path.replace(/^billing\./, "") as keyof MemberBilling;
    if (path.startsWith("billing.")) errors[key] = message;
  }
  return errors;
};
