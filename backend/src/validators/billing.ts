import { z } from "zod";
import type { BillingDetails } from "../models/billing.schema";
import { gstinStateCode, isValidGstin } from "../utils/gstin";

export const MAX_TEXT = 120;
const MAX_ADDRESS = 300;

export const text = z.string().trim().max(MAX_TEXT, `Keep it under ${MAX_TEXT} characters.`);

export const gstin = z
  .string()
  .transform((value) => value.replace(/\s+/g, "").toUpperCase())
  .refine(isValidGstin, "Enter a valid 15-character GSTIN.");

export const address = z
  .string()
  .transform((value) =>
    value
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .join("\n"),
  )
  .refine((value) => value.length <= MAX_ADDRESS, `Keep it under ${MAX_ADDRESS} characters.`);

/** A company invoice chosen at checkout; the GSTIN decides the state. */
export const companyBillingSchema = z
  .object({
    companyName: text.min(1, "Enter the company name."),
    gstin,
    address: address.default(""),
  })
  .transform(
    (billing): BillingDetails => ({
      companyName: billing.companyName,
      gstin: billing.gstin,
      address: billing.address || null,
      state: gstinStateCode(billing.gstin),
    }),
  );

/** Null, or left out, invoices the member in their own name. */
export const purchaseBillingSchema = companyBillingSchema.nullable().default(null);
