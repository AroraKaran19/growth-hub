"use client";

import RequiredMark from "@/app/components/ui/form/RequiredMark";
import type { SelectOption } from "@/types/search";
import { cn } from "@/utils";

type ChipGroupProps = {
  label: string;
  hint?: string;
  options: SelectOption[];
  /** string for single-select, string[] for multi-select */
  value: string | string[];
  onChange: (value: string) => void;
  required?: boolean;
};

const ChipGroup = ({
  label,
  hint,
  options,
  value,
  onChange,
  required = false,
}: ChipGroupProps) => {
  const isSelected = (option: string) =>
    Array.isArray(value) ? value.includes(option) : value === option;

  return (
    <fieldset aria-required={required || undefined}>
      <legend className="text-sm font-medium text-tertiary">
        {label}
        {required && <RequiredMark />}
        {hint && (
          <span className="ml-1.5 font-normal text-tertiary/45">{hint}</span>
        )}
      </legend>

      <div className="mt-2 flex flex-wrap gap-2">
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            aria-pressed={isSelected(option.value)}
            className={cn(
              "rounded-lg border px-3.5 py-2 text-sm transition-colors",
              isSelected(option.value)
                ? "border-primary bg-primary/8 font-medium text-primary"
                : "border-tertiary/15 text-tertiary/75 hover:border-tertiary/35 hover:text-tertiary",
            )}
          >
            {option.label}
          </button>
        ))}
      </div>
    </fieldset>
  );
};

export default ChipGroup;
