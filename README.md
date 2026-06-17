# Cron Scheduler MCP Server

[![npm version](https://img.shields.io/npm/v/@supernova123/cron-scheduler-mcp-server)](https://www.npmjs.com/package/@supernova123/cron-scheduler-mcp-server)
[![npm downloads](https://img.shields.io/npm/dm/@supernova123/cron-scheduler-mcp-server)](https://www.npmjs.com/package/@supernova123/cron-scheduler-mcp-server)
[![MCP](https://img.shields.io/badge/MCP-compatible-green)](https://modelcontextprotocol.io)
[![Claude Desktop](https://img.shields.io/badge/Claude%20Desktop-compatible-purple)](https://claude.ai)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Tests](https://img.shields.io/badge/tests-11%20passing-brightgreen)]()
[![Glama](https://glama.ai/mcp/servers/friendlygeorge/cron-scheduler-mcp-server/badges/card.svg)](https://glama.ai/mcp/servers/friendlygeorge/cron-scheduler-mcp-server)
[![Glama Score](https://glama.ai/mcp/servers/friendlygeorge/cron-scheduler-mcp-server/badges/score.svg)](https://glama.ai/mcp/servers/friendlygeorge/cron-scheduler-mcp-server)

MCP server for cron job scheduling with SQLite persistence, retry logic, and structured observability. Let AI agents create, manage, and monitor scheduled tasks through a clean tool interface.

## Why This Exists

Most cron libraries are designed for applications to embed. This server exposes cron scheduling as an MCP tool — agents can schedule jobs, monitor execution, retry failures, and query logs without touching the filesystem or crontab directly.

**Companion server:** [System Monitoring MCP](https://github.com/friendlygeorge/system-monitoring-mcp-server) for host health metrics. Together they give agents full infrastructure observability and control.

## Why This Over mcp-cron?

| Feature | cron-scheduler-mcp | mcp-cron |
|---------|-------------------|----------|
| License | **MIT** | AGPL-3.0 |
| Storage | SQLite (persistent) | In-memory |
| Retry logic | Configurable retries with backoff | None |
| Observability | Success rate, avg duration, error trends | None |
| Systemd integration | Yes | No |
| Webhook triggers | Yes | No |
| Tool count | 10 | 3 |

mcp-cron is AGPL — fine for personal use, problematic for enterprise agents and commercial deployments. This server uses MIT + SQLite persistence + retry logic for production workloads.

## Features

- **10 tools:** `list_jobs`, `create_job`, `update_job`, `delete_job`, `get_job`, `run_now`, `get_status`, `get_logs`, `list_executions`, `pause_resume`
- **SQLite persistence** — jobs survive server restarts
- **Retry logic** — configurable retry count and delay with attempt tracking
- **Structured logs** — stdout/stderr capture, duration, exit codes per execution
- **Observability** — success rate, average duration, error history per job
- **Webhook triggers** — fire HTTP callbacks on job completion
- **MIT license** — enterprise-friendly, no copyleft restrictions

## Quick Start

```bash
npx @supernova123/cron-scheduler-mcp-server
```

### Claude Desktop

```json
{
  "mcpServers": {
    "cron-scheduler": {
      "command": "npx",
      "args": ["-y", "@supernova123/cron-scheduler-mcp-server"]
    }
  }
}
```

### Cursor / VS Code

Add to your MCP settings (`.cursor/mcp.json` or equivalent):

```json
{
  "mcpServers": {
    "cron-scheduler": {
      "command": "npx",
      "args": ["-y", "@supernova123/cron-scheduler-mcp-server"]
    }
  }
}
```

## Tools

### list_jobs

List all scheduled jobs with status, next run time, and last run result.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `enabled` | boolean | No | Filter by enabled/disabled status |
| `limit` | number | No | Max jobs to return (1-100) |

**Returns:** Array of jobs with id, name, schedule, command, enabled status, next run time, last run result, and aggregate stats (success rate, total runs, avg duration).

### create_job

Create a new cron job with a schedule and shell command.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `name` | string | Yes | Human-readable job name (1-128 chars) |
| `schedule` | string | Yes | Cron expression or interval (see Schedule Formats below) |
| `command` | string | Yes | Shell command to execute |
| `enabled` | boolean | No | Whether job is enabled (default: true) |
| `retryCount` | number | No | Retries on failure, 0-10 (default: 0) |
| `retryDelayMs` | number | No | Delay between retries in ms, 0-60000 (default: 1000) |
| `timeoutMs` | number | No | Execution timeout in ms, 1000-3600000 (default: 30000) |

### delete_job

Remove a scheduled job and its entire run history.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `jobId` | UUID | Yes | Job ID to delete |

### run_now

Execute a job immediately, bypassing its schedule. Useful for testing or manual triggers.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `jobId` | UUID | Yes | Job ID to execute |

**Returns:** Run result with status, exit code, stdout/stderr (truncated to 2000 chars), and duration.

### get_status

Get detailed job status including last run, next run, success rate, average duration, and recent error history.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `jobId` | UUID | Yes | Job ID to check |

**Returns:** Full job config, next scheduled run, whether currently running, aggregate stats, and last 10 runs with status/exit code/duration.

### get_logs

Get execution logs for a job with full stdout, stderr, duration, and exit code.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `jobId` | UUID | Yes | Job ID |
| `limit` | number | No | Max runs to return (1-100, default: 20) |

### pause_resume

Pause or resume a job without deleting it. Paused jobs retain their schedule but won't execute until resumed.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `jobId` | UUID | Yes | Job ID to pause/resume |
| `enabled` | boolean | Yes | true to resume, false to pause |

## Schedule Formats

- **Cron expressions:** Standard 5-field format
  - `*/5 * * * *` — every 5 minutes
  - `0 9 * * 1-5` — weekdays at 9am
  - `30 2 * * 0` — Sundays at 2:30am
- **Intervals:** Simple duration strings
  - `30s` — every 30 seconds
  - `5m` — every 5 minutes
  - `1h` — every hour

## Use Cases

- **Infrastructure automation:** Schedule health checks, log rotation, cleanup scripts
- **Data pipelines:** Periodic data pulls, report generation, cache invalidation
- **Agent workflows:** Let AI agents schedule their own recurring tasks (monitoring, backups, notifications)
- **DevOps:** Scheduled deployments, canary checks, post-deploy verification
- **Testing:** Recurring integration tests, smoke checks, performance benchmarks

## Configuration

| Environment Variable | Default | Description |
|---------------------|---------|-------------|
| `CRON_SCHEDULER_DB` | `cron-scheduler.db` | SQLite database path (relative to CWD) |

## Storage

All job definitions and execution history are stored in a SQLite database. The database file persists across server restarts — jobs survive crashes and restarts without re-creation.

## License

MIT