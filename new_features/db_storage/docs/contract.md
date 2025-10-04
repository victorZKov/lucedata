Discovery & Contract

Summary

This file captures the inventory and contract for the db_storage feature.

Inventory (high level)
- Configuration is currently stored in an embedded SQLite database located at apps/desktop/{{APP_DATA}}/sqlhelper.db (observed in repo tree).
- Expected reads/writes: application settings, user preferences, connection profiles, and possibly some cached state.
- The goal is to route these reads/writes through a pluggable storage adapter.

Contract
- Adapters must implement the minimal storage contract in `adapter-contract.md`.
- Adapters must support migrations to create and upgrade schema.
- Default fallback is the embedded SQLite file; any migration must backup existing DB first.

Open items
- Full extraction of the actual SQLite schema (run `sqlite3` against the packaged DB to export). Will be done at Phase 2.
- Confirm exact keys and shapes used by the configuration service; will be part of Phase 2 discovery.
