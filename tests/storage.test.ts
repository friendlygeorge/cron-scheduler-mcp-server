import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { JobStorage } from "../src/storage.js";
import { mkdtempSync, rmSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";

describe("JobStorage", () => {
  let storage: JobStorage;
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), "cron-test-"));
    storage = new JobStorage(join(tmpDir, "test.db"));
  });

  afterEach(() => {
    storage.close();
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it("creates and retrieves a job", () => {
    const job = storage.createJob({
      name: "test-job",
      schedule: "*/5 * * * *",
      command: "echo hello",
    });

    expect(job.id).toBeTruthy();
    expect(job.name).toBe("test-job");
    expect(job.schedule).toBe("*/5 * * * *");
    expect(job.enabled).toBe(true);

    const retrieved = storage.getJob(job.id);
    expect(retrieved?.id).toBe(job.id);
    expect(retrieved?.name).toBe(job.name);
    expect(retrieved?.command).toBe(job.command);
    expect(retrieved?.enabled).toBe(job.enabled);
    expect(retrieved?.webhookUrl).toBeFalsy();
  });

  it("lists jobs with filters", () => {
    storage.createJob({ name: "enabled", schedule: "*/5 * * * *", command: "echo 1" });
    storage.createJob({ name: "disabled", schedule: "*/5 * * * *", command: "echo 2", enabled: false });

    const all = storage.listJobs();
    expect(all.length).toBe(2);

    const enabled = storage.listJobs({ enabled: true });
    expect(enabled.length).toBe(1);
    expect(enabled[0].name).toBe("enabled");
  });

  it("updates a job", () => {
    const job = storage.createJob({ name: "original", schedule: "*/5 * * * *", command: "echo 1" });
    const updated = storage.updateJob(job.id, { name: "renamed", schedule: "0 * * * *" });

    expect(updated?.name).toBe("renamed");
    expect(updated?.schedule).toBe("0 * * * *");
  });

  it("deletes a job", () => {
    const job = storage.createJob({ name: "to-delete", schedule: "*/5 * * * *", command: "echo 1" });
    expect(storage.deleteJob(job.id)).toBe(true);
    expect(storage.getJob(job.id)).toBeNull();
  });

  it("tracks job runs", () => {
    const job = storage.createJob({ name: "tracked", schedule: "*/5 * * * *", command: "echo 1" });
    const run = storage.createRun(job.id);

    expect(run.status).toBe("running");
    expect(run.attempt).toBe(1);

    storage.finishRun(run.id, { exitCode: 0, stdout: "hello", stderr: "", status: "success" });

    const runs = storage.getRuns(job.id);
    expect(runs.length).toBe(1);
    expect(runs[0].status).toBe("success");
    expect(runs[0].exitCode).toBe(0);
  });

  it("calculates run stats", () => {
    const job = storage.createJob({ name: "stats", schedule: "*/5 * * * *", command: "echo 1" });

    // Create 3 runs: 2 success, 1 failure
    for (let i = 0; i < 3; i++) {
      const run = storage.createRun(job.id);
      storage.finishRun(run.id, {
        exitCode: i === 2 ? 1 : 0,
        stdout: "",
        stderr: "",
        status: i === 2 ? "failure" : "success",
      });
    }

    const stats = storage.getRunStats(job.id);
    expect(stats.totalRuns).toBe(3);
    expect(stats.successRate).toBeCloseTo(66.67, 0);
  });
});
