Database Storage Feature - Phased Plan

Overview

We will add a first-time-run flow that prompts the user to select where to store application data: SQLite, SQL Server, or PostgreSQL. We'll implement a pluggable storage adapter layer to route all configuration reads/writes to the chosen backend. We'll preserve the existing SQLite schema and behavior.

Phases

Phase 0 - Discovery & Contract (DONE)
- Inventory current configuration reads/writes and the SQLite schema.
- Define a minimal contract for storage adapters (connect, getConfig, setConfig, migrate, close).
- Deliverables: `contract.md`, `schema.sql`, `adapter-contract.md`.

Phase 1 - Scaffolding & Progress Tracking (IN PROGRESS)
- Create new_features folder and tracking CLI to gate progress.
- Deliverables: controller CLI, progress.json, base docs.

Phase 2 - Adapter Implementation: SQLite (MIGRATE) (PENDING)
- Extract current SQLite access code into an adapter that implements the contract.
- Ensure production code uses the adapter interface instead of direct SQLite calls.
- Add automated tests for adapter parity.
- Deliverables: `adapter/sqlite.js`, tests, changes to DI wiring.

Phase 3 - Adapter Implementation: PostgreSQL (PENDING)
- Implement a PostgreSQL adapter using `pg` with connection pooling.
- Implement migrations to create schema.
- Tests against a local Postgres (github actions + dev container instructions).
- Deliverables: `adapter/postgres.js`, migrations, tests, docs.

Phase 4 - Adapter Implementation: SQL Server (PENDING)
- Implement a SQL Server adapter using `tedious` or `mssql` package.
- Migrations for SQL Server.
- Tests guidance (requires ephemeral container).
- Deliverables: `adapter/sqlserver.js`, migrations, tests, docs.

Phase 5 - First-time Run UI & Telemetry (PENDING)
- Create UI flow that runs when no configuration is present. Ask user to pick backend and provide connection details (local file path for sqlite, connection string/user for others).
- Validate connection and run migrations.
- Save chosen backend + connection info (securely) to local bootstrap config (still in a safe place). Consider OS secure storage for credentials later.
- Deliverables: renderer + desktop changes for UI and validation.

Phase 6 - Wiring & Runtime Switching (PENDING)
- Wire the application's config service to use the selected adapter at runtime.
- Support switching backend in settings (migrate data if requested).
- Add feature flags to control rollout.
- Deliverables: runtime wiring, migration CLI, settings UI.

Phase 7 - Docs, Tests, CI (PENDING)
- Update README, add integration tests in CI, ensure packaging includes native drivers.
- Deliverables: docs, CI changes, release notes.

Phase 8 - Security & Secrets (PENDING)
- Add secure storage options for credentials (Keychain on macOS, Credential Manager on Windows).
- Implement secret rotation guidance.

Rollback & Safety

- Default to using the embedded SQLite file if anything fails during migration or connection testing.
- Always keep a verified backup of the current SQLite DB before attempting migration.

Assumptions

- Existing schema is compatible with Postgres and SQL Server types with minimal changes (some type mapping may be required).
- We can add server-side connection strings to a secured local config file; secrets will be addressed in Phase 8.

Next Steps

- Implement Phase 2: extract SQLite adapter and rewire code to use the adapter interface, plus add tests. This is required before adding other adapters. Ensure build and tests pass.
