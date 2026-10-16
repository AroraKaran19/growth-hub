"use client";

import { useState, type CSSProperties } from "react";
import { IndianRupee } from "lucide-react";
import { shortLabel } from "@/app/components/shared/BarChart";
import { rupees } from "@/app/components/shared/OverviewUi";
import type { StreamBucket, WorkspaceAnalytics } from "@/types/analytics";
import { cn } from "@/utils";
import { ChartCard, DataTable, STREAMS, Swatch, TOOLTIP, compactRupees, stepWithKeys } from "./analyticsUi";

const GRID_LINES = 4;
const LABELS = 7;

/** A rounded axis ceiling in paise, so each gridline lands on a clean rupee figure. */
const niceMax = (paise: number) => {
  const step = Math.max(100, paise / GRID_LINES);
  const magnitude = 10 ** Math.floor(Math.log10(step));
  const nice = [1, 2, 2.5, 5, 10].find((factor) => factor * magnitude >= step) ?? 10;
  return nice * magnitude * GRID_LINES;
};

const totalOf = (bucket: StreamBucket) => bucket.passes + bucket.memberships + bucket.addons;

const periodLabel = (bucket: StreamBucket) =>
  bucket.from === bucket.to ? shortLabel(bucket.from) : `${shortLabel(bucket.from)} to ${shortLabel(bucket.to)}`;

type Streams = NonNullable<WorkspaceAnalytics["revenueStreams"]>;

const RevenueStreams = ({ streams, style }: { streams: Streams; style?: CSSProperties }) => {
  const [active, setActive] = useState<number | null>(null);
  const { buckets } = streams;
  const totals = buckets.map(totalOf);
  const max = niceMax(Math.max(0, ...totals));
  const step = Math.max(1, Math.ceil(buckets.length / LABELS));
  const hovered = active === null ? null : buckets[active];
  const last = buckets.length - 1;

  const table = (
    <DataTable
      caption={streams.by === "day" ? "Money collected each day" : "Money collected each week"}
      head={[streams.by === "day" ? "Day" : "Week", ...STREAMS.map((stream) => stream.label), "Total"]}
      rows={buckets.map((bucket) => [
        `${periodLabel(bucket)}${bucket.days < 7 && streams.by === "week" ? ` (${bucket.days} days)` : ""}`,
        ...STREAMS.map((stream) => rupees(bucket[stream.key])),
        rupees(totalOf(bucket)),
      ])}
    />
  );

  const legend = (
    <div className="flex flex-wrap gap-x-4 gap-y-2">
      {STREAMS.map((stream) => (
        <Swatch key={stream.key} color={stream.color} label={stream.label} />
      ))}
    </div>
  );

  return (
    <ChartCard
      icon={IndianRupee}
      title="Revenue streams"
      hint={`Collected ${streams.by === "day" ? "each day" : "each week, counted back from today"}, by what was bought`}
      table={table}
      legend={legend}
      empty={totals.every((total) => total === 0) ? "Nothing was collected in this range." : null}
      style={style}
    >
      <div className="flex gap-3">
        <div aria-hidden="true" className="flex h-56 w-12 shrink-0 flex-col justify-between text-right text-[11px] tabular-nums text-tertiary/45">
          {Array.from({ length: GRID_LINES + 1 }, (_, index) => (
            <span key={index} className="-translate-y-1/2 first:translate-y-0 last:translate-y-0">
              {compactRupees(max - (max / GRID_LINES) * index)}
            </span>
          ))}
        </div>

        <div className="min-w-0 flex-1">
          <div
            tabIndex={0}
            role="group"
            aria-label="Money collected by period. Use the left and right arrow keys to read each one."
            className="relative h-56 rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:ring-offset-4"
            onPointerLeave={() => setActive(null)}
            onKeyDown={stepWithKeys(buckets.length, setActive)}
            onFocus={() => setActive((current) => current ?? last)}
            onBlur={() => setActive(null)}
          >
            <div aria-hidden="true" className="absolute inset-0 flex flex-col justify-between">
              {Array.from({ length: GRID_LINES + 1 }, (_, index) => (
                <span key={index} className={cn("border-t", index === GRID_LINES ? "border-tertiary/15" : "border-tertiary/6")} />
              ))}
            </div>
            <div aria-hidden="true" className="absolute inset-0 flex items-end gap-1">
              {buckets.map((bucket, index) => {
                const total = totals[index];
                const shown = STREAMS.filter((stream) => bucket[stream.key] > 0);
                return (
                  <div
                    key={bucket.from}
                    onPointerEnter={() => setActive(index)}
                    onPointerDown={() => setActive(index)}
                    className="relative flex h-full flex-1 cursor-default items-end justify-center"
                  >
                    {index === last && total > 0 && active === null && (
                      <span
                        className="absolute left-1/2 -translate-x-1/2 -translate-y-full whitespace-nowrap pb-1 text-[11px] font-semibold text-tertiary"
                        style={{ bottom: `${(total / max) * 100}%` }}
                      >
                        {compactRupees(total)}
                      </span>
                    )}
                    {/* Reversed so passes sit on the baseline. */}
                    <div
                      className={cn(
                        "flex w-full max-w-6 flex-col-reverse gap-0.5 transition-opacity",
                        active !== null && active !== index && "opacity-55",
                      )}
                      style={{ height: total > 0 ? `${(total / max) * 100}%` : 2 }}
                    >
                      {total === 0 ? (
                        <span className="h-full rounded-t-xs bg-tertiary/10" />
                      ) : (
                        shown.map((stream, at) => (
                          <span
                            key={stream.key}
                            className={cn("min-h-0.5", at === shown.length - 1 && "rounded-t-sm")}
                            style={{ flexGrow: bucket[stream.key], flexBasis: 0, background: stream.color }}
                          />
                        ))
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {hovered && active !== null && (
              <div
                role="status"
                className={cn(
                  TOOLTIP,
                  "top-0",
                  (active + 0.5) / buckets.length > 0.7 ? "-translate-x-full" : (active + 0.5) / buckets.length < 0.3 ? "" : "-translate-x-1/2",
                )}
                style={{ left: `${((active + 0.5) / buckets.length) * 100}%` }}
              >
                <span className="font-semibold">{rupees(totalOf(hovered))}</span>{" "}
                <span className="text-secondary/70">
                  {periodLabel(hovered)}
                  {streams.by === "week" && hovered.days < 7 ? `, ${hovered.days} days` : ""}
                </span>
                {STREAMS.map((stream) => (
                  <span key={stream.key} className="mt-1 flex items-center gap-2">
                    <span aria-hidden="true" className="h-0.5 w-3 rounded-full" style={{ background: stream.color }} />
                    <span className="font-semibold">{rupees(hovered[stream.key])}</span>
                    <span className="text-secondary/70">{stream.label}</span>
                  </span>
                ))}
              </div>
            )}
          </div>

          <div aria-hidden="true" className="mt-2 flex h-4 gap-1 text-[11px] text-tertiary/50">
            {buckets.map((bucket, index) => (
              <div key={bucket.from} className="relative flex-1">
                {(index % step === 0 || index === last) && (last - index >= step || index === last) && (
                  <span
                    className={cn(
                      "absolute top-0 whitespace-nowrap",
                      index === 0 ? "left-0" : index === last ? "right-0" : "left-1/2 -translate-x-1/2",
                    )}
                  >
                    {shortLabel(streams.by === "week" ? bucket.to : bucket.from)}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="sr-only">{table}</div>
    </ChartCard>
  );
};

export default RevenueStreams;
