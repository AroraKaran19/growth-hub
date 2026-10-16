import type { Types } from "mongoose";
import { WORKSPACE_TYPES, type PlanSpace, type SeatType, type WorkspaceType } from "../constants/catalogue";
import { MembershipPlan, SeatMap, Venue, type SeatMapDoc, type VenueDoc } from "../models";

type Offering = { seatTypes: SeatType[]; sellsPasses: boolean; planSpaces: PlanSpace[] };

/** What a venue can actually sell: a seat type on its map, bought as a pass or on a plan on sale. */
export const deriveWorkspaceTypes = ({ seatTypes, sellsPasses, planSpaces }: Offering): WorkspaceType[] => {
  const has = (seat: SeatType) => seatTypes.includes(seat);
  const sold = (seat: SeatType) => has(seat) && (sellsPasses || planSpaces.includes(seat));
  const offered: Record<WorkspaceType, boolean> = {
    // A hot desk is a pass; a desk kept for one member is a dedicated desk.
    "hot-desk": has("desk") && sellsPasses,
    "dedicated-desk": has("desk") && planSpaces.includes("desk"),
    "private-cabin": sold("private-cabin"),
    office: sold("office"),
    "meeting-room": sold("meeting-room"),
  };
  return WORKSPACE_TYPES.filter((type) => offered[type]);
};

type PricedVenue = Pick<VenueDoc, "_id" | "startingPrice" | "halfDayPrice" | "dayPassPrice">;

const offeringOf = async (venue: PricedVenue): Promise<Offering> => {
  const [map, plans] = await Promise.all([
    SeatMap.findOne({ venueId: venue._id }, { seats: 1 }).lean<Pick<SeatMapDoc, "seats">>(),
    MembershipPlan.find({ venueId: venue._id, visible: true }, { space: 1 }).lean<{ space: PlanSpace }[]>(),
  ]);
  return {
    seatTypes: [...new Set((map?.seats ?? []).map((seat) => seat.type as SeatType))],
    sellsPasses: [venue.startingPrice, venue.halfDayPrice, venue.dayPassPrice].some((price) => price != null),
    planSpaces: plans.map((plan) => plan.space),
  };
};

const VENUE_FIELDS = { startingPrice: 1, halfDayPrice: 1, dayPassPrice: 1, workspaceTypes: 1 };

/** Recomputes after a map, price or plan change; leaves the edit version alone so open forms stay valid. */
export const refreshWorkspaceTypes = async (venueId: Types.ObjectId) => {
  const venue = await Venue.findById(venueId, VENUE_FIELDS).lean<PricedVenue & Pick<VenueDoc, "workspaceTypes">>();
  if (!venue) return;
  const types = deriveWorkspaceTypes(await offeringOf(venue));
  if (types.join() !== (venue.workspaceTypes ?? []).join()) {
    await Venue.updateOne({ _id: venueId }, { $set: { workspaceTypes: types } });
  }
};

/** Run at start-up so venues set up by hand match their maps. */
export const refreshAllWorkspaceTypes = async () => {
  const venues = await Venue.find({}, { _id: 1 }).lean<{ _id: Types.ObjectId }[]>();
  for (const venue of venues) await refreshWorkspaceTypes(venue._id);
  return venues.length;
};
