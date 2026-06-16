import { Cron } from "croner";
import { spawn } from "child_process";
import { Job, JobRun } from "./types.js";
import { JobStorage } from "./storage.js";

export class Scheduler {
  private jobs: Map<string, Cron> = new Map();
  private running: Map<string, boolean> = new Map();
  private storage: JobStorage;
  private onUpdate?: () => void;

  constructor(storage: JobStorage, onUpdate?: () => void) {
    this.storage = storage;
    this.onUpdate = onUpdate;
  }

  start() {
    const jobs = this.storage.listJobs({ enabled: true });
    for (const job of jobs) {
      this.scheduleJob(job);
    }
  }

  stop() {
    for (const [id, cron] of this.jobs) {
      cron.stop();
    }
    this.jobs.clear();
  }

  scheduleJob(job: Job) {
    // Unschedule first if exists
    this.unscheduleJob(job.id);

    if (!job.enabled) return;

    try {
      const cron = new Cron(job.schedule, async () => {
        await this.executeJob(job);
      });
      this.jobs.set(job.id, cron);
    } catch (err) {
      console.error(`Failed to schedule job ${job.id} (${job.schedule}):`, err);
    }
  }

  unscheduleJob(jobId: string) {
    const existing = this.jobs.get(jobId);
    if (existing) {
      existing.stop();
      this.jobs.delete(jobId);
    }
  }

  async executeJob(job: Job, attempt: number = 1): Promise<JobRun> {
    const run = this.storage.createRun(job.id, attempt);
    this.running.set(job.id, true);

    return new Promise((resolve) => {
      const startTime = Date.now();
      const child = spawn("sh", ["-c", job.command], {
        stdio: ["ignore", "pipe", "pipe"],
        timeout: job.timeoutMs,
      });

      let stdout = "";
      let stderr = "";

      child.stdout?.on("data", (data: Buffer) => { stdout += data.toString(); });
      child.stderr?.on("data", (data: Buffer) => { stderr += data.toString(); });

      const timeout = setTimeout(() => {
        child.kill("SIGTERM");
        setTimeout(() => child.kill("SIGKILL"), 5000);
      }, job.timeoutMs);

      child.on("close", async (code) => {
        clearTimeout(timeout);
        const status: JobRun["status"] = code === 0 ? "success" : "failure";

        this.storage.finishRun(run.id, {
          exitCode: code ?? -1,
          stdout: stdout.slice(0, 10000),
          stderr: stderr.slice(0, 10000),
          status,
        });

        this.running.delete(job.id);
        this.onUpdate?.();

        // Retry logic
        if (status === "failure" && attempt <= job.retryCount) {
          console.log(`Job ${job.id} failed, retrying (${attempt}/${job.retryCount}) in ${job.retryDelayMs}ms`);
          setTimeout(() => this.executeJob(job, attempt + 1), job.retryDelayMs);
        }

        resolve(this.storage.getRuns(job.id, 1)[0]);
      });

      child.on("error", async (err) => {
        clearTimeout(timeout);
        this.storage.finishRun(run.id, {
          exitCode: -1,
          stdout: "",
          stderr: err.message,
          status: "failure",
        });
        this.running.delete(job.id);
        this.onUpdate?.();
        resolve(this.storage.getRuns(job.id, 1)[0]);
      });
    });
  }

  getNextRun(job: Job): string | null {
    try {
      const cron = new Cron(job.schedule);
      const next = cron.nextRun();
      return next ? next.toISOString() : null;
    } catch {
      return null;
    }
  }

  isRunning(jobId: string): boolean {
    return this.running.get(jobId) ?? false;
  }

  getJobStatus(job: Job): {
    nextRun: string | null;
    isRunning: boolean;
    stats: { totalRuns: number; successRate: number; avgDurationMs: number };
  } {
    const stats = this.storage.getRunStats(job.id);
    const runs = this.storage.getRuns(job.id, 1);
    return {
      nextRun: this.getNextRun(job),
      isRunning: this.isRunning(job.id),
      stats,
    };
  }
}
