"use client";

import { useState } from "react";
import { DoorOpen, LogIn } from "lucide-react";
import { BOOKING_SPACE_LABELS } from "@/app/(pages)/Booking/membershipBooking";
import { CardHeading, QuietLink, RAISED_CARD, REVEAL, plural, revealDelay } from "@/app/components/shared/OverviewUi";
import type { DeskToday } from "@/libs/api/partnerDesk";
import { cn } from "@/utils";
import { membershipTitle } from "@/utils/membershipLabels";
import { toTimeLabel } from "@/utils/time";

const SOON_MINUTES = 120;
const SHOWN = 5;

type Arrival = {
  key: string;
  ref: string;
  seatId?: string;
  name: string;
  detail: string;
  kind: "Pass" | "Member";
  start: number;
  end: number;
};

/** Passes and member seats not checked in yet; full-day plans are due from opening. */
export const arrivalsOf = (feed: DeskToday, opens: number | null, closes: number | null): Arrival[] => {
  const passes = feed.bookings
    .filter((booking) => booking.status === "upcoming")
    .map(
      (booking): Arrival => ({
        key: booking.ref,
        ref: booking.ref,
        name: booking.member.name,
        detail: `${BOOKING_SPACE_LABELS[booking.spaceType]} ${booking.seats.join(", ")}`,
        kind: "Pass",
        start: booking.startMin,
        end: booking.endMin,
      }),
    );
  const seats = feed.members.flatMap((member) => {
    const start = member.window?.start ?? opens;
    const end = member.window?.end ?? closes;
    if (start === null || end === null) return [];
    const isMultiSeat = member.seatCheckIns.length > 1;
    return member.seatCheckIns
      .filter((seat) => !seat.checkedInAt)
      .map(
        (seat): Arrival => ({
          key: `${member.ref}:${seat.seatId}`,
          ref: member.ref,
          seatId: isMultiSeat ? seat.seatId : undefined,
          name: (isMultiSeat && seat.holder) || member.member.name,
          detail: `${membershipTitle(member)}, ${seat.label}`,
          kind: "Member",
          start,
          end,
        }),
      );
  });
  return [...passes, ...seats].sort((a, b) => a.start - b.start);
};

const gap = (minutes: number) => (minutes < 60 ? `${minutes} min` : `${Math.floor(minutes / 60)} hr${minutes % 60 ? ` ${minutes % 60} min` : ""}`);

type ListProps = {
  title: string;
  tone: "late" | "soon";
  items: Arrival[];
  now: number;
  empty: string;
  pending: string | null;
  onCheckIn: (arrival: Arrival) => void;
};

const ArrivalList = ({ title, tone, items, now, empty, pending, onCheckIn }: ListProps) => {
  const [showAll, setShowAll] = useState(false);
  const shown = showAll ? items : items.slice(0, SHOWN);
  return (
    <div className="min-w-0">
      <h3 className="flex items-center gap-2 text-sm font-semibold text-tertiary">
        <span aria-hidden="true" className={cn("size-2 rounded-full", tone === "late" ? "bg-amber-500" : "bg-emerald-500")} />
        {title}
        <span className="rounded-full bg-tertiary/6 px-2 py-0.5 text-xs font-medium text-tertiary/65">{items.length}</span>
      </h3>
      {items.length === 0 ? (
        <p className="mt-3 rounded-xl bg-surface px-4 py-5 text-center text-sm text-tertiary/55">{empty}</p>
      ) : (
        <ul className="mt-3 flex flex-col gap-2">
          {shown.map((arrival, index) => (
            <li
              key={arrival.key}
              className={cn(
                REVEAL,
                "flex items-center gap-3 rounded-xl border bg-secondary p-2.5 pr-3 transition-shadow hover:shadow-md",
                tone === "late" ? "border-amber-500/30" : "border-tertiary/8",
              )}
              style={revealDelay(index)}
            >
              <span
                className={cn(
                  "w-20 shrink-0 rounded-lg py-1.5 text-center text-xs font-semibold",
                  tone === "late" ? "bg-amber-500/12 text-amber-800" : "bg-surface text-tertiary/80",
                )}
              >
                {toTimeLabel(arrival.start)}
                <span className="block text-[11px] font-normal opacity-75">
                  {tone === "late" ? `${gap(now - arrival.start)} late` : `in ${gap(arrival.start - now)}`}
                </span>
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold text-tertiary">{arrival.name}</span>
                <span className="block truncate text-xs text-tertiary/55">
                  {arrival.kind}, {arrival.detail}
                </span>
              </span>
              <button
                type="button"
                onClick={() => onCheckIn(arrival)}
                disabled={pending === arrival.key}
                aria-label={`Check in ${arrival.name}`}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1.5 text-sm font-medium text-primary transition-colors hover:bg-primary hover:text-secondary disabled:opacity-50"
              >
                <LogIn aria-hidden="true" className="size-3.5" />
                <span className="hidden sm:inline">{pending === arrival.key ? "Checking in" : "Check in"}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {items.length > SHOWN && (
        <button
          type="button"
          onClick={() => setShowAll((current) => !current)}
          className="mt-2 text-sm font-medium text-primary transition-opacity hover:opacity-80"
        >
          {showAll ? "Show fewer" : `Show all ${items.length}`}
        </button>
      )}
    </div>
  );
};

type ArrivalsProps = {
  feed: DeskToday;
  opens: number | null;
  closes: number | null;
  now: number;
  onCheckIn: (ref: string, seatId?: string) => Promise<void>;
};

const Arrivals = ({ feed, opens, closes, now, onCheckIn }: ArrivalsProps) => {
  const [pending, setPending] = useState<string | null>(null);
  const due = arrivalsOf(feed, opens, closes).filter((arrival) => arrival.end > now);
  const late = due.filter((arrival) => arrival.start <= now);
  const soon = due.filter((arrival) => arrival.start > now && arrival.start <= now + SOON_MINUTES);
  const later = due.length - late.length - soon.length;
  const checkedIn =
    feed.bookings.filter((booking) => booking.status === "checked-in").length +
    feed.members.reduce((sum, member) => sum + member.seatCheckIns.filter((seat) => seat.checkedInAt).length, 0);

  const checkIn = async (arrival: Arrival) => {
    setPending(arrival.key);
    try {
      await onCheckIn(arrival.ref, arrival.seatId);
    } finally {
      setPending(null);
    }
  };

  return (
    <section aria-label="Arrivals" className={cn(RAISED_CARD, REVEAL, "p-5 sm:p-6")}>
      <CardHeading
        icon={DoorOpen}
        title="Arrivals"
        hint={`${plural(due.length, "person", "people")} still due today, ${checkedIn} checked in`}
        action={<QuietLink href="/partner/bookings">All bookings</QuietLink>}
      />
      <div className="mt-5 grid grid-cols-1 gap-6 md:grid-cols-2">
        <ArrivalList
          title="Running late"
          tone="late"
          items={late}
          now={now}
          empty="Nobody is running late."
          pending={pending}
          onCheckIn={checkIn}
        />
        <ArrivalList
          title="Arriving in the next 2 hours"
          tone="soon"
          items={soon}
          now={now}
          empty="Nobody is due in the next two hours."
          pending={pending}
          onCheckIn={checkIn}
        />
      </div>
      {later > 0 && <p className="mt-4 text-xs text-tertiary/55">{plural(later, "more arrival")} due later today.</p>}
    </section>
  );
};

export default Arrivals;
