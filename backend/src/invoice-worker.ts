// PM2 process draining the invoice queue; run one instance, as each job starts LibreOffice.
import dotenv from "dotenv";
import { initializeS3 } from "./config/aws";
import { connectDB, disconnectDB } from "./config/database";
import { installWorkerGuards } from "./utils/workerGuards";
import { startInvoiceWorker } from "./workers/invoice.worker";

dotenv.config();

const start = async () => {
  installWorkerGuards("invoice worker");
  try {
    await connectDB();
    await initializeS3();
    startInvoiceWorker();
    process.on("SIGTERM", () => {
      console.log("Stopping the invoice worker...");
      void disconnectDB().finally(() => process.exit(0));
    });
  } catch (error) {
    console.error("Invoice worker failed to start:", error instanceof Error ? error.message : error);
    process.exit(1);
  }
};

void start();
