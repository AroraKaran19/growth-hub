import { z } from "zod";
import { MEMBERSHIP_LENGTHS, PLAN_SPACES, ROOM_MODES } from "../constants/catalogue";
import { objectIdSchema, slugSchema } from "./common";

export const MAX_SLOT_HOURS = 8;
export const MAX_PLAN_SEATS = 20;

const price = z.number().int("Use whole rupees.").min(1, "Enter a price above zero.").max(10_000_000).nullable();

const fields = z.object({
  name: z.string().trim().min(2, "Enter a name.").max(60, "Keep it under 60 characters."),
  description: z.string().trim().max(240, "Keep it under 240 characters."),
  includes: z
    .array(z.string().trim().max(80, "Keep each line under 80 characters."))
    .max(8, "Keep it to 8 lines.")
    .transform((lines) => lines.filter(Boolean)),
  space: z.enum(PLAN_SPACES, "Pick what the plan locks."),
  roomMode: z.enum(ROOM_MODES).nullable(),
  slotHours: z.number().int().min(1, "At least 1 hour.").max(MAX_SLOT_HOURS, `At most ${MAX_SLOT_HOURS} hours.`).nullable(),
  days: z
    .array(z.number().int().min(0).max(6))
    .min(1, "Pick at least one day.")
    .transform((days) => [...new Set(days)].sort()),
  prices: z.object(Object.fromEntries(MEMBERSHIP_LENGTHS.map((length) => [length, price])) as Record<(typeof MEMBERSHIP_LENGTHS)[number], typeof price>),
  maxSeats: z.number().int().min(1).max(MAX_PLAN_SEATS, `At most ${MAX_PLAN_SEATS} seats.`),
  visible: z.boolean(),
});

type PlanFields = z.infer<typeof fields>;

const roomRules = (plan: PlanFields, ctx: z.RefinementCtx) => {
  if (Object.values(plan.prices).every((value) => value === null)) {
    ctx.addIssue({ code: "custom", path: ["prices"], message: "Set a price for at least one length." });
  }
  if (plan.space !== "meeting-room") return;
  if (!plan.roomMode) ctx.addIssue({ code: "custom", path: ["roomMode"], message: "Pick full day or a time slot." });
  if (plan.roomMode === "time-slot" && !plan.slotHours) {
    ctx.addIssue({ code: "custom", path: ["slotHours"], message: "Pick how many hours the slot lasts." });
  }
};

// Settings that don't apply to the chosen space are cleared rather than refused.
const normalise = <T extends PlanFields>(plan: T): T => {
  const isRoom = plan.space === "meeting-room";
  const isSlot = isRoom && plan.roomMode === "time-slot";
  return {
    ...plan,
    roomMode: isRoom ? plan.roomMode : null,
    slotHours: isSlot ? plan.slotHours : null,
    maxSeats: plan.space === "desk" ? plan.maxSeats : 1,
  };
};

export const planSchema = fields.extend({ venueSlug: slugSchema }).superRefine(roomRules).transform(normalise);

export const planUpdateSchema = fields.superRefine(roomRules).transform(normalise);

export const planOrderSchema = z.object({
  venueSlug: slugSchema,
  ids: z.array(objectIdSchema).max(100),
});

export type PlanInput = z.infer<typeof planSchema>;
export type PlanUpdateInput = z.infer<typeof planUpdateSchema>;
export type PlanOrderInput = z.infer<typeof planOrderSchema>;
