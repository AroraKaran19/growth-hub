"use client";

import { useState } from "react";
import { usePartnerDesk } from "@/stores/partner";
import { SEAT_TYPE_LABELS, type Seat } from "@/types/seat";
import { cn } from "@/utils";
import { formatDay } from "@/utils/date";
import {
  BookingStatusBadge,
  CHECK_IN_BUTTON,
  PARTNER_CARD,
  PartnerPageHeader,
  PartnerSkeleton,
} from "./components/PartnerUi";
import { SEAT_STATUS_META, seatStatesFor, type SeatStatus } from "./seatStatus";

const SECONDARY_BUTTON =
  "inline-flex w-full items-center justify-center rounded-lg border border-tertiary/20 px-4 py-2.5 text-sm font-medium text-tertiary transition-colors hover:bg-tertiary/5";

const PartnerSeatsPage = () => {
  const desk = usePartnerDesk();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  if (!desk.isReady) return <PartnerSkeleton />;

  const { seatMap } = desk.venue;
  if (!seatMap) {
    return (
      <>
        <PartnerPageHeader
          title="Seats"
          description="Live view of the floor."
        />
        <div className={`${PARTNER_CARD} mt-6 px-6 py-14 text-center`}>
          <p className="text-base font-semibold text-tertiary">
            Your venue has no seat plan yet
          </p>
          <p className="mx-auto mt-2 max-w-sm text-sm text-tertiary/60">
            Growth Hub assigns the plan. Contact us and we will set it up.
          </p>
        </div>
      </>
    );
  }

  const { image } = seatMap;
  const { seats } = desk;
  const states = seatStatesFor(seats, desk);
  const selected: Seat | undefined = seats.find((seat) => seat.id === selectedId);
  const selectedState = selected ? states[selected.id] : null;

  const counts = Object.values(states).reduce(
    (total, state) => ({ ...total, [state.status]: (total[state.status] ?? 0) + 1 }),
    {} as Partial<Record<SeatStatus, number>>,
  );

  return (
    <>
      <PartnerPageHeader
        title="Seats"
        description="Live view of the floor. Select a seat to check someone in or mark a walk-in."
      />

      <ul className="mt-6 flex flex-wrap gap-x-5 gap-y-2">
        {(Object.keys(SEAT_STATUS_META) as SeatStatus[]).map((status) => (
          <li key={status} className="flex items-center gap-2 text-sm text-tertiary/70">
            <span aria-hidden="true" className={cn("size-2.5 rounded-full", SEAT_STATUS_META[status].swatch)} />
            {SEAT_STATUS_META[status].label}
            <span className="font-semibold text-tertiary">{counts[status] ?? 0}</span>
          </li>
        ))}
      </ul>

      <div className="mt-5 grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className={`${PARTNER_CARD} p-4 sm:p-5`}>
          <div className="relative overflow-hidden rounded-xl border border-tertiary/10">
            {/* Plain img so the plan and its seat boxes share one coordinate
                space; percentages position every seat against it. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={image} alt="Floor plan" className="w-full select-none" draggable={false} />

            {seats.map((seat) => {
              const state = states[seat.id];
              const isSelected = seat.id === selectedId;
              return (
                <button
                  key={seat.id}
                  type="button"
                  onClick={() => setSelectedId(seat.id)}
                  aria-pressed={isSelected}
                  title={`${seat.label}: ${SEAT_STATUS_META[state.status].label}`}
                  style={{
                    left: `${seat.x}%`,
                    top: `${seat.y}%`,
                    width: `${seat.width}%`,
                    height: `${seat.height}%`,
                  }}
                  className={cn(
                    "absolute rounded border-2 transition-colors",
                    SEAT_STATUS_META[state.status].box,
                    isSelected && "ring-2 ring-tertiary ring-offset-1",
                  )}
                >
                  <span className="sr-only">
                    {seat.label}, {SEAT_STATUS_META[state.status].label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <aside className={`${PARTNER_CARD} h-fit p-5`} aria-live="polite">
          {!selected || !selectedState ? (
            <div className="py-8 text-center">
              <p className="text-sm font-semibold text-tertiary">No seat selected</p>
              <p className="mt-1 text-sm text-tertiary/60">
                Select any seat or room on the plan.
              </p>
            </div>
          ) : (
            <>
              <p className="text-xs font-semibold uppercase tracking-wider text-tertiary/50">
                {SEAT_TYPE_LABELS[selected.type]}
                {selected.capacity && `, seats ${selected.capacity}`}
              </p>
              <h2 className="mt-1 text-xl font-bold text-tertiary">{selected.label}</h2>
              <p className="mt-2 inline-flex items-center gap-2 text-sm text-tertiary/70">
                <span
                  aria-hidden="true"
                  className={cn("size-2.5 rounded-full", SEAT_STATUS_META[selectedState.status].swatch)}
                />
                {SEAT_STATUS_META[selectedState.status].label}
              </p>

              {selectedState.booking && (
                <dl className="mt-5 flex flex-col gap-2.5 border-t border-tertiary/10 pt-4 text-sm">
                  <div className="flex justify-between gap-3">
                    <dt className="text-tertiary/55">Member</dt>
                    <dd className="font-medium text-tertiary">{selectedState.booking.memberName}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-tertiary/55">Time</dt>
                    <dd className="text-right text-tertiary">{selectedState.booking.time}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-tertiary/55">Booking</dt>
                    <dd className="font-mono text-tertiary">{selectedState.booking.bookingId}</dd>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <dt className="text-tertiary/55">Status</dt>
                    <dd><BookingStatusBadge status={selectedState.booking.status} /></dd>
                  </div>
                </dl>
              )}

              {selectedState.member && (
                <dl className="mt-5 flex flex-col gap-2.5 border-t border-tertiary/10 pt-4 text-sm">
                  <div className="flex justify-between gap-3">
                    <dt className="text-tertiary/55">Member</dt>
                    <dd className="font-medium text-tertiary">{selectedState.member.memberName}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-tertiary/55">Plan</dt>
                    <dd className="text-right text-tertiary">
                      {selectedState.member.plan} {selectedState.member.workspace}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-tertiary/55">
                      {selectedState.member.renewsOn ? "Renews" : "Ends"}
                    </dt>
                    <dd className="text-tertiary">
                      {formatDay(selectedState.member.renewsOn ?? selectedState.member.paidThrough)}
                    </dd>
                  </div>
                </dl>
              )}

              <div className="mt-5 flex flex-col gap-2">
                {selectedState.status === "booked" && selectedState.booking && (
                  <button
                    type="button"
                    onClick={() => void desk.quickCheckIn(selectedState.booking!.bookingId)}
                    className={cn(CHECK_IN_BUTTON, "w-full py-2.5")}
                  >
                    Check in {selectedState.booking.memberName}
                  </button>
                )}
                {(selectedState.status === "member" || selectedState.status === "held") &&
                  selectedState.member && (
                  <button
                    type="button"
                    onClick={() => void desk.quickCheckIn(selectedState.member!.membershipId)}
                    className={cn(CHECK_IN_BUTTON, "w-full py-2.5")}
                  >
                    Check in {selectedState.member.memberName}
                  </button>
                )}
                {selectedState.status === "available" && (
                  <button
                    type="button"
                    onClick={() => desk.toggleWalkIn(selected.id)}
                    className={cn(CHECK_IN_BUTTON, "w-full py-2.5")}
                  >
                    Mark as taken by a walk-in
                  </button>
                )}
                {selectedState.status === "walk-in" && (
                  <button
                    type="button"
                    onClick={() => desk.toggleWalkIn(selected.id)}
                    className={SECONDARY_BUTTON}
                  >
                    Mark as free
                  </button>
                )}
                {selectedState.status === "being-booked" && (
                  <p className="rounded-lg bg-sky-500/10 px-3 py-2 text-sm text-sky-900">
                    Someone is paying for this seat right now. It frees up within two minutes if they leave.
                  </p>
                )}
                {selectedState.status === "blocked" && (
                  <p className="rounded-lg bg-tertiary/4 px-3 py-2 text-sm text-tertiary/65">
                    Out of service. Availability is managed in the admin panel.
                  </p>
                )}
                {selectedState.status === "held" && (
                  <p className="rounded-lg bg-amber-500/10 px-3 py-2 text-sm text-amber-800">
                    The last renewal failed. The seat stays theirs while Razorpay retries.
                  </p>
                )}
                {selectedState.status === "checked-in" && (
                  <p className="rounded-lg bg-blue-600/8 px-3 py-2 text-sm text-blue-800">
                    In use today.
                  </p>
                )}
              </div>
            </>
          )}
        </aside>
      </div>
    </>
  );
};

export default PartnerSeatsPage;
