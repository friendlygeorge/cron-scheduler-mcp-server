import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { JobStorage } from "./storage.js";
import { Scheduler } from "./scheduler.js";
import { registerJobTools } from "./tools/jobs.js";
import { registerExecutionTools } from "./tools/execution.js";

export async function createServer(dbPath?: string) {
  const storage = new JobStorage(dbPath);
  const server = new McpServer({
    name: "cron-scheduler-mcp",
    version: "0.1.0",
  });

  const scheduler = new Scheduler(storage, () => {
    // Update callback — could broadcast changes
  });

  registerJobTools(server, storage, scheduler);
  registerExecutionTools(server, storage, scheduler);

  // Start scheduler on connect
  scheduler.start();

  return { server, storage, scheduler };
}
