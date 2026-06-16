import Database from "better-sqlite3";
import { randomUUID } from "crypto";
import { Job, JobRun } from "./types.js";

export class JobStorage {
  private db: Database.Database;

  constructor(dbPath: string = "cron-scheduler.db") {
    this.db = new Database(dbPath);
    this.db.pragma("journal_mode = WAL");
    this.db.pragma("foreign_keys = ON");
    this.migrate();
  }

  private migrate() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS jobs (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        schedule TEXT NOT NULL,
        command TEXT NOT NULL,
        enabled INTEGER NOT NULL DEFAULT 1,
        retry_count INTEGER NOT NULL DEFAULT 0,
        retry_delay_ms INTEGER NOT NULL DEFAULT 1000,
        timeout_ms INTEGER NOT NULL DEFAULT 30000,
        webhook_url TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS job_runs (
        id TEXT PRIMARY KEY,
        job_id TEXT NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
        started_at TEXT NOT NULL,
        finished_at TEXT,
        exit_code INTEGER,
        stdout TEXT DEFAULT '',
        stderr TEXT DEFAULT '',
        duration_ms INTEGER,
        status TEXT NOT NULL DEFAULT 'running',
        attempt INTEGER NOT NULL DEFAULT 1
      );
      CREATE INDEX IF NOT EXISTS idx_job_runs_job_id ON job_runs(job_id);
      CREATE INDEX IF NOT EXISTS idx_job_runs_started ON job_runs(started_at);
    `);
  }

  createJob(params: {
    name: string;
    schedule: string;
    command: string;
    enabled?: boolean;
    retryCount?: number;
    retryDelayMs?: number;
    timeoutMs?: number;
    webhookUrl?: string;
  }): Job {
    const now = new Date().toISOString();
    const job: Job = {
      id: randomUUID(),
      name: params.name,
      schedule: params.schedule,
      command: params.command,
      enabled: params.enabled ?? true,
      retryCount: params.retryCount ?? 0,
      retryDelayMs: params.retryDelayMs ?? 1000,
      timeoutMs: params.timeoutMs ?? 30000,
      webhookUrl: params.webhookUrl,
      createdAt: now,
      updatedAt: now,
    };

    this.db.prepare(`
      INSERT INTO jobs (id, name, schedule, command, enabled, retry_count, retry_delay_ms, timeout_ms, webhook_url, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      job.id, job.name, job.schedule, job.command,
      job.enabled ? 1 : 0, job.retryCount, job.retryDelayMs,
      job.timeoutMs, job.webhookUrl ?? null, job.createdAt, job.updatedAt
    );

    return job;
  }

  getJob(id: string): Job | null {
    const row = this.db.prepare("SELECT * FROM jobs WHERE id = ?").get(id) as any;
    return row ? this.rowToJob(row) : null;
  }

  listJobs(filter: { enabled?: boolean; limit?: number } = {}): Job[] {
    let sql = "SELECT * FROM jobs";
    const conditions: string[] = [];
    if (filter.enabled !== undefined) conditions.push(`enabled = ${filter.enabled ? 1 : 0}`);
    if (conditions.length) sql += " WHERE " + conditions.join(" AND ");
    sql += " ORDER BY created_at DESC";
    if (filter.limit) sql += ` LIMIT ${filter.limit}`;
    return (this.db.prepare(sql).all() as any[]).map(r => this.rowToJob(r));
  }

  updateJob(id: string, updates: Partial<Pick<Job, "name" | "schedule" | "command" | "enabled" | "retryCount" | "retryDelayMs" | "timeoutMs" | "webhookUrl">>): Job | null {
    const existing = this.getJob(id);
    if (!existing) return null;

    const merged = { ...existing, ...updates, updatedAt: new Date().toISOString() };
    this.db.prepare(`
      UPDATE jobs SET name=?, schedule=?, command=?, enabled=?, retry_count=?, retry_delay_ms=?, timeout_ms=?, webhook_url=?, updated_at=?
      WHERE id=?
    `).run(
      merged.name, merged.schedule, merged.command,
      merged.enabled ? 1 : 0, merged.retryCount, merged.retryDelayMs,
      merged.timeoutMs, merged.webhookUrl ?? null, merged.updatedAt, id
    );
    return merged;
  }

  deleteJob(id: string): boolean {
    const result = this.db.prepare("DELETE FROM jobs WHERE id = ?").run(id);
    return result.changes > 0;
  }

  // Run tracking
  createRun(jobId: string, attempt: number = 1): JobRun {
    const now = new Date().toISOString();
    const run: JobRun = {
      id: randomUUID(),
      jobId,
      startedAt: now,
      finishedAt: null,
      exitCode: null,
      stdout: "",
      stderr: "",
      durationMs: null,
      status: "running",
      attempt,
    };

    this.db.prepare(`
      INSERT INTO job_runs (id, job_id, started_at, status, attempt)
      VALUES (?, ?, ?, 'running', ?)
    `).run(run.id, run.jobId, run.startedAt, run.attempt);

    return run;
  }

  finishRun(id: string, result: { exitCode: number; stdout: string; stderr: string; status: JobRun["status"] }) {
    const now = new Date().toISOString();
    this.db.prepare(`
      UPDATE job_runs SET finished_at=?, exit_code=?, stdout=?, stderr=?, status=?,
        duration_ms=CAST((julianday(?) - julianday(started_at)) * 86400000 AS INTEGER)
      WHERE id=?
    `).run(now, result.exitCode, result.stdout, result.stderr, result.status, now, id);
  }

  getRuns(jobId: string, limit: number = 50): JobRun[] {
    return (this.db.prepare(
      "SELECT * FROM job_runs WHERE job_id = ? ORDER BY started_at DESC LIMIT ?"
    ).all(jobId, limit) as any[]).map(r => ({
      ...r,
      exitCode: r.exit_code,
      startedAt: r.started_at,
      finishedAt: r.finished_at,
      durationMs: r.duration_ms,
    }));
  }

  getRunStats(jobId: string): { totalRuns: number; successRate: number; avgDurationMs: number } {
    const row = this.db.prepare(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) as successes,
        AVG(duration_ms) as avg_dur
      FROM job_runs WHERE job_id = ? AND status != 'running'
    `).get(jobId) as any;

    return {
      totalRuns: row?.total ?? 0,
      successRate: row?.total > 0 ? (row.successes / row.total) * 100 : 0,
      avgDurationMs: Math.round(row?.avg_dur ?? 0),
    };
  }

  close() {
    this.db.close();
  }

  private rowToJob(row: any): Job {
    return {
      id: row.id,
      name: row.name,
      schedule: row.schedule,
      command: row.command,
      enabled: row.enabled === 1,
      retryCount: row.retry_count,
      retryDelayMs: row.retry_delay_ms,
      timeoutMs: row.timeout_ms,
      webhookUrl: row.webhook_url ?? undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
