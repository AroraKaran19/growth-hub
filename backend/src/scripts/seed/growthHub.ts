import { readFileSync } from "fs";
import { resolve } from "path";
import type { SeedVenue } from "../../services/catalogueSeed.service";

// Hours, photos and rules are placeholders the admin replaces before publishing.
export const GROWTH_HUB_VENUE: SeedVenue = {
  slug: "growthhub",
  name: "GrowthHub",
  locality: "Koramangala",
  city: "Bangalore",
  image: "",
  gallery: [],
  rating: 0,
  // No prices: the admin or the venue sets them, and the venue stays hidden until then.
  startingPrice: null,
  priceUnit: "hr",
  dayPassPrice: null,
  distanceKm: 0,
  description: "Flexible desks, private cabins and meeting rooms for freelancers, startups and growing teams.",
  longDescription: "Placeholder details. Update the address, photos, hours and prices from the admin panel, then publish.",
  openDaysLabel: "Open Daily",
  openHours: "10:00 AM - 6:00 PM",
  hoursNote: "",
  googleMapsUrl: "https://www.google.com/maps/search/?api=1&query=GrowthHub%2C%20Koramangala%2C%20Bangalore",
  rules: [],
  workspaceTypes: ["hot-desk"],
  amenities: [],
};

/** The generic floor plan every new venue starts from. */
export const readTemplatePlan = () =>
  JSON.parse(readFileSync(resolve(__dirname, "demo-plan.json"), "utf8")) as { image: string; seats: unknown[] };
