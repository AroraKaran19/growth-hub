import dotenv from "dotenv";
import mongoose from "mongoose";
import { seedCatalogue } from "../services/catalogueSeed.service";
import { hasFlag } from "./cliArgs";
import { GROWTH_HUB_VENUE, readTemplatePlan } from "./seed/growthHub";

dotenv.config();

// Accounts, sign-ins and the demo catalogue; bookings and payments are left alone.
const WIPED = ["members", "admins", "partner_staff", "sessions", "refresh_tokens", "otp_challenges", "seat_maps", "venues"];

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

  const plan = readTemplatePlan();
  const result = await seedCatalogue({ venues: [GROWTH_HUB_VENUE], demoSeats: plan.seats, demoImage: plan.image });
  console.log(`Created ${result.venuesCreated} hidden venue (Growth Hub) and ${result.mapsCreated} placeholder seat map. Set its prices, then publish it.`);
  console.log("Next: npm run create-admin -- --email you@example.com --name \"Your name\" --super");
};

main()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
