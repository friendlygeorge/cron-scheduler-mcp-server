     1|# Changelog
     2|
     3|All notable changes to the Cron Scheduler MCP Server will be documented in this file.
     4|
     5|The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
     6|and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).
     7|
     8|## [0.1.3] - 2026-06-17

### Added
- `get_job` tool — inspect a specific job's full configuration, stats, and recent runs
- `update_job` tool — modify schedule, command, or settings without recreating the job
- `list_executions` tool — view recent executions across all jobs with filtering by status
- `listAllRuns` storage method for aggregate execution history
- Test coverage increased from 10 to 11 tests

## [0.1.1] - 2026-06-17
     9|
    10|### Fixed
    11|- Empty tarball in v0.1.0 npm publish — dist/ build now included
    12|- Correct `main` entry point pointing to `dist/index.js`
    13|
    14|### Changed
    15|- Added `keywords` to package.json for npm discoverability
    16|- Added `glama.json` metadata for Glama listing
    17|
    18|## [0.1.0] - 2026-06-17
    19|
    20|### Added
    21|- Initial release — 7 tools for AI agent cron job scheduling
    22|- `list_jobs` — list all scheduled jobs with status, schedule, and next run time
    23|- `create_job` — create cron jobs with cron expressions or intervals
    24|- `delete_job` — remove jobs by ID with confirmation
    25|- `run_now` — trigger immediate execution of any job
    26|- `get_status` — get execution history and success rates
    27|- `get_logs` — retrieve structured logs with filtering and time ranges
    28|- `pause_resume` — pause and resume jobs without deleting them
    29|- SQLite persistence for job definitions and execution history
    30|- Retry logic with exponential backoff for failed executions
    31|- Structured observability (success rate, avg duration, error trends)
    32|- Systemd timer integration for host-level scheduling
    33|- 10 unit tests passing
    34|- MIT license (vs mcp-cron's AGPL)
    35|