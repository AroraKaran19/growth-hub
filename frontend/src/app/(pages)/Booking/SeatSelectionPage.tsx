"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import type { Venue } from "@/types/venue";
import BookingStepper from "./components/BookingStepper";
import BookingFooter from "./components/BookingFooter";
import SeatMap from "./components/SeatMap";
import { calculateSubtotal } from "./pricing";
import { toggleSeatSelection } from "./seatRules";
import { useBookingSelection } from "./useBookingSelection";

const SeatSelectionPage = ({ venue }: { venue: Venue }) => {
  const router = useRouter();
  const {
    selection,
    setSelection,
    isHydrated,
    remainingPicks,
    isSeatingComplete,
  } = useBookingSelection(venue.slug);

  const { subtotal, amount, unit, quantity } = calculateSubtotal(
    venue,
    selection,
  );

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
            Select Your Workstation
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
              onToggleSeat={(seat) =>
                setSelection((current) => toggleSeatSelection(current, seat))
              }
            />
          )}
        </div>
      </div>

      <BookingFooter
        subtotal={subtotal}
        rateSummary={`₹${amount}/${unit}${quantity > 1 ? ` x ${quantity}` : ""}`}
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
