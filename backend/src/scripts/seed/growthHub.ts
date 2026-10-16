import { readFileSync } from "fs";
import { resolve } from "path";
import type { SeedVenue } from "../../services/catalogueSeed.service";
import { sameHoursOn, WEEK } from "../../services/venueHours";

// Hours, photos and rules are placeholders the admin replaces before publishing.
export const GROWTH_HUB_VENUE: SeedVenue = {
  slug: "growthhub",
  name: "Growth Hub",
  locality: "Koramangala",
  city: "Bangalore",
  image: "/assets/home/categories/categories-1.webp",
  gallery: ["/assets/home/categories/categories-2.webp", "/assets/home/categories/categories-4.webp"],
  rating: 0,
  // No prices: the admin or the venue sets them, and the venue stays hidden until then.
  startingPrice: null,
  priceUnit: "hr",
  dayPassPrice: null,
  distanceKm: 0,
  description: "Flexible desks, private cabins and meeting rooms for freelancers, startups and growing teams.",
  longDescription: "Placeholder details. Update the address, photos, hours and prices from the admin panel, then publish.",
  hours: sameHoursOn(WEEK, "10:00", "18:00"),
  hoursNote: "",
  googleMapsUrl: "https://www.google.com/maps/search/?api=1&query=Growth%20Hub%2C%20Koramangala%2C%20Bangalore",
  rules: [],
  amenities: [],
};

/** The generic floor plan every new venue starts from. */
export const readTemplatePlan = () =>
  JSON.parse(readFileSync(resolve(__dirname, "demo-plan.json"), "utf8")) as { image: string; seats: unknown[] };
