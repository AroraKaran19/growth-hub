"use client";

import { useState } from "react";
import useSWR from "swr";
import { ArrowRight, ArrowRightLeft, Armchair, CalendarClock, SearchX } from "lucide-react";
import SelectField from "@/app/components/ui/form/SelectField";
import { readApiError } from "@/libs/api/errors";
import { fetchSeatOptions, type SeatDesk, type SeatRecord } from "@/libs/api/seatChanges";
import { toastDone } from "@/libs/toast";
import { SEAT_TYPE_LABELS, type SeatType } from "@/types/seat";
import type { SeatChangeInput, SeatOptions } from "@/types/seatChange";
import { cn } from "@/utils";
import { formatDay } from "@/utils/date";
import StaffModal, { MODAL_ERROR, MODAL_QUIET_ACTION } from "./StaffModal";

type ChangeSeatModalProps = {
  desk: SeatDesk;
  record: SeatRecord;
  recordRef: string;
  customerName: string;
  /** Sends the change and updates the caller's data; throws the server's refusal. */
  onSave: (input: SeatChangeInput) => Promise<unknown>;
  onClose: () => void;
};

const MAX_NOTE = 500;

const typeName = (type: string) => (SEAT_TYPE_LABELS[type as SeatType] ?? type).toLowerCase();

const movesLabel = (record: SeatRecord, options: SeatOptions) => {
  if (record === "booking") return `For this booking on ${formatDay(options.from)}.`;
  if (options.days === 0) return `From ${formatDay(options.from)}, the new seat takes over.`;
  return `From ${formatDay(options.from)}, ${options.days} reserved ${options.days === 1 ? "day moves" : "days move"} to the new seat.`;
};

const SeatTile = ({ caption, label, muted }: { caption: string; label: string | null; muted?: boolean }) => (
  <div
    className={cn(
      "flex min-w-0 flex-1 flex-col items-center gap-1 rounded-xl px-3 py-3 text-center",
      muted ? "border border-dashed border-tertiary/20 bg-surface" : "bg-secondary shadow-md shadow-tertiary/8",
    )}
  >
    <span className="text-xs text-tertiary/55">{caption}</span>
    <span className={cn("truncate text-lg font-bold", label ? "text-tertiary" : "text-tertiary/35")}>{label ?? "Pick one"}</span>
  </div>
);

