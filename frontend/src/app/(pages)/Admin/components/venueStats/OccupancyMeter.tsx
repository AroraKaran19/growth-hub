import { cn } from "@/utils";

export type OccupancyTone = "green" | "amber" | "red";

export const toneOf = (share: number): OccupancyTone => (share > 0.9 ? "red" : share >= 0.7 ? "amber" : "green");

export const FILL: Record<OccupancyTone, string> = {
  green: "from-green-600 to-emerald-400",
  amber: "from-amber-500 to-yellow-400",
  red: "from-primary to-accent",
};

const TEXT: Record<OccupancyTone, string> = {
  green: "text-green-700",
  amber: "text-amber-700",
  red: "text-primary",
};

export const percentOf = (share: number) => Math.round(share * 100);

type OccupancyMeterProps = {
  /** 0 to 1. */
  share: number;
  label: string;
  /** Greys the bar out, for hidden venues. */
  muted?: boolean;
};

const OccupancyMeter = ({ share, label, muted = false }: OccupancyMeterProps) => {
  const percent = percentOf(share);
  const tone = toneOf(share);
  return (
    <div className="flex items-center gap-2.5">
      <div
        role="meter"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
        aria-valuetext={`${percent}%`}
        className="relative h-2.5 min-w-20 flex-1 overflow-hidden rounded-full bg-tertiary/8 shadow-inner shadow-tertiary/10"
      >
        <div
          style={{ width: `${Math.min(100, share * 100)}%` }}
          className={cn(
            "h-full origin-left rounded-full bg-linear-to-r shadow-sm transition-[width,scale] duration-700 ease-out starting:scale-x-0 motion-reduce:transition-none",
            muted ? "from-tertiary/25 to-tertiary/20" : FILL[tone],
          )}
        />
      </div>
      <span className={cn("w-10 shrink-0 text-right text-sm font-semibold tabular-nums", muted ? "text-tertiary/45" : TEXT[tone])}>
        {percent}%
      </span>
    </div>
  );
};

export default OccupancyMeter;
