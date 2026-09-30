import { z } from "zod";
import { SEAT_TYPES } from "../constants/catalogue";
import { PASS_TYPES } from "../services/pricing";
import { isIsoDate } from "../utils/indiaTime";
import { slugSchema } from "./common";

export const PREFERENCES = ["none", "window", "quiet", "cafeteria"] as const;

const MAX_PEOPLE = 20;
const MAX_HOURS = 8;

const dateSchema = z.string().refine(isIsoDate, "Pick a date.");

const startSchema = z
  .number()
  .int()
  .min(0)
  .max(24 * 60 - 1);

export const bookingInputSchema = z.object({
  venueSlug: slugSchema,
  passType: z.enum(PASS_TYPES),
  spaceType: z.enum(SEAT_TYPES),
  date: dateSchema,
  startMin: startSchema.default(0),
  hours: z.number().int().min(1).max(MAX_HOURS).default(1),
  people: z.number().int().min(1).max(MAX_PEOPLE),
  seatIds: z.array(z.string().trim().min(1).max(40)).min(1, "Pick your seats.").max(MAX_PEOPLE),
  addonKeys: z.array(z.string().trim().min(1).max(63)).max(20).default([]),
  preference: z.enum(PREFERENCES).default("none"),
  companyName: z.string().trim().max(120).default(""),
});

export const quoteInputSchema = bookingInputSchema.extend({
  seatIds: z.array(z.string().trim().min(1).max(40)).max(MAX_PEOPLE).default([]),
});

export const rescheduleSchema = z.object({ date: dateSchema, startMin: startSchema.default(0) });

/** Admins can also move a booking to other seats of the same kind. */
export const adminRescheduleSchema = rescheduleSchema.extend({
  seatIds: z.array(z.string().trim().min(1).max(40)).min(1).max(MAX_PEOPLE).optional(),
});

export const confirmSchema = z.object({
  razorpay_order_id: z.string().trim().min(1).max(100),
  razorpay_payment_id: z.string().trim().min(1).max(100),
  razorpay_signature: z.string().trim().min(1).max(200),
});

export const requestKeySchema = z.string().regex(/^[A-Za-z0-9_-]{8,100}$/, "Send an Idempotency-Key header.");

export type BookingInput = z.infer<typeof bookingInputSchema>;
export type QuoteInput = z.infer<typeof quoteInputSchema>;
export type RescheduleInput = z.infer<typeof rescheduleSchema>;
export type AdminRescheduleInput = z.infer<typeof adminRescheduleSchema>;
export type ConfirmInput = z.infer<typeof confirmSchema>;
