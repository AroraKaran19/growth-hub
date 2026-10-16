import type { MemberBilling } from "@/types/auth";
import { gstinStateCode, isValidGstin, tidyGstin } from "@/utils/gstin";

/** The "Need a GST invoice for a company?" answer for one purchase. */
export type CompanyInvoiceDraft = {
  forCompany: boolean;
  companyName: string;
  gstin: string;
  address: string;
  /** Update the saved details on the Billing page as well. */
  save: boolean;
};

export type CompanyInvoiceErrors = Partial<Record<"companyName" | "gstin" | "address", string>>;

/** What a purchase sends; the server takes the state from the GSTIN. */
export type CompanyBillingInput = { companyName: string; gstin: string; address: string };

const MAX_COMPANY = 120;
const MAX_ADDRESS = 300;

export const EMPTY_COMPANY_INVOICE: CompanyInvoiceDraft = {
  forCompany: false,
  companyName: "",
  gstin: "",
  address: "",
  save: true,
};

const text = (value: unknown) => (typeof value === "string" ? value : "");

/** Saved progress can predate this shape, so coerce what comes back. */
export const normaliseCompanyInvoice = (value: unknown): CompanyInvoiceDraft => {
  const saved = (value ?? {}) as Partial<CompanyInvoiceDraft>;
  return {
    forCompany: saved.forCompany === true,
    companyName: text(saved.companyName),
    gstin: text(saved.gstin),
    address: text(saved.address),
    save: saved.save !== false,
  };
};

/** Saved details fill only the boxes still empty, so nothing typed is lost. */
export const withSavedDetails = (draft: CompanyInvoiceDraft, saved: MemberBilling | null | undefined): CompanyInvoiceDraft => ({
  ...draft,
  companyName: draft.companyName || saved?.companyName || "",
  gstin: draft.gstin || saved?.gstin || "",
  address: draft.address || saved?.address || "",
});

export const validateCompanyInvoice = (draft: CompanyInvoiceDraft): CompanyInvoiceErrors => {
  if (!draft.forCompany) return {};
  const errors: CompanyInvoiceErrors = {};
  const name = draft.companyName.trim();
  const gstin = tidyGstin(draft.gstin);
  if (!name) errors.companyName = "Enter the company name.";
  else if (name.length > MAX_COMPANY) errors.companyName = `Keep it under ${MAX_COMPANY} characters.`;
  if (!gstin) errors.gstin = "Enter the company's GSTIN.";
  else if (!isValidGstin(gstin)) errors.gstin = "Enter a valid 15-character GSTIN.";
  if (draft.address.trim().length > MAX_ADDRESS) errors.address = `Keep it under ${MAX_ADDRESS} characters.`;
  return errors;
};

export const billingInputFrom = (draft: CompanyInvoiceDraft): CompanyBillingInput | null =>
  draft.forCompany
    ? { companyName: draft.companyName.trim(), gstin: tidyGstin(draft.gstin), address: draft.address.trim() }
    : null;

/** The Billing page update to send, or null when it is not wanted or nothing would change. */
export const savedBillingUpdate = (draft: CompanyInvoiceDraft, saved: MemberBilling | null | undefined) => {
  const input = billingInputFrom(draft);
  if (!input || !draft.save) return null;
  const next = { ...input, state: gstinStateCode(input.gstin) };
  const same =
    saved?.companyName === next.companyName &&
    saved?.gstin === next.gstin &&
    (saved?.address ?? "") === next.address &&
    saved?.state === next.state;
  return same ? null : next;
};

/** "Example Studio LLP (GSTIN 29ABCDE1234F1ZW)", or null for an invoice in the member's own name. */
export const invoiceToLabel = (billing: Pick<MemberBilling, "companyName" | "gstin"> | null | undefined) =>
  billing?.companyName ? `${billing.companyName}${billing.gstin ? ` (GSTIN ${billing.gstin})` : ""}` : null;
