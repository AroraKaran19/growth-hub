import { AppError } from "../middlewares/error.middleware";
import { openDaysOf, type DayHours } from "./venueHours";

export const toLocalityId = (locality: string) =>
  locality
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 63);

export type PublishInput = {
  hasMap: boolean;
  hasPrice: boolean;
  image: string;
  galleryCount: number;
  hours: DayHours[];
};

export const MIN_GALLERY_PHOTOS = 2;

export const publishBlocker = (venue: PublishInput): AppError | null => {
  if (!venue.hasMap) return new AppError("Assign a seat map before publishing.", 422, "MAP_REQUIRED");
  if (!venue.image) return new AppError("Add a cover photo before publishing.", 422, "COVER_REQUIRED");
  if (venue.galleryCount < MIN_GALLERY_PHOTOS) {
    return new AppError(`Add at least ${MIN_GALLERY_PHOTOS} gallery photos before publishing.`, 422, "GALLERY_REQUIRED");
  }
  if (!venue.hasPrice) return new AppError("Set at least one price before publishing.", 422, "PRICE_REQUIRED");
  if (openDaysOf(venue).length === 0) {
    return new AppError("Set opening hours for at least one day before publishing.", 422, "HOURS_REQUIRED");
  }
  return null;
};

export type CrossFieldInput = { startingPrice: number | null; dayPassPrice: number | null };

export const crossFieldErrors = (venue: CrossFieldInput) => {
  const fields: Record<string, string> = {};
  if (venue.dayPassPrice !== null && venue.startingPrice !== null && venue.dayPassPrice < venue.startingPrice) {
    fields.dayPassPrice = "A day pass can't cost less than one hour.";
  }
  return fields;
};

export const unknownSeatIds = (seatIds: string[], mapSeatIds: string[]) => {
  const known = new Set(mapSeatIds);
  return seatIds.filter((id) => !known.has(id));
};

type Priced = {
  startingPrice: number | null;
  halfDayPrice: number | null;
  dayPassPrice: number | null;
  /** Whether the venue has a visible membership plan on sale. */
  hasPlan: boolean;
};

/** Whether anything at the venue can be bought. */
export const hasAnyPrice = (venue: Priced) =>
  venue.startingPrice !== null ||
  venue.halfDayPrice !== null ||
  venue.dayPassPrice !== null ||
  venue.hasPlan;
