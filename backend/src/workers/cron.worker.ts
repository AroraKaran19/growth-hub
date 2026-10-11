import cron from "node-cron";
import { runDailyTick, runFrequentTick } from "../services/dailyTick.service";

const TIMEZONE = "Asia/Kolkata";

export const JOBS = [
  { name: "frequent-tick", expression: "*/10 * * * *", run: (now: Date) => runFrequentTick(now) },
  { name: "daily-tick", expression: "30 8 * * *", run: (now: Date) => runDailyTick(now) },
];

type Schedule = (expression: string, task: () => Promise<void>, options: { timezone: string; name: string }) => unknown;

const changedAnything = (report: unknown): boolean =>
  typeof report === "number" ? report > 0 : typeof report === "object" && report !== null && Object.values(report).some(changedAnything);

/** Only the worker-cron process calls this; a second copy would run every job twice. */
export const startCronJobs = (schedule: Schedule = cron.schedule) => {
  for (const job of JOBS) {
    let running = false;
    const task = async () => {
      if (running) return;
      running = true;
      const startedAt = new Date();
      try {
        const report = await job.run(startedAt);
        if (changedAnything(report)) {
          console.log(JSON.stringify({ job: job.name, startedAt: startedAt.toISOString(), tookMs: Date.now() - startedAt.getTime(), report }));
        }
      } catch (error) {
        console.error(`${job.name} failed:`, error instanceof Error ? error.stack ?? error.message : error);
      } finally {
        running = false;
      }
    };
    schedule(job.expression, task, { timezone: TIMEZONE, name: job.name });
  }
};
