import { Types } from "mongoose";
import type { SeatType } from "../constants/catalogue";
import { AppError } from "../middlewares/error.middleware";
import { SeatMap, Venue, type SeatMapDoc, type VenueDoc } from "../models";
import type { CreateSeatMapInput } from "../validators/catalogue";

export type SeatMapSummary = {
  id: string;
  name: string;
  image: string;
  seatCount: number;
  countsByType: Record<SeatType, number>;
  venue: { slug: string; name: string } | null;
};

const countsByType = (map: SeatMapDoc) => {
  const counts: Record<SeatType, number> = { desk: 0, "private-cabin": 0, office: 0, "meeting-room": 0 };
  for (const seat of map.seats) counts[seat.type] += 1;
  return counts;
};

const summarise = (map: SeatMapDoc, venue: Pick<VenueDoc, "slug" | "name"> | undefined): SeatMapSummary => ({
  id: map._id.toString(),
  name: map.name,
  image: map.image,
  seatCount: map.seats.length,
  countsByType: countsByType(map),
  venue: venue ? { slug: venue.slug, name: venue.name } : null,
});

export const listSeatMaps = async (status: "free" | "assigned" | "all") => {
  const filter =
    status === "free" ? { venueId: null } : status === "assigned" ? { venueId: { $ne: null } } : {};
  const maps = await SeatMap.find(filter).sort({ name: 1 }).lean<SeatMapDoc[]>();
  const venueIds = maps.flatMap((map) => (map.venueId ? [map.venueId] : []));
  const venues = await Venue.find({ _id: { $in: venueIds } }, { slug: 1, name: 1 }).lean<VenueDoc[]>();
  const byId = new Map(venues.map((venue) => [venue._id.toString(), venue]));
  return maps.map((map) => summarise(map, map.venueId ? byId.get(map.venueId.toString()) : undefined));
};

export const getSeatMap = async (id: string) => {
  const map = Types.ObjectId.isValid(id) ? await SeatMap.findById(id).lean<SeatMapDoc>() : null;
  if (!map) throw new AppError("That seat map no longer exists.", 404, "SEAT_MAP_NOT_FOUND");
  return { ...summarise(map, undefined), seats: map.seats };
};

export const createSeatMap = async (input: CreateSeatMapInput) => {
  if (await SeatMap.exists({ name: input.name })) {
    throw new AppError("A map with that name already exists.", 409, "SEAT_MAP_NAME_TAKEN");
  }
  const map = await SeatMap.create(input);
  return summarise(map.toObject(), undefined);
};
