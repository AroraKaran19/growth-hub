"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft,
  CalendarDays,
  CircleX,
  Clock,
  Hourglass,
  Download,
  MapPin,
  QrCode,
  RefreshCw,
} from "lucide-react";
import DirectionsLink from "@/app/components/ui/DirectionsLink";
import { useBooking } from "@/hooks/useBookings";
import { useVenue } from "@/hooks/useVenues";
import { rescheduleBooking } from "@/libs/api/bookings";
import { askToCancel, withdrawCancellation } from "@/libs/api/cancellations";
import { readApiError } from "@/libs/api/errors";
import { toastDone, toastFailed } from "@/libs/toast";
import { BOOKING_STATUS_LABELS, type MemberBooking } from "@/types/memberBooking";
import { cn } from "@/utils";
import { formatDay } from "@/utils/date";
import { toMemberBooking } from "./bookingAdapter";
import { requestNotice } from "./cancelRequest";
import VenueRemovedNotice from "./components/VenueRemovedNotice";
import BookingQrModal from "./components/BookingQrModal";
import CancelRequestModal from "./components/CancelRequestModal";
import RescheduleModal from "./components/RescheduleModal";

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

type Dialog = "qr" | "reschedule" | "cancel" | null;

const BookingDetailPage = ({ bookingId }: { bookingId: string }) => {
  const { booking: fromApi, error, isLoading, mutate } = useBooking(bookingId);
  const [dialog, setDialog] = useState<Dialog>(null);
  const [isWithdrawing, setIsWithdrawing] = useState(false);

  const booking = fromApi ? toMemberBooking(fromApi) : null;
  const { venue } = useVenue(booking?.venueSlug);

  if (!booking) {
    if (isLoading) {
      return <div className="h-96 animate-pulse rounded-2xl border border-tertiary/10 bg-secondary" />;
    }
    const isMissing = readApiError(error).code === "BOOKING_NOT_FOUND";
    return (
      <div className="rounded-2xl border border-tertiary/10 px-6 py-16 text-center">
        <p className="text-base font-semibold text-tertiary">
          {isMissing ? "We couldn't find that booking" : "We couldn't load this booking"}
        </p>
        <p className="mx-auto mt-2 max-w-sm text-sm text-tertiary/60">
          {isMissing
            ? "It may belong to another account, or the link is incomplete."
            : "Check your connection and refresh the page."}
        </p>
        <Link
          href="/account/bookings"
          className="cta-gradient mt-5 inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-medium text-secondary"
        >
          Back to My Bookings
        </Link>
      </div>
    );
  }

  const isPast =
    booking.status === "completed" || booking.status === "cancelled";

  const handleReschedule = async (date: string, startMin: number) => {
    const moved = await rescheduleBooking(booking.bookingId, date, startMin);
    await mutate(moved, { revalidate: false });
    setDialog(null);
    const next = toMemberBooking(moved);
    toastDone(`Rescheduled to ${next.dateRange}, ${next.time}. Your check-in QR stays the same.`);
  };

  const request = booking.request ?? null;
  const decision = requestNotice(request);
  const isRequestOpen = request?.status === "open";

  const handleWithdraw = async () => {
    setIsWithdrawing(true);
    try {
      await withdrawCancellation("booking", booking.bookingId);
      await mutate();
      toastDone("Your cancellation request is withdrawn. The booking stays as it was.");
    } catch (caught) {
      toastFailed(readApiError(caught).message);
    } finally {
      setIsWithdrawing(false);
    }
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


      {booking.missed && (
        <p className="mt-5 flex items-start gap-2 rounded-xl bg-tertiary/5 px-4 py-3 text-sm text-tertiary/75">
          <CircleX aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-tertiary/50" />
          Nobody checked in for this booking.
        </p>
      )}

      {booking.status === "cancelled" && (
        <p
          className="mt-5 flex items-start gap-2 rounded-xl bg-primary/8 px-4 py-3 text-sm text-tertiary/80"
        >
          <CircleX
            aria-hidden="true"
            className="mt-0.5 size-4 shrink-0 text-primary"
          />
          <span>
            Cancelled
            {booking.cancelledOn && ` on ${formatDay(booking.cancelledOn)}`}.
            {request?.status === "approved" && ` ${decision?.text.replace("Cancellation approved. ", "")}`}
          </span>
        </p>
      )}

      {booking.venueRemoval && <VenueRemovedNotice notice={booking.venueRemoval} className="mt-4" />}

      {booking.status !== "cancelled" && decision && decision.tone !== "approved" && (
        <div
          className={cn(
            "mt-5 flex flex-col gap-3 rounded-xl px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between",
            decision.tone === "waiting" ? "bg-amber-500/10 text-amber-900" : "bg-tertiary/5 text-tertiary/80",
          )}
        >
          <p className="flex items-start gap-2">
            {decision.tone === "waiting" ? (
              <Hourglass aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
            ) : (
              <CircleX aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-tertiary/50" />
            )}
            {decision.text}
          </p>
          {isRequestOpen && !request?.systemOpened && (
            <button
              type="button"
              onClick={handleWithdraw}
              disabled={isWithdrawing}
              className="shrink-0 text-sm font-semibold underline underline-offset-2 transition-opacity hover:opacity-75 disabled:opacity-50"
            >
              {isWithdrawing ? "Withdrawing..." : "Withdraw request"}
            </button>
          )}
        </div>
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
            <h2 className="text-base font-bold text-tertiary">Reservation</h2>

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
                <dd className="text-sm text-tertiary">
                  ₹{booking.total - (booking.addons ?? []).reduce((sum, line) => sum + line.amount, 0)}
                </dd>
              </div>
              {booking.addons?.map((line) => (
                <div key={line.name} className="flex items-center justify-between gap-4">
                  <dt className="text-sm text-tertiary/60">{line.name}</dt>
                  <dd className="text-sm text-tertiary">₹{line.amount}</dd>
                </div>
              ))}
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
              {booking.refund !== undefined && (
                <div className="flex items-center justify-between gap-4">
                  <dt className="text-sm text-tertiary/60">Refund from the venue</dt>
                  <dd className="text-sm font-medium text-green-700">
                    ₹{booking.refund}
                  </dd>
                </div>
              )}
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
                onClick={() => setDialog("qr")}
                className="cta-gradient inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium text-secondary transition-opacity hover:opacity-90"
              >
                <QrCode aria-hidden="true" className="size-4" />
                Show check-in QR
              </button>
              {venue?.googleMapsUrl && (
                <DirectionsLink url={venue.googleMapsUrl} />
              )}
              {!isRequestOpen && (
                <button
                  type="button"
                  onClick={() => setDialog("reschedule")}
                  className={SECONDARY_ACTION}
                >
                  <RefreshCw aria-hidden="true" className="size-4" />
                  Reschedule
                </button>
              )}
            </>
          )}

          {booking.invoiceNumber && (
            <Link
              href={`/invoice/${booking.bookingId}`}
              target="_blank"
              className={SECONDARY_ACTION}
            >
              <Download aria-hidden="true" className="size-4" />
              Download invoice
            </Link>
          )}

          {booking.canRequestCancel && (
            <p className="mt-2 text-xs leading-relaxed text-tertiary/50">
              Can&apos;t make it?{" "}
              <button
                type="button"
                onClick={() => setDialog("cancel")}
                className="font-medium text-primary underline underline-offset-2"
              >
                Ask the venue to cancel
              </button>
              . It decides and refunds you directly.
            </p>
          )}
        </aside>
      </div>

      {dialog === "qr" && (
        <BookingQrModal booking={booking} onClose={() => setDialog(null)} />
      )}

      {dialog === "cancel" && (
        <CancelRequestModal
          subject={`Pass ${booking.bookingId}`}
          venueName={booking.venueName}
          onClose={() => setDialog(null)}
          onSubmit={async (input) => {
            await askToCancel("booking", booking.bookingId, input);
            await mutate();
            setDialog(null);
          }}
        />
      )}

      {dialog === "reschedule" && (
        <RescheduleModal
          booking={booking}
          onClose={() => setDialog(null)}
          onConfirm={handleReschedule}
        />
      )}
    </>
  );
};

export default BookingDetailPage;
