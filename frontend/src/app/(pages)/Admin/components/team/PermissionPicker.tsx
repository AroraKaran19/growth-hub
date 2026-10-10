"use client";

import { Check } from "lucide-react";
import { ADMIN_PERMISSIONS } from "@/config/adminPermissions";
import { cn } from "@/utils";

type PermissionPickerProps = {
  value: string[];
  onChange: (next: string[]) => void;
  error?: string;
  idPrefix: string;
  /** Sections this admin may give; the rest show but stay locked. */
  grantable?: string[];
};

const PermissionPicker = ({ value, onChange, error, idPrefix, grantable }: PermissionPickerProps) => {
  const givable = ADMIN_PERMISSIONS.map((entry) => entry.key).filter((key) => !grantable || grantable.includes(key));
  const allSelected = givable.every((key) => value.includes(key));

  const toggle = (key: string) =>
    onChange(value.includes(key) ? value.filter((item) => item !== key) : [...value, key]);

  const toggleAll = () =>
    onChange(allSelected ? value.filter((key) => !givable.includes(key)) : [...new Set([...value, ...givable])]);

  return (
    <fieldset aria-describedby={error ? `${idPrefix}-error` : undefined}>
      <legend className="sr-only">Sections they can open</legend>
      <div className="flex items-center justify-between gap-3">
        <span aria-hidden="true" className="text-sm font-medium text-tertiary">
          Sections they can open
        </span>
        <button
          type="button"
          onClick={toggleAll}
          className="text-sm font-medium text-primary transition-opacity hover:opacity-75"
        >
          {allSelected ? "Clear all" : "Select all"}
        </button>
      </div>

      <div className="mt-2.5 grid grid-cols-1 gap-2 sm:grid-cols-2">
        {ADMIN_PERMISSIONS.map((entry) => {
          const isOn = value.includes(entry.key);
          const isLocked = !givable.includes(entry.key);
          return (
            <button
              key={entry.key}
              type="button"
              role="checkbox"
              aria-checked={isOn}
              disabled={isLocked}
              title={isLocked ? "Only an admin who has this section can give it." : undefined}
              onClick={() => toggle(entry.key)}
              className={cn(
                "flex items-start gap-3 rounded-xl border px-3.5 py-3 text-left transition-all",
                isLocked
                  ? "cursor-not-allowed border-tertiary/8 opacity-55"
                  : isOn
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
