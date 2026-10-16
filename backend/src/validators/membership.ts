import { z } from "zod";
import { MEMBERSHIP_LENGTHS } from "../constants/catalogue";
import { isIsoDate } from "../utils/indiaTime";
import { purchaseBillingSchema } from "./billing";
import { objectIdSchema } from "./common";

const MAX_PEOPLE = 20;
const MAX_HOLDER_NAME = 60;
const DAY_MINUTES = 24 * 60;

const seatIdSchema = z.string().trim().min(1).max(40);

const holderSchema = z.object({
  seatId: seatIdSchema,
  name: z.string().trim().max(MAX_HOLDER_NAME, `Keep each name under ${MAX_HOLDER_NAME} characters.`),
});

const fields = z.object({
  planId: objectIdSchema,
  length: z.enum(MEMBERSHIP_LENGTHS),
  startDate: z.string().refine(isIsoDate, "Pick a start date."),
  people: z.number().int().min(1).max(MAX_PEOPLE),
  seatIds: z.array(seatIdSchema).min(1, "Pick your seats.").max(MAX_PEOPLE),
  /** Time-slot rooms only: the daily start, in minutes from midnight. */
  startMin: z.number().int().min(0).max(DAY_MINUTES).optional(),
  holders: z.array(holderSchema).max(MAX_PEOPLE).default([]),
  billing: purchaseBillingSchema,
});

type Fields = z.infer<typeof fields>;

const holdersFitSeats = (input: Pick<Fields, "seatIds" | "holders">, ctx: z.RefinementCtx) => {
  const seen = new Set<string>();
  for (const holder of input.holders) {
    if (!input.seatIds.includes(holder.seatId) || seen.has(holder.seatId)) {
      ctx.addIssue({ code: "custom", path: ["holders"], message: "Name each chosen seat at most once." });
      return;
    }
    seen.add(holder.seatId);
  }
};

// A blank name means the buyer left that seat unnamed.
const namedOnly = <T extends Pick<Fields, "holders">>(input: T): T => ({
  ...input,
  holders: input.holders.filter((holder) => holder.name),
});

export const membershipInputSchema = fields.superRefine(holdersFitSeats).transform(namedOnly);

export const membershipQuoteSchema = fields
  .extend({ seatIds: z.array(seatIdSchema).max(MAX_PEOPLE).default([]) })
  .superRefine(holdersFitSeats)
  .transform(namedOnly);

export const membershipBillingSchema = z.object({ billing: purchaseBillingSchema });

export const subscriptionConfirmSchema = z.object({
  razorpay_payment_id: z.string().trim().min(1).max(100),
  razorpay_subscription_id: z.string().trim().min(1).max(100),
  razorpay_signature: z.string().trim().min(1).max(200),
});

export type MembershipInput = z.infer<typeof membershipInputSchema>;
export type MembershipQuoteInput = z.infer<typeof membershipQuoteSchema>;
export type SubscriptionConfirmInput = z.infer<typeof subscriptionConfirmSchema>;
