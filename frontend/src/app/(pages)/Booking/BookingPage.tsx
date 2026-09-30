"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import {
  buildDays,
  buildDaysThrough,
  lastPassDay,
  withinPassHorizon,
  buildTimeSlots,
} from "@/data/bookingOptions";
import { useSlotAvailability } from "@/hooks/useAvailability";
import { useVenueMembership } from "@/hooks/useMemberships";
import { isMembershipType, type BookingType } from "@/types/booking";
import type { SeatType } from "@/types/seat";
import type { VenueDetail } from "@/types/venue";
import { toMinutes } from "@/utils/time";
import AccessCard from "./components/AccessCard";
import BookingStepper from "./components/BookingStepper";
import BookingFooter from "./components/BookingFooter";
import ConfigureForm from "./components/ConfigureForm";
import DateStrip from "./components/DateStrip";
import MemberVenueBanner from "./components/MemberVenueBanner";
import TimeSlotGrid from "./components/TimeSlotGrid";
import { needsStartTime } from "./membershipBooking";
import { quoteBooking, rateSummary } from "./pricing";
import { clearSeatsIfTypeChanged } from "./seatRules";
import { durationMinutesFor, spaceTypesFor } from "./selectionRules";
import { useBookingSelection } from "./useBookingSelection";

const BookingPage = ({ venue }: { venue: VenueDetail }) => {
  const router = useRouter();
  const {
    selection,
    setSelection,
    isHydrated,
    update,
    adjustSeats,
    adjustHours,
    isConfigured,
    isScheduled,
  } = useBookingSelection(venue);

  const duration = durationMinutesFor(selection);
  const { opensAt, closesAt, openDays } = venue;
  const { slots: live } = useSlotAvailability(venue.slug, selection.date, duration);
  const needed = selection.spaceType === "desk" ? selection.seats : 1;
  const slots = useMemo(() => {
    if (duration === null) return [];
    const byStart = new Map(live?.starts.map((start) => [start.startMin, start.free]) ?? []);
    // A start with no free seat of the chosen kind can't be booked.
    return buildTimeSlots(selection.date, { opensAt, closesAt }, duration).map((slot) => {
      const free = byStart.get(toMinutes(slot.id) ?? -1)?.[selection.spaceType];
      return free !== undefined && free < needed ? { ...slot, available: false } : slot;
    });
  }, [selection.date, selection.spaceType, opensAt, closesAt, duration, live, needed]);

  const membership = useVenueMembership(venue.slug);
  const isMembership = isMembershipType(selection.bookingType);

  // Dates depend on "today", so they wait for the client. A calendar pick
  // beyond the usual month grows the strip far enough to include it.
  const days = useMemo(() => {
    if (!isHydrated) return [];
    return selection.date
      ? buildDaysThrough(selection.date, openDays)
      : buildDays(30, openDays);
  }, [isHydrated, selection.date, openDays]);
  const lastDay = useMemo(() => (isHydrated && !isMembership ? lastPassDay() : undefined), [isHydrated, isMembership]);

  // Changing the kind of space invalidates seats already picked for it, and
  // a plan moves to a space this venue sells it for.
  const handleConfigChange: typeof update = (key, value) => {
    const seats = venue.seatMap?.seats ?? [];

    if (key === "spaceType") {
      setSelection((current) =>
        clearSeatsIfTypeChanged(
          { ...current, spaceType: value as SeatType },
          seats,
        ),
      );
      return;
    }

    if (key === "bookingType" && isMembershipType(value as string)) {
      const bookingType = value as BookingType;
      const spaces = spaceTypesFor(venue, bookingType);
      setSelection((current) => {
        const spaceType =
          spaces.includes(current.spaceType) || spaces.length === 0
            ? current.spaceType
            : spaces[0];
        return clearSeatsIfTypeChanged(
          { ...current, bookingType, spaceType },
          seats,
        );
      });
      return;
    }

    // A plan can start later than a pass can be sold, so a far date goes when switching back.
    if (key === "bookingType" && !withinPassHorizon(selection.date)) {
      setSelection((current) => ({ ...current, bookingType: value as BookingType, date: "", time: "" }));
      return;
    }

    update(key, value);
  };

  const quote = quoteBooking(venue, selection, venue.addons);

  return (
    <div className="bg-surface pt-28 lg:pt-32">
      <div className="mx-auto w-full max-w-5xl px-4 sm:px-6">
        <BookingStepper activeIndex={isConfigured && isScheduled ? 1 : 0} />

        <div className="mt-8 flex items-center gap-1.5">
          <Link
            href={`/workspaces/${venue.slug}`}
            aria-label={`Back to ${venue.name}`}
            className="-ml-1 rounded-md p-1 text-tertiary transition-colors hover:bg-tertiary/5"
          >
            <ChevronLeft aria-hidden="true" className="size-5" />
          </Link>
          <h1 className="text-2xl font-bold text-tertiary">
            Configure Your Workstation
          </h1>
        </div>

        <div className="mt-5 flex flex-col gap-5">
          {!isHydrated ? (
            <div className="h-96 animate-pulse rounded-2xl border border-tertiary/10 bg-secondary" />
          ) : !venue.published ? (
            <div className="rounded-2xl border border-tertiary/10 bg-secondary px-6 py-14 text-center">
              <p className="text-base font-semibold text-tertiary">
                {venue.name} isn&apos;t taking bookings right now
              </p>
              <p className="mx-auto mt-2 max-w-sm text-sm text-tertiary/60">
                Try another workspace nearby. Existing bookings and
                memberships here are not affected.
              </p>
              <Link
                href="/workspaces"
                className="cta-gradient mt-5 inline-flex rounded-lg px-5 py-2.5 text-sm font-medium text-secondary"
              >
                Browse workspaces
              </Link>
            </div>
          ) : (
            <>
              {membership && <MemberVenueBanner membership={membership} />}
              <ConfigureForm
                venue={venue}
                selection={selection}
                onChange={handleConfigChange}
                onAdjustSeats={adjustSeats}
                onAdjustHours={adjustHours}
              />
              <DateStrip
                title={isMembership ? "Start Date" : "Select Date"}
                days={days}
                openDays={openDays}
                lastDay={lastDay}
                value={selection.date}
                onChange={(value) => value && update("date", value)}
              />
              {needsStartTime(selection.bookingType) ? (
                <TimeSlotGrid
                  slots={slots}
                  value={selection.time}
                  onChange={(value) => update("time", value)}
                />
              ) : (
                <AccessCard venue={venue} selection={selection} />
              )}
            </>
          )}
        </div>
      </div>

      <BookingFooter
        subtotal={quote.total}
        rateSummary={rateSummary(quote)}
        actionLabel="Proceed"
        disabled={!isHydrated || !venue.published || !isConfigured || !isScheduled}
        onAction={() => router.push(`/workspaces/${venue.slug}/book/seats`)}
      />
    </div>
  );
};

export default BookingPage;
