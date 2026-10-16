"use client";

import { useState, type CSSProperties, type PointerEvent } from "react";
import { UsersRound } from "lucide-react";
import { shortLabel } from "@/app/components/shared/BarChart";
import { RAISED_CARD, REVEAL, plural } from "@/app/components/shared/OverviewUi";
import type { GrowthPoint } from "@/types/overview";
import { cn } from "@/utils";

type Range = "daily" | "monthly";

const RANGES: { value: Range; label: string }[] = [
  { value: "daily", label: "30 days" },
  { value: "monthly", label: "12 months" },
];

const GRID_LINES = 4;
const LABELS = 6;

/** A rounded axis ceiling, so gridlines land on whole numbers. */
const niceMax = (value: number) => {
  if (value <= GRID_LINES) return GRID_LINES;
  const step = Math.ceil(value / GRID_LINES);
  const magnitude = 10 ** Math.floor(Math.log10(step));
  return Math.ceil(step / magnitude) * magnitude * GRID_LINES;
};


type CustomerGrowthProps = { growth: { daily: GrowthPoint[]; monthly: GrowthPoint[] }; style?: CSSProperties };

/** Total customers over time as one line; new sign-ups ride along in the tooltip. */
const CustomerGrowth = ({ growth, style }: CustomerGrowthProps) => {
  const [range, setRange] = useState<Range>("daily");
  const [active, setActive] = useState<number | null>(null);
  const points = growth[range];
  if (points.length === 0) return null;

  const max = niceMax(Math.max(...points.map((point) => point.total)));
  const last = points[points.length - 1];
  const addedInRange = points.reduce((sum, point) => sum + point.added, 0);
  const x = (index: number) => (points.length === 1 ? 50 : (index / (points.length - 1)) * 100);
  const y = (total: number) => 100 - (total / max) * 100;
  const line = points.map((point, index) => `${index === 0 ? "M" : "L"}${x(index)},${y(point.total)}`).join(" ");
  const area = `${line} L100,100 L0,100 Z`;
  const step = Math.max(1, Math.ceil(points.length / LABELS));
  const hovered = active === null ? null : points[active];

  const track = (event: PointerEvent<HTMLDivElement>) => {
    const box = event.currentTarget.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (event.clientX - box.left) / box.width));
    setActive(Math.round(ratio * (points.length - 1)));
  };

  return (
    <figure className={cn(RAISED_CARD, REVEAL, "p-5 sm:p-6")} style={style}>
      <figcaption className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/8 text-primary">
            <UsersRound aria-hidden="true" className="size-5" />
          </span>
          <div>
            <p className="text-sm font-semibold text-tertiary">Customer growth</p>
            <p className="mt-0.5 text-2xl font-bold text-tertiary">{last.total.toLocaleString("en-IN")}</p>
            <p className="text-xs text-tertiary/55">
              {addedInRange > 0
                ? `+${plural(addedInRange, "new customer")} in the last ${range === "daily" ? "30 days" : "12 months"}`
                : `No new customers in the last ${range === "daily" ? "30 days" : "12 months"}`}
            </p>
          </div>
        </div>
        <div role="group" aria-label="Time range" className="inline-flex rounded-full bg-tertiary/6 p-1">
          {RANGES.map((option) => (
            <button
              key={option.value}
              type="button"
              aria-pressed={range === option.value}
              onClick={() => {
                setRange(option.value);
                setActive(null);
              }}
              className={cn(
                "rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors",
                range === option.value ? "bg-secondary text-tertiary shadow-sm" : "text-tertiary/60 hover:text-tertiary",
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      </figcaption>

      <div className="mt-5 flex gap-3">
        <div aria-hidden="true" className="flex h-44 w-8 shrink-0 flex-col justify-between text-right text-[11px] text-tertiary/45">
          {Array.from({ length: GRID_LINES + 1 }, (_, index) => (
            <span key={index} className="-translate-y-1/2 first:translate-y-0 last:translate-y-0">
              {Math.round(max - (max / GRID_LINES) * index).toLocaleString("en-IN")}
            </span>
          ))}
        </div>

        <div className="min-w-0 flex-1">
          <div
            aria-hidden="true"
            className="relative h-44 cursor-crosshair touch-none"
            onPointerMove={track}
            onPointerDown={track}
            onPointerLeave={() => setActive(null)}
          >
            <div className="absolute inset-0 flex flex-col justify-between">
              {Array.from({ length: GRID_LINES + 1 }, (_, index) => (
                <span key={index} className="border-t border-tertiary/6" />
              ))}
            </div>
            <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 size-full overflow-visible">
              <path d={area} className="fill-primary/8" />
              <path
                d={line}
                fill="none"
                strokeWidth={2}
                strokeLinejoin="round"
                strokeLinecap="round"
                vectorEffect="non-scaling-stroke"
                className="stroke-primary"
              />
              {active !== null && (
                <line
                  x1={x(active)}
                  x2={x(active)}
                  y1={0}
                  y2={100}
                  strokeWidth={1}
                  vectorEffect="non-scaling-stroke"
                  className="stroke-tertiary/25"
                />
              )}
            </svg>
            {hovered && active !== null && (
              <>
                <span
                  className="pointer-events-none absolute size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary ring-2 ring-secondary"
                  style={{ left: `${x(active)}%`, top: `${y(hovered.total)}%` }}
                />
                <div
                  role="status"
                  className={cn(
                    "pointer-events-none absolute -top-2 z-10 -translate-y-full whitespace-nowrap rounded-lg bg-tertiary px-2.5 py-1.5 text-xs text-secondary shadow-lg",
                    x(active) > 70 ? "-translate-x-full" : x(active) < 30 ? "" : "-translate-x-1/2",
                  )}
                  style={{ left: `${x(active)}%` }}
                >
                  <span className="text-secondary/70">{shortLabel(hovered.label)}</span>{" "}
                  <span className="font-semibold">{plural(hovered.total, "customer")}</span>
                  <span className="text-secondary/70"> · +{hovered.added} new</span>
                </div>
              </>
            )}
          </div>

          <div aria-hidden="true" className="relative mt-2 h-4 text-[11px] text-tertiary/50">
            {points.map((point, index) =>
              index % step === 0 || index === points.length - 1 ? (
                <span
                  key={point.label}
                  className={cn(
                    "absolute top-0 whitespace-nowrap",
                    index === 0 ? "" : index === points.length - 1 ? "-translate-x-full" : "-translate-x-1/2",
                  )}
                  style={{ left: `${x(index)}%` }}
                >
                  {shortLabel(point.label)}
                </span>
              ) : null,
            )}
          </div>
        </div>
      </div>

      <div className="sr-only">
        <table>
          <caption>Customer growth, {range === "daily" ? "last 30 days" : "last 12 months"}</caption>
          <thead>
            <tr>
              <th scope="col">{range === "daily" ? "Day" : "Month"}</th>
              <th scope="col">New customers</th>
              <th scope="col">Total customers</th>
            </tr>
          </thead>
          <tbody>
            {points.map((point) => (
              <tr key={point.label}>
                <th scope="row">{shortLabel(point.label)}</th>
                <td>{point.added}</td>
                <td>{point.total}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </figure>
  );
};

export default CustomerGrowth;
