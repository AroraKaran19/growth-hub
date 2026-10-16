"use client";

import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Moon } from "lucide-react";
import type { VenueStats } from "@/types/catalogue";
import { cn } from "@/utils";
import { isoToUtc } from "@/utils/date";
import OccupancyMeter, { FILL, percentOf, toneOf } from "./OccupancyMeter";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const POPOVER_WIDTH = 288;
const POPOVER_HEIGHT = 156;
const GAP = 8;

type Week = VenueStats["week"];

const weekdayOf = (date: string) => WEEKDAYS[new Date(isoToUtc(date)).getUTCDay()];

const dayShare = (taken: number, usable: number) => (usable > 0 ? taken / usable : 0);

type WeekStripProps = { days: Week["days"]; usable: number; muted?: boolean; dark?: boolean };

/** One small column per day; closed days show as off. */
export const WeekStrip = ({ days, usable, muted = false, dark = false }: WeekStripProps) => (
  <ol aria-hidden="true" className="grid grid-cols-7 gap-1.5">
    {days.map((day) => {
      const share = dayShare(day.taken, usable);
      return (
        <li key={day.date} className="flex flex-col items-center gap-1">
          <span className={cn("text-xs tabular-nums", dark ? "text-secondary/75" : "text-tertiary/60")}>
            {day.open ? `${percentOf(share)}%` : "Off"}
          </span>
          <span
            className={cn(
              "relative flex h-12 w-full max-w-7 items-end justify-center overflow-hidden rounded-md",
              dark ? "bg-secondary/10" : "bg-tertiary/6",
            )}
          >
            {day.open ? (
              <span
                style={{ height: `${Math.max(4, share * 100)}%` }}
                className={cn(
                  "w-full origin-bottom rounded-md bg-linear-to-t transition-[height,scale] duration-500 ease-out starting:scale-y-0 motion-reduce:transition-none",
                  muted ? (dark ? "from-secondary/40 to-secondary/25" : "from-tertiary/25 to-tertiary/15") : FILL[toneOf(share)],
                )}
              />
            ) : (
              <Moon className={cn("mb-1.5 size-3.5", dark ? "text-secondary/40" : "text-tertiary/35")} />
            )}
          </span>
          <span className={cn("text-xs font-medium", dark ? "text-secondary" : "text-tertiary/75")}>{weekdayOf(day.date)}</span>
        </li>
      );
    })}
  </ol>
);

const describe = (days: Week["days"], usable: number) =>
  days
    .map((day) => `${weekdayOf(day.date)} ${Number(day.date.slice(8))}: ${day.open ? `${percentOf(dayShare(day.taken, usable))}% booked` : "closed"}`)
    .join(", ");

const openDays = (days: Week["days"]) => days.filter((day) => day.open).length;

type WeekOccupancyProps = { week: Week; usable: number; muted?: boolean };

const Summary = ({ week, muted }: { week: Week; muted: boolean }) => {
  const open = openDays(week.days);
  return (
    <>
      <OccupancyMeter share={week.average ?? 0} label="Average booked over the next 7 days" muted={muted} />
      <p className="mt-1.5 text-xs text-tertiary/60">{`Average of ${open} open ${open === 1 ? "day" : "days"}`}</p>
    </>
  );
};

// The average is null only with nothing usable or no open day ahead.
const NoAverage = ({ usable }: { usable: number }) => (
  <p className="text-sm text-tertiary/50">{usable === 0 ? "No usable units" : "Closed all week"}</p>
);

type Anchor = { top: number; left: number };

/** The average as a bar; hovering or focusing it shows each day. */
const WeekOccupancy = ({ week, usable, muted = false }: WeekOccupancyProps) => {
  const [anchor, setAnchor] = useState<Anchor | null>(null);
  const triggerRef = useRef<HTMLDivElement>(null);
  const summaryId = useId();

  useEffect(() => {
    if (!anchor) return;
    const hide = () => setAnchor(null);
    window.addEventListener("scroll", hide, true);
    window.addEventListener("resize", hide);
    return () => {
      window.removeEventListener("scroll", hide, true);
      window.removeEventListener("resize", hide);
    };
  }, [anchor]);

  if (week.average === null) return <NoAverage usable={usable} />;

  const show = () => {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const fitsBelow = rect.bottom + GAP + POPOVER_HEIGHT <= window.innerHeight;
    const left = Math.min(Math.max(GAP, rect.left + rect.width / 2 - POPOVER_WIDTH / 2), window.innerWidth - POPOVER_WIDTH - GAP);
    setAnchor({ top: fitsBelow ? rect.bottom + GAP : rect.top - GAP - POPOVER_HEIGHT, left });
  };

  return (
    <>
      <div
        ref={triggerRef}
        tabIndex={0}
        role="group"
        aria-label="Next 7 days"
        aria-describedby={summaryId}
        onMouseEnter={show}
        onMouseLeave={() => setAnchor(null)}
        onFocus={show}
        onBlur={() => setAnchor(null)}
        onKeyDown={(event) => event.key === "Escape" && setAnchor(null)}
        className="-m-2 cursor-default rounded-xl p-2 outline-none transition-colors hover:bg-tertiary/4 focus-visible:ring-2 focus-visible:ring-primary/30"
      >
        <Summary week={week} muted={muted} />
      </div>
      <span id={summaryId} className="sr-only">
        {describe(week.days, usable)}
      </span>
      {anchor &&
        createPortal(
          <div
            aria-hidden="true"
            style={{ top: anchor.top, left: anchor.left, width: POPOVER_WIDTH, height: POPOVER_HEIGHT }}
            className="pointer-events-none fixed z-50 animate-[fade-up_0.15s_ease-out_both] rounded-2xl bg-tertiary p-3.5 text-secondary shadow-2xl shadow-tertiary/30 motion-reduce:animate-none"
          >
            <p className="mb-2.5 text-xs font-semibold text-secondary/70">Booked each day</p>
            <WeekStrip days={week.days} usable={usable} muted={muted} dark />
          </div>,
          document.body,
        )}
    </>
  );
};

/** The card layout shows every day inline, since touch screens can't hover. */
export const WeekOccupancyInline = ({ week, usable, muted = false }: WeekOccupancyProps) => {
  if (week.average === null) return <NoAverage usable={usable} />;
  return (
    <>
      <Summary week={week} muted={muted} />
      <div className="mt-3">
        <WeekStrip days={week.days} usable={usable} muted={muted} />
      </div>
      <span className="sr-only">{describe(week.days, usable)}</span>
    </>
  );
};

export default WeekOccupancy;
