/** A crash outside a tick would otherwise vanish; log it and exit so PM2 restarts the worker. */
export const installWorkerGuards = (name: string) => {
  const fatal = (kind: string) => (error: unknown) => {
    console.error(`[${name}] ${kind}:`, error instanceof Error ? error.stack ?? error.message : error);
    process.exit(1);
  };
  process.on("uncaughtException", fatal("uncaught exception"));
  process.on("unhandledRejection", fatal("unhandled rejection"));
};
