"use client";

import { useState, type ReactNode } from "react";
import { Check, ChevronDown, Minus } from "lucide-react";
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

type GroupRowProps = {
  entry: AdminPermissionInfo;
  pages: AdminPermissionInfo[];
  value: string[];
  locked: boolean;
  onToggle: () => void;
  renderPage: (page: AdminPermissionInfo) => ReactNode;
};

const GroupRow = ({ entry, pages, value, locked, onToggle, renderPage }: GroupRowProps) => {
  const whole = value.includes(entry.key);
  const picked = whole ? pages.length : pages.filter((page) => value.includes(page.key)).length;
  const [isOpen, setIsOpen] = useState(picked > 0 && !whole);
  const state = whole ? "on" : picked > 0 ? "some" : "off";

  return (
    <li className={cn("rounded-xl border transition-colors", picked > 0 ? "border-primary/30 bg-primary/3" : "border-tertiary/12")}>
      <div className="flex items-center gap-2 px-2.5 py-1.5">
        <button
          type="button"
          role="checkbox"
          aria-checked={whole ? true : picked > 0 ? "mixed" : false}
          aria-label={`${entry.label}: every page, including ones added later`}
          disabled={locked}
          title={locked ? LOCKED_HINT : "Every page, including ones added later"}
          onClick={onToggle}
          className={cn("rounded-md p-0.5", locked && "cursor-not-allowed opacity-55")}
        >
          <Box state={state} />
        </button>
        <button
          type="button"
          aria-expanded={isOpen}
          onClick={() => setIsOpen(!isOpen)}
          className="flex grow items-center gap-2 rounded-md py-1 text-left"
        >
          <span className="text-sm font-semibold text-tertiary">{entry.label}</span>
          <span className={cn("rounded-full px-2 py-0.5 text-xs", picked > 0 ? "bg-primary/10 text-primary" : "bg-tertiary/5 text-tertiary/55")}>
            {whole ? "All pages" : `${picked} of ${pages.length}`}
          </span>
          <ChevronDown aria-hidden="true" className={cn("ml-auto size-4 text-tertiary/50 transition-transform", isOpen && "rotate-180")} />
        </button>
      </div>
      {isOpen && <div className="flex flex-wrap gap-1.5 border-t border-tertiary/8 px-3 py-2.5">{pages.map(renderPage)}</div>}
    </li>
  );
};

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

  const chip = (entry: AdminPermissionInfo, onToggle: () => void) => {
    const locked = !canGive(entry.key);
    const on = isOn(entry.key);
    return (
      <button
        key={entry.key}
        type="button"
        role="checkbox"
        aria-checked={on}
        disabled={locked}
        title={locked ? LOCKED_HINT : entry.description}
        onClick={onToggle}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full border py-1.5 pl-2 pr-3 text-sm transition-all",
          locked
            ? "cursor-not-allowed border-tertiary/8 text-tertiary/40"
            : on
              ? "cta-gradient border-transparent font-medium text-secondary shadow-sm shadow-primary/20"
              : "border-tertiary/15 text-tertiary/75 hover:-translate-y-0.5 hover:border-tertiary/30",
        )}
      >
        <span aria-hidden="true" className={cn("flex size-4 items-center justify-center rounded-full", on ? "bg-secondary/25" : "border border-tertiary/25")}>
          {on && <Check className="size-3" />}
        </span>
        {entry.label}
      </button>
    );
  };

  const singles = TOP_LEVEL.filter((entry) => !pagesOf(entry.key).length);
  const groups = TOP_LEVEL.filter((entry) => pagesOf(entry.key).length);

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

      <div className="mt-2.5 flex flex-wrap gap-1.5">{singles.map((entry) => chip(entry, () => toggleGroup(entry)))}</div>

      <ul className="mt-3 flex flex-col gap-1.5">
        {groups.map((entry) => (
          <GroupRow
            key={entry.key}
            entry={entry}
            pages={pagesOf(entry.key)}
            value={value}
            locked={!canGive(entry.key)}
            onToggle={() => toggleGroup(entry)}
            renderPage={(page) => chip(page, () => togglePage(page))}
          />
        ))}
      </ul>

      {error && (
        <p id={`${idPrefix}-error`} className="mt-1.5 text-sm text-primary">
          {error}
        </p>
      )}
    </fieldset>
  );
};

export default PermissionPicker;
