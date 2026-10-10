import dotenv from "dotenv";
import { readFileSync } from "fs";
import mongoose from "mongoose";
import { resolve } from "path";
import { seedCatalogue, type SeedVenue } from "../services/catalogueSeed.service";
import { hasFlag } from "./cliArgs";

dotenv.config();

// Accounts, sign-ins and the demo catalogue; bookings and payments are left alone.
const WIPED = ["members", "admins", "partner_staff", "sessions", "refresh_tokens", "otp_challenges", "seat_maps", "venues"];

const read = (file: string) => JSON.parse(readFileSync(resolve(__dirname, "seed", file), "utf8"));

const main = async () => {
  if (!process.env.MONGODB_URI) throw new Error("MONGODB_URI is not set");
  if (!hasFlag(process.argv.slice(2), "yes")) {
    throw new Error(`This deletes every ${WIPED.join(", ")} record. Run it again with --yes to go ahead.`);
  }

  await mongoose.connect(process.env.MONGODB_URI);
  const db = mongoose.connection.db!;
  for (const name of WIPED) {
    const { deletedCount } = await db.collection(name).deleteMany({});
    console.log(`Deleted ${deletedCount} from ${name}`);
  }

  const sample = read("venues.json")[1];
  const plan = read("demo-plan.json") as { image: string; seats: unknown[] };
  const growthHub: SeedVenue = {
    slug: "growthhub",
    name: "GrowthHub",
    locality: "Koramangala",
    city: "Bangalore",
    image: sample.image,
    gallery: sample.gallery,
    rating: 0,
    // No prices: the admin or the venue sets them, and the venue stays hidden until then.
    startingPrice: null,
    priceUnit: "hr",
    dayPassPrice: null,
    distanceKm: 0,
    description: "Flexible desks, private cabins and meeting rooms for freelancers, startups and growing teams.",
    longDescription: "Placeholder details. Update the address, photos, hours and prices from the admin panel, then publish.",
    openDaysLabel: sample.openDaysLabel,
    openHours: sample.openHours,
    hoursNote: sample.hoursNote,
    googleMapsUrl: "https://www.google.com/maps/search/?api=1&query=GrowthHub%2C%20Koramangala%2C%20Bangalore",
    rules: sample.rules,
    workspaceTypes: sample.workspaceTypes,
    amenities: sample.amenities,
  };
  const result = await seedCatalogue({ venues: [growthHub], demoSeats: plan.seats, demoImage: plan.image });
  console.log(`Created ${result.venuesCreated} hidden venue (GrowthHub) and ${result.mapsCreated} placeholder seat map. Set its prices, then publish it.`);
  console.log("Next: npm run create-admin -- --email you@example.com --name \"Your name\" --super");
};

main()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
