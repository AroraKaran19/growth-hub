import dotenv from "dotenv";
import mongoose from "mongoose";
import { Venue } from "../models";
import { seedCatalogue } from "../services/catalogueSeed.service";
import { hasFlag } from "./cliArgs";
import { GROWTH_HUB_VENUE, readTemplatePlan } from "./seed/growthHub";

dotenv.config();

// Adds only the GrowthHub venue with the template floor plan; nothing is deleted.
const main = async () => {
  if (!process.env.MONGODB_URI) throw new Error("MONGODB_URI is not set");
  const apply = hasFlag(process.argv.slice(2), "yes");
  await mongoose.connect(process.env.MONGODB_URI);

  if (await Venue.exists({ slug: GROWTH_HUB_VENUE.slug })) {
    console.log(`"${GROWTH_HUB_VENUE.slug}" already exists. Nothing to do.`);
    return;
  }
  const plan = readTemplatePlan();
  console.log(`Will add hidden venue "${GROWTH_HUB_VENUE.name}" (${GROWTH_HUB_VENUE.locality}, ${GROWTH_HUB_VENUE.city}) with the template floor plan (${plan.seats.length} seats).`);
  if (!apply) {
    console.log("Nothing changed. Run again with --yes to add it.");
    return;
  }

  const result = await seedCatalogue({ venues: [GROWTH_HUB_VENUE], demoSeats: plan.seats, demoImage: plan.image });
  console.log(`Added ${result.venuesCreated} venue and ${result.mapsCreated} seat map. Set its prices, photos and hours in the admin panel, then publish it.`);
};

main()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
