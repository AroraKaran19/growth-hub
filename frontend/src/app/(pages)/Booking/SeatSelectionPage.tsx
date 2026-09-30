"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, CircleAlert } from "lucide-react";
import { useMembershipTakenSeats, useTakenSeats } from "@/hooks/useAvailability";
import { useMemberships } from "@/hooks/useMemberships";
import { isMembershipType, type MembershipLength } from "@/types/booking";
import { formatDay } from "@/utils/date";
import type { VenueDetail } from "@/types/venue";
import { checkoutStepFor, windowOf } from "./checkoutState";
import BookingStepper from "./components/BookingStepper";
import BookingFooter from "./components/BookingFooter";
import SeatMap from "./components/SeatMap";
import { reservedSeatIdsFor } from "./membershipBooking";
import { LENGTH_KEYS, quoteBooking, rateSummary } from "./pricing";
import { toggleSeatSelection } from "./seatRules";
import { useBookingSelection } from "./useBookingSelection";

const NOTICE =
  "rounded-2xl border border-tertiary/10 bg-secondary px-6 py-14 text-center";

const SeatSelectionPage = ({ venue }: { venue: VenueDetail }) => {
  const router = useRouter();
  const {
    selection,
    setSelection,
    isHydrated,
    remainingPicks,
    isSeatingComplete,
    isConfigured,
    isScheduled,
  } = useBookingSelection(venue);

  // Seats depend on the date and time, so a selection that lost them starts over on the options step.
  const needsOptions = checkoutStepFor({ isConfigured, isScheduled, isSeatingComplete: true }) === "book";
  useEffect(() => {
    if (isHydrated && needsOptions) router.replace(`/workspaces/${venue.slug}/book`);
  }, [isHydrated, needsOptions, router, venue.slug]);

  const { seatMap } = venue;
  const takenNotice = useSearchParams().get("taken");
  const isPass = !isMembershipType(selection.bookingType);
  const { taken: passTaken } = useTakenSeats(
    venue.slug,
    isPass ? selection.date : "",
    isPass ? windowOf(selection, venue) : null,
  );
  const { taken: planTaken } = useMembershipTakenSeats(
    venue.slug,
    isPass ? "" : selection.date,
    isPass ? null : LENGTH_KEYS[selection.bookingType as MembershipLength],
  );
  const taken = isPass ? passTaken : planTaken;
  const blocked = new Set([...(taken?.takenSeatIds ?? []), ...(taken?.outOfServiceSeatIds ?? [])]);
  // Seats someone else booked or is paying for right now can't be picked.
  const liveSeats = (seatMap?.seats ?? []).map((seat) =>
    blocked.has(seat.id) && !selection.seatIds.includes(seat.id) ? { ...seat, available: false } : seat,
  );
  const { memberships } = useMemberships();
  const yourSeatIds = reservedSeatIdsFor(memberships, venue.slug);
  const quote = quoteBooking(venue, selection, venue.addons);
  const canPick = venue.published && Boolean(seatMap);

  return (
    <div className="bg-surface pt-28 lg:pt-32">
      <div className="mx-auto w-full max-w-5xl px-4 sm:px-6">
        <BookingStepper activeIndex={isSeatingComplete ? 3 : 2} />

        <div className="mt-8 flex items-center gap-1.5">
          <Link
            href={`/workspaces/${venue.slug}/book`}
            aria-label="Back to workstation options"
            className="-ml-1 rounded-md p-1 text-tertiary transition-colors hover:bg-tertiary/5"
          >
            <ChevronLeft aria-hidden="true" className="size-5" />
          </Link>
          <h1 className="text-2xl font-bold text-tertiary">
            {isMembershipType(selection.bookingType)
              ? "Choose Your Reserved Seat"
              : "Select Your Workstation"}
          </h1>
        </div>

        <div className="mt-5">
          {!isHydrated ? (
            <div className="h-128 animate-pulse rounded-2xl border border-tertiary/10 bg-secondary" />
          ) : !venue.published ? (
            <div className={NOTICE}>
              <p className="text-base font-semibold text-tertiary">
                {venue.name} isn&apos;t taking bookings right now
              </p>
              <Link
                href="/workspaces"
                className="cta-gradient mt-5 inline-flex rounded-lg px-5 py-2.5 text-sm font-medium text-secondary"
              >
                Browse workspaces
              </Link>
            </div>
          ) : !seatMap ? (
            <div className={NOTICE}>
              <p className="text-base font-semibold text-tertiary">
                This venue&apos;s seat plan isn&apos;t ready yet
              </p>
              <p className="mx-auto mt-2 max-w-sm text-sm text-tertiary/60">
                There is nothing to pick for now. Please check back soon or
                try another workspace.
              </p>
            </div>
          ) : (
            <>
            {takenNotice && (
              <p
                role="alert"
                className="mb-4 flex items-start gap-2.5 rounded-xl border border-primary/25 bg-primary/5 px-4 py-3 text-sm text-tertiary"
              >
                <CircleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-primary" />
                Someone has just taken {takenNotice}. Pick another seat and we will hold it for you.
              </p>
            )}
            {!isPass && planTaken && (
              <p className="mb-4 text-sm text-tertiary/60">
                A plan keeps its seat every day from {formatDay(planTaken.startDate)} to{" "}
                {formatDay(planTaken.through)}, so seats booked on any of those days show grey.
              </p>
            )}
            <SeatMap
              image={seatMap.image}
              seats={liveSeats}
              selectedSeats={selection.seatIds}
              requiredSeats={selection.seats}
              spaceType={selection.spaceType}
              yourSeatIds={yourSeatIds}
              onToggleSeat={(seat) =>
                setSelection((current) => toggleSeatSelection(current, seat))
              }
            />
            </>
          )}
        </div>
      </div>

      <BookingFooter
        subtotal={quote.total}
        rateSummary={rateSummary(quote)}
        actionLabel={
          remainingPicks > 0
            ? `Pick ${remainingPicks} more`
            : "Proceed to payment"
        }
        disabled={!isHydrated || !canPick || !isSeatingComplete}
        onAction={() => router.push(`/workspaces/${venue.slug}/book/payment`)}
      />
    </div>
  );
};

export default SeatSelectionPage;
