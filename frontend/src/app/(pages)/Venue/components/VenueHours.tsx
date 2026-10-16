"use client";

import { useState } from "react";
import { ChevronDown, Clock } from "lucide-react";
import type { Venue } from "@/types/venue";
import { cn } from "@/utils";
import { useIsClient } from "@/utils/storage";
import { indiaNow, openStatus, weekRuns, weekdayOfIso } from "@/utils/venueHours";

// "10:00 AM" reads as "10 AM" here; the half hours keep their minutes.
const compact = (text: string) => text.replace(/:00(?= [AP]M)/g, "");

/** One line for the hours; the week only unfolds when the days differ. */
const VenueHours = ({ venue }: { venue: Pick<Venue, "hours" | "hoursNote"> }) => {
  const [isOpen, setIsOpen] = useState(false);
  // "Now" only exists in the browser, so the server renders the plain summary.
  const isClient = useIsClient();
  const now = isClient ? indiaNow() : null;
  const status = now ? openStatus(venue.hours, now) : null;
  const today = now ? weekdayOfIso(now.date) : null;

  const runs = weekRuns(venue.hours);
  const neverOpen = runs.every((run) => run.range === null);
  const isEveryDay = runs.length === 1 && runs[0].range !== null;
  // Two runs still fit on one line, like "Mon to Sat 10 AM to 6 PM, Sun closed".
  const canFold = runs.length > 2;
  const summary = neverOpen
    ? "Hours coming soon"
    : isEveryDay
      ? `Open daily, ${compact(runs[0].range!)}`
      : canFold
        ? "Hours vary by day"
        : runs.map((run) => `${run.label} ${run.range ? compact(run.range) : "closed"}`).join(", ");

  const heading = (
    <>
      <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-tertiary/5 text-tertiary/70">
        <Clock aria-hidden="true" className="size-4" />
      </span>
      <span className="min-w-0 grow">
        <span className="flex items-center gap-1.5 text-sm font-medium text-tertiary" aria-live="polite">
          {status ? (
            <>
              <span
                aria-hidden="true"
                className={cn("size-1.5 shrink-0 rounded-full", status.isOpen ? "bg-green-600" : "bg-primary")}
              />
              <span className={status.isOpen ? "text-green-700" : "text-primary"}>{status.label}</span>
              <span className="truncate font-normal text-tertiary/55">· {compact(status.detail)}</span>
            </>
          ) : (
            "Opening hours"
          )}
        </span>
        <span className="block truncate text-xs text-tertiary/55">{summary}</span>
      </span>
    </>
  );

  return (
    <div>
      {canFold ? (
        <button
          type="button"
          aria-expanded={isOpen}
          aria-controls="venue-week-hours"
          onClick={() => setIsOpen(!isOpen)}
          className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-tertiary/3"
        >
          {heading}
          <ChevronDown
            aria-hidden="true"
            className={cn("size-4 shrink-0 text-tertiary/40 transition-transform", isOpen && "rotate-180")}
          />
        </button>
      ) : (
        <div className="flex items-center gap-3 px-4 py-3.5">{heading}</div>
      )}

      {canFold && isOpen && (
        <dl id="venue-week-hours" className="-mt-1.5 flex flex-col gap-1.5 pb-3.5 pl-15 pr-4 text-xs">
          {runs.map((run) => {
            const isToday = today !== null && run.days.includes(today);
            return (
              <div key={run.label} className="flex items-baseline justify-between gap-3">
                <dt className={isToday ? "font-medium text-tertiary" : "text-tertiary/55"}>
                  {run.label}
                  {isToday && <span className="sr-only"> (today)</span>}
                </dt>
                <dd className={cn("tabular-nums", run.range ? (isToday ? "font-medium text-tertiary" : "text-tertiary/75") : "text-tertiary/40")}>
                  {run.range ? compact(run.range) : "Closed"}
                </dd>
              </div>
            );
          })}
        </dl>
      )}

      {venue.hoursNote && <p className="-mt-1.5 pb-3.5 pl-15 pr-4 text-xs leading-relaxed text-tertiary/55">{venue.hoursNote}</p>}
    </div>
  );
};

export default VenueHours;
