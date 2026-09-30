import { HALF_DAY_HOURS, isOpenDay } from "@/data/bookingOptions";
import { isMembershipType, type BookingSelection, type BookingType } from "@/types/booking";
import { SEAT_TYPE_LABELS, type SeatType } from "@/types/seat";
import type { VenueDetail } from "@/types/venue";
import { toMinutes, toMinutes24 } from "@/utils/time";
import { isOffered } from "./pricing";

type FittingVenue = Pick<
  VenueDetail,
  "startingPrice" | "dayPassPrice" | "membershipPrices" | "openDays" | "opensAt" | "closesAt" | "addons" | "seatMap"
>;

const SPACE_TYPES = Object.keys(SEAT_TYPE_LABELS) as SeatType[];

/** Spaces on the venue's plan that it sells this pass or plan for. */
export const spaceTypesFor = (
  venue: Pick<FittingVenue, "startingPrice" | "dayPassPrice" | "membershipPrices" | "seatMap">,
  bookingType: BookingType,
): SeatType[] => {
  const mapped = venue.seatMap ? new Set(venue.seatMap.seats.map((seat) => seat.type)) : null;
  return SPACE_TYPES.filter((type) => (!mapped || mapped.has(type)) && isOffered(venue, type, bookingType));
};

/** How long a pass with a start time runs, in minutes. Null for whole-day types. */
export const durationMinutesFor = (selection: Pick<BookingSelection, "bookingType" | "hours">) => {
  if (selection.bookingType === "hourly") return selection.hours * 60;
  if (selection.bookingType === "half-day") return HALF_DAY_HOURS * 60;
  return null;
};

const startFits = (selection: BookingSelection, venue: FittingVenue) => {
  const duration = durationMinutesFor(selection);
  const start = toMinutes(selection.time);
  const opens = toMinutes24(venue.opensAt);
  const closes = toMinutes24(venue.closesAt);
  if (duration === null || start === null || opens === null || closes === null) return true;
  return start >= opens && start + duration <= closes;
};

/** Drops saved choices the venue no longer offers; same object when all fits. */
export const fitSelectionToVenue = (selection: BookingSelection, venue: FittingVenue): BookingSelection => {
  // A saved plan length the space is no longer priced for starts over as a day pass, never a pricier space.
  const offeredSpaces = spaceTypesFor(venue, selection.bookingType);
  const lengthFits = !isMembershipType(selection.bookingType) || offeredSpaces.includes(selection.spaceType);
  const bookingType = offeredSpaces.length && lengthFits ? selection.bookingType : "full-day";

  const spaces = spaceTypesFor(venue, bookingType);
  const spaceType = spaces.length && !spaces.includes(selection.spaceType) ? spaces[0] : selection.spaceType;

  const offered = new Set(venue.addons.map((addon) => addon.key));
  const addOns = selection.addOns.filter((key) => offered.has(key));

  const seats = venue.seatMap?.seats ?? [];
  const seatIds = selection.seatIds.filter((id) => seats.some((seat) => seat.id === id && seat.type === spaceType));

  const date = selection.date && !isOpenDay(venue.openDays, selection.date) ? "" : selection.date;
  const time = !date || !startFits({ ...selection, bookingType }, venue) ? "" : selection.time;

  const unchanged =
    bookingType === selection.bookingType &&
    spaceType === selection.spaceType &&
    addOns.length === selection.addOns.length &&
    seatIds.length === selection.seatIds.length &&
    date === selection.date &&
    time === selection.time;

  return unchanged ? selection : { ...selection, bookingType, spaceType, addOns, seatIds, date, time };
};
