// PM2 process owning every scheduled job; run exactly one instance.
import dotenv from "dotenv";
import { connectDB, disconnectDB } from "./config/database";
import { installWorkerGuards } from "./utils/workerGuards";
import { startCronJobs } from "./workers/cron.worker";

dotenv.config();

const start = async () => {
  installWorkerGuards("cron worker");
  try {
    await connectDB();
    startCronJobs();
    console.log("Cron worker running: quick jobs every 10 minutes, daily jobs at 08:30 India time.");
    process.on("SIGTERM", () => {
      console.log("Stopping the cron worker...");
      void disconnectDB().finally(() => process.exit(0));
    });
  } catch (error) {
    console.error("Cron worker failed to start:", error instanceof Error ? error.message : error);
    process.exit(1);
  }
};

void start();
