import gstStates from "@/config/gst-states.json";
import type { SelectOption } from "@/types/search";

export const GST_STATE_CODES: string[] = gstStates.map((state) => state.code);

export const GST_STATE_OPTIONS: SelectOption[] = gstStates.map((state) => ({
  label: `${state.name} (${state.code})`,
  value: state.code,
}));

export const gstStateName = (code: string | null | undefined) =>
  gstStates.find((state) => state.code === code)?.name ?? "";
