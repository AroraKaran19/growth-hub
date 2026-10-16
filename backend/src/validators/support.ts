import { z } from "zod";
import { GUEST_TOPIC_KEYS, SUPPORT_CATEGORIES, SUPPORT_LIMITS, SUPPORT_STATUSES } from "../constants/support";
import { emailSchema, nameSchema } from "./common";

const { subject: SUBJECT_MAX, messageMin: MESSAGE_MIN, messageMax: MESSAGE_MAX, attachments: ATTACHMENTS_MAX } = SUPPORT_LIMITS;

const message = z
  .string({ error: "Tell us what happened." })
  .trim()
  .min(MESSAGE_MIN, `Tell us a little more (at least ${MESSAGE_MIN} characters).`)
  .max(MESSAGE_MAX, `Keep the message under ${MESSAGE_MAX.toLocaleString("en-IN")} characters.`);

const shortMessage = z
  .string({ error: "Write a message." })
  .trim()
  .min(1, "Write a message.")
  .max(MESSAGE_MAX, `Keep the message under ${MESSAGE_MAX.toLocaleString("en-IN")} characters.`);

const oneOf = <T extends readonly [string, ...string[]]>(values: T, problem: string) => z.enum(values, { error: problem });

export const createSupportSchema = z.object({
  category: oneOf(SUPPORT_CATEGORIES, "Choose what this is about."),
  relatedRef: z.string().trim().max(32).default(""),
  subject: z
    .string({ error: "Add a subject." })
    .trim()
    .min(1, "Add a subject.")
    .max(SUBJECT_MAX, `Keep the subject under ${SUBJECT_MAX} characters.`),
  message,
  attachments: z.array(z.string().trim().max(200)).max(ATTACHMENTS_MAX, `Attach up to ${ATTACHMENTS_MAX} screenshots.`).default([]),
});

export const guestSupportSchema = z.object({
  name: nameSchema,
  email: emailSchema,
  phone: z
    .string()
    .trim()
    .refine((value) => value === "" || /^[6-9]\d{9}$/.test(value), "Enter a 10-digit mobile number, or leave it blank.")
    .default(""),
  topic: oneOf(GUEST_TOPIC_KEYS, "Choose what this is about."),
  message,
});

export const followUpSchema = z.object({ message: shortMessage });

export const adminUpdateSchema = z.object({
  status: oneOf(SUPPORT_STATUSES, "Pick a status.").optional(),
  reply: z.string().trim().max(MESSAGE_MAX, `Keep the reply under ${MESSAGE_MAX.toLocaleString("en-IN")} characters.`).default(""),
});

export type CreateSupportInput = z.infer<typeof createSupportSchema>;
export type GuestSupportInput = z.infer<typeof guestSupportSchema>;
export type AdminUpdateInput = z.infer<typeof adminUpdateSchema>;
