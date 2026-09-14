"use client";

import { useEffect, useRef } from "react";
import { CalendarDays } from "lucide-react";
import type { DayOption } from "@/types/booking";
import { cn } from "@/utils";

type DateStripProps = {
  days: DayOption[];
  value: string;
  onChange: (value: string) => void;
  title?: string;
};

const DateStrip = ({
  days,
  value,
  onChange,
  title = "Select Date",
}: DateStripProps) => {
  const calendarRef = useRef<HTMLInputElement>(null);
  const stripRef = useRef<HTMLDivElement>(null);

  // Keep the chosen day visible, including when it came from the calendar and
  // sits far outside the current scroll position.
  useEffect(() => {
    if (!value) return;
    stripRef.current
      ?.querySelector(`[data-day="${value}"]`)
      ?.scrollIntoView({ block: "nearest", inline: "center" });
  }, [value, days]);

  const openCalendar = () => {
    const input = calendarRef.current;
    if (!input) return;

    // showPicker is the reliable way in; clicking is the fallback for browsers
    // that do not support it.
    if (typeof input.showPicker === "function") input.showPicker();
    else input.click();
  };

  return (
    <div className="rounded-2xl border border-tertiary/10 bg-secondary p-5 lg:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-base font-bold text-tertiary">{title}</h2>

        <span className="relative inline-flex">
          <button
            type="button"
            onClick={openCalendar}
            className="cta-gradient inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium text-secondary transition-opacity hover:opacity-90"
          >
            <CalendarDays aria-hidden="true" className="size-4" />
            View Calendar
          </button>
          <input
            ref={calendarRef}
            type="date"
            aria-label="Pick a date from the calendar"
            min={days[0]?.id}
            value={value}
            onChange={(event) => onChange(event.target.value)}
            className="pointer-events-none absolute inset-0 opacity-0"
            tabIndex={-1}
          />
        </span>
      </div>

      <div
        ref={stripRef}
        className="-mx-1 mt-5 flex gap-2 overflow-x-auto px-1 pb-1"
      >
        {days.length === 0 ? (
          // Days are built after mount; hold the height so nothing jumps.
          <div className="h-16" aria-hidden="true" />
        ) : (
          days.map((day) => (
            <div key={day.id} className="flex shrink-0 items-center gap-2">
              {day.monthLabel && (
                <span className="flex h-16 w-11 shrink-0 items-center justify-center rounded-lg bg-tertiary/5 text-xs font-medium text-tertiary/60">
                  {day.monthLabel}
                </span>
              )}
              <button
                type="button"
                data-day={day.id}
                onClick={() => onChange(day.id)}
                aria-pressed={value === day.id}
                className={cn(
                  "flex h-16 w-14 shrink-0 flex-col items-center justify-center rounded-lg border transition-colors",
                  value === day.id
                    ? "cta-gradient border-transparent text-secondary"
                    : "border-tertiary/12 text-tertiary hover:border-tertiary/30",
                )}
              >
                <span className="text-base font-semibold">{day.day}</span>
                <span
                  className={cn(
                    "text-xs",
                    value === day.id ? "text-secondary/85" : "text-tertiary/55",
                  )}
                >
                  {day.weekday}
                </span>
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default DateStrip;
