"use client";

import { useState } from "react";
import type { ColumnKind } from "@/types/report";
import { cn } from "@/utils";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export const shortLabel = (label: string) => {
  const [year, month, day] = label.split("-");
  return day ? `${Number(day)} ${MONTHS[Number(month) - 1]}` : `${MONTHS[Number(month) - 1]} ${year.slice(2)}`;
};

export const formatValue = (value: number, kind: ColumnKind) =>
  kind === "money"
    ? `₹${(value / 100).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`
    : kind === "percent"
      ? `${value}%`
      : value.toLocaleString("en-IN");

type Point = { label: string; value: number; kind: ColumnKind };

/** One series of bars with a hover tooltip; the title names the series, so no legend. */
const BarChart = ({ series, title, total, className }: { series: Point[]; title: string; total?: string; className?: string }) => {
  const [active, setActive] = useState<number | null>(null);
  if (!series.length) return null;

  const kind = series[0].kind;
  const max = Math.max(...series.map((point) => point.value), kind === "percent" ? 100 : 1);
  const step = Math.max(1, Math.ceil(series.length / 6));
  const hovered = active === null ? null : series[active];

  return (
    <figure className={cn("relative rounded-2xl border border-tertiary/10 bg-secondary p-5 shadow-sm", className)}>
      <figcaption className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="text-sm font-semibold text-tertiary">{title}</span>
        {total && <span className="text-lg font-bold text-tertiary">{total}</span>}
      </figcaption>

      <div className="relative mt-4 h-40" onMouseLeave={() => setActive(null)}>
        <div aria-hidden="true" className="absolute inset-0 flex flex-col justify-between">
          {[0, 1, 2, 3].map((line) => (
            <span key={line} className="border-t border-tertiary/6" />
          ))}
        </div>
        <div aria-hidden="true" className="absolute inset-0 flex items-end gap-0.5">
          {series.map((point, index) => (
            <div
              key={point.label}
              onMouseEnter={() => setActive(index)}
              className="flex h-full flex-1 cursor-default items-end justify-center"
            >
              <span
                className={cn(
                  "w-full max-w-6 rounded-t transition-colors",
                  point.value === 0 ? "bg-tertiary/8" : active === index ? "bg-primary" : "bg-primary/70",
                )}
                style={{ height: point.value === 0 ? 2 : `${Math.max(3, (point.value / max) * 100)}%` }}
              />
            </div>
          ))}
        </div>
        {hovered && active !== null && (
          <div
            role="status"
            className="pointer-events-none absolute -top-2 z-10 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-lg bg-tertiary px-2.5 py-1.5 text-xs text-secondary shadow-lg"
            style={{ left: `${((active + 0.5) / series.length) * 100}%` }}
          >
            <span className="text-secondary/70">{shortLabel(hovered.label)}</span>{" "}
            <span className="font-semibold">{formatValue(hovered.value, hovered.kind)}</span>
          </div>
        )}
      </div>

      <div aria-hidden="true" className="mt-2 flex justify-between text-[11px] text-tertiary/50">
        {series
          .filter((_, index) => index % step === 0)
          .map((point) => (
            <span key={point.label}>{shortLabel(point.label)}</span>
          ))}
      </div>

      {/* sr-only on a table itself leaks its caption and height, so a div clips it. */}
      <div className="sr-only">
        <table>
          <caption>{title}</caption>
          <tbody>
            {series.map((point) => (
              <tr key={point.label}>
                <th scope="row">{shortLabel(point.label)}</th>
                <td>{formatValue(point.value, point.kind)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </figure>
  );
};

export default BarChart;
