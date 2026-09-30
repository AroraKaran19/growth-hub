import { HALF_DAY_HOURS } from "@/data/bookingOptions";
import { MEMBERSHIP_LENGTH_DETAILS, MEMBERSHIP_SPACES, isMembershipSpace } from "@/data/membershipPlans";
import { isMembershipType, type BookingSelection, type BookingType } from "@/types/booking";
import { isLiveMembership, type ApiMembership } from "@/types/membership";
import type { Seat, SeatType } from "@/types/seat";
import type { Venue } from "@/types/venue";
import { timeRange } from "@/utils/time";
import { addCycle } from "../Account/membershipCycle";

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

export const seatLabelsFor = (seatIds: string[], seats: Seat[]) =>
  seatIds.map((id) => seats.find((seat) => seat.id === id)?.label ?? id);

/** Seats held by the member's live plans at this venue, as floor plan ids. */
export const reservedSeatIdsFor = (memberships: ApiMembership[], venueSlug: string) =>
  memberships
    .filter((item) => item.venue.slug === venueSlug && isLiveMembership(item))
    .flatMap((item) => item.seats.map((seat) => seat.id));

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

/** What a membership being bought covers, before it exists. */
export const membershipPreview = (selection: BookingSelection) => {
  if (!isMembershipType(selection.bookingType) || !isMembershipSpace(selection.spaceType)) return null;
  const length = MEMBERSHIP_LENGTH_DETAILS[selection.bookingType];
  return {
    plan: length.plan,
    unit: length.unit,
    workspace: MEMBERSHIP_SPACES[selection.spaceType].workspace,
    renewsOn: selection.date ? addCycle(selection.date, length.unit) : "",
  };
};
