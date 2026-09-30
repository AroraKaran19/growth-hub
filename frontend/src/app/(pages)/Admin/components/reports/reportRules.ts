export type Preset = "this-month" | "last-month" | "last-3-months" | "last-12-months";

export const PRESETS: { value: Preset; label: string }[] = [
  { value: "this-month", label: "This month" },
  { value: "last-month", label: "Last month" },
  { value: "last-3-months", label: "Last 3 months" },
  { value: "last-12-months", label: "Last 12 months" },
];

const iso = (year: number, month: number, day: number) => new Date(Date.UTC(year, month, day)).toISOString().slice(0, 10);

/** Inclusive ISO dates for a preset, counted from today. */
export const presetRange = (preset: Preset, today: string) => {
  const [year, month] = today.split("-").map(Number);
  const index = month - 1;
  switch (preset) {
    case "this-month":
      return { from: iso(year, index, 1), to: today };
    case "last-month":
      return { from: iso(year, index - 1, 1), to: iso(year, index, 0) };
    case "last-3-months":
      return { from: iso(year, index - 2, 1), to: today };
    case "last-12-months":
      return { from: iso(year, index - 11, 1), to: today };
  }
};
