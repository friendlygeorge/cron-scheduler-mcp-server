import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { JobStorage } from "../storage.js";
import { Scheduler } from "../scheduler.js";

export function registerJobTools(server: McpServer, storage: JobStorage, scheduler: Scheduler) {
  server.tool(
    "list_jobs",
    "List all scheduled cron jobs with their status, next run time, and last run result",
    {
      enabled: z.boolean().optional().describe("Filter by enabled/disabled status"),
      limit: z.number().int().min(1).max(100).optional().describe("Max jobs to return"),
    },
    async ({ enabled, limit }) => {
      const jobs = storage.listJobs({ enabled, limit });
      const result = jobs.map(job => {
        const status = scheduler.getJobStatus(job);
        const runs = storage.getRuns(job.id, 1);
        return {
          id: job.id,
          name: job.name,
          schedule: job.schedule,
          command: job.command,
          enabled: job.enabled,
          nextRun: status.nextRun,
          lastRun: runs[0] ? {
            startedAt: runs[0].startedAt,
            status: runs[0].status,
            exitCode: runs[0].exitCode,
            durationMs: runs[0].durationMs,
          } : null,
          stats: status.stats,
          createdAt: job.createdAt,
        };
      });

      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      };
    }
  );

  server.tool(
    "create_job",
    "Create a new cron job with a schedule and shell command",
    {
      name: z.string().min(1).max(128).describe("Human-readable job name"),
      schedule: z.string().min(1).describe("Cron expression (e.g., '*/5 * * * *') or interval (e.g., '5m', '1h', '30s')"),
      command: z.string().min(1).describe("Shell command to execute"),
      enabled: z.boolean().optional().describe("Whether job is enabled (default: true)"),
      retryCount: z.number().int().min(0).max(10).optional().describe("Number of retries on failure (default: 0)"),
      retryDelayMs: z.number().int().min(0).max(60000).optional().describe("Delay between retries in ms (default: 1000)"),
      timeoutMs: z.number().int().min(1000).max(3600000).optional().describe("Execution timeout in ms (default: 30000)"),
    },
    async ({ name, schedule, command, enabled, retryCount, retryDelayMs, timeoutMs }) => {
      const job = storage.createJob({
        name,
        schedule,
        command,
        enabled,
        retryCount,
        retryDelayMs,
        timeoutMs,
      });
      scheduler.scheduleJob(job);

      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            id: job.id,
            name: job.name,
            schedule: job.schedule,
            command: job.command,
            enabled: job.enabled,
            message: "Job created and scheduled",
          }, null, 2),
        }],
      };
    }
  );

  server.tool(
    "delete_job",
    "Remove a scheduled job and its run history",
    {
      jobId: z.string().uuid().describe("Job ID to delete"),
    },
    async ({ jobId }) => {
      scheduler.unscheduleJob(jobId);
      const deleted = storage.deleteJob(jobId);
      if (!deleted) {
        return {
          content: [{ type: "text", text: JSON.stringify({ error: "Job not found" }) }],
          isError: true,
        };
      }
      return {
        content: [{ type: "text", text: JSON.stringify({ deleted: true, jobId }) }],
      };
    }
  );

  server.tool(
    "pause_resume",
    "Pause or resume a scheduled job without deleting it",
    {
      jobId: z.string().uuid().describe("Job ID to pause or resume"),
      enabled: z.boolean().describe("true to resume, false to pause"),
    },
    async ({ jobId, enabled }) => {
      const job = storage.getJob(jobId);
      if (!job) {
        return {
          content: [{ type: "text", text: JSON.stringify({ error: "Job not found" }) }],
          isError: true,
        };
      }
      const updated = storage.updateJob(jobId, { enabled });
      if (enabled) {
        scheduler.scheduleJob(updated!);
      } else {
        scheduler.unscheduleJob(jobId);
      }
      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            id: updated!.id,
            name: updated!.name,
            enabled: updated!.enabled,
            message: enabled ? "Job resumed" : "Job paused",
          }),
        }],
      };
    }
  );


  server.tool(
    "get_job",
    "Get detailed information about a specific cron job including configuration, stats, and recent runs",
    {
      jobId: z.string().uuid().describe("Job ID to inspect"),
    },
    async ({ jobId }) => {
      const job = storage.getJob(jobId);
      if (!job) {
        return {
          content: [{ type: "text", text: JSON.stringify({ error: "Job not found" }) }],
          isError: true,
        };
      }
      const status = scheduler.getJobStatus(job);
      const runs = storage.getRuns(jobId, 5);
      const stats = storage.getRunStats(jobId);
      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            id: job.id,
            name: job.name,
            schedule: job.schedule,
            command: job.command,
            enabled: job.enabled,
            retryCount: job.retryCount,
            retryDelayMs: job.retryDelayMs,
            timeoutMs: job.timeoutMs,
            webhookUrl: job.webhookUrl,
            nextRun: status.nextRun,
            isRunning: status.isRunning,
            stats,
            recentRuns: runs.map(r => ({
              startedAt: r.startedAt,
              status: r.status,
              exitCode: r.exitCode,
              durationMs: r.durationMs,
            })),
            createdAt: job.createdAt,
            updatedAt: job.updatedAt,
          }, null, 2),
        }],
      };
    }
  );

  server.tool(
    "update_job",
    "Modify an existing job's schedule, command, or settings without recreating it",
    {
      jobId: z.string().uuid().describe("Job ID to update"),
      name: z.string().min(1).max(128).optional().describe("New job name"),
      schedule: z.string().optional().describe("New cron expression or interval"),
      command: z.string().optional().describe("New shell command"),
      enabled: z.boolean().optional().describe("Enable or disable the job"),
      retryCount: z.number().int().min(0).max(10).optional().describe("New retry count"),
      retryDelayMs: z.number().int().min(0).max(60000).optional().describe("New retry delay in ms"),
      timeoutMs: z.number().int().min(1000).max(3600000).optional().describe("New timeout in ms"),
      webhookUrl: z.string().url().optional().describe("New webhook URL (pass empty string to remove)"),
    },
    async ({ jobId, ...updates }) => {
      const job = storage.getJob(jobId);
      if (!job) {
        return {
          content: [{ type: "text", text: JSON.stringify({ error: "Job not found" }) }],
          isError: true,
        };
      }
      // Filter out undefined values
      const filtered: Record<string, any> = {};
      for (const [key, value] of Object.entries(updates)) {
        if (value !== undefined) filtered[key] = value;
      }
      if (Object.keys(filtered).length === 0) {
        return {
          content: [{ type: "text", text: JSON.stringify({ error: "No fields to update" }) }],
          isError: true,
        };
      }
      const updated = storage.updateJob(jobId, filtered);
      // Reschedule if schedule changed
      if (filtered.schedule || filtered.enabled !== undefined) {
        scheduler.unscheduleJob(jobId);
        if (updated!.enabled) {
          scheduler.scheduleJob(updated!);
        }
      }
      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            id: updated!.id,
            name: updated!.name,
            schedule: updated!.schedule,
            command: updated!.command,
            enabled: updated!.enabled,
            message: "Job updated" + (filtered.schedule ? " and rescheduled" : ""),
          }, null, 2),
        }],
      };
    }
  );

}
