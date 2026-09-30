import { z } from "zod";
import { isIsoDate } from "../utils/indiaTime";

export const IFSC_PATTERN = /^[A-Z]{4}0[A-Z0-9]{6}$/;

export const payoutAccountSchema = z
  .object({
    accountName: z.string().trim().min(2, "Enter the name on the account.").max(80),
    accountNumber: z
      .string()
      .trim()
      .regex(/^\d{6,18}$/, "Use the 6 to 18 digit account number."),
    ifsc: z.string().trim().toUpperCase().regex(IFSC_PATTERN, "Use the 11 character IFSC, like HDFC0001234."),
    bankName: z.string().trim().min(2, "Enter the bank's name.").max(80),
    upiId: z
      .string()
      .trim()
      .regex(/^[\w.-]{2,}@[\w.-]{2,}$/, "Use a UPI id like name@bank.")
      .nullable()
      .default(null),
  })
  .strict();

export const monthSchema = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Pick a month.");

export const generateSchema = z.object({ month: monthSchema, venueSlug: z.string().trim().min(1).max(80).optional() }).strict();

export const adjustmentSchema = z
  .object({
    amount: z.number().int().refine((value) => value !== 0, "Enter an amount other than 0.").refine((value) => Math.abs(value) <= 100_000_000),
    note: z.string().trim().min(3, "Say what the adjustment is for.").max(200),
  })
  .strict();

export const markPaidSchema = z
  .object({
    utr: z.string().trim().toUpperCase().regex(/^[A-Z0-9]{8,30}$/, "Enter the transfer's UTR number."),
    paidOn: z.string().refine(isIsoDate, "Pick a date."),
    note: z.string().trim().max(200).default(""),
  })
  .strict();

export const deleteVenueSchema = z
  .object({
    reason: z.string().trim().min(5, "Say why, members will see it.").max(300),
    confirmName: z.string().trim().min(1, "Type the venue's name to confirm."),
  })
  .strict();

export const refundDoneSchema = z
  .object({
    amount: z.number().int().min(0).max(100_000_000),
    note: z.string().trim().min(3, "Note how it was refunded, like the Razorpay refund id.").max(200),
  })
  .strict();
