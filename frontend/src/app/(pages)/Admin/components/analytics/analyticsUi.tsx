"use client";

import { useState, type CSSProperties, type KeyboardEvent, type ReactNode } from "react";
import { ChartColumn, Table2, type LucideIcon } from "lucide-react";
import { RAISED_CARD, REVEAL } from "@/app/components/shared/OverviewUi";
import { cn } from "@/utils";

// Fixed order, checked with the dataviz validator against the white card surface.
export const STREAMS = [
  { key: "passes", label: "Passes", color: "var(--color-primary)" },
  { key: "memberships", label: "Memberships", color: "#2a78d6" },
  { key: "addons", label: "Add-ons", color: "#008300" },
] as const;

// One hue light to dark at the brand red; the five booked bins pass the ordinal check.
export const HEAT_ZERO = "#fceae7";
export const HEAT_STEPS = ["#ea988e", "#e26c61", "#d73530", "#b70010", "#8a050c"];

export const heatColor = (share: number) =>
  share <= 0 ? HEAT_ZERO : HEAT_STEPS[Math.min(HEAT_STEPS.length - 1, Math.floor((share * 100 - 0.0001) / 20))];

export const HATCH: CSSProperties = {
  backgroundImage: "repeating-linear-gradient(45deg, rgb(0 0 0 / 0.07) 0 1.5px, transparent 1.5px 6px)",
};

export const TOOLTIP =
  "pointer-events-none absolute z-20 whitespace-nowrap rounded-lg bg-tertiary px-2.5 py-1.5 text-xs text-secondary shadow-lg";

export const percent = (share: number | null, digits = 0) =>
  share === null ? "No data" : `${(share * 100).toFixed(share > 0 && share < 0.01 && digits === 0 ? 1 : digits)}%`;

export const hoursLabel = (hours: number) => `${hours.toLocaleString("en-IN", { maximumFractionDigits: 1 })} h`;

export const lengthLabel = (minutes: number | null) => {
  if (minutes === null) return "No data";
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return hours ? (rest ? `${hours}h ${rest}m` : `${hours}h`) : `${rest}m`;
};

/** Indian grouping: thousands, lakhs and crores. */
export const compactRupees = (paise: number) => {
  const rupees = paise / 100;
  const trim = (value: number) => value.toLocaleString("en-IN", { maximumFractionDigits: value < 10 ? 1 : 0 });
  if (rupees >= 1e7) return `₹${trim(rupees / 1e7)}Cr`;
  if (rupees >= 1e5) return `₹${trim(rupees / 1e5)}L`;
  if (rupees >= 1e3) return `₹${trim(rupees / 1e3)}K`;
  return `₹${Math.round(rupees).toLocaleString("en-IN")}`;
};

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export const weekdayName = (weekday: number, short = false) => (short ? DAY_NAMES[weekday].slice(0, 3) : DAY_NAMES[weekday]);

export const clockHour = (hour: number) => `${hour % 12 || 12} ${hour < 12 ? "AM" : "PM"}`;

/** Left and right step through a chart's points, Home and End jump, Escape leaves. */
export const stepWithKeys =
  (count: number, setActive: (update: (current: number | null) => number | null) => void) => (event: KeyboardEvent) => {
    const moves: Record<string, (current: number) => number> = {
      ArrowLeft: (current) => current - 1,
      ArrowRight: (current) => current + 1,
      Home: () => 0,
      End: () => count - 1,
    };
    if (event.key === "Escape") return setActive(() => null);
    const move = moves[event.key];
    if (!move) return;
    event.preventDefault();
    setActive((current) => Math.min(count - 1, Math.max(0, move(current ?? count - 1))));
  };

export const axisHour =(hour: number) => `${hour % 12 || 12}${hour < 12 ? "a" : "p"}`;

type ChartCardProps = {
  icon: LucideIcon;
  title: string;
  hint?: string;
  /** The chart's accessible twin; omitted for blocks that are already a table. */
  table?: ReactNode;
  legend?: ReactNode;
  empty?: string | null;
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
};

