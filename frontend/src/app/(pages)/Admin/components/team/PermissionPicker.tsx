"use client";

import { Check, Minus } from "lucide-react";
import { ADMIN_PERMISSIONS, hasPermission, type AdminPermissionInfo } from "@/config/adminPermissions";
import { cn } from "@/utils";

type PermissionPickerProps = {
  value: string[];
  onChange: (next: string[]) => void;
  error?: string;
  idPrefix: string;
  /** Sections this admin may give; the rest show but stay locked. */
  grantable?: string[];
};

const TOP_LEVEL = ADMIN_PERMISSIONS.filter((entry) => !entry.group);
const pagesOf = (group: string) => ADMIN_PERMISSIONS.filter((entry) => entry.group === group);
const LOCKED_HINT = "Only an admin who has this section can give it.";

const Box = ({ state }: { state: "on" | "off" | "some" }) => (
  <span
    aria-hidden="true"
    className={cn(
      "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-md border transition-colors",
      state === "off" ? "border-tertiary/25" : "cta-gradient border-transparent text-secondary",
    )}
  >
    {state === "on" && <Check className="size-3.5" />}
    {state === "some" && <Minus className="size-3.5" />}
  </span>
);

const PermissionPicker = ({ value, onChange, error, idPrefix, grantable }: PermissionPickerProps) => {
  const canGive = (key: string) => !grantable || hasPermission(grantable, key);
  const isOn = (key: string) => hasPermission(value, key);

  // Select all gives each group whole when allowed, otherwise the pages that are.
  const everything = TOP_LEVEL.flatMap((entry) => {
    const pages = pagesOf(entry.key);
    if (canGive(entry.key) || !pages.length) return canGive(entry.key) ? [entry.key] : [];
    return pages.filter((page) => canGive(page.key)).map((page) => page.key);
  });
  const allSelected = everything.every(isOn);

  const toggleAll = () =>
    onChange(allSelected ? value.filter((key) => !everything.some((given) => hasPermission([given], key))) : everything);

  const toggleGroup = (entry: AdminPermissionInfo) => {
    const pageKeys = pagesOf(entry.key).map((page) => page.key);
    const rest = value.filter((key) => key !== entry.key && !pageKeys.includes(key));
    onChange(value.includes(entry.key) ? rest : [...rest, entry.key]);
  };

  const togglePage = (page: AdminPermissionInfo) => {
    const group = page.group!;
    if (value.includes(group)) {
      // Unticking one page breaks the group into its other pages.
      const others = pagesOf(group).map((item) => item.key).filter((key) => key !== page.key);
      onChange([...value.filter((key) => key !== group), ...others]);
      return;
    }
    onChange(value.includes(page.key) ? value.filter((key) => key !== page.key) : [...value, page.key]);
  };

  const cardClass = (on: boolean, locked: boolean) =>
    cn(
      "flex w-full items-start gap-3 rounded-xl border px-3.5 py-3 text-left transition-all",
      locked
        ? "cursor-not-allowed border-tertiary/8 opacity-55"
        : on
          ? "border-primary/40 bg-primary/5 shadow-sm"
          : "border-tertiary/12 hover:-translate-y-0.5 hover:border-tertiary/25 hover:shadow-sm",
    );

  return (
    <fieldset aria-describedby={error ? `${idPrefix}-error` : undefined}>
      <legend className="sr-only">Sections they can open</legend>
      <div className="flex items-center justify-between gap-3">
        <span aria-hidden="true" className="text-sm font-medium text-tertiary">
          Sections they can open
        </span>
        <button type="button" onClick={toggleAll} className="text-sm font-medium text-primary transition-opacity hover:opacity-75">
          {allSelected ? "Clear all" : "Select all"}
        </button>
      </div>

      <div className="mt-2.5 grid grid-cols-1 gap-2 sm:grid-cols-2">
        {TOP_LEVEL.map((entry) => {
          const pages = pagesOf(entry.key);
          if (!pages.length) {
            const locked = !canGive(entry.key);
            const on = isOn(entry.key);
            return (
              <button
                key={entry.key}
                type="button"
                role="checkbox"
                aria-checked={on}
                disabled={locked}
                title={locked ? LOCKED_HINT : undefined}
                onClick={() => toggleGroup(entry)}
                className={cardClass(on, locked)}
              >
                <Box state={on ? "on" : "off"} />
                <span>
                  <span className="block text-sm font-medium text-tertiary">{entry.label}</span>
                  <span className="block text-xs text-tertiary/55">{entry.description}</span>
                </span>
              </button>
            );
          }

          const whole = value.includes(entry.key);
          const some = !whole && pages.some((page) => value.includes(page.key));
          const groupLocked = !canGive(entry.key);
          return (
            <div key={entry.key} className={cn("rounded-xl border p-1.5 sm:col-span-2", whole || some ? "border-primary/30 bg-primary/3" : "border-tertiary/12")}>
              <button
                type="button"
                role="checkbox"
                aria-checked={whole ? true : some ? "mixed" : false}
                disabled={groupLocked}
                title={groupLocked ? LOCKED_HINT : undefined}
                onClick={() => toggleGroup(entry)}
                className={cn("flex w-full items-start gap-3 rounded-lg px-2.5 py-2 text-left", groupLocked && "cursor-not-allowed opacity-55")}
              >
                <Box state={whole ? "on" : some ? "some" : "off"} />
                <span>
                  <span className="block text-sm font-semibold text-tertiary">{entry.label}</span>
                  <span className="block text-xs text-tertiary/55">All pages below, including ones added later</span>
                </span>
              </button>
              <div className="mt-1 grid grid-cols-1 gap-1.5 pl-8 sm:grid-cols-2">
                {pages.map((page) => {
                  const locked = !canGive(page.key);
                  const on = isOn(page.key);
                  return (
                    <button
                      key={page.key}
                      type="button"
                      role="checkbox"
                      aria-checked={on}
                      disabled={locked}
                      title={locked ? LOCKED_HINT : undefined}
                      onClick={() => togglePage(page)}
                      className={cardClass(on, locked)}
                    >
                      <Box state={on ? "on" : "off"} />
                      <span>
                        <span className="block text-sm font-medium text-tertiary">{page.label}</span>
                        <span className="block text-xs text-tertiary/55">{page.description}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
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
