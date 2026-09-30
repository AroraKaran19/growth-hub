import dotenv from "dotenv";
import mongoose from "mongoose";
import { promoteLegacyAdmins } from "../services/team.service";

dotenv.config();

const main = async () => {
  if (!process.env.MONGODB_URI) throw new Error("MONGODB_URI is not set");
  await mongoose.connect(process.env.MONGODB_URI);
  console.log(`Admins promoted to super admin: ${await promoteLegacyAdmins()}`);
};

main()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
