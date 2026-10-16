"use client";

import { useEffect, useState } from "react";
import { cn } from "@/utils";

export type ListBar = { key: string; label: string; note?: string; value: number; display: string; detail?: string };

const BarList = ({ bars, max, className }: { bars: ListBar[]; max?: number; className?: string }) => {
  const [grown, setGrown] = useState(false);
  useEffect(() => {
    const frame = requestAnimationFrame(() => setGrown(true));
    return () => cancelAnimationFrame(frame);
  }, []);
  const top = max ?? Math.max(1, ...bars.map((bar) => bar.value));

  return (
    <ul className={cn("flex flex-col gap-3.5", className)}>
      {bars.map((bar) => {
        const share = Math.min(1, bar.value / top);
        return (
          <li key={bar.key} className="group">
            <div className="flex items-baseline justify-between gap-3">
              <span className="min-w-0 truncate text-sm font-medium text-tertiary">
                {bar.label}
                {bar.note && <span className="ml-1.5 text-xs font-normal text-tertiary/45">{bar.note}</span>}
              </span>
              {bar.detail && <span className="shrink-0 text-xs tabular-nums text-tertiary/50">{bar.detail}</span>}
            </div>
            <div className="mt-1.5 flex items-center gap-2">
              <span
                aria-hidden="true"
                className={cn(
                  "h-2.5 shrink-0 rounded-r-sm transition-[width,background-color] duration-700 ease-out motion-reduce:transition-none",
                  bar.value > 0 ? "bg-primary/80 group-hover:bg-primary" : "bg-tertiary/10",
                )}
                style={{ width: bar.value > 0 && grown ? `max(3px, calc((100% - 4.5rem) * ${share}))` : bar.value > 0 ? 0 : 2 }}
              />
              <span className="text-xs font-semibold tabular-nums text-tertiary">{bar.display}</span>
            </div>
          </li>
        );
      })}
    </ul>
  );
};

export default BarList;
