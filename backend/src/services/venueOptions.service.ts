import { AppError } from "../middlewares/error.middleware";
import { Venue, type VenueDoc } from "../models";
import { escapeRegex } from "../utils/regex";

export const VENUE_OPTIONS_PAGE = 20;

type OptionDoc = Pick<VenueDoc, "slug" | "name" | "locality" | "city" | "published">;

const FIELDS = { _id: 0, slug: 1, name: 1, locality: 1, city: 1, published: 1 };

const toOption = ({ slug, name, locality, city, published }: OptionDoc) => ({ slug, name, locality, city, published });

/** One page of venues for pickers, by name, matching name or locality. */
export const listVenueOptions = async (q: string, page: number) => {
  const text = q.trim().slice(0, 80);
  const pattern = { $regex: escapeRegex(text), $options: "i" };
  const filter = text ? { $or: [{ name: pattern }, { locality: pattern }] } : {};
  // One extra row tells whether another page exists.
  const rows = await Venue.find(filter, FIELDS)
    .sort({ name: 1, slug: 1 })
    .skip((page - 1) * VENUE_OPTIONS_PAGE)
    .limit(VENUE_OPTIONS_PAGE + 1)
    .lean<OptionDoc[]>();
  return { venues: rows.slice(0, VENUE_OPTIONS_PAGE).map(toOption), hasMore: rows.length > VENUE_OPTIONS_PAGE };
};

export const getVenueOption = async (slug: string) => {
  const venue = await Venue.findOne({ slug }, FIELDS).lean<OptionDoc>();
  if (!venue) throw new AppError("That venue doesn't exist.", 404, "VENUE_NOT_FOUND");
  return toOption(venue);
};
