#!/usr/bin/env node

import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createServer } from "./server.js";

async function main() {
  const dbPath = process.env.CRON_SCHEDULER_DB || "cron-scheduler.db";
  const { server, storage, scheduler } = await createServer(dbPath);

  const transport = new StdioServerTransport();
  await server.connect(transport);

  // Graceful shutdown
  process.on("SIGINT", () => {
    scheduler.stop();
    storage.close();
    process.exit(0);
  });

  process.on("SIGTERM", () => {
    scheduler.stop();
    storage.close();
    process.exit(0);
  });
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
