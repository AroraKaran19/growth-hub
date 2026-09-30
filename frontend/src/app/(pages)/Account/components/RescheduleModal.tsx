"use client";

import { useEffect, useMemo, useState } from "react";
import useSWR from "swr";
import { X } from "lucide-react";
import { buildDays, buildDaysThrough, lastPassDay } from "@/data/bookingOptions";
import { useVenue } from "@/hooks/useVenues";
import { fetchRescheduleOptions } from "@/libs/api/bookings";
import { readApiError } from "@/libs/api/errors";
import type { MemberBooking } from "@/types/memberBooking";
import { formatMonthDay } from "@/utils/date";
import DateStrip from "../../Booking/components/DateStrip";
import TimeSlotGrid from "../../Booking/components/TimeSlotGrid";

type RescheduleModalProps = {
  booking: MemberBooking;
  onClose: () => void;
  onConfirm: (date: string, startMin: number) => Promise<void>;
};

const SECONDARY_ACTION =
  "inline-flex items-center justify-center rounded-lg border border-tertiary/20 px-4 py-2.5 text-sm font-medium text-tertiary transition-colors hover:bg-tertiary/5";

const RescheduleModal = ({ booking, onClose, onConfirm }: RescheduleModalProps) => {
  const [date, setDate] = useState("");
  const [start, setStart] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const { venue } = useVenue(booking.venueSlug);
  const openDays = venue?.openDays;

  // Only ever mounted after a click, so "today" is already the browser's.
  const days = useMemo(
    () => (date ? buildDaysThrough(date, openDays) : buildDays(30, openDays)),
    [date, openDays],
  );

  // The server knows which starts the booking's own seats are free for.
  const { data: options, error: loadError } = useSWR(date ? ["reschedule", booking.bookingId, date] : null, ([, ref, day]) =>
    fetchRescheduleOptions(ref, day),
  );
  const slots = (options?.starts ?? []).map((slot) => ({
    id: String(slot.startMin),
    label: slot.label,
    available: slot.available,
  }));
  const picked = options?.starts.find((slot) => String(slot.startMin) === start);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const pickDate = (value: string) => {
    if (!value) return;
    setDate(value);
    setStart("");
    setError(null);
  };

  const confirm = async () => {
    if (!picked) return;
    setIsSaving(true);
    setError(null);
    try {
      await onConfirm(date, picked.startMin);
    } catch (caught) {
      setError(readApiError(caught).message);
      setIsSaving(false);
    }
  };

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
              Currently {booking.dateRange}, {booking.time}. Seats, type and price stay the same.
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
          <DateStrip days={days} openDays={openDays} lastDay={lastPassDay()} value={date} onChange={pickDate} />
          {!date ? null : loadError ? (
            <p role="alert" className="rounded-2xl border border-primary/25 bg-primary/5 px-5 py-4 text-sm text-primary">
              {readApiError(loadError).message}
            </p>
          ) : !options ? (
            <div aria-hidden="true" className="h-48 animate-pulse rounded-2xl border border-tertiary/10 bg-secondary" />
          ) : (
            <TimeSlotGrid slots={slots} value={start} onChange={setStart} />
          )}
          {error && (
            <p role="alert" className="text-sm text-primary">
              {error}
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-tertiary/10 bg-secondary px-5 py-4 sm:px-6">
          <p aria-live="polite" className="text-sm text-tertiary/60">
            {picked ? (
              <>
                New slot:{" "}
                <span className="font-medium text-tertiary">
                  {formatMonthDay(date)}, {picked.label}
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
              disabled={!picked || isSaving}
              onClick={confirm}
              className="cta-gradient inline-flex items-center justify-center rounded-lg px-5 py-2.5 text-sm font-medium text-secondary transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSaving ? "Moving..." : "Confirm reschedule"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RescheduleModal;
