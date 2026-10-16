import { Check, EyeOff, IndianRupee, Landmark, Map as MapIcon, MapPinOff, Moon, UsersRound, Wrench, type LucideIcon } from "lucide-react";
import Link from "next/link";
import type { VenueHealthFlag, VenueStats } from "@/types/catalogue";
import type { SeatType } from "@/types/seat";
import { cn } from "@/utils";
import OccupancyMeter from "./OccupancyMeter";

const UNIT_NOUNS: [SeatType, string, string][] = [
  ["desk", "desk", "desks"],
  ["private-cabin", "cabin", "cabins"],
  ["office", "office", "offices"],
  ["meeting-room", "room", "rooms"],
];

const plural = (count: number, one: string, many = `${one}s`) => `${count} ${count === 1 ? one : many}`;

export const rupees = (paise: number) => `₹${Math.round(paise / 100).toLocaleString("en-IN")}`;

export const StatusChip = ({ published }: { published: boolean }) =>
  published ? (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-green-500/12 px-2 py-0.5 text-xs font-medium text-green-700">
      <span aria-hidden="true" className="size-1.5 rounded-full bg-green-600" />
      Live
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 rounded-full bg-tertiary/8 px-2 py-0.5 text-xs font-medium text-tertiary/60">
      <EyeOff aria-hidden="true" className="size-3" />
      Hidden
    </span>
  );

export const StatPlaceholder = () => (
  <div aria-hidden="true" className="space-y-2">
    <div className="h-2.5 w-full animate-pulse rounded-full bg-tertiary/8" />
    <div className="h-2.5 w-2/3 animate-pulse rounded-full bg-tertiary/6" />
  </div>
);

export const CapacitySummary = ({ capacity }: { capacity: VenueStats["capacity"] }) => {
  if (capacity.total === 0) return <p className="text-sm text-tertiary/50">No seat map yet</p>;
  const parts = UNIT_NOUNS.filter(([type]) => capacity.byType[type] > 0).map(([type, one, many]) =>
    plural(capacity.byType[type], one, many),
  );
  return (
    <div>
      <p className="font-semibold tabular-nums text-tertiary">{plural(capacity.total, "unit")}</p>
      <p className="mt-0.5 text-xs text-tertiary/60">{parts.join(" · ")}</p>
      {capacity.outOfService > 0 && (
        <p className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-amber-700">
          <Wrench aria-hidden="true" className="size-3" />
          {capacity.outOfService} out of service
        </p>
      )}
    </div>
  );
};

export const TodayOccupancy = ({ stats, muted }: { stats: VenueStats; muted: boolean }) => {
  const { today, capacity } = stats;
  if (!today.open) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-tertiary/6 px-2.5 py-1 text-xs font-medium text-tertiary/65">
        <Moon aria-hidden="true" className="size-3.5" />
        Closed today
      </span>
    );
  }
  if (capacity.usable === 0) return <p className="text-sm text-tertiary/50">No usable units</p>;
  const free = capacity.usable - today.taken;
  return (
    <div>
      <OccupancyMeter share={today.taken / capacity.usable} label="Units taken today" muted={muted} />
      <p className="mt-1.5 text-xs text-tertiary/60">
        <span className="font-medium text-tertiary/85">
          {today.taken} of {capacity.usable} taken
        </span>
        {` · ${free} free`}
      </p>
      <p className="text-xs text-tertiary/50">
        {today.freeNow === null ? "Outside opening hours now" : `${today.freeNow} free right now`}
      </p>
    </div>
  );
};

export const MonthTakings = ({ stats, showsMoney }: { stats: VenueStats; showsMoney: boolean }) => (
  <div>
    {showsMoney && stats.collected !== undefined && (
      <p className="text-base font-bold tabular-nums text-tertiary">{rupees(stats.collected)}</p>
    )}
    <p className={cn("inline-flex items-center gap-1.5 text-xs text-tertiary/60", !showsMoney && "text-sm text-tertiary/75")}>
      <UsersRound aria-hidden="true" className="size-3.5" />
      {plural(stats.activeMembers, "active member")}
    </p>
  </div>
);

// Each warning links to the place that fixes it.
const HEALTH: Record<VenueHealthFlag, { label: string; icon: LucideIcon; severe: boolean; fix: (slug: string) => string }> = {
  "no-map": { label: "No seat map", icon: MapPinOff, severe: true, fix: (slug) => `/admin/venues/${slug}#seat-map` },
  "all-out-of-service": { label: "All seats out of service", icon: Wrench, severe: true, fix: () => "/admin/availability" },
  "no-prices": { label: "No prices", icon: IndianRupee, severe: true, fix: (slug) => `/admin/venues/${slug}#prices` },
  "placeholder-map": { label: "Placeholder map", icon: MapIcon, severe: false, fix: (slug) => `/admin/venues/${slug}#seat-map` },
  "no-bank-details": { label: "No bank details", icon: Landmark, severe: false, fix: (slug) => `/admin/venues/${slug}#bank-details` },
};

export const HealthChips = ({ flags, slug }: { flags: VenueHealthFlag[]; slug: string }) => {
  if (flags.length === 0) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-green-500/12 px-2.5 py-1 text-xs font-medium text-green-700">
        <Check aria-hidden="true" className="size-3.5" />
        All good
      </span>
    );
  }
  return (
    <ul className="flex flex-wrap gap-1.5">
      {flags.map((flag) => {
        const { label, icon: Icon, severe, fix } = HEALTH[flag];
        return (
          <li key={flag}>
            <Link
              href={fix(slug)}
              className={cn(
                "inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium transition-opacity hover:opacity-80",
                severe ? "bg-primary/10 text-primary" : "bg-amber-500/14 text-amber-800",
              )}
            >
              <Icon aria-hidden="true" className="size-3.5" />
              {label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
};
