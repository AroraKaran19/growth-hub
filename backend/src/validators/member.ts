import { z } from "zod";
import { GENDERS, INDUSTRIES, PROFILE_FIELDS, WORK_TYPES } from "../constants/profile";
import { normalizeEmail } from "../utils/email";

const MAX_TEXT = 120;
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

const schema = z.object({
  dateOfBirth: clearable(dateOfBirth),
  gender: clearable(oneOf(GENDERS)),
  companyName: clearable(text),
  jobTitle: clearable(text),
  industry: clearable(oneOf(INDUSTRIES)),
  workType: clearable(oneOf(WORK_TYPES)),
  preferredLocation: clearable(z.string().regex(/^[a-z0-9-]{1,80}$/, "Pick one of the options.")),
  billingEmail: clearable(billingEmail),
});

/** The profile part of a member update; every other key in the body is dropped. */
export const profileFieldsSchema = z.preprocess((body) => {
  const source = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  return Object.fromEntries(PROFILE_FIELDS.filter((key) => key in source).map((key) => [key, source[key]]));
}, schema);

export type ProfileFieldsInput = z.infer<typeof profileFieldsSchema>;
