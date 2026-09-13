"use client";

import { DEMO_FLOOR_PLAN } from "@/data/floorPlan";
import { SEAT_TYPE_LABELS, type Seat, type SeatType } from "@/types/seat";
import { cn } from "@/utils";
import { isRoom, roomFits } from "../seatRules";

type SeatMapProps = {
  selectedSeats: string[];
  requiredSeats: number;
  spaceType: SeatType;
  onToggleSeat: (seat: Seat) => void;
};

const LEGEND = [
  { label: "Available", className: "bg-green-500" },
  { label: "Selected", className: "bg-orange-500" },
  { label: "Unavailable", className: "bg-tertiary/30" },
];

const SeatMap = ({
  selectedSeats,
  requiredSeats,
  spaceType,
  onToggleSeat,
}: SeatMapProps) => {
  const { seats, image } = DEMO_FLOOR_PLAN;

  const isChosenType = (seat: Seat) => seat.type === spaceType;

  const isDeskBooking = spaceType === "desk";
  const hasRoomSelected = !isDeskBooking && selectedSeats.length > 0;
  const deskCapReached = selectedSeats.length >= requiredSeats;

  const disabledReason = (seat: Seat, isSelected: boolean) => {
    if (isSelected) return null;
    if (!isChosenType(seat))
      return `You are booking a ${SEAT_TYPE_LABELS[spaceType].toLowerCase()}`;
    if (!seat.available) return "Unavailable";
    if (isRoom(seat) && !roomFits(seat, requiredSeats))
      return `Seats ${seat.capacity}, you need ${requiredSeats}`;
    if (isDeskBooking && deskCapReached)
      return `You have picked ${requiredSeats} of ${requiredSeats} desks`;
    return null;
  };

  const seatClass = (seat: Seat, isSelected: boolean, blocked: boolean) => {
    if (isSelected) return "border-orange-600 bg-orange-500/60";
    if (!seat.available) return "border-tertiary/30 bg-tertiary/25";
    if (!isChosenType(seat)) return "border-transparent bg-transparent";
    if (blocked) return "border-tertiary/25 bg-tertiary/10";
    return "border-green-600 bg-green-500/45 hover:bg-green-500/65";
  };

  return (
    <div className="rounded-2xl border border-tertiary/10 bg-secondary p-5 lg:p-6">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <ul className="flex flex-wrap items-center gap-x-5 gap-y-2">
          {LEGEND.map((item) => (
            <li
              key={item.label}
              className="flex items-center gap-2 text-xs text-tertiary/65"
            >
              <span
                aria-hidden="true"
                className={cn("size-2.5 rounded-full", item.className)}
              />
              {item.label}
            </li>
          ))}
        </ul>

        <p className="text-xs font-medium text-tertiary/70">
          {isDeskBooking
            ? `${selectedSeats.length} of ${requiredSeats} desk${requiredSeats === 1 ? "" : "s"} selected`
            : hasRoomSelected
              ? "Selected"
              : "Pick one"}
        </p>
      </div>

      <p className="mb-3 text-xs text-tertiary/55">
        {isDeskBooking
          ? `Pick ${requiredSeats} desk${requiredSeats === 1 ? "" : "s"} on the plan.`
          : `Pick one ${SEAT_TYPE_LABELS[spaceType].toLowerCase()} that seats ${requiredSeats} or more.`}
      </p>

      <div className="relative overflow-hidden rounded-xl border border-tertiary/10">
        {/* Plain img so the plan and its seat boxes share one coordinate
            space; percentages position every seat against it. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={image}
          alt="Floor plan"
          className="w-full select-none"
          draggable={false}
        />

        {seats.map((seat) => {
          const isSelected = selectedSeats.includes(seat.id);
          const reason = disabledReason(seat, isSelected);

          return (
            <button
              key={seat.id}
              type="button"
              // Selected seats stay clickable so they can always be undone.
              disabled={Boolean(reason)}
              onClick={() => onToggleSeat(seat)}
              aria-pressed={isSelected}
              title={
                reason
                  ? `${seat.label}: ${reason}`
                  : `${seat.label}${seat.capacity ? ` (seats ${seat.capacity})` : ""}`
              }
              style={{
                left: `${seat.x}%`,
                top: `${seat.y}%`,
                width: `${seat.width}%`,
                height: `${seat.height}%`,
              }}
              className={cn(
                "absolute rounded border-2 transition-colors",
                seatClass(seat, isSelected, Boolean(reason)),
                reason && "cursor-not-allowed",
              )}
            >
              <span className="sr-only">{seat.label}</span>
            </button>
          );
        })}
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-primary/30 px-4 py-2.5">
        <span className="text-sm font-medium text-tertiary">Selected Seat</span>
        <span className="text-sm text-tertiary/70">
          {selectedSeats.length === 0
            ? "None yet"
            : selectedSeats
                .map((id) => seats.find((seat) => seat.id === id)?.label ?? id)
                .join(", ")}
        </span>
      </div>
    </div>
  );
};

export default SeatMap;
