import { z } from "zod";

export const JobSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(128),
  schedule: z.string().describe("Cron expression (e.g., '*/5 * * * *') or interval (e.g., '5m', '1h')"),
  command: z.string().min(1).describe("Shell command to execute"),
  enabled: z.boolean().default(true),
  retryCount: z.number().int().min(0).max(10).default(0),
  retryDelayMs: z.number().int().min(0).max(60000).default(1000),
  timeoutMs: z.number().int().min(1000).max(3600000).default(30000),
  webhookUrl: z.string().url().optional().describe("Optional webhook URL to fire on job completion"),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type Job = z.infer<typeof JobSchema>;

export interface JobRun {
  id: string;
  jobId: string;
  startedAt: string;
  finishedAt: string | null;
  exitCode: number | null;
  stdout: string;
  stderr: string;
  durationMs: number | null;
  status: "running" | "success" | "failure" | "timeout" | "retry";
  attempt: number;
}

export interface JobStatus {
  job: Job;
  lastRun: JobRun | null;
  nextRun: string | null;
  successRate: number;
  totalRuns: number;
  avgDurationMs: number;
}

export interface ListJobsFilter {
  enabled?: boolean;
  limit?: number;
}
