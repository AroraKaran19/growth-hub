// Keep in step with frontend/src/config/profile-ids.json; a test compares them.
export const GENDERS = ["female", "male", "non-binary", "prefer-not-to-say"] as const;

export const INDUSTRIES = [
  "technology",
  "design",
  "finance",
  "consulting",
  "healthcare",
  "education",
  "legal",
  "marketing",
  "other",
] as const;

export const WORK_TYPES = ["remote", "hybrid", "on-site"] as const;

export const PROFILE_FIELDS = [
  "dateOfBirth",
  "gender",
  "companyName",
  "jobTitle",
  "industry",
  "workType",
  "preferredLocation",
  "billingEmail",
] as const;

export type ProfileField = (typeof PROFILE_FIELDS)[number];
