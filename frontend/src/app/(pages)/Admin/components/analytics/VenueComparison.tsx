"use client";

import { useState, type CSSProperties } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown, Building2 } from "lucide-react";
import { RAISED_CARD, REVEAL, rupees } from "@/app/components/shared/OverviewUi";
import type { VenueComparisonRow } from "@/types/analytics";
import { cn } from "@/utils";
import { EmptyBlock, percent } from "./analyticsUi";

type SortKey = "name" | "occupancy" | "bookings" | "noShowRate" | "revenue" | "revpad";

type Column = { key: SortKey; label: string; value: (row: VenueComparisonRow) => number | string | null };

const COLUMNS: Column[] = [
  { key: "name", label: "Venue", value: (row) => row.name },
  { key: "occupancy", label: "Occupancy", value: (row) => row.occupancy },
  { key: "bookings", label: "Bookings", value: (row) => row.bookings },
  { key: "noShowRate", label: "No-show rate", value: (row) => row.noShowRate },
];

const MONEY_COLUMNS: Column[] = [
  { key: "revenue", label: "Collected", value: (row) => row.revenue ?? null },
  { key: "revpad", label: "RevPAD", value: (row) => row.revpad ?? null },
];

/** Sortable on every column; empty figures always sink to the bottom. */
const VenueComparison = ({
  rows,
  showsMoney,
  onPick,
  style,
}: {
  rows: VenueComparisonRow[];
  showsMoney: boolean;
  onPick: (slug: string) => void;
  style?: CSSProperties;
}) => {
  const [sort, setSort] = useState<{ key: SortKey; dir: "asc" | "desc" }>({ key: "occupancy", dir: "desc" });
  const columns = showsMoney ? [...COLUMNS, ...MONEY_COLUMNS] : COLUMNS;
  const column = columns.find((item) => item.key === sort.key) ?? COLUMNS[1];

  const sorted = [...rows].sort((a, b) => {
    const left = column.value(a);
    const right = column.value(b);
    if (left === null || right === null) return left === right ? 0 : left === null ? 1 : -1;
    const order = typeof left === "string" ? left.localeCompare(String(right)) : left - Number(right);
    return sort.dir === "asc" ? order : -order;
  });

  const toggle = (key: SortKey) =>
    setSort((current) =>
      current.key === key ? { key, dir: current.dir === "asc" ? "desc" : "asc" } : { key, dir: key === "name" ? "asc" : "desc" },
    );

  return (
    <section aria-label="Venues compared" className={cn(RAISED_CARD, REVEAL, "p-5 sm:p-6")} style={style}>
      <div className="flex items-start gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/8 text-primary">
          <Building2 aria-hidden="true" className="size-5" />
        </span>
        <div>
          <h2 className="text-base font-bold text-tertiary">Venues compared</h2>
          <p className="mt-0.5 text-xs text-tertiary/55">Live venues over the same range. Pick one to see its own peak hours and seats.</p>
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="mt-5">
          <EmptyBlock icon={Building2} message="No live venues yet." />
        </div>
      ) : (
        <div className="scrollbar-thin mt-5 overflow-x-auto">
          <table className="w-full min-w-max text-sm">
            <caption className="sr-only">Venues compared, sorted by {column.label.toLowerCase()}</caption>
            <thead>
              <tr className="border-b border-tertiary/10">
                {columns.map((item, index) => {
                  const isSorted = sort.key === item.key;
                  const Icon = !isSorted ? ArrowUpDown : sort.dir === "asc" ? ArrowUp : ArrowDown;
                  return (
                    <th
                      key={item.key}
                      scope="col"
                      aria-sort={isSorted ? (sort.dir === "asc" ? "ascending" : "descending") : "none"}
                      className={cn("px-3 py-2 font-medium", index === 0 ? "text-left" : "text-right")}
                    >
                      <button
                        type="button"
                        onClick={() => toggle(item.key)}
                        className={cn(
                          "inline-flex items-center gap-1 rounded-md px-1 py-0.5 text-xs transition-colors hover:text-tertiary",
                          isSorted ? "text-tertiary" : "text-tertiary/55",
                        )}
                      >
                        {item.label}
                        <Icon aria-hidden="true" className={cn("size-3.5", !isSorted && "opacity-50")} />
                      </button>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {sorted.map((row) => (
                <tr key={row.slug} className="group border-b border-tertiary/6 transition-colors last:border-0 hover:bg-tertiary/2">
                  <th scope="row" className="px-3 py-3 text-left font-medium">
                    <button
                      type="button"
                      onClick={() => onPick(row.slug)}
                      className="text-tertiary underline-offset-4 transition-colors hover:text-primary hover:underline"
                    >
                      {row.name}
                    </button>
                    {row.seats === 0 && (
                      <span className="ml-2 rounded-full bg-tertiary/6 px-2 py-0.5 text-[11px] font-medium text-tertiary/55">No seat map</span>
                    )}
                  </th>
                  <td className="px-3 py-3 text-right">
                    <span className="inline-flex items-center justify-end gap-2.5">
                      <span aria-hidden="true" className="hidden h-1.5 w-20 overflow-hidden rounded-full bg-tertiary/6 sm:block">
                        <span className="block h-full rounded-full bg-primary/80" style={{ width: `${(row.occupancy ?? 0) * 100}%` }} />
                      </span>
                      <span className="w-14 tabular-nums text-tertiary">{percent(row.occupancy, 1)}</span>
                    </span>
                  </td>
                  <td className="px-3 py-3 text-right tabular-nums text-tertiary/80">{row.bookings.toLocaleString("en-IN")}</td>
                  <td className="px-3 py-3 text-right tabular-nums text-tertiary/80">{percent(row.noShowRate, 1)}</td>
                  {showsMoney && (
                    <>
                      <td className="px-3 py-3 text-right tabular-nums text-tertiary/80">{rupees(row.revenue ?? 0)}</td>
                      <td className="px-3 py-3 text-right tabular-nums text-tertiary/80">
                        {row.revpad === null || row.revpad === undefined ? "No data" : rupees(row.revpad)}
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
};

export default VenueComparison;
