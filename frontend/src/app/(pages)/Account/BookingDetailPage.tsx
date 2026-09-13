"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft,
  CalendarCheck,
  CalendarDays,
  Clock,
  Download,
  MapPin,
  QrCode,
  RefreshCw,
  XCircle,
} from "lucide-react";
import DirectionsLink from "@/app/components/ui/DirectionsLink";
import { findVenue } from "@/data/venues";
import {
  BOOKING_STATUS_LABELS,
  type BookingSchedule,
  type MemberBooking,
} from "@/types/memberBooking";
import { cn } from "@/utils";
import BookingQrModal from "./components/BookingQrModal";
import RescheduleModal from "./components/RescheduleModal";
import { useMemberBookings } from "@/stores/bookings";

const STATUS_STYLE: Record<MemberBooking["status"], string> = {
  upcoming: "bg-green-500/12 text-green-700",
  rescheduled: "bg-amber-500/15 text-amber-700",
  completed: "bg-tertiary/8 text-tertiary/70",
  cancelled: "bg-primary/10 text-primary",
};

const ROW_LABEL = "text-xs text-tertiary/50";
const ROW_VALUE = "mt-1 text-sm text-tertiary";
const SECONDARY_ACTION =
  "inline-flex items-center justify-center gap-2 rounded-lg border border-tertiary/20 px-4 py-2.5 text-sm font-medium text-tertiary transition-colors hover:bg-tertiary/5";

