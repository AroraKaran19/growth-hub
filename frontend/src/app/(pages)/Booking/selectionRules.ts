import { HALF_DAY_HOURS, MAX_SEATS, isOpenDay } from "@/data/bookingOptions";
import { isMembershipType, type BookingSelection, type BookingType, type PassType } from "@/types/booking";
import type { VenuePlan } from "@/types/membership";
import { SEAT_TYPE_LABELS, type SeatType } from "@/types/seat";
import type { VenueDetail } from "@/types/venue";
import { KEY_FROM_LENGTH, LENGTH_FROM_KEY, isTimeSlotPlan, pricedLengths } from "@/utils/plans";
import { toMinutes, toMinutes24 } from "@/utils/time";
import { hoursOn, isOpenOn, sharedHours, type OpeningHours } from "@/utils/venueHours";
import { isOffered, type PricedVenue } from "./pricing";

type FittingVenue = Pick<VenueDetail, "startingPrice" | "halfDayPrice" | "dayPassPrice" | "hours" | "addons" | "seatMap">;

type OfferingVenue = PricedVenue & Pick<VenueDetail, "seatMap">;

const SPACE_TYPES = Object.keys(SEAT_TYPE_LABELS) as SeatType[];

/** Spaces on the venue's plan that it sells this pass for. */
export const spaceTypesFor = (venue: OfferingVenue, bookingType: BookingType): SeatType[] => {
  const mapped = venue.seatMap ? new Set(venue.seatMap.seats.map((seat) => seat.type)) : null;
  return SPACE_TYPES.filter((type) => (!mapped || mapped.has(type)) && isOffered(venue, bookingType));
};

const FALLBACK_ORDER: PassType[] = ["full-day", "half-day", "hourly"];

/** The first pass the venue sells on its map, for when a saved choice no longer fits. */
export const firstOfferedType = (venue: OfferingVenue): PassType =>
  FALLBACK_ORDER.find((type) => spaceTypesFor(venue, type).length > 0) ?? "full-day";

/** How long a pass with a start time runs, in minutes. Null for whole-day types. */
export const durationMinutesFor = (selection: Pick<BookingSelection, "bookingType" | "hours">) => {
  if (selection.bookingType === "hourly") return selection.hours * 60;
  if (selection.bookingType === "half-day") return HALF_DAY_HOURS * 60;
  return null;
};

/** The length today must still fit: the pass or room slot, null for a whole day. */
export const saleMinutesFor = (
  selection: Pick<BookingSelection, "bookingType" | "hours">,
  plan: Pick<VenuePlan, "roomMode" | "slotHours"> | null,
) => {
  if (!plan) return durationMinutesFor(selection);
  return isTimeSlotPlan(plan) ? (plan.slotHours ?? 0) * 60 : null;
};

/** A start that runs past closing on the day it is for no longer fits; no hours means nothing fits. */
const fitsHours = (time: string, duration: number, hours: OpeningHours | null) => {
  const start = toMinutes(time);
  if (start === null) return true;
  const opens = hours ? toMinutes24(hours.opensAt) : null;
  const closes = hours ? toMinutes24(hours.closesAt) : null;
  if (opens === null || closes === null) return false;
  return start >= opens && start + duration <= closes;
};

const startFits = (selection: BookingSelection, venue: FittingVenue) => {
  const duration = durationMinutesFor(selection);
  return duration === null || fitsHours(selection.time, duration, hoursOn(venue.hours, selection.date));
};

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

const holdersFor = (holders: Record<string, string>, seatIds: string[]) =>
  Object.fromEntries(Object.entries(holders).filter(([seatId]) => seatIds.includes(seatId)));

/** Most people one purchase of this plan covers: desk seats up to its cap, a room's head count. */
export const maxPeopleFor = (plan: Pick<VenuePlan, "space" | "maxSeats">) =>
  plan.space === "desk" ? Math.max(1, plan.maxSeats) : MAX_SEATS;

