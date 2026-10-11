import dotenv from "dotenv";
import mongoose from "mongoose";
import { queueMissingInvoices } from "../services/invoice.service";

dotenv.config();

// Run once after deploying the invoice worker; safe to run again.
const main = async () => {
  if (!process.env.MONGODB_URI) throw new Error("MONGODB_URI is not set");
  await mongoose.connect(process.env.MONGODB_URI);
  const { queued } = await queueMissingInvoices();
  console.log(`Queued ${queued} earlier invoice${queued === 1 ? "" : "s"} for PDFs. No emails are sent for these.`);
};

main()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
