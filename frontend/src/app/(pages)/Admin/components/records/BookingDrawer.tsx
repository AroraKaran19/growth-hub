"use client";

import { useMemo, useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import DateField from "@/app/components/ui/form/DateField";
import SelectField from "@/app/components/ui/form/SelectField";
import { buildTimeSlots } from "@/data/bookingOptions";
import { useAdminBooking } from "@/hooks/useStaffBookings";
import { useVenue } from "@/hooks/useVenues";
import { moveAsAdmin } from "@/libs/api/adminRecords";
import { readApiError } from "@/libs/api/errors";
import { cn } from "@/utils";
import { invoiceToLabel } from "@/utils/companyInvoice";
import { formatDay } from "@/utils/date";
import { toMinutes } from "@/utils/time";
import { hoursOn, isOpenOn } from "@/utils/venueHours";
import { BOOKING_SPACE_LABELS } from "../../../Booking/membershipBooking";
import { rupees } from "../../../Partner/requestRules";
import AdminCancelForm from "./AdminCancelForm";
import { seatCountProblem } from "./moveRules";
import RecordDrawer from "./RecordDrawer";
import RequestHistory from "./RequestHistory";

type Panel = "move" | "cancel" | null;

const Section = ({ title, open, onToggle, children }: { title: string; open: boolean; onToggle: () => void; children: ReactNode }) => (
  <section className="rounded-2xl border border-tertiary/10 bg-secondary">
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={open}
      className="flex w-full items-center justify-between px-5 py-4 text-left text-sm font-semibold text-tertiary"
    >
      {title}
      <ChevronDown aria-hidden="true" className={cn("size-4 transition-transform", open && "rotate-180")} />
    </button>
    {open && <div className="border-t border-tertiary/8 px-5 py-4">{children}</div>}
  </section>
);

/** One booking for an admin: details, move, cancel and every request. */
const BookingDrawer = ({ bookingRef, onClose, onChanged }: { bookingRef: string; onClose: () => void; onChanged: () => void }) => {
  const { booking, error, mutate } = useAdminBooking(bookingRef);
  const { venue } = useVenue(booking?.venue.slug);
  const [panel, setPanel] = useState<Panel>(null);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [picked, setPicked] = useState<string[]>([]);
  const [moveError, setMoveError] = useState<string | null>(null);
  const [isMoving, setIsMoving] = useState(false);

  const isFullDay = booking?.passType === "full-day";
  const slots = useMemo(() => {
    if (!booking || !venue || !date || isFullDay) return [];
    return buildTimeSlots(date, hoursOn(venue.hours, date), booking.endMin - booking.startMin);
  }, [booking, venue, date, isFullDay]);
  const sameKindSeats = (venue?.seatMap?.seats ?? []).filter((seat) => seat.type === booking?.spaceType);

  const refresh = async () => {
    await mutate();
    onChanged();
  };

  const move = async () => {
    if (!booking) return;
    const startMin = isFullDay ? 0 : toMinutes(time);
    if (!date) return setMoveError("Pick a date.");
    if (startMin === null) return setMoveError("Pick a start time.");
    const seatProblem = seatCountProblem(booking.spaceType, booking.people, picked);
    if (seatProblem) return setMoveError(seatProblem);
    setIsMoving(true);
    setMoveError(null);
    try {
      await moveAsAdmin(booking.ref, { date, startMin, ...(picked.length && { seatIds: picked }) });
      setPanel(null);
      setPicked([]);
      await refresh();
    } catch (caught) {
      setMoveError(readApiError(caught).message);
    } finally {
      setIsMoving(false);
    }
  };

  const canChange = booking?.status === "upcoming";

  return (
    <RecordDrawer
      title={booking ? booking.member.name : "Booking"}
      subtitle={<span className="font-mono">{bookingRef}</span>}
      badge={
        booking?.hasOpenRequest ? (
          <span className="rounded-full bg-amber-400 px-2.5 py-0.5 text-xs font-semibold text-tertiary">Cancellation requested</span>
        ) : undefined
      }
      onClose={onClose}
    >
      {!booking ? (
        error ? (
          <p className="text-sm text-primary">{readApiError(error).message}</p>
        ) : (
          <div className="h-64 animate-pulse rounded-2xl bg-secondary" />
        )
      ) : (
        <div className="flex flex-col gap-4">
          <dl className="grid grid-cols-2 gap-x-6 gap-y-4 rounded-2xl bg-secondary p-5 shadow-sm">
            <div>
              <dt className="text-xs text-tertiary/50">Venue</dt>
              <dd className="mt-1 text-sm font-medium text-tertiary">{booking.venue.name}</dd>
            </div>
            <div>
              <dt className="text-xs text-tertiary/50">Member</dt>
              <dd className="mt-1 text-sm text-tertiary">{booking.member.phone}</dd>
            </div>
            <div>
              <dt className="text-xs text-tertiary/50">When</dt>
              <dd className="mt-1 text-sm text-tertiary">
                {formatDay(booking.date)}, {booking.timeLabel}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-tertiary/50">Space</dt>
              <dd className="mt-1 text-sm text-tertiary">
                {BOOKING_SPACE_LABELS[booking.spaceType]}, {booking.seats.join(", ")}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-tertiary/50">Paid</dt>
              <dd className="mt-1 text-sm font-semibold text-tertiary">{rupees(booking.paid)}</dd>
            </div>
            <div>
              <dt className="text-xs text-tertiary/50">Status</dt>
              <dd className="mt-1 text-sm capitalize text-tertiary">{booking.status.replace("-", " ")}</dd>
            </div>
            <div className="col-span-2">
              <dt className="text-xs text-tertiary/50">Invoice to</dt>
              <dd className="mt-1 text-sm text-tertiary">{invoiceToLabel(booking.billing) ?? booking.member.name}</dd>
            </div>
          </dl>

          {canChange && !booking.hasOpenRequest && (
            <Section title="Move booking" open={panel === "move"} onToggle={() => setPanel(panel === "move" ? null : "move")}>
              <div className="flex flex-col gap-4">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <DateField label="New date" value={date} onChange={(value) => { setDate(value); setTime(""); }} required />
                  {!isFullDay && (
                    <SelectField
                      label="Start time"
                      value={time}
                      onChange={setTime}
                      placeholder={
                        !date
                          ? "Pick a date first"
                          : slots.length
                            ? "Pick a time"
                            : isOpenOn(venue?.hours, date)
                              ? "No start fits that day"
                              : "Closed that day"
                      }
                      options={slots.map((slot) => ({ value: slot.id, label: slot.label }))}
                      required
                    />
                  )}
                </div>
                {sameKindSeats.length > 0 && (
                  <fieldset>
                    <legend className="text-sm font-medium text-tertiary">
                      Seats <span className="font-normal text-tertiary/55">(leave all unpicked to keep {booking.seats.join(", ")})</span>
                    </legend>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {sameKindSeats.map((seat) => {
                        const isPicked = picked.includes(seat.id);
                        return (
                          <button
                            key={seat.id}
                            type="button"
                            aria-pressed={isPicked}
                            onClick={() => setPicked((list) => (isPicked ? list.filter((id) => id !== seat.id) : [...list, seat.id]))}
                            className={cn(
                              "rounded-lg border px-3 py-1.5 text-sm transition-colors",
                              isPicked ? "border-primary bg-primary/10 font-medium text-primary" : "border-tertiary/15 text-tertiary/75 hover:border-tertiary/35",
                            )}
                          >
                            {seat.label}
                          </button>
                        );
                      })}
                    </div>
                  </fieldset>
                )}
                {moveError && (
                  <p role="alert" className="text-sm text-primary">
                    {moveError}
                  </p>
                )}
                <button
                  type="button"
                  onClick={move}
                  disabled={isMoving}
                  className="cta-gradient self-end rounded-lg px-5 py-2.5 text-sm font-semibold text-secondary shadow-sm transition-opacity hover:opacity-90 disabled:opacity-60"
                >
                  {isMoving ? "Moving..." : "Move booking"}
                </button>
              </div>
            </Section>
          )}

          {canChange && (
            <Section title="Cancel booking" open={panel === "cancel"} onToggle={() => setPanel(panel === "cancel" ? null : "cancel")}>
              <AdminCancelForm
                kind="booking"
                recordRef={booking.ref}
                paid={booking.paid}
                hasOpenRequest={booking.hasOpenRequest}
                onDone={async () => {
                  setPanel(null);
                  await refresh();
                }}
              />
            </Section>
          )}

          <section>
            <h3 className="mb-3 text-sm font-semibold text-tertiary">Cancellation requests</h3>
            <RequestHistory requests={booking.requests} />
          </section>
        </div>
      )}
    </RecordDrawer>
  );
};

export default BookingDrawer;
