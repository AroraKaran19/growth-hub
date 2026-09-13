import { HALF_DAY_HOURS } from "@/data/bookingOptions";
import { DEMO_FLOOR_PLAN } from "@/data/floorPlan";
import {
  MEMBERSHIP_LENGTH_DETAILS,
  MEMBERSHIP_SPACES,
  allowancesFor,
  isMembershipSpace,
} from "@/data/membershipPlans";
import {
  isMembershipType,
  type BookingSelection,
  type BookingType,
} from "@/types/booking";
import type { MemberBooking } from "@/types/memberBooking";
import type { MemberMembership } from "@/types/membership";
import type { SeatType } from "@/types/seat";
import type { Venue } from "@/types/venue";
import { formatMonthDay } from "@/utils/date";
import { timeRange } from "@/utils/time";
import { addCycle } from "../Account/membershipCycle";
import type { BookingQuote } from "./pricing";

export const BOOKING_SPACE_LABELS: Record<SeatType, string> = {
  desk: "Open Desk",
  "private-cabin": "Private Cabin",
  office: "Office Space",
  "meeting-room": "Meeting Room",
};

/** Only hourly and half-day passes pick a start; the rest follow the venue's
 *  opening hours. */
export const needsStartTime = (type: BookingType) =>
  type === "hourly" || type === "half-day";

export const seatLabelsFor = (seatIds: string[]) =>
  seatIds.map(
    (id) => DEMO_FLOOR_PLAN.seats.find((seat) => seat.id === id)?.label ?? id,
  );

/** Seats held by the member's live plans at this venue, as floor plan ids. */
export const reservedSeatIdsFor = (
  memberships: MemberMembership[],
  venueSlug: string,
) => {
  const labels = memberships
    .filter((item) => item.venueSlug === venueSlug && item.status !== "expired")
    .flatMap((item) => item.seats);

  return DEMO_FLOOR_PLAN.seats
    .filter((seat) => labels.includes(seat.label) || labels.includes(seat.id))
    .map((seat) => seat.id);
};

export const bookingTimeFor = (venue: Venue, selection: BookingSelection) => {
  switch (selection.bookingType) {
    case "hourly":
      return timeRange(selection.time, selection.hours * 60);
    case "half-day":
      return timeRange(selection.time, HALF_DAY_HOURS * 60);
    default:
      return venue.openHours;
  }
};

/** Allowances and renewal for a membership being bought, before it exists. */
export const membershipPreview = (
  selection: BookingSelection,
  units: number,
) => {
  if (
    !isMembershipType(selection.bookingType) ||
    !isMembershipSpace(selection.spaceType)
  ) {
    return null;
  }

  const length = MEMBERSHIP_LENGTH_DETAILS[selection.bookingType];
  const allowances = allowancesFor(selection.spaceType, selection.bookingType);

  return {
    plan: length.plan,
    unit: length.unit,
    workspace: MEMBERSHIP_SPACES[selection.spaceType].workspace,
    renewsOn: selection.date ? addCycle(selection.date, length.unit) : "",
    meetingRoomHours: allowances.meetingRoomHours * units,
    guestPasses: allowances.guestPasses * units,
  };
};

export const buildBooking = (
  venue: Venue,
  selection: BookingSelection,
  bookingId: string,
  total: number,
): MemberBooking => ({
  id: bookingId,
  bookingId,
  venueName: venue.name,
  venueSlug: venue.slug,
  locality: venue.locality,
  city: venue.city,
  image: venue.image,
  status: "upcoming",
  startDate: selection.date,
  endDate: selection.date,
  dateRange: formatMonthDay(selection.date),
  time: bookingTimeFor(venue, selection),
  type: BOOKING_SPACE_LABELS[selection.spaceType],
  seats: seatLabelsFor(selection.seatIds),
  total,
});

export const buildMembership = (
  venue: Venue,
  selection: BookingSelection,
  quote: BookingQuote,
  id: string,
): MemberMembership | null => {
  const preview = membershipPreview(selection, quote.units);
  if (!preview) return null;

  return {
    id,
    venueName: venue.name,
    venueSlug: venue.slug,
    locality: venue.locality,
    city: venue.city,
    image: venue.image,
    plan: preview.plan,
    workspace: preview.workspace,
    seats: seatLabelsFor(selection.seatIds),
    status: "active",
    price: quote.subtotal,
    priceUnit: preview.unit,
    autoRenew: true,
    startedOn: selection.date,
    cycleStart: selection.date,
    cycleEnd: preview.renewsOn,
    meetingRoomHours: { used: 0, included: preview.meetingRoomHours },
    guestPasses: { used: 0, included: preview.guestPasses },
  };
};
