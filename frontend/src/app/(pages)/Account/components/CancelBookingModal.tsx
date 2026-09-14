"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CircleAlert, X } from "lucide-react";
import SelectField from "@/app/components/ui/form/SelectField";
import type { MemberBooking } from "@/types/memberBooking";
import { formatDay } from "@/utils/date";
import {
  FREE_CANCELLATION_HOURS,
  LATE_CANCELLATION_REFUND,
  cancellationTerms,
} from "../cancellation";

type CancelBookingModalProps = {
  booking: MemberBooking;
  onCancel: () => void;
  onConfirm: (refund: number) => void;
};

const REASONS = [
  { value: "", label: "Choose a reason (optional)" },
  { value: "plans-changed", label: "My plans changed" },
  { value: "booked-wrong", label: "Booked the wrong date or space" },
  { value: "found-elsewhere", label: "Found another workspace" },
  { value: "other", label: "Something else" },
];

const CancelBookingModal = ({
  booking,
  onCancel,
  onConfirm,
}: CancelBookingModalProps) => {
  // Mounted only after a click, so this is already the viewer's clock.
  const [now] = useState(() => new Date());
  const [reason, setReason] = useState("");
  const terms = cancellationTerms(booking, now);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onCancel();
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onCancel]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-tertiary/50 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="cancel-title"
        className="relative w-full max-w-md rounded-2xl bg-secondary p-6 sm:p-8"
      >
        <button
          type="button"
          onClick={onCancel}
          aria-label="Close"
          className="absolute right-4 top-4 rounded-md p-1 text-tertiary/50 transition-colors hover:text-tertiary"
        >
          <X aria-hidden="true" className="size-5" />
        </button>

        <span className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
          <CircleAlert aria-hidden="true" className="size-5" />
        </span>

        <h2 id="cancel-title" className="mt-4 text-xl font-bold text-tertiary">
          Cancel this booking?
        </h2>
        <p className="mt-1 text-sm text-tertiary/60">
          {booking.venueName}, {formatDay(booking.startDate)}, {booking.time}.
        </p>

        {terms.allowed ? (
          <>
            <dl className="mt-5 flex flex-col gap-3 rounded-xl bg-tertiary/4 p-4">
              <div className="flex items-center justify-between gap-4">
                <dt className="text-sm text-tertiary/60">You paid</dt>
                <dd className="text-sm font-medium text-tertiary">
                  ₹{booking.total.toLocaleString("en-IN")}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-4">
                <dt className="text-sm text-tertiary/60">Refund</dt>
                <dd className="text-sm font-semibold text-green-700">
                  ₹{terms.refund.toLocaleString("en-IN")}
                  {!terms.isFree &&
                    ` (${Math.round(LATE_CANCELLATION_REFUND * 100)}%)`}
                </dd>
              </div>
            </dl>

            <p className="mt-3 text-xs leading-relaxed text-tertiary/55">
              {terms.isFree
                ? `More than ${FREE_CANCELLATION_HOURS} hours before the start, so you get a full refund.`
                : `Less than ${FREE_CANCELLATION_HOURS} hours before the start, so ${Math.round(LATE_CANCELLATION_REFUND * 100)}% is refunded.`}{" "}
              Refunds reach your original payment method in 5 to 7 working
              days.{" "}
              <Link
                href="/cancellation-policy"
                target="_blank"
                className="font-medium text-primary underline underline-offset-2"
              >
                Cancellation policy
              </Link>
            </p>

            <SelectField
              label="Why are you cancelling?"
              value={reason}
              onChange={setReason}
              options={REASONS}
              className="mt-5"
            />

            <div className="mt-6 flex flex-wrap justify-end gap-3">
              <button
                type="button"
                onClick={onCancel}
                className="rounded-lg border border-tertiary/20 px-4 py-2.5 text-sm font-medium text-tertiary transition-colors hover:bg-tertiary/5"
              >
                Keep booking
              </button>
              <button
                type="button"
                onClick={() => onConfirm(terms.refund)}
                className="rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-secondary transition-colors hover:bg-accent"
              >
                Cancel booking
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="mt-5 rounded-xl bg-tertiary/4 p-4 text-sm text-tertiary/70">
              {terms.reason}
            </p>
            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={onCancel}
                className="rounded-lg border border-tertiary/20 px-4 py-2.5 text-sm font-medium text-tertiary transition-colors hover:bg-tertiary/5"
              >
                Close
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default CancelBookingModal;
