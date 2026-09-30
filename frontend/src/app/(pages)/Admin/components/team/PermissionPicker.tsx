"use client";

import { Check } from "lucide-react";
import { ADMIN_PERMISSIONS } from "@/config/adminPermissions";
import { cn } from "@/utils";

type PermissionPickerProps = {
  value: string[];
  onChange: (next: string[]) => void;
  error?: string;
  idPrefix: string;
};

const PermissionPicker = ({ value, onChange, error, idPrefix }: PermissionPickerProps) => {
  const allSelected = ADMIN_PERMISSIONS.every((entry) => value.includes(entry.key));

  const toggle = (key: string) =>
    onChange(value.includes(key) ? value.filter((item) => item !== key) : [...value, key]);

  return (
    <fieldset className="relative" aria-describedby={error ? `${idPrefix}-error` : undefined}>
      <legend className="text-sm font-medium text-tertiary">Sections they can open</legend>
      <button
        type="button"
        onClick={() => onChange(allSelected ? [] : ADMIN_PERMISSIONS.map((entry) => entry.key))}
        className="absolute right-0 top-0 text-sm font-medium text-primary transition-opacity hover:opacity-75"
      >
        {allSelected ? "Clear all" : "Select all"}
      </button>

      <div className="mt-2.5 grid grid-cols-1 gap-2 sm:grid-cols-2">
        {ADMIN_PERMISSIONS.map((entry) => {
          const isOn = value.includes(entry.key);
          return (
            <button
              key={entry.key}
              type="button"
              role="checkbox"
              aria-checked={isOn}
              onClick={() => toggle(entry.key)}
              className={cn(
                "flex items-start gap-3 rounded-xl border px-3.5 py-3 text-left transition-all",
                isOn
                  ? "border-primary/40 bg-primary/5 shadow-sm"
                  : "border-tertiary/12 hover:-translate-y-0.5 hover:border-tertiary/25 hover:shadow-sm",
              )}
            >
              <span
                aria-hidden="true"
                className={cn(
                  "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-md border transition-colors",
                  isOn ? "cta-gradient border-transparent text-secondary" : "border-tertiary/25",
                )}
              >
                {isOn && <Check className="size-3.5" />}
              </span>
              <span>
                <span className="block text-sm font-medium text-tertiary">{entry.label}</span>
                <span className="block text-xs text-tertiary/55">{entry.description}</span>
              </span>
            </button>
          );
        })}
      </div>

      {error && (
        <p id={`${idPrefix}-error`} className="mt-1.5 text-sm text-primary">
          {error}
        </p>
      )}
    </fieldset>
  );
};

export default PermissionPicker;
