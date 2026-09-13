"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import {
  buildDays,
  buildDaysThrough,
  buildTimeSlots,
} from "@/data/bookingOptions";
import { DEMO_FLOOR_PLAN } from "@/data/floorPlan";
import type { BookingSelection } from "@/types/booking";
import type { Venue } from "@/types/venue";
import BookingStepper from "./components/BookingStepper";
import BookingFooter from "./components/BookingFooter";
import ConfigureForm from "./components/ConfigureForm";
import DateStrip from "./components/DateStrip";
import TimeSlotGrid from "./components/TimeSlotGrid";
import { calculateSubtotal } from "./pricing";
import { clearSeatsIfTypeChanged } from "./seatRules";
import { useBookingSelection } from "./useBookingSelection";

const BookingPage = ({ venue }: { venue: Venue }) => {
  const router = useRouter();
  const slots = useMemo(() => buildTimeSlots(), []);

  const {
    selection,
    setSelection,
    isHydrated,
    update,
    adjustSeats,
    isConfigured,
    isScheduled,
  } = useBookingSelection(venue.slug);

  // Dates depend on "today", so they wait for the client. A calendar pick
  // beyond the usual month grows the strip far enough to include it.
  const days = useMemo(() => {
    if (!isHydrated) return [];
    return selection.date ? buildDaysThrough(selection.date) : buildDays();
  }, [isHydrated, selection.date]);

  // Changing the kind of space invalidates any seats already picked for it.
  const handleConfigChange: typeof update = (key, value) => {
    if (key !== "spaceType") return update(key, value);
    setSelection((current) =>
      clearSeatsIfTypeChanged(
        { ...current, spaceType: value as BookingSelection["spaceType"] },
        DEMO_FLOOR_PLAN.seats,
      ),
    );
  };

  const { subtotal, amount, unit, quantity } = calculateSubtotal(
    venue,
    selection,
  );

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
          ) : (
            <>
              <ConfigureForm
                selection={selection}
                onChange={handleConfigChange}
                onAdjustSeats={adjustSeats}
              />
              <DateStrip
                days={days}
                value={selection.date}
                onChange={(value) => value && update("date", value)}
              />
              <TimeSlotGrid
                slots={slots}
                value={selection.time}
                onChange={(value) => update("time", value)}
              />
            </>
          )}
        </div>
      </div>

      <BookingFooter
        subtotal={subtotal}
        rateSummary={`₹${amount}/${unit}${quantity > 1 ? ` x ${quantity}` : ""}`}
        actionLabel="Proceed"
        disabled={!isHydrated || !isConfigured || !isScheduled}
        onAction={() => router.push(`/workspaces/${venue.slug}/book/seats`)}
      />
    </div>
  );
};

export default BookingPage;
