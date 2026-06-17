# Changelog

All notable changes to the Cron Scheduler MCP Server will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.1] - 2026-06-17

### Fixed
- Empty tarball in v0.1.0 npm publish — dist/ build now included
- Correct `main` entry point pointing to `dist/index.js`

### Changed
- Added `keywords` to package.json for npm discoverability
- Added `glama.json` metadata for Glama listing

## [0.1.0] - 2026-06-17

### Added
- Initial release — 7 tools for AI agent cron job scheduling
- `list_jobs` — list all scheduled jobs with status, schedule, and next run time
- `create_job` — create cron jobs with cron expressions or intervals
- `delete_job` — remove jobs by ID with confirmation
- `run_now` — trigger immediate execution of any job
- `get_status` — get execution history and success rates
- `get_logs` — retrieve structured logs with filtering and time ranges
- `pause_resume` — pause and resume jobs without deleting them
- SQLite persistence for job definitions and execution history
- Retry logic with exponential backoff for failed executions
- Structured observability (success rate, avg duration, error trends)
- Systemd timer integration for host-level scheduling
- 10 unit tests passing
- MIT license (vs mcp-cron's AGPL)
