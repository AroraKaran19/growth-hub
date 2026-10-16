// Run from backend/: npm run build && pm2 start ecosystem.config.cjs
module.exports = {
  apps: [
    // One process: rate limits are counted in memory per process.
    {
      name: "api",
      script: "dist/server.js",
      instances: 1,
      exec_mode: "fork",
      time: true,
      env: { NODE_ENV: "production" },
      max_memory_restart: "1G",
      kill_timeout: 10000,
    },
    // The only scheduler (every 10 min, and daily at 08:30 IST); run one instance.
    {
      name: "worker-cron",
      script: "dist/cron-worker.js",
      instances: 1,
      exec_mode: "fork",
      time: true,
      env: { NODE_ENV: "production" },
      max_memory_restart: "350M",
    },
    // Needs LibreOffice on the server; fonts are embedded in the template.
    {
      name: "worker-invoice",
      script: "dist/invoice-worker.js",
      instances: 1,
      exec_mode: "fork",
      time: true,
      env: { NODE_ENV: "production", INVOICE_WORKER_POLL_MS: "10000", INVOICE_WORKER_BATCH: "5" },
      max_memory_restart: "350M",
    },
  ],
};
