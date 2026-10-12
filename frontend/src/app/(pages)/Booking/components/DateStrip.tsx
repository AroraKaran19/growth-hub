"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CalendarDays } from "lucide-react";
import { isOpenDay } from "@/data/bookingOptions";
import type { DayOption } from "@/types/booking";
import { cn } from "@/utils";

type DateStripProps = {
  days: DayOption[];
  value: string;
  onChange: (value: string) => void;
  title?: string;
  /** Weekdays the venue opens (0 is Sunday). Omit when it opens every day. */
  openDays?: number[];
  /** The last date on sale; passes stop at the booking horizon, plans have none. */
  lastDay?: string;
  /** Shown on days that can't be picked, such as days a plan does not cover. */
  closedLabel?: string;
  closedMessage?: string;
};

const DateStrip = ({
  days,
  value,
  onChange,
  title = "Select Date",
  openDays,
  lastDay,
  closedLabel = "Closed",
  closedMessage = "The venue is closed on that day. Please pick another date.",
}: DateStripProps) => {
  const calendarRef = useRef<HTMLInputElement>(null);
  const stripRef = useRef<HTMLDivElement>(null);
  const [isClosedPick, setIsClosedPick] = useState(false);
  const [isTooFar, setIsTooFar] = useState(false);
  const shown = useMemo(() => (lastDay ? days.filter((day) => day.id <= lastDay) : days), [days, lastDay]);
  const firstDay = shown[0]?.id;

  // Keep the chosen day visible, including when it came from the calendar and
  // sits far outside the current scroll position.
  useEffect(() => {
    if (!value) return;
    stripRef.current
      ?.querySelector(`[data-day="${value}"]`)
      ?.scrollIntoView({ block: "nearest", inline: "center" });
  }, [value, shown]);

  // `min` only limits the picker; a typed date can still come in earlier.
  const pickFromCalendar = (picked: string) => {
    if (!picked || !firstDay || picked < firstDay) return;
    setIsTooFar(Boolean(lastDay && picked > lastDay));
    if (lastDay && picked > lastDay) return setIsClosedPick(false);
    const isClosed = !isOpenDay(openDays, picked);
    setIsClosedPick(isClosed);
    if (!isClosed) onChange(picked);
  };

  const pickDay = (id: string) => {
    setIsClosedPick(false);
    setIsTooFar(false);
    onChange(id);
  };

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
            min={firstDay}
            max={lastDay}
            value={value}
            onChange={(event) => pickFromCalendar(event.target.value)}
            className="pointer-events-none absolute inset-0 opacity-0"
            tabIndex={-1}
          />
        </span>
      </div>

      <div
        ref={stripRef}
        className="-mx-1 mt-5 flex gap-2 overflow-x-auto px-1 pb-1"
      >
        {shown.length === 0 ? (
          // Days are built after mount; hold the height so nothing jumps.
          <div className="h-16" aria-hidden="true" />
        ) : (
          shown.map((day) => (
            <div key={day.id} className="flex shrink-0 items-center gap-2">
              {day.monthLabel && (
                <span className="flex h-16 w-11 shrink-0 items-center justify-center rounded-lg bg-tertiary/5 text-xs font-medium text-tertiary/60">
                  {day.monthLabel}
                </span>
              )}
              <button
                type="button"
                data-day={day.id}
                onClick={() => pickDay(day.id)}
                disabled={day.closed}
                title={day.closed ? closedLabel : undefined}
                aria-pressed={value === day.id}
                className={cn(
                  "flex h-16 w-14 shrink-0 flex-col items-center justify-center rounded-lg border transition-colors",
                  day.closed
                    ? "cursor-not-allowed border-transparent bg-tertiary/5 text-tertiary/35"
                    : value === day.id
                      ? "cta-gradient border-transparent text-secondary"
                      : "border-tertiary/12 text-tertiary hover:border-tertiary/30",
                )}
              >
                <span className="text-base font-semibold">{day.day}</span>
                <span
                  className={cn(
                    "text-xs",
                    day.closed
                      ? "text-tertiary/35"
                      : value === day.id
                        ? "text-secondary/85"
                        : "text-tertiary/55",
                  )}
                >
                  {day.closed ? closedLabel : day.weekday}
                </span>
              </button>
            </div>
          ))
        )}
      </div>

      {isTooFar && (
        <p role="status" className="mt-3 text-xs text-red-600">
          Passes can be booked up to 60 days ahead. Please pick an earlier date.
        </p>
      )}
      {isClosedPick && (
        <p role="status" className="mt-3 text-xs text-red-600">
          {closedMessage}
        </p>
      )}
    </div>
  );
};

export default DateStrip;
