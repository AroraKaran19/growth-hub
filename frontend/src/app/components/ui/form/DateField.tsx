"use client";

import { Calendar } from "lucide-react";
import { cn } from "@/utils";
import RequiredMark from "./RequiredMark";

type DateFieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  required?: boolean;
  /** ISO dates the picker allows. */
  min?: string;
  max?: string;
};

const DateField = ({
  label,
  value,
  onChange,
  placeholder = "Select",
  className,
  required = false,
  min,
  max,
}: DateFieldProps) => {
  return (
    <label className={cn("block", className)}>
      <span className="mb-1.5 block text-sm font-medium text-tertiary">
        {label}
        {required && <RequiredMark />}
      </span>

      <span className="relative block">
        {/* Native input keeps the OS picker; its `mm/dd/yyyy` text is hidden
            while empty so the span below can stand in. */}
        <input
          type="date"
          value={value}
          min={min}
          max={max}
          onChange={(event) => onChange(event.target.value)}
          aria-required={required || undefined}
          className={cn(
            "peer relative w-full rounded-lg border border-tertiary/15 bg-secondary py-2.5 pl-3.5 pr-9 text-sm text-tertiary outline-none transition-colors",
            "hover:border-tertiary/30 focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20",
            !value && "text-transparent focus:text-tertiary",
          )}
        />

        {!value && (
          <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-tertiary/55 peer-focus:hidden">
            {placeholder}
          </span>
        )}

        <Calendar
          aria-hidden="true"
          className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-tertiary/50"
        />
      </span>
    </label>
  );
};

export default DateField;
