import { Schema } from "mongoose";

/** Company details an invoice is made out to; state is a GST state code. */
export interface BillingDetails {
  companyName: string | null;
  gstin: string | null;
  address: string | null;
  state: string | null;
}

const optionalText = { type: String, trim: true, default: null };

/** A purchase's company, or null when the member is invoiced in their own name. */
export const billingView = (billing: BillingDetails | null | undefined): BillingDetails | null =>
  billing?.companyName
    ? { companyName: billing.companyName, gstin: billing.gstin ?? null, address: billing.address ?? null, state: billing.state ?? null }
    : null;

export const billingDetailsSchema = new Schema<BillingDetails>(
  { companyName: optionalText, gstin: optionalText, address: optionalText, state: optionalText },
  { _id: false },
);
