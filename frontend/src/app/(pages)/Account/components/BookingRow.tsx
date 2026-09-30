"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { MemberBooking } from "@/types/memberBooking";
import TicketCard, { TICKET_ACTION, TICKET_LINK } from "./TicketCard";

type BookingRowProps = {
  booking: MemberBooking;
  onViewQr: (booking: MemberBooking) => void;
};

const BookingRow = ({ booking, onViewQr }: BookingRowProps) => {
  // A finished or cancelled booking has no QR worth showing, so it rebooks.
  const isRebook =
    booking.status === "completed" || booking.status === "cancelled";

  return (
    <TicketCard
      image={booking.image}
      imageAlt={booking.venueName}
      title={booking.venueName}
      subtitle={`${booking.locality}, ${booking.city}`}
      badge={
        booking.request?.status === "open" ? (
          <span className="rounded-full bg-amber-500/15 px-2.5 py-0.5 text-xs font-medium text-amber-800">
            Cancellation requested
          </span>
        ) : undefined
      }
      actions={
        <>
          <Link
            href={`/account/bookings/${booking.bookingId}`}
            className={TICKET_LINK}
          >
            View Details
          </Link>

          {isRebook ? (
            <Link
              href={`/workspaces/${booking.venueSlug}/book`}
              className={TICKET_ACTION}
            >
              Rebook
              <ArrowRight aria-hidden="true" className="size-4" />
            </Link>
          ) : (
            <button
              type="button"
              onClick={() => onViewQr(booking)}
              className={TICKET_ACTION}
            >
              View QR
              <ArrowRight aria-hidden="true" className="size-4" />
            </button>
          )}
        </>
      }
      details={[
        { label: "Date", value: booking.dateRange },
        { label: "Booking ID", value: booking.bookingId },
        { label: "Type", value: booking.type },
        { label: "Seat no", value: booking.seats.join(", ") },
      ]}
      summary={{ label: "Total", value: `₹${booking.total}` }}
    />
  );
};

export default BookingRow;
