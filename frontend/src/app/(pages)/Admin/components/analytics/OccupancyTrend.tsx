"use client";

import { useState, type CSSProperties, type PointerEvent } from "react";
import { Activity } from "lucide-react";
import { shortLabel } from "@/app/components/shared/BarChart";
import type { WorkspaceAnalytics } from "@/types/analytics";
import { cn } from "@/utils";
import { ChartCard, DataTable, TOOLTIP, hoursLabel, percent, stepWithKeys, weekdayName } from "./analyticsUi";

const GRID_LINES = 4;
const STEPS = [5, 10, 15, 20, 25];
const LABELS = 6;

const weekdayOfIso = (iso: string) => new Date(`${iso}T00:00:00Z`).getUTCDay();

type Point = WorkspaceAnalytics["trend"][number];

/** Runs of open days, so a closed day breaks the line instead of dipping to zero. */
const runsOf = (points: Point[]) => {
  const runs: number[][] = [];
  points.forEach((point, index) => {
    if (point.occupancy === null) return;
    const last = runs[runs.length - 1];
    if (last && last[last.length - 1] === index - 1) last.push(index);
    else runs.push([index]);
  });
  return runs;
};

const OccupancyTrend = ({ trend, style, className }: { trend: Point[]; style?: CSSProperties; className?: string }) => {
  const [active, setActive] = useState<number | null>(null);
  const open = trend.filter((point) => point.occupancy !== null);
  const peak = Math.max(0, ...open.map((point) => (point.occupancy ?? 0) * 100));
  const ceiling = (STEPS.find((step) => step * GRID_LINES >= peak) ?? 25) * GRID_LINES;

  const x = (index: number) => (trend.length === 1 ? 50 : (index / (trend.length - 1)) * 100);
  const y = (share: number) => 100 - ((share * 100) / ceiling) * 100;
  const runs = runsOf(trend);
  const lineOf = (run: number[]) => run.map((index, at) => `${at === 0 ? "M" : "L"}${x(index)},${y(trend[index].occupancy!)}`).join(" ");
  const step = Math.max(1, Math.ceil(trend.length / LABELS));
  const lastOpen = [...trend.keys()].reverse().find((index) => trend[index].occupancy !== null);
  const hovered = active === null ? null : trend[active];

  const track = (event: PointerEvent<HTMLDivElement>) => {
    const box = event.currentTarget.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (event.clientX - box.left) / box.width));
    setActive(Math.round(ratio * (trend.length - 1)));
  };

  const table = (
    <DataTable
      caption="Daily occupancy"
      head={["Day", "Occupancy", "Booked", "Open"]}
      rows={trend.map((point) => [
        `${weekdayName(weekdayOfIso(point.date), true)} ${shortLabel(point.date)}`,
        point.occupancy === null ? "Closed" : percent(point.occupancy, 1),
        hoursLabel(point.bookedHours),
        hoursLabel(point.openHours),
      ])}
    />
  );

  return (
    <ChartCard
      icon={Activity}
      title="Occupancy trend"
      hint="Booked seat-hours over open seat-hours, day by day"
      table={table}
      empty={open.length === 0 ? "No open seat-hours in this range. Occupancy shows once there's a seat map and opening hours." : null}
      style={style}
      className={className}
    >
      <div className="flex gap-3">
        <div aria-hidden="true" className="flex h-52 w-9 shrink-0 flex-col justify-between text-right text-[11px] tabular-nums text-tertiary/45">
          {Array.from({ length: GRID_LINES + 1 }, (_, index) => (
            <span key={index} className="-translate-y-1/2 first:translate-y-0 last:translate-y-0">
              {Math.round(ceiling - (ceiling / GRID_LINES) * index)}%
            </span>
          ))}
        </div>

        <div className="min-w-0 flex-1">
          <div
            tabIndex={0}
            role="group"
            aria-label="Occupancy by day. Use the left and right arrow keys to read each day."
            className="relative h-52 cursor-crosshair touch-none rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:ring-offset-4"
            onPointerMove={track}
            onPointerDown={track}
            onPointerLeave={() => setActive(null)}
            onKeyDown={stepWithKeys(trend.length, setActive)}
            onFocus={() => setActive((current) => current ?? trend.length - 1)}
            onBlur={() => setActive(null)}
          >
            <div aria-hidden="true" className="absolute inset-0 flex flex-col justify-between">
              {Array.from({ length: GRID_LINES + 1 }, (_, index) => (
                <span key={index} className={cn("border-t", index === GRID_LINES ? "border-tertiary/15" : "border-tertiary/6")} />
              ))}
            </div>
            <svg aria-hidden="true" viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 size-full overflow-visible">
              {runs.map((run) => (
                <g key={run[0]}>
                  {run.length > 1 && (
                    <path d={`${lineOf(run)} L${x(run[run.length - 1])},100 L${x(run[0])},100 Z`} className="fill-primary/8" />
                  )}
                  <path
                    d={lineOf(run)}
                    fill="none"
                    strokeWidth={2}
                    strokeLinejoin="round"
                    strokeLinecap="round"
                    vectorEffect="non-scaling-stroke"
                    className="stroke-primary"
                  />
                </g>
              ))}
              {active !== null && (
                <line x1={x(active)} x2={x(active)} y1={0} y2={100} strokeWidth={1} vectorEffect="non-scaling-stroke" className="stroke-tertiary/25" />
              )}
            </svg>

            {runs
              .filter((run) => run.length === 1)
              .map(([index]) => (
                <span
                  key={index}
                  className="pointer-events-none absolute size-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary ring-2 ring-secondary"
                  style={{ left: `${x(index)}%`, top: `${y(trend[index].occupancy!)}%` }}
                />
              ))}

            {lastOpen !== undefined && active === null && (
              <span aria-hidden="true">
                <span
                  className="pointer-events-none absolute size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary ring-2 ring-secondary"
                  style={{ left: `${x(lastOpen)}%`, top: `${y(trend[lastOpen].occupancy!)}%` }}
                />
                <span
                  className={cn(
                    "pointer-events-none absolute translate-y-[-160%] rounded-md bg-secondary/90 px-1.5 text-xs font-semibold text-tertiary",
                    x(lastOpen) < 15 ? "" : "-translate-x-full",
                  )}
                  style={{ left: `${x(lastOpen)}%`, top: `${y(trend[lastOpen].occupancy!)}%` }}
                >
                  {percent(trend[lastOpen].occupancy, 1)}
                </span>
              </span>
            )}

            {hovered && active !== null && (
              <>
                {hovered.occupancy !== null && (
                  <span
                    className="pointer-events-none absolute size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary ring-2 ring-secondary"
                    style={{ left: `${x(active)}%`, top: `${y(hovered.occupancy)}%` }}
                  />
                )}
                <div
                  role="status"
                  className={cn(
                    TOOLTIP,
                    "-top-2 -translate-y-full",
                    x(active) > 70 ? "-translate-x-full" : x(active) < 30 ? "" : "-translate-x-1/2",
                  )}
                  style={{ left: `${x(active)}%` }}
                >
                  <span className="font-semibold">{hovered.occupancy === null ? "Closed" : percent(hovered.occupancy, 1)}</span>{" "}
                  <span className="text-secondary/70">
                    {weekdayName(weekdayOfIso(hovered.date), true)} {shortLabel(hovered.date)}
                  </span>
                  {hovered.occupancy !== null && (
                    <span className="block text-secondary/70">
                      {hoursLabel(hovered.bookedHours)} of {hoursLabel(hovered.openHours)} booked
                    </span>
                  )}
                </div>
              </>
            )}
          </div>

          <div aria-hidden="true" className="relative mt-2 h-4 text-[11px] text-tertiary/50">
            {trend.map((point, index) =>
              index % step === 0 || index === trend.length - 1 ? (
                <span
                  key={point.date}
                  className={cn(
                    "absolute top-0 whitespace-nowrap",
                    index === 0 ? "" : index === trend.length - 1 ? "-translate-x-full" : "-translate-x-1/2",
                    index !== 0 && index !== trend.length - 1 && trend.length - 1 - index < step / 2 && "hidden",
                  )}
                  style={{ left: `${x(index)}%` }}
                >
                  {shortLabel(point.date)}
                </span>
              ) : null,
            )}
          </div>
        </div>
      </div>
      <div className="sr-only">{table}</div>
    </ChartCard>
  );
};

export default OccupancyTrend;
