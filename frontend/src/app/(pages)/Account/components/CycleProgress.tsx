"use client";

import { cn } from "@/utils";
import { formatDay, isoToUtc } from "@/utils/date";
import { useIsClient } from "@/utils/storage";

const DAY_MS = 24 * 60 * 60 * 1000;

type CycleProgressProps = {
  label: string;
  start: string;
  end: string;
  remainingSuffix?: string;
  barClassName?: string;
};

const CycleProgress = ({
  label,
  start,
  end,
  remainingSuffix = "left",
  barClassName = "cta-gradient",
}: CycleProgressProps) => {
  const isClient = useIsClient();

  let percent = 0;
  let daysLeft: number | null = null;

  if (isClient) {
    const now = new Date();
    const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
    const startMs = isoToUtc(start);
    const endMs = isoToUtc(end);
    const span = Math.max(endMs - startMs, DAY_MS);

    percent = Math.min(Math.max((today - startMs) / span, 0), 1) * 100;
    daysLeft = Math.max(Math.ceil((endMs - today) / DAY_MS), 0);
  }

  return (
    <div>
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 text-sm">
        <span className="text-tertiary/55">{label}</span>
        <span className="font-medium text-tertiary">
          {daysLeft === null
            ? " "
            : `${daysLeft} ${daysLeft === 1 ? "day" : "days"} ${remainingSuffix}`}
        </span>
      </div>
      <div
        role="progressbar"
        aria-label={`${label} elapsed`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(percent)}
        className="mt-2 h-2 overflow-hidden rounded-full bg-tertiary/8"
      >
        <div
          className={cn(
            "h-full rounded-full transition-[width] duration-500",
            barClassName,
          )}
          style={{ width: `${percent}%` }}
        />
      </div>
      <p className="mt-1.5 text-xs text-tertiary/55">
        {formatDay(start)} to {formatDay(end)}
      </p>
    </div>
  );
};

export default CycleProgress;
