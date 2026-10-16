"use client";

import { CalendarClock, CopyCheck } from "lucide-react";
import RequiredMark from "@/app/components/ui/form/RequiredMark";
import SelectField, { type SelectFieldOption } from "@/app/components/ui/form/SelectField";
import { cn } from "@/utils";
import { LONG_DAY_NAMES, clockLabel, hoursSummary, windowOfHours } from "@/utils/venueHours";
import { toMinutes24 } from "@/utils/time";
import { hoursFromDraft, type DayDraft, type DraftErrors } from "./venueDraft";

const STEP_MINUTES = 30;
// Hours end on the same day, so the latest closing is a minute before midnight.
const LAST_CLOSE = "23:59";

const hhmm = (minutes: number) => `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;

const GRID = Array.from({ length: (24 * 60) / STEP_MINUTES }, (_, index) => hhmm(index * STEP_MINUTES));

const optionFor = (value: string, disabled = false): SelectFieldOption => ({
  value,
  label: clockLabel(toMinutes24(value) ?? 0),
  disabled,
});

/** A saved time off the half-hour grid stays pickable, so opening the form never changes it. */
const withValue = (values: string[], current: string) =>
  values.includes(current) || toMinutes24(current) === null ? values : [...values, current].sort();

const openingOptions = (current: string) => withValue(GRID, current).map((value) => optionFor(value));

const closingOptions = (opensAt: string, current: string) =>
  withValue([...GRID.slice(1), LAST_CLOSE], current).map((value) => optionFor(value, value <= opensAt));

type DaySwitchProps = { day: number; isOpen: boolean; onChange: (isOpen: boolean) => void };

const DaySwitch = ({ day, isOpen, onChange }: DaySwitchProps) => (
  <button
    type="button"
    role="switch"
    aria-checked={isOpen}
    aria-label={`Open on ${LONG_DAY_NAMES[day]}`}
    onClick={() => onChange(!isOpen)}
    className="group inline-flex w-fit items-center gap-2 rounded-full py-1 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
  >
    <span
      aria-hidden="true"
      className={cn(
        "relative inline-flex h-5 w-9 shrink-0 rounded-full shadow-inner transition-colors",
        isOpen ? "cta-gradient" : "bg-tertiary/15 group-hover:bg-tertiary/25",
      )}
    >
      <span
        className={cn(
          "absolute top-0.5 size-4 rounded-full bg-secondary shadow-sm transition-transform motion-reduce:transition-none",
          isOpen ? "translate-x-4.5" : "translate-x-0.5",
        )}
      />
    </span>
    <span className={cn("w-12 text-left font-medium", isOpen ? "text-tertiary" : "text-tertiary/45")}>
      {isOpen ? "Open" : "Closed"}
    </span>
  </button>
);

type WeeklyHoursEditorProps = {
  rows: DayDraft[];
  errors: DraftErrors;
  onChange: (rows: DayDraft[]) => void;
};

/** Seven compact rows, Monday first: an open switch and a time range per day. */
const WeeklyHoursEditor = ({ rows, errors, onChange }: WeeklyHoursEditorProps) => {
  const update = (day: number, change: Partial<DayDraft>) =>
    onChange(rows.map((row) => (row.day === day ? { ...row, ...change } : row)));

  const copyToOpenDays = (from: DayDraft) =>
    onChange(rows.map((row) => (row.isOpen ? { ...row, opensAt: from.opensAt, closesAt: from.closesAt } : row)));

  const openCount = rows.filter((row) => row.isOpen).length;
  const summary = hoursSummary(hoursFromDraft(rows));

  return (
    <fieldset aria-describedby="venue-hours-summary">
      <legend className="flex items-center gap-2 text-sm font-medium text-tertiary">
        <CalendarClock aria-hidden="true" className="size-4 text-primary" />
        Opening hours
        <RequiredMark />
      </legend>

      <ul className="mt-2.5 divide-y divide-tertiary/8 rounded-xl border border-tertiary/10 bg-secondary shadow-sm">
        {rows.map((row) => {
          const name = LONG_DAY_NAMES[row.day];
          const isValid = !row.isOpen || windowOfHours(row) !== null;
          const rowError = isValid ? null : (errors[`hours.${row.day}`] ?? "Closing time must be after opening time.");
          return (
            <li
              key={row.day}
              className={cn(
                "grid grid-cols-[minmax(0,1fr)_auto_2.25rem] items-center gap-x-3 gap-y-2 px-3.5 py-2.5 transition-colors first:rounded-t-xl last:rounded-b-xl sm:grid-cols-[6.5rem_6.5rem_minmax(0,1fr)_2.25rem]",
                row.isOpen ? "bg-secondary" : "bg-tertiary/3",
                rowError && "bg-primary/4",
              )}
            >
              <span className={cn("text-sm font-semibold", row.isOpen ? "text-tertiary" : "text-tertiary/50")}>{name}</span>
              <DaySwitch day={row.day} isOpen={row.isOpen} onChange={(isOpen) => update(row.day, { isOpen })} />

              <button
                type="button"
                onClick={() => copyToOpenDays(row)}
                disabled={!row.isOpen || openCount < 2 || !isValid}
                aria-label={`Copy ${name}'s hours to all open days`}
                title="Copy to all open days"
                className="flex size-9 items-center justify-center rounded-lg text-tertiary/45 transition-all hover:-translate-y-0.5 hover:bg-primary/8 hover:text-primary disabled:pointer-events-none disabled:opacity-0 sm:col-start-4 sm:row-start-1"
              >
                <CopyCheck aria-hidden="true" className="size-4" />
              </button>

              <div className={cn("col-span-3 sm:col-span-1", !row.isOpen && "hidden sm:block")}>
                {row.isOpen ? (
                  <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2">
                    <SelectField
                      label={`${name} opens`}
                      hideLabel
                      required
                      value={row.opensAt}
                      onChange={(opensAt) => update(row.day, { opensAt })}
                      options={openingOptions(row.opensAt)}
                    />
                    <span className="text-xs text-tertiary/45">to</span>
                    <SelectField
                      label={`${name} closes`}
                      hideLabel
                      required
                      value={row.closesAt}
                      onChange={(closesAt) => update(row.day, { closesAt })}
                      options={closingOptions(row.opensAt, row.closesAt)}
                    />
                  </div>
                ) : (
                  <p className="text-sm text-tertiary/40">Closed all day</p>
                )}
              </div>

              {rowError && (
                <p role="alert" className="col-span-full text-sm text-primary">
                  {rowError}
                </p>
              )}
            </li>
          );
        })}
      </ul>

      {errors.hours && (
        <p role="alert" className="mt-2 text-sm text-primary">
          {errors.hours}
        </p>
      )}
      <p id="venue-hours-summary" className="mt-2.5 rounded-lg bg-tertiary/4 px-3.5 py-2.5 text-xs text-tertiary/65">
        <span className="font-medium text-tertiary">Members see: </span>
        {summary || "Closed every day. Open at least one day before publishing."}
      </p>
    </fieldset>
  );
};

export default WeeklyHoursEditor;
