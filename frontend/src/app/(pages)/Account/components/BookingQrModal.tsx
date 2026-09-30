"use client";

import { useEffect } from "react";
import { QRCodeSVG } from "qrcode.react";
import { X } from "lucide-react";
import DirectionsLink from "@/app/components/ui/DirectionsLink";
import { useVenue } from "@/hooks/useVenues";
import type { MemberBooking } from "@/types/memberBooking";

type BookingQrModalProps = {
  booking: MemberBooking;
  onClose: () => void;
};

const ROW_LABEL = "text-xs text-tertiary/50";
const ROW_VALUE = "mt-0.5 text-sm font-medium text-tertiary";

const BookingQrModal = ({ booking, onClose }: BookingQrModalProps) => {
  const { venue } = useVenue(booking.venueSlug);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-tertiary/50 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="booking-qr-title"
        className="relative w-full max-w-md rounded-2xl bg-secondary p-6 sm:p-8"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-4 top-4 rounded-md p-1 text-tertiary/50 transition-colors hover:text-tertiary"
        >
          <X aria-hidden="true" className="size-5" />
        </button>

        <div className="text-center">
          <h2
            id="booking-qr-title"
            className="text-xl font-bold text-tertiary"
          >
            {booking.venueName}
          </h2>
          <p className="mt-0.5 text-sm text-tertiary/60">
            {booking.locality}, {booking.city}
          </p>
        </div>

        {booking.qrCode ? (
          <>
            <div className="mt-5 flex justify-center rounded-xl bg-tertiary/4 p-5">
              <QRCodeSVG value={booking.qrCode} size={176} level="M" />
            </div>
            <p className="mt-3 text-center text-sm text-tertiary/60">
              Scan this at reception to check in
            </p>
          </>
        ) : (
          <p className="mt-5 rounded-xl bg-tertiary/4 p-5 text-center text-sm text-tertiary/65">
            Show your booking ID at reception to check in.
          </p>
        )}

        <dl className="mt-5 grid grid-cols-2 gap-4 border-t border-tertiary/10 pt-5">
          <div>
            <dt className={ROW_LABEL}>Booking ID</dt>
            <dd className={`${ROW_VALUE} font-mono`}>{booking.bookingId}</dd>
          </div>
          <div>
            <dt className={ROW_LABEL}>Date</dt>
            <dd className={ROW_VALUE}>{booking.dateRange}</dd>
          </div>
          <div>
            <dt className={ROW_LABEL}>Type</dt>
            <dd className={ROW_VALUE}>{booking.type}</dd>
          </div>
          <div>
            <dt className={ROW_LABEL}>Seat no</dt>
            <dd className={ROW_VALUE}>{booking.seats.join(", ")}</dd>
          </div>
          <div>
            <dt className={ROW_LABEL}>Total</dt>
            <dd className={ROW_VALUE}>₹{booking.total}</dd>
          </div>
        </dl>

        {venue?.googleMapsUrl && (
          <DirectionsLink url={venue.googleMapsUrl} className="mt-5 w-full" />
        )}
      </div>
    </div>
  );
};

export default BookingQrModal;
