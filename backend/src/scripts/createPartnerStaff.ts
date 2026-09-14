import dotenv from "dotenv";
import mongoose from "mongoose";
import { PartnerStaff } from "../models";
import { normalizeEmail } from "../utils/email";
import { readFlags } from "./cliArgs";

dotenv.config();

const main = async () => {
  const flags = readFlags(process.argv.slice(2));
  const email = normalizeEmail(flags.email);
  const name = flags.name?.trim();
  const venueSlug = flags.venue?.trim();
  if (!email || !name || !venueSlug) {
    throw new Error(
      'Usage: npm run create-partner-staff -- --email staff@example.com --name "Jane Doe" --venue awfis-coworking-koramangala',
    );
  }
  if (!process.env.MONGODB_URI) throw new Error("MONGODB_URI is not set");

  await mongoose.connect(process.env.MONGODB_URI);
  const staff = await PartnerStaff.findOneAndUpdate(
    { email },
    { $set: { name, venueSlug, status: "active" } },
    { upsert: true, returnDocument: "after" },
  );
  console.log(`Partner staff ready: ${staff?.email} at ${staff?.venueSlug}`);
};

main()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
