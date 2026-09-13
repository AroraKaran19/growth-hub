"use client";

import { useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";
import {
  buildDays,
  buildDaysThrough,
  buildTimeSlots,
} from "@/data/bookingOptions";
import type { BookingSchedule, MemberBooking } from "@/types/memberBooking";
import DateStrip from "../../Booking/components/DateStrip";
import TimeSlotGrid from "../../Booking/components/TimeSlotGrid";
import { fitsBeforeMidnight, rescheduleTo } from "../reschedule";

type RescheduleModalProps = {
  booking: MemberBooking;
  onClose: () => void;
  onConfirm: (schedule: BookingSchedule) => void;
};

const SECONDARY_ACTION =
  "inline-flex items-center justify-center rounded-lg border border-tertiary/20 px-4 py-2.5 text-sm font-medium text-tertiary transition-colors hover:bg-tertiary/5";

const RescheduleModal = ({
  booking,
  onClose,
  onConfirm,
}: RescheduleModalProps) => {
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");

  // Only ever mounted after a click, so "today" is already the browser's.
  // A calendar pick beyond the usual month grows the strip to include it.
  const days = useMemo(
    () => (date ? buildDaysThrough(date) : buildDays()),
    [date],
  );

  // The booking keeps its length, so starts that would run past midnight go.
  const slots = useMemo(
    () =>
      buildTimeSlots().map((slot) => ({
        ...slot,
        available: slot.available && fitsBeforeMidnight(booking.time, slot.id),
      })),
    [booking.time],
  );

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const handleDatePick = (value: string) => {
    if (value) setDate(value);
  };

  const next = date && time ? rescheduleTo(booking, date, time) : null;
  const isUnchanged =
    next !== null &&
    next.startDate === booking.startDate &&
    next.time === booking.time;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-tertiary/50 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="reschedule-title"
        className="flex max-h-[calc(100dvh-2rem)] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-surface"
      >
        <div className="flex items-start justify-between gap-4 border-b border-tertiary/10 bg-secondary px-5 py-4 sm:px-6">
          <div>
            <h2 id="reschedule-title" className="text-xl font-bold text-tertiary">
              Reschedule booking
            </h2>
            <p className="mt-1 text-sm text-tertiary/60">
              Currently {booking.dateRange}, {booking.time}. Seats, type and
              price stay the same.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-md p-1 text-tertiary/50 transition-colors hover:text-tertiary"
          >
            <X aria-hidden="true" className="size-5" />
          </button>
        </div>

        <div className="flex min-h-0 flex-col gap-4 overflow-y-auto p-4 sm:p-6">
          <DateStrip days={days} value={date} onChange={handleDatePick} />
          <TimeSlotGrid slots={slots} value={time} onChange={setTime} />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-tertiary/10 bg-secondary px-5 py-4 sm:px-6">
          <p aria-live="polite" className="text-sm text-tertiary/60">
            {next ? (
              <>
                New slot:{" "}
                <span className="font-medium text-tertiary">
                  {next.dateRange}, {next.time}
                </span>
              </>
            ) : (
              "Pick a new date and start time"
            )}
          </p>

          <div className="flex flex-wrap gap-3">
            <button type="button" onClick={onClose} className={SECONDARY_ACTION}>
              Keep current
            </button>
            <button
              type="button"
              disabled={!next || isUnchanged}
              onClick={() => next && onConfirm(next)}
              className="cta-gradient inline-flex items-center justify-center rounded-lg px-5 py-2.5 text-sm font-medium text-secondary transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Confirm reschedule
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RescheduleModal;
