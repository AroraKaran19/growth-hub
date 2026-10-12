import { z } from "zod";
import { GST_STATE_CODES } from "../constants/gstStates";
import { GENDERS, INDUSTRIES, PROFILE_FIELDS, WORK_TYPES } from "../constants/profile";
import type { MemberBilling } from "../models/member.schema";
import { normalizeEmail } from "../utils/email";
import { gstinStateCode, isValidGstin } from "../utils/gstin";

const MAX_TEXT = 120;
const MAX_ADDRESS = 300;
const EARLIEST_BIRTH_YEAR = 1900;

const blankToNull = (value: unknown) => (typeof value === "string" && value.trim() === "" ? null : value);

/** Optional field where an empty box clears the saved value. */
const clearable = <T extends z.ZodType>(schema: T) => z.preprocess(blankToNull, schema.nullable()).optional();

const oneOf = (values: readonly string[]) =>
  z.string().refine((value) => values.includes(value), "Pick one of the options.");

const isRealDay = (value: string) => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;
  const [year, month, day] = match.slice(1).map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return year >= EARLIEST_BIRTH_YEAR && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
};

// India time, so a birthday typed late in the evening is not called the future.
const todayInIndia = () => new Date(Date.now() + 5.5 * 60 * 60 * 1000).toISOString().slice(0, 10);

const dateOfBirth = z
  .string()
  .refine(isRealDay, "Enter a real date.")
  .refine((value) => !isRealDay(value) || value <= todayInIndia(), "The date can't be in the future.");

const text = z.string().trim().max(MAX_TEXT, `Keep it under ${MAX_TEXT} characters.`);

const billingEmail = z
  .string()
  .transform((value) => normalizeEmail(value) ?? "")
  .refine((value) => value !== "", "Enter a valid email address.");

const gstin = z
  .string()
  .transform((value) => value.replace(/\s+/g, "").toUpperCase())
  .refine(isValidGstin, "Enter a valid 15-character GSTIN.");

const address = z
  .string()
  .transform((value) =>
    value
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .join("\n"),
  )
  .refine((value) => value.length <= MAX_ADDRESS, `Keep it under ${MAX_ADDRESS} characters.`);

// Sent whole: a field left out is cleared, so the GSTIN and state are always checked together.
const billingFields = z
  .object({
    companyName: clearable(text),
    gstin: clearable(gstin),
    address: clearable(address),
    state: clearable(oneOf(GST_STATE_CODES)),
  })
  .superRefine((billing, ctx) => {
    // Runs even when the GSTIN itself failed; that error is the one to show.
    if (billing.gstin && isValidGstin(billing.gstin) && billing.state && gstinStateCode(billing.gstin) !== billing.state) {
      ctx.addIssue({ code: "custom", path: ["state"], message: "Pick the state your GSTIN is registered in." });
    }
  })
  .transform(
    (billing): MemberBilling => ({
      companyName: billing.companyName ?? null,
      gstin: billing.gstin ?? null,
      address: billing.address ?? null,
      state: billing.state ?? (billing.gstin ? gstinStateCode(billing.gstin) : null),
    }),
  );

const billing = z.preprocess((value) => (value === null ? {} : value), billingFields);

const schema = z.object({
  dateOfBirth: clearable(dateOfBirth),
  gender: clearable(oneOf(GENDERS)),
  companyName: clearable(text),
  jobTitle: clearable(text),
  industry: clearable(oneOf(INDUSTRIES)),
  workType: clearable(oneOf(WORK_TYPES)),
  preferredLocation: clearable(z.string().regex(/^[a-z0-9-]{1,80}$/, "Pick one of the options.")),
  billingEmail: clearable(billingEmail),
  billing: billing.optional(),
});

const UPDATABLE = [...PROFILE_FIELDS, "billing"];

/** The profile part of a member update; every other key in the body is dropped. */
export const profileFieldsSchema = z.preprocess((body) => {
  const source = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  return Object.fromEntries(UPDATABLE.filter((key) => key in source).map((key) => [key, source[key]]));
}, schema);

export type ProfileFieldsInput = z.infer<typeof profileFieldsSchema>;
