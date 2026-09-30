import type { Seat } from "@/types/seat";
import type { PartnerBooking, PartnerMember } from "@/types/partner";

export type SeatStatus =
  | "available"
  | "booked"
  | "checked-in"
  | "member"
  | "held"
  | "walk-in"
  | "being-booked"
  | "blocked";

export const SEAT_STATUS_META: Record<
  SeatStatus,
  { label: string; swatch: string; box: string }
> = {
  available: {
    label: "Free",
    swatch: "bg-green-500",
    box: "border-green-600 bg-green-500/35 hover:bg-green-500/55",
  },
  booked: {
    label: "Booked, not in yet",
    swatch: "bg-amber-500",
    box: "border-amber-600 bg-amber-500/45 hover:bg-amber-500/65",
  },
  "checked-in": {
    label: "Checked in",
    swatch: "bg-blue-600",
    box: "border-blue-700 bg-blue-600/45 hover:bg-blue-600/65",
  },
  member: {
    label: "Member seat",
    swatch: "bg-primary",
    box: "border-primary bg-primary/35 hover:bg-primary/55",
  },
  held: {
    label: "Member seat, payment failed",
    swatch: "bg-primary/40",
    box: "border-primary/50 bg-primary/15 hover:bg-primary/25",
  },
  "walk-in": {
    label: "Walk-in",
    swatch: "bg-purple-600",
    box: "border-purple-700 bg-purple-600/40 hover:bg-purple-600/60",
  },
  "being-booked": {
    label: "Being booked",
    swatch: "bg-sky-500",
    box: "border-sky-600 border-dashed bg-sky-500/25 hover:bg-sky-500/40",
  },
  blocked: {
    label: "Out of service",
    swatch: "bg-tertiary/35",
    box: "border-tertiary/35 bg-tertiary/25",
  },
};

export type SeatState = {
  status: SeatStatus;
  booking?: PartnerBooking;
  member?: PartnerMember;
};

const matchesSeat = (seat: Seat, labels: string[]) =>
  labels.includes(seat.label) || labels.includes(seat.id);

/** Who is using each seat today, most specific state first. */
export const seatStatesFor = (
  seats: Seat[],
  context: {
    today: string;
    bookings: PartnerBooking[];
    members: PartnerMember[];
    checkIns: Record<string, string>;
    walkIns: string[];
    /** Someone is on the payment page for these right now. */
    beingBooked?: string[];
  },
): Record<string, SeatState> => {
  const todays = context.bookings.filter(
    (booking) =>
      booking.date === context.today &&
      (booking.status === "upcoming" || booking.status === "checked-in"),
  );

  return Object.fromEntries(
    seats.map((seat) => {
      const booking = todays.find((item) => matchesSeat(seat, item.seats));
      const member = context.members.find(
        (item) => item.startDate <= context.today && matchesSeat(seat, item.seats),
      );

      let state: SeatState = { status: "available" };

      if (!seat.available) {
        state = { status: "blocked" };
      } else if (booking) {
        state = {
          status: booking.status === "checked-in" ? "checked-in" : "booked",
          booking,
        };
      } else if (member) {
        state = {
          status: context.checkIns[member.membershipId]
            ? "checked-in"
            : member.status === "past-due"
              ? "held"
              : "member",
          member,
        };
      } else if (context.walkIns.includes(seat.id)) {
        state = { status: "walk-in" };
      } else if (context.beingBooked?.includes(seat.id)) {
        state = { status: "being-booked" };
      }

      return [seat.id, state];
    }),
  );
};