export const ChartCard = ({ icon: Icon, title, hint, table, legend, empty, className, style, children }: ChartCardProps) => {
  const [view, setView] = useState<"chart" | "table">("chart");
  const showTable = view === "table" && table && !empty;
  return (
    <section aria-label={title} className={cn(RAISED_CARD, REVEAL, "flex min-w-0 flex-col p-5 sm:p-6", className)} style={style}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/8 text-primary">
            <Icon aria-hidden="true" className="size-5" />
          </span>
          <div className="min-w-0">
            <h2 className="text-base font-bold text-tertiary">{title}</h2>
            {hint && <p className="mt-0.5 text-xs text-tertiary/55">{hint}</p>}
          </div>
        </div>
        {table && !empty && (
          <div role="group" aria-label={`${title} view`} className="inline-flex shrink-0 rounded-full bg-tertiary/6 p-1">
            {(
              [
                { value: "chart", label: "Chart", icon: ChartColumn },
                { value: "table", label: "Table", icon: Table2 },
              ] as const
            ).map((option) => (
              <button
                key={option.value}
                type="button"
                aria-pressed={view === option.value}
                aria-label={`Show as ${option.label.toLowerCase()}`}
                title={option.label}
                onClick={() => setView(option.value)}
                className={cn(
                  "grid size-8 place-items-center rounded-full transition-colors",
                  view === option.value ? "bg-secondary text-tertiary shadow-sm" : "text-tertiary/50 hover:text-tertiary",
                )}
              >
                <option.icon aria-hidden="true" className="size-4" />
              </button>
            ))}
          </div>
        )}
      </div>
      {legend && !empty && !showTable && <div className="mt-4">{legend}</div>}
      <div className="mt-5 min-w-0 flex-1">
        {empty ? <EmptyBlock icon={Icon} message={empty} /> : showTable ? <div className="overflow-x-auto">{table}</div> : children}
      </div>
    </section>
  );
};

export const EmptyBlock = ({ icon: Icon, message }: { icon: LucideIcon; message: string }) => (
  <div className="flex h-full min-h-40 flex-col items-center justify-center gap-3 rounded-xl bg-tertiary/3 px-6 py-8 text-center">
    <span className="grid size-10 place-items-center rounded-full bg-secondary text-tertiary/35 shadow-sm">
      <Icon aria-hidden="true" className="size-5" />
    </span>
    <p className="max-w-xs text-sm text-tertiary/60">{message}</p>
  </div>
);

export const DataTable = ({ caption, head, rows }: { caption: string; head: string[]; rows: (string | number)[][] }) => (
  <table className="w-full min-w-max text-left text-sm">
    <caption className="sr-only">{caption}</caption>
    <thead>
      <tr className="border-b border-tertiary/10 text-xs text-tertiary/55">
        {head.map((cell, index) => (
          <th key={cell} scope="col" className={cn("px-3 py-2 font-medium", index > 0 && "text-right")}>
            {cell}
          </th>
        ))}
      </tr>
    </thead>
    <tbody>
      {rows.map((row) => (
        <tr key={String(row[0])} className="border-b border-tertiary/6 last:border-0">
          {row.map((cell, index) =>
            index === 0 ? (
              <th key={index} scope="row" className="px-3 py-2 font-medium text-tertiary">
                {cell}
              </th>
            ) : (
              <td key={index} className="px-3 py-2 text-right tabular-nums text-tertiary/75">
                {cell}
              </td>
            ),
          )}
        </tr>
      ))}
    </tbody>
  </table>
);

export const Swatch = ({ color, label }: { color: string; label: string }) => (
  <span className="inline-flex items-center gap-2 text-xs text-tertiary/70">
    <span aria-hidden="true" className="size-2.5 rounded-sm" style={{ background: color }} />
    {label}
  </span>
);
