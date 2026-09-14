"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { useMemberMemberships, venueMembership } from "@/stores/memberships";
import { useVenueCatalog } from "@/stores/venues";
import { isMembershipType } from "@/types/booking";
import type { Venue } from "@/types/venue";
import BookingStepper from "./components/BookingStepper";
import BookingFooter from "./components/BookingFooter";
import SeatMap from "./components/SeatMap";
import { reservedSeatIdsFor } from "./membershipBooking";
import { quoteBooking, rateSummary } from "./pricing";
import { toggleSeatSelection } from "./seatRules";
import { useBookingSelection } from "./useBookingSelection";

const SeatSelectionPage = ({ venue: listing }: { venue: Venue }) => {
  const router = useRouter();
  const { venueFor, seatsFor } = useVenueCatalog();
  const venue = venueFor(listing);
  const {
    selection,
    setSelection,
    isHydrated,
    remainingPicks,
    isSeatingComplete,
  } = useBookingSelection(venue.slug);

  const { memberships } = useMemberMemberships();
  const membership = venueMembership(memberships, venue.slug);
  const yourSeatIds = reservedSeatIdsFor(memberships, venue.slug);
  const quote = quoteBooking(venue, selection, membership);

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
          ) : (
            <SeatMap
              selectedSeats={selection.seatIds}
              requiredSeats={selection.seats}
              spaceType={selection.spaceType}
              yourSeatIds={yourSeatIds}
              seats={seatsFor(venue.slug)}
              onToggleSeat={(seat) =>
                setSelection((current) => toggleSeatSelection(current, seat))
              }
            />
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
        disabled={!isHydrated || !isSeatingComplete}
        onAction={() => router.push(`/workspaces/${venue.slug}/book/payment`)}
      />
    </div>
  );
};

export default SeatSelectionPage;
