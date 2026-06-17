# Cron Scheduler MCP Server

[![npm version](https://img.shields.io/npm/v/@supernova123/cron-scheduler-mcp-server)](https://www.npmjs.com/package/@supernova123/cron-scheduler-mcp-server)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Tests](https://img.shields.io/badge/tests-10%20passing-brightgreen)]()
[![Glama](https://glama.ai/mcp/servers/friendlygeorge/cron-scheduler-mcp-server/badges/card.svg)](https://glama.ai/mcp/servers/friendlygeorge/cron-scheduler-mcp-server)
[![Glama Score](https://glama.ai/mcp/servers/friendlygeorge/cron-scheduler-mcp-server/badges/score.svg)](https://glama.ai/mcp/servers/friendlygeorge/cron-scheduler-mcp-server)

MCP server for cron job scheduling with SQLite persistence, retry logic, and structured observability.

## Features

- **7 tools:** `list_jobs`, `create_job`, `delete_job`, `run_now`, `get_status`, `get_logs`, `pause_resume`
- **SQLite persistence** — jobs survive restarts
- **Retry logic** — configurable retry with attempt tracking
- **Structured logs** — stdout/stderr capture, duration, exit codes
- **Observability** — success rate, average duration, error history per job
- **MIT license** — enterprise-friendly

## Why This Over mcp-cron?

| Feature | cron-scheduler-mcp | mcp-cron |
|---------|-------------------|----------|
| License | **MIT** | AGPL-3.0 |
| Storage | SQLite (persistent) | In-memory |
| Retry logic | ✅ Configurable retries with backoff | ❌ |
| Observability | ✅ Success rate, avg duration, error trends | ❌ |
| Systemd integration | ✅ | ❌ |
| Webhook triggers | ✅ | ❌ |
| Tool count | 7 | 3 |

mcp-cron is AGPL — fine for personal use, problematic for enterprise agents and commercial deployments. This server uses MIT + SQLite persistence + retry logic for production workloads.


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

### Configuration

Set `CRON_SCHEDULER_DB` environment variable to customize the SQLite database path (default: `cron-scheduler.db` in current directory).

## Tools

| Tool | Description |
|------|-------------|
| `list_jobs` | List all scheduled jobs with status, next run, success rate |
| `create_job` | Create a cron job with schedule, command, and retry settings |
| `delete_job` | Remove a job and its run history |
| `run_now` | Execute a job immediately (bypass schedule) |
| `get_status` | Detailed job status: last run, next run, success rate, error history |
| `get_logs` | Execution logs with stdout, stderr, duration, exit codes |
| `pause_resume` | Pause or resume a job without deleting it |

## Schedule Formats

- **Cron expressions:** `*/5 * * * *` (every 5 minutes), `0 9 * * 1-5` (weekdays at 9am)
- **Intervals:** `30s`, `5m`, `1h`

## License

MIT