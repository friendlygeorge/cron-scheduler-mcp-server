import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { JobStorage } from "../storage.js";
import { Scheduler } from "../scheduler.js";

export function registerExecutionTools(server: McpServer, storage: JobStorage, scheduler: Scheduler) {
  server.tool(
    "run_now",
    "Execute a job immediately, bypassing its schedule",
    {
      jobId: z.string().uuid().describe("Job ID to execute"),
    },
    async ({ jobId }) => {
      const job = storage.getJob(jobId);
      if (!job) {
        return {
          content: [{ type: "text", text: JSON.stringify({ error: "Job not found" }) }],
          isError: true,
        };
      }
      if (scheduler.isRunning(jobId)) {
        return {
          content: [{ type: "text", text: JSON.stringify({ error: "Job is already running" }) }],
          isError: true,
        };
      }

      const run = await scheduler.executeJob(job);
      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            runId: run.id,
            status: run.status,
            exitCode: run.exitCode,
            stdout: run.stdout.slice(0, 2000),
            stderr: run.stderr.slice(0, 2000),
            durationMs: run.durationMs,
          }, null, 2),
        }],
      };
    }
  );

  server.tool(
    "get_status",
    "Get detailed job status: last run, next run, success rate, average duration, and error history",
    {
      jobId: z.string().uuid().describe("Job ID to check"),
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
      const runs = storage.getRuns(jobId, 10);

      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            id: job.id,
            name: job.name,
            schedule: job.schedule,
            enabled: job.enabled,
            nextRun: status.nextRun,
            isRunning: status.isRunning,
            stats: status.stats,
            recentRuns: runs.map(r => ({
              startedAt: r.startedAt,
              finishedAt: r.finishedAt,
              status: r.status,
              exitCode: r.exitCode,
              durationMs: r.durationMs,
              attempt: r.attempt,
            })),
          }, null, 2),
        }],
      };
    }
  );

  server.tool(
    "get_logs",
    "Get execution logs for a job with output, duration, and exit code",
    {
      jobId: z.string().uuid().describe("Job ID"),
      limit: z.number().int().min(1).max(100).optional().describe("Max runs to return (default: 20)"),
    },
    async ({ jobId, limit }) => {
      const job = storage.getJob(jobId);
      if (!job) {
        return {
          content: [{ type: "text", text: JSON.stringify({ error: "Job not found" }) }],
          isError: true,
        };
      }

      const runs = storage.getRuns(jobId, limit ?? 20);
      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            jobId,
            jobName: job.name,
            runs: runs.map(r => ({
              id: r.id,
              startedAt: r.startedAt,
              finishedAt: r.finishedAt,
              status: r.status,
              exitCode: r.exitCode,
              stdout: r.stdout,
              stderr: r.stderr,
              durationMs: r.durationMs,
              attempt: r.attempt,
            })),
          }, null, 2),
        }],
      };
    }
  );


  server.tool(
    "list_executions",
    "List recent executions across all jobs with status, duration, and job name",
    {
      limit: z.number().int().min(1).max(100).optional().describe("Max executions to return (default: 20)"),
      status: z.enum(["running", "success", "failure", "timeout", "retry"]).optional().describe("Filter by execution status"),
    },
    async ({ limit, status }) => {
      let runs = storage.listAllRuns(limit ?? 20);
      if (status) {
        runs = runs.filter(r => r.status === status);
      }
      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            count: runs.length,
            executions: runs.map(r => ({
              id: r.id,
              jobId: r.jobId,
              jobName: r.jobName,
              startedAt: r.startedAt,
              finishedAt: r.finishedAt,
              status: r.status,
              exitCode: r.exitCode,
              durationMs: r.durationMs,
              attempt: r.attempt,
            })),
          }, null, 2),
        }],
      };
    }
  );

}
