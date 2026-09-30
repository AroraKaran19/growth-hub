"use client";

import type { TimeSlot } from "@/types/booking";
import { cn } from "@/utils";

type TimeSlotGridProps = {
  slots: TimeSlot[];
  value: string;
  onChange: (value: string) => void;
};

const LEGEND = [
  { label: "Available", className: "bg-green-500" },
  { label: "Selected", className: "bg-orange-500" },
  { label: "Unavailable", className: "bg-tertiary/30" },
];

const TimeSlotGrid = ({ slots, value, onChange }: TimeSlotGridProps) => {
  return (
    <div className="rounded-2xl border border-tertiary/10 bg-secondary p-5 lg:p-6">
      <h2 className="text-base font-bold text-tertiary">Select Time</h2>

      {slots.length === 0 && (
        <p className="mt-4 text-sm text-tertiary/60">
          No start time fits inside the venue&apos;s opening hours. Try a
          shorter booking.
        </p>
      )}

      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {slots.map((slot) => {
          const isSelected = value === slot.id;

          return (
            <button
              key={slot.id}
              type="button"
              disabled={!slot.available}
              onClick={() => onChange(slot.id)}
              aria-pressed={isSelected}
              className={cn(
                "rounded-lg border px-3 py-2.5 text-sm transition-colors",
                !slot.available &&
                  "cursor-not-allowed border-transparent bg-tertiary/5 text-tertiary/35",
                slot.available &&
                  !isSelected &&
                  "border-tertiary/12 text-tertiary hover:border-tertiary/30",
                isSelected && "cta-gradient border-transparent text-secondary",
              )}
            >
              {slot.label}
            </button>
          );
        })}
      </div>

      <ul className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
        {LEGEND.map((item) => (
          <li
            key={item.label}
            className="flex items-center gap-2 text-xs text-tertiary/65"
          >
            <span
              aria-hidden="true"
              className={cn("size-2.5 rounded-full", item.className)}
            />
            {item.label}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default TimeSlotGrid;
