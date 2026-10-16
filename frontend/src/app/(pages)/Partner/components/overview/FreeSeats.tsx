import { Armchair } from "lucide-react";
import { CardHeading, Meter, QuietLink, RAISED_CARD, REVEAL, revealDelay } from "@/app/components/shared/OverviewUi";
import type { BusyKind, PartnerOverview, RoomDay } from "@/types/overview";
import type { SeatType } from "@/types/seat";
import { cn } from "@/utils";
import { toTimeLabel } from "@/utils/time";

const TYPE_LABELS: Record<SeatType, string> = {
  desk: "Desks",
  "private-cabin": "Cabins",
  office: "Offices",
  "meeting-room": "Meeting rooms",
};

const BUSY_STYLE: Record<BusyKind, { label: string; className: string }> = {
  booking: { label: "Booked", className: "bg-primary/75" },
  membership: { label: "Member", className: "bg-tertiary/70" },
  "walk-in": { label: "Walk-in", className: "bg-purple-600/60" },
  "being-booked": { label: "Being booked", className: "border border-dashed border-sky-600 bg-sky-500/30" },
  "out-of-service": { label: "Out of service", className: "bg-tertiary/25" },
};

/** Out of service for all of today's opening hours. */
const isOutAllDay = (room: RoomDay, opens: number, closes: number) =>
  room.busy.some((slot) => slot.kind === "out-of-service" && slot.start <= opens && slot.end >= closes);

const hourLabel = (minutes: number) => toTimeLabel(minutes).replace(":00", "").replace(/^0/, "");

const RoomTimeline = ({ rooms, opens, closes, now }: { rooms: RoomDay[]; opens: number; closes: number; now: number | null }) => {
  const span = closes - opens;
  const at = (minutes: number) => `${((Math.min(Math.max(minutes, opens), closes) - opens) / span) * 100}%`;
  const step = span > 8 * 60 ? 180 : 120;
  const ticks: number[] = [];
  for (let tick = Math.ceil(opens / 60) * 60; tick <= closes; tick += step) ticks.push(tick);
  const hasOutage = rooms.some((room) => room.busy.some((slot) => slot.kind === "out-of-service"));
  const kinds = (Object.keys(BUSY_STYLE) as BusyKind[]).filter((kind) => kind !== "out-of-service" || hasOutage);

  return (
    <div className="mt-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-tertiary">Meeting rooms today</h3>
        <ul className="flex flex-wrap gap-3 text-xs text-tertiary/60">
          {kinds.map((kind) => (
            <li key={kind} className="flex items-center gap-1.5">
              <span aria-hidden="true" className={cn("h-2.5 w-4 rounded-sm", BUSY_STYLE[kind].className)} />
              {BUSY_STYLE[kind].label}
            </li>
          ))}
        </ul>
      </div>
      <ul className="mt-3 flex flex-col gap-2">
        {rooms.map((room) => {
          const outAllDay = isOutAllDay(room, opens, closes);
          return (
            <li key={room.id} className="flex items-center gap-3">
              <span className="w-14 shrink-0 truncate text-sm font-medium text-tertiary">{room.label}</span>
              <div
                className={cn(
                  "relative h-8 flex-1 overflow-hidden rounded-lg ring-1 ring-tertiary/8",
                  outAllDay ? "bg-tertiary/8" : "bg-emerald-500/8",
                )}
              >
                {outAllDay ? (
                  <span className="absolute inset-0 grid place-items-center text-xs text-tertiary/55">Out of service</span>
                ) : (
                  room.busy
                    .filter((slot) => slot.end > opens && slot.start < closes)
                    .map((slot) => (
                      <span
                        key={`${slot.start}-${slot.kind}`}
                        title={`${BUSY_STYLE[slot.kind].label}, ${toTimeLabel(slot.start)} to ${toTimeLabel(slot.end)}`}
                        className={cn("absolute inset-y-1 rounded-md", BUSY_STYLE[slot.kind].className)}
                        style={{ left: at(slot.start), width: `calc(${at(slot.end)} - ${at(slot.start)})` }}
                      />
                    ))
                )}
                {now !== null && now >= opens && now < closes && (
                  <span aria-hidden="true" className="absolute inset-y-0 w-0.5 bg-tertiary" style={{ left: at(now) }} />
                )}
              </div>
            </li>
          );
        })}
      </ul>
      <div aria-hidden="true" className="relative mt-1.5 ml-17 h-4 text-[11px] text-tertiary/50">
        {ticks.map((tick) => (
          <span key={tick} className="absolute -translate-x-1/2 whitespace-nowrap" style={{ left: at(tick) }}>
            {hourLabel(tick)}
          </span>
        ))}
      </div>
      <p className="sr-only">
        {rooms
          .map((room) =>
            room.busy.length
              ? `${room.label}: ${room.busy.map((slot) => `${BUSY_STYLE[slot.kind].label} ${toTimeLabel(slot.start)} to ${toTimeLabel(slot.end)}`).join("; ")}`
              : `${room.label}: free all day`,
          )
          .join(". ")}
      </p>
    </div>
  );
};

const FreeSeats = ({ overview, className }: { overview: PartnerOverview; className?: string }) => {
  const { hours, spaces, rooms } = overview;
  const hint = hours.openNow
    ? `Right now, and until closing at ${toTimeLabel(hours.closes ?? 0)}`
    : hours.openToday && hours.opens !== null && overview.minutes < hours.opens
      ? `Closed now, opens at ${toTimeLabel(hours.opens)}`
      : hours.openToday
        ? "Closed for the day"
        : "Closed today";

  return (
    <section aria-label="Free seats" className={cn(RAISED_CARD, REVEAL, "p-5 sm:p-6", className)} style={revealDelay(1)}>
      <CardHeading icon={Armchair} title="Free seats" hint={hint} action={<QuietLink href="/partner/seats">Floor plan</QuietLink>} />
      {spaces.length === 0 ? (
        <p className="mt-5 rounded-xl bg-surface px-4 py-6 text-center text-sm text-tertiary/55">
          This venue has no seat map yet.
        </p>
      ) : (
        <ul className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {spaces.map((space, index) => (
            <li key={space.type} className={cn(REVEAL, "rounded-xl bg-surface p-4")} style={revealDelay(index + 2)}>
              <p className="text-sm text-tertiary/60">{TYPE_LABELS[space.type]}</p>
              <p className="mt-1 text-3xl font-bold text-tertiary">
                {space.freeNow}
                <span className="ml-1 text-sm font-medium text-tertiary/45">of {space.total}</span>
              </p>
              <Meter
                percent={space.total ? (space.freeNow / space.total) * 100 : 0}
                label={`${TYPE_LABELS[space.type]} free now`}
                className="mt-2.5 bg-tertiary/10"
              />
              <p className="mt-2 text-xs text-tertiary/60">{space.freeRestOfDay} free until closing</p>
              {space.outOfService > 0 && <p className="text-xs text-tertiary/45">{space.outOfService} out of service</p>}
            </li>
          ))}
        </ul>
      )}
      {rooms.length > 0 && hours.openToday && hours.opens !== null && hours.closes !== null && (
        <RoomTimeline rooms={rooms} opens={hours.opens} closes={hours.closes} now={hours.openNow ? overview.minutes : null} />
      )}
    </section>
  );
};

export default FreeSeats;