/** Moves one seat of a membership or booking to a free seat of the same type. */
const ChangeSeatModal = ({ desk, record, recordRef, customerName, onSave, onClose }: ChangeSeatModalProps) => {
  const { data, error: loadError, mutate } = useSWR(
    ["seat-options", desk, record, recordRef],
    () => fetchSeatOptions(desk, record, recordRef),
    { revalidateOnFocus: false },
  );
  const [pickedFrom, setPickedFrom] = useState("");
  const [pickedTo, setPickedTo] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [fields, setFields] = useState<Record<string, string>>({});
  const [isLocked, setIsLocked] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const seats = data?.seats ?? [];
  const fromSeat = seats.length === 1 ? seats[0] : seats.find((seat) => seat.id === pickedFrom);
  const choices = fromSeat ? (data?.options ?? []).filter((option) => option.type === fromSeat.type) : [];
  const toSeat = choices.find((option) => option.id === pickedTo);
  const hasNoChoice = Boolean(fromSeat) && choices.length === 0;

  const clearErrors = () => {
    setError(null);
    setFields({});
  };

  const save = async () => {
    if (!fromSeat) return setFields({ fromSeatId: "Pick the seat to replace." });
    if (!toSeat) return setFields({ toSeatId: "Pick the new seat." });
    setIsSaving(true);
    clearErrors();
    try {
      await onSave({ fromSeatId: fromSeat.id, toSeatId: toSeat.id, ...(note.trim() && { note: note.trim() }) });
      toastDone("Seat changed. The customer has been emailed.");
      onClose();
    } catch (caught) {
      const info = readApiError(caught);
      setIsSaving(false);
      if (info.code === "SEAT_TAKEN") {
        setPickedTo("");
        setError(info.message);
        void mutate();
      } else if (info.code === "NOT_MOVABLE") {
        setIsLocked(true);
        setError(info.message);
      } else if (Object.keys(info.fields).length) {
        setFields(info.fields);
        if (!info.fields.fromSeatId && !info.fields.toSeatId && !info.fields.note) setError(info.message);
      } else {
        setError(info.message);
      }
    }
  };

  const canSave = Boolean(data) && !hasNoChoice && !isLocked && !isSaving;

  return (
    <StaffModal
      eyebrow={
        <>
          <ArrowRightLeft aria-hidden="true" className="size-4" />
          {record === "membership" ? "Membership" : "Booking"} {recordRef}
        </>
      }
      title="Change seat"
      description={`For ${customerName}. They get an email with the new seat.`}
      onClose={onClose}
      footer={
        <>
          {error && (
            <p role="alert" className={MODAL_ERROR}>
              {error}
            </p>
          )}
          <div className="flex flex-wrap items-center justify-end gap-5">
            <button type="button" onClick={onClose} className={MODAL_QUIET_ACTION}>
              Cancel
            </button>
            <button
              type="button"
              onClick={save}
              disabled={!canSave}
              className="cta-gradient inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold text-secondary shadow-md shadow-primary/20 transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Armchair aria-hidden="true" className="size-4" />
              {isSaving ? "Changing..." : "Change seat"}
            </button>
          </div>
        </>
      }
    >
      {loadError ? (
        <p role="alert" className="rounded-xl bg-primary/6 px-4 py-3 text-sm text-primary">
          {readApiError(loadError).message}
        </p>
      ) : !data ? (
        <div aria-busy="true" aria-label="Loading seats" className="h-48 animate-pulse rounded-xl bg-tertiary/5" />
      ) : (
        <>
          <div className="flex items-center gap-3 rounded-2xl bg-tertiary/4 p-3">
            <SeatTile caption="Now" label={fromSeat?.label ?? null} muted={!fromSeat} />
            <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-secondary text-primary shadow-sm">
              <ArrowRight aria-hidden="true" className="size-4" />
            </span>
            <SeatTile caption="New seat" label={toSeat?.label ?? null} muted={!toSeat} />
          </div>

          <p className="flex items-start gap-2 text-sm text-tertiary/70">
            <CalendarClock aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-tertiary/45" />
            {movesLabel(record, data)}
          </p>

          {seats.length > 1 && (
            <div>
              <SelectField
                label="Seat to replace"
                value={fromSeat?.id ?? ""}
                onChange={(value) => {
                  setPickedFrom(value);
                  setPickedTo("");
                  clearErrors();
                }}
                placeholder="Pick a seat"
                options={seats.map((seat) => ({
                  value: seat.id,
                  label: seat.holder ? `${seat.label} (${seat.holder})` : seat.label,
                  note: SEAT_TYPE_LABELS[seat.type as SeatType],
                }))}
                required
              />
              {fields.fromSeatId && <p className="mt-1.5 text-xs text-primary">{fields.fromSeatId}</p>}
            </div>
          )}

          {hasNoChoice && fromSeat ? (
            <div className="flex items-center gap-3 rounded-xl border border-tertiary/10 bg-surface px-4 py-4">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-secondary text-tertiary/50 shadow-sm">
                <SearchX aria-hidden="true" className="size-4" />
              </span>
              <p className="text-sm text-tertiary/70">No other {typeName(fromSeat.type)} is free for this period.</p>
            </div>
          ) : (
            <div>
              <SelectField
                label="New seat"
                value={toSeat?.id ?? ""}
                onChange={(value) => {
                  setPickedTo(value);
                  clearErrors();
                }}
                placeholder={fromSeat ? "Pick a free seat" : "Pick the seat to replace first"}
                options={choices.map((option) => ({ value: option.id, label: option.label }))}
                required
              />
              {fields.toSeatId && <p className="mt-1.5 text-xs text-primary">{fields.toSeatId}</p>}
            </div>
          )}

          <div>
            <label htmlFor={`seat-note-${recordRef}`} className="text-sm font-medium text-tertiary">
              Message to the customer (optional)
            </label>
            <textarea
              id={`seat-note-${recordRef}`}
              value={note}
              maxLength={MAX_NOTE}
              rows={3}
              onChange={(event) => {
                setNote(event.target.value);
                clearErrors();
              }}
              placeholder="Why the seat changed, or where to find it"
              className="mt-2 w-full resize-none rounded-lg border border-tertiary/15 bg-secondary px-3 py-2.5 text-sm text-tertiary outline-none transition-colors hover:border-tertiary/30 focus-visible:border-primary"
            />
            <div className="mt-1 flex justify-between gap-3 text-xs">
              <span className="text-primary">{fields.note}</span>
              <span className="text-tertiary/45">
                {note.length}/{MAX_NOTE}
              </span>
            </div>
          </div>
        </>
      )}
    </StaffModal>
  );
};

export default ChangeSeatModal;
