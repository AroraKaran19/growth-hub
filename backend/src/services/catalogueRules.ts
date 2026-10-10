import { AppError } from "../middlewares/error.middleware";
import type { MembershipPriceTable } from "../models";

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
  openDays: number[];
  opensAt: string;
  closesAt: string;
};

export const publishBlocker = (venue: PublishInput): AppError | null => {
  if (!venue.hasMap) return new AppError("Assign a seat map before publishing.", 422, "MAP_REQUIRED");
  if (!venue.image) return new AppError("Add a cover photo before publishing.", 422, "COVER_REQUIRED");
  if (!venue.hasPrice) return new AppError("Set at least one price before publishing.", 422, "PRICE_REQUIRED");
  if (venue.openDays.length === 0 || !venue.opensAt || !venue.closesAt) {
    return new AppError("Set opening days and hours before publishing.", 422, "HOURS_REQUIRED");
  }
  return null;
};

export type CrossFieldInput = { startingPrice: number | null; dayPassPrice: number | null; opensAt: string; closesAt: string };

export const crossFieldErrors = (venue: CrossFieldInput) => {
  const fields: Record<string, string> = {};
  if (venue.dayPassPrice !== null && venue.startingPrice !== null && venue.dayPassPrice < venue.startingPrice) {
    fields.dayPassPrice = "A day pass can't cost less than one hour.";
  }
  if (venue.opensAt && venue.closesAt && venue.closesAt <= venue.opensAt) {
    fields.closesAt = "Closing time must be after opening time.";
  }
  return fields;
};

export const unknownSeatIds = (seatIds: string[], mapSeatIds: string[]) => {
  const known = new Set(mapSeatIds);
  return seatIds.filter((id) => !known.has(id));
};

const pad = (value: number) => String(value).padStart(2, "0");

const toLabel = (hhmm: string) => {
  const [hours, minutes] = hhmm.split(":").map(Number);
  return `${pad(hours % 12 || 12)}:${pad(minutes)} ${hours >= 12 ? "PM" : "AM"}`;
};

export const formatOpenHours = (opensAt: string, closesAt: string) =>
  opensAt && closesAt ? `${toLabel(opensAt)} - ${toLabel(closesAt)}` : "";

const to24 = (hours: string, minutes: string, meridiem: string) =>
  `${pad((Number(hours) % 12) + (meridiem.toUpperCase() === "PM" ? 12 : 0))}:${minutes}`;

export const parseOpenHours = (display: string) => {
  const match = /^(\d{1,2}):(\d{2})\s*(AM|PM)\s*-\s*(\d{1,2}):(\d{2})\s*(AM|PM)$/i.exec(display.trim());
  if (!match) return null;
  return { opensAt: to24(match[1], match[2], match[3]), closesAt: to24(match[4], match[5], match[6]) };
};

type Priced = {
  startingPrice: number | null;
  halfDayPrice: number | null;
  dayPassPrice: number | null;
  membershipPrices?: Partial<Record<string, Partial<Record<string, number>>>> | null;
};

/** Whether anything at the venue can be bought. */
export const hasAnyPrice = (venue: Priced) =>
  venue.startingPrice !== null ||
  venue.halfDayPrice !== null ||
  venue.dayPassPrice !== null ||
  Object.values(venue.membershipPrices ?? {}).some((row) => Object.values(row ?? {}).some((price) => typeof price === "number"));
