import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { Scheduler } from "../src/scheduler.js";
import { JobStorage } from "../src/storage.js";
import { mkdtempSync, rmSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";

describe("Scheduler", () => {
  let storage: JobStorage;
  let scheduler: Scheduler;
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), "cron-test-"));
    storage = new JobStorage(join(tmpDir, "test.db"));
    scheduler = new Scheduler(storage);
  });

  afterEach(() => {
    scheduler.stop();
    storage.close();
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it("schedules and unschedules a job", () => {
    const job = storage.createJob({
      name: "test",
      schedule: "*/5 * * * *",
      command: "echo hello",
    });

    scheduler.scheduleJob(job);
    expect(scheduler.isRunning(job.id)).toBe(false);

    scheduler.unscheduleJob(job.id);
    expect(scheduler.isRunning(job.id)).toBe(false);
  });

  it("executes a job immediately", async () => {
    const job = storage.createJob({
      name: "quick",
      schedule: "*/5 * * * *",
      command: "echo hello",
    });

    const run = await scheduler.executeJob(job);
    expect(run.status).toBe("success");
    expect(run.exitCode).toBe(0);
    expect(run.stdout).toContain("hello");
  });

  it("handles job failure with retry", async () => {
    const job = storage.createJob({
      name: "retry",
      schedule: "*/5 * * * *",
      command: "exit 1",
      retryCount: 2,
      retryDelayMs: 100,
    });

    const run = await scheduler.executeJob(job);
    expect(run.status).toBe("failure");
    expect(run.attempt).toBe(1);
  });

  it("gets next run time", () => {
    const job = storage.createJob({
      name: "scheduled",
      schedule: "*/5 * * * *",
      command: "echo 1",
    });

    const nextRun = scheduler.getNextRun(job);
    expect(nextRun).toBeTruthy();
    expect(new Date(nextRun!).getTime()).toBeGreaterThan(Date.now());
  });
});
