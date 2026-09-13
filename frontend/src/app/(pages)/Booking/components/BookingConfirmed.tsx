"use client";

import Link from "next/link";
import { QRCodeSVG } from "qrcode.react";
import { ArrowRight, CalendarDays, Check, Clock, Download } from "lucide-react";
import DirectionsLink from "@/app/components/ui/DirectionsLink";
import type { BookingSelection } from "@/types/booking";
import type { Venue } from "@/types/venue";
import { DEMO_FLOOR_PLAN } from "@/data/floorPlan";
import { SEAT_TYPE_LABELS } from "@/types/seat";

type BookingConfirmedProps = {
  venue: Venue;
  selection: BookingSelection;
  bookingId: string;
};

const formatDate = (iso: string) => {
  if (!iso) return "Date not set";
  const date = new Date(`${iso}T00:00:00`);
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

const BookingConfirmed = ({
  venue,
  selection,
  bookingId,
}: BookingConfirmedProps) => {
  const seatLabels = selection.seatIds
    .map(
      (id) =>
        DEMO_FLOOR_PLAN.seats.find((seat) => seat.id === id)?.label ?? id,
    )
    .join(", ");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-tertiary/50 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="booking-confirmed-title"
        className="w-full max-w-md rounded-2xl bg-secondary p-6 text-center sm:p-8"
      >
        <span className="mx-auto flex size-16 items-center justify-center rounded-full bg-green-500">
          <Check aria-hidden="true" className="size-8 text-secondary" />
        </span>

        <h2
          id="booking-confirmed-title"
          className="mt-5 text-2xl font-bold text-tertiary"
        >
          Booking Confirmed
        </h2>

        <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            className="cta-gradient inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium text-secondary transition-opacity hover:opacity-90"
          >
            Download PDF
            <Download aria-hidden="true" className="size-4" />
          </button>
          <DirectionsLink url={venue.googleMapsUrl} />
        </div>

        {/* Ticket: QR on the left, details on the right, split by a perforation */}
        <div className="mt-6 flex overflow-hidden rounded-xl bg-tertiary/4 text-left">
          <div className="flex shrink-0 items-center justify-center p-4">
            <QRCodeSVG
              value={`growthhub:booking:${bookingId}`}
              size={96}
              level="M"
              aria-label={`QR code for booking ${bookingId}`}
            />
          </div>

          <div
            aria-hidden="true"
            className="my-3 border-l border-dashed border-tertiary/25"
          />

          <div className="min-w-0 grow p-4">
            <p className="truncate text-base font-bold text-tertiary">
              {venue.name}
            </p>
            <p className="mt-0.5 truncate text-sm text-tertiary/60">
              {SEAT_TYPE_LABELS[selection.spaceType]}
              {seatLabels && ` - ${seatLabels}`}
            </p>

            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-tertiary/70">
              <span className="inline-flex items-center gap-1.5">
                <CalendarDays
                  aria-hidden="true"
                  className="size-3.5 text-primary"
                />
                {formatDate(selection.date)}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Clock aria-hidden="true" className="size-3.5 text-primary" />
                {selection.time || "Time not set"}
              </span>
            </div>

            <p className="mt-3 text-xs text-tertiary/50">Booking ID</p>
            <p className="font-mono text-sm text-tertiary">{bookingId}</p>
          </div>
        </div>

        <p className="mt-4 text-sm text-tertiary/60">
          Check in by scanning the QR code at reception
        </p>

        <div className="mt-6 flex items-center justify-center gap-5">
          <Link
            href="/"
            className="text-sm text-tertiary underline underline-offset-4 transition-opacity hover:opacity-70"
          >
            Go to Home
          </Link>
          <Link
            href="/account/bookings"
            className="cta-gradient inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-medium text-secondary transition-opacity hover:opacity-90"
          >
            View Booking
            <ArrowRight aria-hidden="true" className="size-4" />
          </Link>
        </div>
      </div>
    </div>
  );
};

export default BookingConfirmed;
