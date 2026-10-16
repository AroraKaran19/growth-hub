import catalogue from "@/config/catalogue-ids.json";
import type { SelectOption } from "@/types/search";

// Areas shown as "coming soon" until a venue opens there. Not a filter list.
export const PLANNED_LOCALITIES: SelectOption[] = [
  { label: "Koramangala", value: "koramangala" },
  { label: "Mahalaxmi Layout", value: "mahalaxmi-layout" },
  { label: "Indiranagar", value: "indiranagar" },
  { label: "HSR Layout", value: "hsr-layout" },
  { label: "Whitefield", value: "whitefield" },
  { label: "MG Road", value: "mg-road" },
  { label: "Electronic City", value: "electronic-city" },
  { label: "Hebbal", value: "hebbal" },
];

export const PEOPLE_OPTIONS: SelectOption[] = [
  { label: "1 person", value: "1" },
  { label: "2 people", value: "2" },
  { label: "3-5 people", value: "3-5" },
  { label: "6-10 people", value: "6-10" },
  { label: "10+ people", value: "10+" },
];

export const DURATION_OPTIONS: SelectOption[] = [
  { label: "Hourly", value: "hourly" },
  { label: "Half day", value: "half-day" },
  { label: "Full day", value: "full-day" },
  { label: "Weekly", value: "weekly" },
  { label: "Monthly", value: "monthly" },
];

export type PriceBand = SelectOption & {
  min: number;
  max: number;
};

export const PRICE_BANDS: PriceBand[] = [
  { label: "Under ₹200", value: "under-200", min: 0, max: 199 },
  { label: "₹200 to ₹400", value: "200-400", min: 200, max: 400 },
  { label: "₹400 to ₹600", value: "400-600", min: 401, max: 600 },
  { label: "Over ₹600", value: "over-600", min: 601, max: Infinity },
];

export const WORKSPACE_TYPE_OPTIONS: SelectOption[] = [
  { label: "Hot desk", value: "hot-desk" },
  { label: "Dedicated desk", value: "dedicated-desk" },
  { label: "Private cabin", value: "private-cabin" },
  { label: "Office", value: "office" },
  { label: "Meeting room", value: "meeting-room" },
];

if (WORKSPACE_TYPE_OPTIONS.map((option) => option.value).join() !== catalogue.workspaceTypes.join()) {
  throw new Error("WORKSPACE_TYPE_OPTIONS must list the ids in config/catalogue-ids.json, in order");
}
