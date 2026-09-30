import profileIds from "@/config/profile-ids.json";
import type { SelectOption } from "@/types/search";

export const GENDER_OPTIONS: SelectOption[] = [
  { label: "Female", value: "female" },
  { label: "Male", value: "male" },
  { label: "Non-binary", value: "non-binary" },
  { label: "Prefer not to say", value: "prefer-not-to-say" },
];

export const INDUSTRY_OPTIONS: SelectOption[] = [
  { label: "Technology", value: "technology" },
  { label: "Design and creative", value: "design" },
  { label: "Finance", value: "finance" },
  { label: "Consulting", value: "consulting" },
  { label: "Healthcare", value: "healthcare" },
  { label: "Education", value: "education" },
  { label: "Legal", value: "legal" },
  { label: "Marketing", value: "marketing" },
  { label: "Other", value: "other" },
];

export const WORK_TYPE_OPTIONS: SelectOption[] = [
  { label: "Remote", value: "remote" },
  { label: "Hybrid", value: "hybrid" },
  { label: "On-site", value: "on-site" },
];

const ids = (options: SelectOption[]) => options.map((option) => option.value).join();

if (
  ids(GENDER_OPTIONS) !== profileIds.genders.join() ||
  ids(INDUSTRY_OPTIONS) !== profileIds.industries.join() ||
  ids(WORK_TYPE_OPTIONS) !== profileIds.workTypes.join()
) {
  throw new Error("Profile options must list the ids in config/profile-ids.json, in order");
}

export const COUNTRY_CODE_OPTIONS: SelectOption[] = [
  { label: "+91 IN", value: "+91" },
  { label: "+1 US", value: "+1" },
  { label: "+44 UK", value: "+44" },
  { label: "+61 AU", value: "+61" },
  { label: "+65 SG", value: "+65" },
  { label: "+971 AE", value: "+971" },
];

export const labelFor = (options: SelectOption[], value: string) =>
  options.find((option) => option.value === value)?.label ?? value;