/** Starts the plan on its first priced length with the plan's space, keeping a date it still covers. */
export const choosePlan = (selection: BookingSelection, plan: VenuePlan, venue: FittingVenue): BookingSelection => {
  const length = pricedLengths(plan)[0];
  return fitSelectionToPlan(
    {
      ...selection,
      planId: plan.id,
      bookingType: LENGTH_FROM_KEY[length ?? "monthly"],
      spaceType: plan.space,
      seatIds: selection.planId === plan.id ? selection.seatIds : [],
      holders: selection.planId === plan.id ? selection.holders : {},
      time: selection.planId === plan.id ? selection.time : "",
    },
    plan,
    venue,
  );
};

/** Drops anything the plan no longer allows; same object when all fits. */
export const fitSelectionToPlan = (selection: BookingSelection, plan: VenuePlan, venue: FittingVenue): BookingSelection => {
  const lengths = pricedLengths(plan);
  const current = isMembershipType(selection.bookingType) ? KEY_FROM_LENGTH[selection.bookingType] : null;
  const bookingType = current && lengths.includes(current) ? selection.bookingType : LENGTH_FROM_KEY[lengths[0] ?? "monthly"];
  const spaceType: SeatType = plan.space;
  const seats = clamp(selection.seats, 1, maxPeopleFor(plan));

  const mapSeats = venue.seatMap?.seats ?? [];
  const picks = plan.space === "desk" ? seats : 1;
  const seatIds = selection.seatIds
    .filter((id) => mapSeats.some((seat) => seat.id === id && seat.type === spaceType))
    .slice(0, picks);
  const holders = plan.space === "desk" ? holdersFor(selection.holders, seatIds) : {};

  const date = selection.date && !isOpenDay(plan.days, selection.date) ? "" : selection.date;
  const time =
    date && isTimeSlotPlan(plan) && fitsHours(selection.time, (plan.slotHours ?? 0) * 60, sharedHours(venue.hours, plan.days))
      ? selection.time
      : "";

  const unchanged =
    bookingType === selection.bookingType &&
    spaceType === selection.spaceType &&
    seats === selection.seats &&
    seatIds.length === selection.seatIds.length &&
    Object.keys(holders).length === Object.keys(selection.holders).length &&
    date === selection.date &&
    time === selection.time;

  return unchanged ? selection : { ...selection, bookingType, spaceType, seats, seatIds, holders, date, time };
};

/** Drops choices the venue no longer offers; a saved plan waits for the plan list. */
export const fitSelectionToVenue = (
  selection: BookingSelection,
  venue: FittingVenue,
  plans: VenuePlan[] | undefined,
): BookingSelection => {
  if (selection.planId || isMembershipType(selection.bookingType)) {
    if (!plans) return selection;
    const plan = plans.find((item) => item.id === selection.planId);
    if (plan) return fitSelectionToPlan(selection, plan, venue);
    // The plan is gone or the progress predates plans: start over on a pass.
    return fitSelectionToVenue(
      { ...selection, planId: "", holders: {}, seatIds: [], time: "", bookingType: firstOfferedType(venue) },
      venue,
      plans,
    );
  }

  // A saved choice the venue no longer prices starts over on something it sells, never a pricier space.
  const offeredSpaces = spaceTypesFor(venue, selection.bookingType);
  const bookingType = offeredSpaces.length ? selection.bookingType : firstOfferedType(venue);

  const spaces = spaceTypesFor(venue, bookingType);
  const spaceType = spaces.length && !spaces.includes(selection.spaceType) ? spaces[0] : selection.spaceType;

  const offered = new Set(venue.addons.map((addon) => addon.key));
  const addOns = selection.addOns.filter((key) => offered.has(key));

  const seats = venue.seatMap?.seats ?? [];
  const seatIds = selection.seatIds.filter((id) => seats.some((seat) => seat.id === id && seat.type === spaceType));

  const date = selection.date && !isOpenOn(venue.hours, selection.date) ? "" : selection.date;
  const time = !date || !startFits({ ...selection, bookingType }, venue) ? "" : selection.time;
  const hasHolders = Object.keys(selection.holders).length > 0;

  const unchanged =
    bookingType === selection.bookingType &&
    spaceType === selection.spaceType &&
    addOns.length === selection.addOns.length &&
    seatIds.length === selection.seatIds.length &&
    date === selection.date &&
    time === selection.time &&
    !hasHolders;

  return unchanged ? selection : { ...selection, bookingType, spaceType, addOns, seatIds, date, time, holders: {} };
};
