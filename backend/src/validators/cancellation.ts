import { z } from "zod";
import { CANCELLATION_REASONS, CUSTOMER_REASONS, MAX_DETAILS } from "../constants/cancellation";

const note = z.string().trim().max(MAX_DETAILS);

export const requestInputSchema = z
  .object({ reason: z.enum(CUSTOMER_REASONS), details: note.default("") })
  .refine((input) => input.reason !== "other" || input.details.length > 0, {
    message: "Tell the venue why you want to cancel.",
    path: ["details"],
  });

const paise = z.number().int().min(0).max(100_000_000);

export const decisionSchema = z.discriminatedUnion("decision", [
  z.object({ decision: z.literal("approve"), refundAmount: paise, note: note.default("") }),
  z.object({ decision: z.literal("reject"), note: note.min(1, "Tell the member why.") }),
]);

export const adminCancelSchema = z.object({
  reason: z.enum(CANCELLATION_REASONS),
  refundAmount: paise,
  note: note.default(""),
});

export type RequestInput = z.infer<typeof requestInputSchema>;
export type DecisionInput = z.input<typeof decisionSchema>;
export type AdminCancelInput = z.input<typeof adminCancelSchema>;
