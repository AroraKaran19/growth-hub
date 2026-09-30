import { z } from "zod";
import { MEMBERSHIP_LENGTHS, MEMBERSHIP_SPACES } from "../constants/catalogue";
import { isIsoDate } from "../utils/indiaTime";
import { slugSchema } from "./common";

const MAX_PEOPLE = 20;

export const membershipInputSchema = z.object({
  venueSlug: slugSchema,
  spaceType: z.enum(MEMBERSHIP_SPACES),
  length: z.enum(MEMBERSHIP_LENGTHS),
  startDate: z.string().refine(isIsoDate, "Pick a start date."),
  people: z.number().int().min(1).max(MAX_PEOPLE),
  seatIds: z.array(z.string().trim().min(1).max(40)).min(1, "Pick your seats.").max(MAX_PEOPLE),
  companyName: z.string().trim().max(120).default(""),
});

export const membershipQuoteSchema = membershipInputSchema.extend({
  seatIds: z.array(z.string().trim().min(1).max(40)).max(MAX_PEOPLE).default([]),
});

export const subscriptionConfirmSchema = z.object({
  razorpay_payment_id: z.string().trim().min(1).max(100),
  razorpay_subscription_id: z.string().trim().min(1).max(100),
  razorpay_signature: z.string().trim().min(1).max(200),
});

export type MembershipInput = z.infer<typeof membershipInputSchema>;
export type MembershipQuoteInput = z.infer<typeof membershipQuoteSchema>;
export type SubscriptionConfirmInput = z.infer<typeof subscriptionConfirmSchema>;
