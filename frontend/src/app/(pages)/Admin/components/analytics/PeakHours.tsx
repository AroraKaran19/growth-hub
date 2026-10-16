"use client";

import { useState, type CSSProperties, type KeyboardEvent } from "react";
import { Flame } from "lucide-react";
import type { WorkspaceAnalytics } from "@/types/analytics";
import { cn } from "@/utils";
import {
  ChartCard,
  DataTable,
  HATCH,
  HEAT_STEPS,
  HEAT_ZERO,
  Swatch,
  TOOLTIP,
  axisHour,
  clockHour,
  heatColor,
  hoursLabel,
  percent,
  weekdayName,
} from "./analyticsUi";

type Heatmap = WorkspaceAnalytics["heatmap"];

const BIN_LABELS = ["1–20%", "21–40%", "41–60%", "61–80%", "81–100%"];

const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? "" : "s"}`;

const PeakHours = ({ heatmap, style }: { heatmap: Heatmap; style?: CSSProperties }) => {
  const [active, setActive] = useState<{ row: number; col: number } | null>(null);
  const { hours, days } = heatmap;

  const peak = days
    .flatMap((day, row) => day.cells.map((cell, col) => ({ row, col, share: cell?.share ?? 0 })))
    .reduce<{ row: number; col: number; share: number } | null>((best, cell) => (cell.share > (best?.share ?? 0) ? cell : best), null);
  const empty = hours.length === 0 || days.every((day) => day.cells.every((cell) => cell === null));

  const move = (event: KeyboardEvent<HTMLDivElement>) => {
    const steps: Record<string, [number, number]> = { ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1] };
    const step = steps[event.key];
    if (event.key === "Escape") return setActive(null);
    if (!step) return;
    event.preventDefault();
    setActive((current) => {
      const from = current ?? { row: 0, col: 0 };
      return {
        row: Math.min(days.length - 1, Math.max(0, from.row + step[0])),
        col: Math.min(hours.length - 1, Math.max(0, from.col + step[1])),
      };
    });
  };

  const labelEvery = hours.length > 12 ? 2 : 1;

  const table = (
    <DataTable
      caption="Average occupancy by weekday and hour"
      head={["Day", ...hours.map(clockHour)]}
      rows={days.map((day) => [weekdayName(day.weekday), ...day.cells.map((cell) => (cell ? percent(cell.share) : "Closed"))])}
    />
  );

  const legend = (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
      <Swatch color={HEAT_ZERO} label="0%" />
      {HEAT_STEPS.map((color, index) => (
        <Swatch key={color} color={color} label={BIN_LABELS[index]} />
      ))}
      <span className="inline-flex items-center gap-2 text-xs text-tertiary/70">
        <span aria-hidden="true" className="size-2.5 rounded-sm bg-tertiary/4 ring-1 ring-tertiary/10" style={HATCH} />
        Closed
      </span>
    </div>
  );

  return (
    <ChartCard
      icon={Flame}
      title="Peak hours"
      hint={
        peak
          ? `Busiest: ${weekdayName(days[peak.row].weekday)} ${clockHour(hours[peak.col])}, ${percent(peak.share)} booked on average`
          : "Average share of seats booked in each opening hour"
      }
      table={table}
      legend={legend}
      empty={empty ? "No opening hours in this range yet, so there are no peak hours to show." : null}
      style={style}
    >
      <div className="scrollbar-thin -mx-1 overflow-x-auto px-1 py-1">
        <div
          tabIndex={0}
          role="group"
          aria-label="Peak hours heatmap. Use the arrow keys to read each hour; the table view lists every value."
          onKeyDown={move}
          onFocus={() => setActive((current) => current ?? (peak ? { row: peak.row, col: peak.col } : { row: 0, col: 0 }))}
          onBlur={() => setActive(null)}
          onPointerLeave={() => setActive(null)}
          className="grid gap-0.5 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
          style={{
            gridTemplateColumns: `2.75rem repeat(${hours.length}, minmax(1.25rem, 1fr))`,
            minWidth: `${44 + hours.length * 22}px`,
          }}
        >
          {days.map((day, row) => (
            <div key={day.weekday} className="contents">
              <span className="flex items-center text-xs font-medium text-tertiary/60">{weekdayName(day.weekday, true)}</span>
              {day.cells.map((cell, col) => {
                const isActive = active?.row === row && active.col === col;
                const edge = col < 2 ? "left-0" : col > hours.length - 3 ? "right-0" : "left-1/2 -translate-x-1/2";
                return (
                  <div
                    key={hours[col]}
                    onPointerEnter={() => setActive({ row, col })}
                    className={cn(
                      "relative h-8 rounded-[5px] transition-[box-shadow,transform] duration-150 sm:h-9 motion-reduce:transition-none",
                      cell === null && "bg-tertiary/3",
                      isActive && "z-10 scale-110 shadow-md ring-2 ring-tertiary/80 ring-offset-1 ring-offset-secondary",
                    )}
                    style={cell === null ? HATCH : { background: heatColor(cell.share ?? 0) }}
                  >
                    {isActive && (
                      // The scroller clips overflow, so the top rows open their tooltip downwards.
                      <div role="status" className={cn(TOOLTIP, row < 2 ? "top-full mt-2" : "bottom-full mb-2", edge)}>
                        {cell === null ? (
                          <span className="font-semibold">Closed</span>
                        ) : (
                          <span className="font-semibold">{percent(cell.share, 1)} booked</span>
                        )}{" "}
                        <span className="text-secondary/70">
                          {weekdayName(day.weekday, true)} {clockHour(hours[col])}
                        </span>
                        {cell && (
                          <span className="block text-secondary/70">
                            Across {plural(cell.days, weekdayName(day.weekday))}, {hoursLabel(cell.openHours)} open
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
          <span />
          {hours.map((hour, col) => (
            <span key={hour} className="pt-1 text-center text-[11px] tabular-nums text-tertiary/45">
              {col % labelEvery === 0 ? axisHour(hour) : ""}
            </span>
          ))}
        </div>
      </div>
      <div className="sr-only">{table}</div>
    </ChartCard>
  );
};

export default PeakHours;
