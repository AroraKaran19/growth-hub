import dotenv from "dotenv";
import mongoose from "mongoose";
import { Admin } from "../models";
import { normalizeEmail } from "../utils/email";
import { readFlags } from "./cliArgs";

dotenv.config();

const main = async () => {
  const flags = readFlags(process.argv.slice(2));
  const email = normalizeEmail(flags.email);
  const name = flags.name?.trim();
  if (!email || !name) {
    throw new Error('Usage: npm run create-admin -- --email admin@example.com --name "Jane Doe"');
  }
  if (!process.env.MONGODB_URI) throw new Error("MONGODB_URI is not set");

  await mongoose.connect(process.env.MONGODB_URI);
  const admin = await Admin.findOneAndUpdate(
    { email },
    { $set: { name, status: "active" } },
    { upsert: true, returnDocument: "after" },
  );
  console.log(`Admin ready: ${admin?.email}`);
};

main()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
