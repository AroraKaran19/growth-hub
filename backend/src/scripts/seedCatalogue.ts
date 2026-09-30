import dotenv from "dotenv";
import { readFileSync } from "fs";
import mongoose from "mongoose";
import { resolve } from "path";
import { seedCatalogue } from "../services/catalogueSeed.service";

dotenv.config();

const read = (file: string) => JSON.parse(readFileSync(resolve(__dirname, "seed", file), "utf8"));

const main = async () => {
  if (!process.env.MONGODB_URI) throw new Error("MONGODB_URI is not set");
  const plan = read("demo-plan.json") as { image: string; seats: unknown[] };
  await mongoose.connect(process.env.MONGODB_URI);
  const result = await seedCatalogue({ venues: read("venues.json"), demoSeats: plan.seats, demoImage: plan.image });
  console.log(
    `Seed done: ${result.venuesCreated} venues, ${result.mapsCreated} placeholder maps, ` +
      `${result.addonTypesCreated} add-on types, ${result.promotedAdmins} admins promoted.`,
  );
};

main()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
