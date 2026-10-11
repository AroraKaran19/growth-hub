import { ensureDefaultAmenities } from "./amenity.service";
import { AddonType, SeatMap, Venue } from "../models";
import { parseBody } from "../utils/validate";
import { createVenueSchema, seatListSchema } from "../validators/catalogue";
import { hasAnyPrice, parseOpenHours, toLocalityId } from "./catalogueRules";
import { promoteLegacyAdmins } from "./team.service";

export const STARTER_ADDON_TYPES = [
  { key: "locker", name: "Locker", description: "A personal locker for the day", unit: "per-person", sortOrder: 0 },
  {
    key: "printing-credits",
    name: "Printing credits",
    description: "Print and scan at the front desk",
    unit: "per-booking",
    sortOrder: 1,
  },
  {
    key: "two-wheeler-parking",
    name: "Two-wheeler parking",
    description: "One bike or scooter spot",
    unit: "per-day",
    sortOrder: 2,
  },
  { key: "four-wheeler-parking", name: "Four-wheeler parking", description: "One car spot", unit: "per-day", sortOrder: 3 },
] as const;

export type SeedVenue = {
  slug: string;
  name: string;
  locality: string;
  city: string;
  image: string;
  gallery: string[];
  rating: number;
  startingPrice: number | null;
  priceUnit: "hr" | "day" | "month";
  dayPassPrice: number | null;
  distanceKm: number;
  description: string;
  longDescription: string;
  openDaysLabel: string;
  openHours: string;
  hoursNote: string;
  googleMapsUrl: string;
  rules: string[];
  offer?: { label: string; details: string };
  workspaceTypes: string[];
  amenities: string[];
};

type SeedInput = { venues: SeedVenue[]; demoSeats: unknown[]; demoImage: string };

const EVERY_DAY = [0, 1, 2, 3, 4, 5, 6];

export const seedCatalogue = async ({ venues, demoSeats, demoImage }: SeedInput) => {
  const promotedAdmins = await promoteLegacyAdmins();
  await ensureDefaultAmenities();
  const seats = parseBody(seatListSchema, demoSeats);

  let addonTypesCreated = 0;
  for (const type of STARTER_ADDON_TYPES) {
    const result = await AddonType.updateOne({ key: type.key }, { $setOnInsert: type }, { upsert: true });
    addonTypesCreated += result.upsertedCount;
  }

  let venuesCreated = 0;
  let mapsCreated = 0;
  for (const seed of venues) {
    if (await Venue.exists({ slug: seed.slug })) continue;

    const hours = parseOpenHours(seed.openHours) ?? { opensAt: "", closesAt: "" };
    const fields = parseBody(createVenueSchema, {
      slug: seed.slug,
      name: seed.name,
      locality: seed.locality,
      city: seed.city,
      image: seed.image,
      gallery: seed.gallery,
      rating: seed.rating,
      startingPrice: seed.startingPrice,
      priceUnit: seed.priceUnit,
      dayPassPrice: seed.dayPassPrice,
      distanceKm: seed.distanceKm,
      description: seed.description,
      longDescription: seed.longDescription,
      openDays: EVERY_DAY,
      ...hours,
      openDaysLabel: seed.openDaysLabel,
      hoursNote: seed.hoursNote,
      googleMapsUrl: seed.googleMapsUrl,
      rules: seed.rules,
      offer: seed.offer ?? null,
      workspaceTypes: seed.workspaceTypes,
      amenities: seed.amenities,
    });
    const venue = await Venue.create({
      ...fields,
      localityId: toLocalityId(fields.locality),
      seatsAvailable: seats.length,
      published: false,
    });
    venuesCreated += 1;

    const baseName = `Placeholder: ${seed.name}`;
    const name = (await SeatMap.exists({ name: baseName })) ? `${baseName} (${seed.slug})` : baseName;
    await SeatMap.create({ name, image: demoImage, seats, venueId: venue._id, assignedAt: new Date() });
    mapsCreated += 1;

    // A venue with nothing to buy stays hidden until someone sets its prices.
    if (hasAnyPrice({ startingPrice: fields.startingPrice ?? null, halfDayPrice: null, dayPassPrice: fields.dayPassPrice ?? null })) {
      await Venue.updateOne({ _id: venue._id }, { $set: { published: true } });
    }
  }

  return { promotedAdmins, addonTypesCreated, venuesCreated, mapsCreated };
};
