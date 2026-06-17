# Contributing to Cron/Scheduler MCP Server

Thanks for your interest in contributing! This guide will help you get started.

## Development Setup

```bash
git clone https://github.com/friendlygeorge/cron-scheduler-mcp-server.git
cd cron-scheduler-mcp-server
npm install
```

## Project Structure

```
src/
├── index.ts          # Entry point, MCP server setup
├── tools.ts          # Tool definitions (10 tools)
├── storage.ts        # SQLite storage layer
└── types.ts          # TypeScript types and schemas
tests/
├── tools.test.ts     # Tool integration tests
└── storage.test.ts   # Storage layer tests
```

## Available Tools

| Tool | Description |
|------|-------------|
| `list_jobs` | List all scheduled jobs |
| `create_job` | Create a new cron job |
| `update_job` | Update an existing job |
| `delete_job` | Delete a job |
| `get_job` | Get details of a specific job |
| `run_now` | Execute a job immediately |
| `get_status` | Get scheduler status |
| `get_logs` | Get execution logs |
| `list_executions` | List execution history |
| `pause_resume` | Pause or resume a job |

## Running Tests

```bash
npm test
```

All tests use vitest. Run with `--watch` during development:

```bash
npm test -- --watch
```

## Adding a New Tool

1. Define the schema in `types.ts`
2. Implement the tool in `tools.ts`
3. Add tests in `tests/tools.test.ts`
4. Update the README with tool documentation
5. Update CHANGELOG.md

## Code Style

- TypeScript strict mode
- Use `better-sqlite3` for synchronous SQLite operations
- Use `croner` for cron expression parsing
- Tools return structured JSON with `content` array
- Error handling: return MCP error responses, don't throw

## Commit Messages

Use conventional commits:
- `feat: add new tool` — new functionality
- `fix: handle edge case` — bug fixes
- `docs: update README` — documentation
- `test: add coverage` — test additions
- `chore: update deps` — maintenance

## Pull Requests

1. Fork the repo
2. Create a feature branch (`git checkout -b feat/my-feature`)
3. Make your changes
4. Run tests (`npm test`)
5. Submit a PR with a clear description

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
