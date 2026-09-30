import type { MemberAccount, MemberProfileFields } from "@/types/auth";

export type ProfileDraft = { name: string; email: string } & Record<keyof MemberProfileFields, string>;

export type ProfileErrors = Partial<Record<keyof ProfileDraft, string>>;

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const BAD_EMAIL = "Enter a valid email address.";

const PROFILE_KEYS: (keyof MemberProfileFields)[] = [
  "dateOfBirth",
  "gender",
  "companyName",
  "jobTitle",
  "industry",
  "workType",
  "preferredLocation",
  "billingEmail",
];

export const toDraft = (account: MemberAccount): ProfileDraft => ({
  name: account.name ?? "",
  email: account.email ?? "",
  // An API deployed before profiles existed sends no profile at all.
  ...(Object.fromEntries(PROFILE_KEYS.map((key) => [key, account.profile?.[key] ?? ""])) as Record<
    keyof MemberProfileFields,
    string
  >),
});

/** Only what changed, so one save never rewrites fields it did not touch. */
export const toPatch = (draft: ProfileDraft, account: MemberAccount): Partial<ProfileDraft> => {
  const saved = toDraft(account);
  const patch: Partial<ProfileDraft> = {};
  for (const key of Object.keys(saved) as (keyof ProfileDraft)[]) {
    const value = draft[key].trim();
    if (value !== saved[key]) patch[key] = value;
  }
  return patch;
};

export const validateDraft = (draft: ProfileDraft, today: string): ProfileErrors => {
  const errors: ProfileErrors = {};
  if (!draft.name.trim()) errors.name = "Enter your name.";
  if (draft.email.trim() && !EMAIL.test(draft.email.trim())) errors.email = BAD_EMAIL;
  if (draft.billingEmail.trim() && !EMAIL.test(draft.billingEmail.trim())) errors.billingEmail = BAD_EMAIL;
  if (draft.dateOfBirth && today && draft.dateOfBirth > today) errors.dateOfBirth = "The date can't be in the future.";
  return errors;
};

type ApiErrorInfo = { code?: string; message: string; fields: Record<string, string> };

export const errorsFromApi = (info: ApiErrorInfo): ProfileErrors => {
  if (info.code === "NAME_INVALID") return { name: "Enter your name." };
  if (info.code === "EMAIL_INVALID") return { email: BAD_EMAIL };
  return info.code === "VALIDATION_FAILED" ? (info.fields as ProfileErrors) : {};
};

export const memberNumber = (id: string) => id.slice(-8).toUpperCase();

export const memberSince = (createdAt: string | null) => {
  if (!createdAt) return "";
  const date = new Date(createdAt);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-GB", { month: "long", year: "numeric" });
};