const BookingDetailPage = ({
  booking: issuedBooking,
}: {
  booking: MemberBooking;
}) => {
  const { bookings, reschedule } = useMemberBookings();
  const [showQr, setShowQr] = useState(false);
  const [isRescheduling, setIsRescheduling] = useState(false);
  const [wasRescheduled, setWasRescheduled] = useState(false);

  // Picks up a reschedule saved in this browser.
  const booking =
    bookings.find((item) => item.bookingId === issuedBooking.bookingId) ??
    issuedBooking;
  const venue = findVenue(booking.venueSlug);

  const isPast =
    booking.status === "completed" || booking.status === "cancelled";

  const handleReschedule = (schedule: BookingSchedule) => {
    reschedule(booking.bookingId, schedule);
    setIsRescheduling(false);
    setWasRescheduled(true);
  };

  return (
    <>
      <Link
        href="/account/bookings"
        className="inline-flex items-center gap-2 text-sm text-tertiary/60 transition-colors hover:text-tertiary"
      >
        <ArrowLeft aria-hidden="true" className="size-4" />
        All bookings
      </Link>

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold text-tertiary">Booking details</h1>
        <span
          className={cn(
            "rounded-full px-3 py-1 text-xs font-medium",
            STATUS_STYLE[booking.status],
          )}
        >
          {BOOKING_STATUS_LABELS[booking.status]}
        </span>
      </div>
      <p className="mt-1 font-mono text-sm text-tertiary/55">
        {booking.bookingId}
      </p>

      {wasRescheduled && (
        <p
          role="status"
          className="mt-5 flex items-center gap-2 rounded-xl bg-green-500/10 px-4 py-3 text-sm text-green-800"
        >
          <CalendarCheck aria-hidden="true" className="size-4 shrink-0" />
          Rescheduled to {booking.dateRange}, {booking.time}. Your check-in QR
          stays the same.
        </p>
      )}

      <div className="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="flex flex-col gap-5">
          <section className="rounded-2xl border border-tertiary/10 bg-secondary p-5 sm:p-6">
            <div className="flex flex-wrap items-center gap-5">
              <div className="relative h-24 w-32 shrink-0 overflow-hidden rounded-lg">
                <Image
                  src={booking.image}
                  alt={booking.venueName}
                  fill
                  sizes="128px"
                  className="object-cover"
                />
              </div>
              <div className="min-w-0">
                <h2 className="text-xl font-bold text-tertiary">
                  {booking.venueName}
                </h2>
                <p className="mt-1 inline-flex items-center gap-1.5 text-sm text-tertiary/60">
                  <MapPin aria-hidden="true" className="size-4 shrink-0" />
                  {booking.locality}, {booking.city}
                </p>
                <Link
                  href={`/workspaces/${booking.venueSlug}`}
                  className="mt-2 block text-sm font-medium text-primary transition-opacity hover:opacity-75"
                >
                  View workspace
                </Link>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-tertiary/10 bg-secondary p-5 sm:p-6">
            <h2 className="text-base font-bold text-tertiary">
              Reservation
            </h2>

            <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-3">
              <div>
                <dt className={ROW_LABEL}>Date</dt>
                <dd className={`${ROW_VALUE} inline-flex items-center gap-1.5`}>
                  <CalendarDays
                    aria-hidden="true"
                    className="size-3.5 text-primary"
                  />
                  {booking.dateRange}
                </dd>
              </div>
              <div>
                <dt className={ROW_LABEL}>Time</dt>
                <dd className={`${ROW_VALUE} inline-flex items-center gap-1.5`}>
                  <Clock aria-hidden="true" className="size-3.5 text-primary" />
                  {booking.time}
                </dd>
              </div>
              <div>
                <dt className={ROW_LABEL}>Type</dt>
                <dd className={ROW_VALUE}>{booking.type}</dd>
              </div>
              <div className="col-span-2 sm:col-span-1">
                <dt className={ROW_LABEL}>Seat no</dt>
                <dd className={ROW_VALUE}>{booking.seats.join(", ")}</dd>
              </div>
              <div>
                <dt className={ROW_LABEL}>Seats booked</dt>
                <dd className={ROW_VALUE}>{booking.seats.length}</dd>
              </div>
            </dl>
          </section>

          <section className="rounded-2xl border border-tertiary/10 bg-secondary p-5 sm:p-6">
            <h2 className="text-base font-bold text-tertiary">Payment</h2>

            <dl className="mt-4 flex flex-col gap-3">
              <div className="flex items-center justify-between gap-4">
                <dt className="text-sm text-tertiary/60">
                  {booking.type} x {booking.seats.length}
                </dt>
                <dd className="text-sm text-tertiary">₹{booking.total}</dd>
              </div>
              <div className="flex items-center justify-between gap-4">
                <dt className="text-sm text-tertiary/60">Taxes and fees</dt>
                <dd className="text-sm text-tertiary">Included</dd>
              </div>
              <div className="flex items-center justify-between gap-4 border-t border-tertiary/10 pt-3">
                <dt className="text-sm font-medium text-tertiary">
                  Total paid
                </dt>
                <dd className="text-lg font-bold text-tertiary">
                  ₹{booking.total}
                </dd>
              </div>
            </dl>
          </section>
        </div>

        <aside className="flex h-fit flex-col gap-3 rounded-2xl border border-tertiary/10 bg-secondary p-5 sm:p-6">
          <h2 className="text-base font-bold text-tertiary">Actions</h2>

          {isPast ? (
            <Link
              href={`/workspaces/${booking.venueSlug}/book`}
              className="cta-gradient inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium text-secondary transition-opacity hover:opacity-90"
            >
              <RefreshCw aria-hidden="true" className="size-4" />
              Rebook this space
            </Link>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setShowQr(true)}
                className="cta-gradient inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium text-secondary transition-opacity hover:opacity-90"
              >
                <QrCode aria-hidden="true" className="size-4" />
                Show check-in QR
              </button>
              {venue && <DirectionsLink url={venue.googleMapsUrl} />}
              <button
                type="button"
                onClick={() => setIsRescheduling(true)}
                className={SECONDARY_ACTION}
              >
                <RefreshCw aria-hidden="true" className="size-4" />
                Reschedule
              </button>
              <button type="button" className={SECONDARY_ACTION}>
                <XCircle aria-hidden="true" className="size-4" />
                Cancel booking
              </button>
            </>
          )}

          <button type="button" className={SECONDARY_ACTION}>
            <Download aria-hidden="true" className="size-4" />
            Download invoice
          </button>

          <p className="mt-2 text-xs leading-relaxed text-tertiary/50">
            Free cancellation up to 24 hours before your booking starts.
          </p>
        </aside>
      </div>

      {showQr && (
        <BookingQrModal booking={booking} onClose={() => setShowQr(false)} />
      )}

      {isRescheduling && (
        <RescheduleModal
          booking={booking}
          onClose={() => setIsRescheduling(false)}
          onConfirm={handleReschedule}
        />
      )}
    </>
  );
};

export default BookingDetailPage;
