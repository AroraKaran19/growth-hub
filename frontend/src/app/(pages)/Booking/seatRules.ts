import type { Seat } from "@/types/seat";
import type { BookingSelection } from "@/types/booking";

export const isRoom = (seat: Seat) => seat.type !== "desk";

/** A room takes the whole party, so it has to be big enough for them. */
export const roomFits = (seat: Seat, people: number) =>
  (seat.capacity ?? 0) >= people;

/**
 * The kind of space is chosen on the previous screen, so the map only ever
 * offers one type: desks are picked up to the seat count, a room is one pick.
 */
export const toggleSeatSelection = (
  selection: BookingSelection,
  seat: Seat,
): BookingSelection => {
  if (seat.type !== selection.spaceType) return selection;

  if (selection.seatIds.includes(seat.id)) {
    return {
      ...selection,
      seatIds: selection.seatIds.filter((id) => id !== seat.id),
    };
  }

  if (isRoom(seat)) {
    if (!roomFits(seat, selection.seats)) return selection;
    return { ...selection, seatIds: [seat.id] };
  }

  if (selection.seatIds.length >= selection.seats) return selection;

  return { ...selection, seatIds: [...selection.seatIds, seat.id] };
};

/** Selections made before the space type changed no longer apply. */
export const clearSeatsIfTypeChanged = (
  selection: BookingSelection,
  seats: Seat[],
): BookingSelection => {
  const stillValid = selection.seatIds.filter((id) => {
    const seat = seats.find((item) => item.id === id);
    return seat?.type === selection.spaceType;
  });

  return stillValid.length === selection.seatIds.length
    ? selection
    : { ...selection, seatIds: stillValid };
};
