Database storage feature

Goal

When the application starts from install and there's no configuration, ask the user which database they want to store application data in. Options: local SQLite (default), SQL Server, or PostgreSQL. The application must continue to support all reads and writes of the current configuration (stored today in SQLite) using the selected backend.

What this folder contains

- `plan.md` - phased plan and rationale
- `progress.json` - tracks phase status and notes
- `controller.js` - simple CLI to inspect and advance phases
- `docs/` - additional design artifacts
- `migrations/` - SQL migration templates for each backend
- `adapter/` - initial code scaffolding for database adapters

How to use

Run `node controller.js status` to see current phase. Run `node controller.js next` to mark current phase done and move to the next (for development tracking only).