Usage & next steps

Controller
- Check current progress:
  node new_features/db_storage/controller.js status

- Advance to next phase (only when work for current phase is complete):
  node new_features/db_storage/controller.js next

Files added
- `docs/contract.md` — inventory & contract
- `docs/adapter-contract.md` — adapter interface
- `docs/schema.sql` — placeholder schema
- `migrations/<backend>/001_init.sql` — init migrations for sqlite/postgres/sqlserver
- `adapter/` — scaffolding including `sqlite.js` and loader `index.js`

Next actionable item (Phase 2)
- Extract actual SQLite schema from packaged DB and implement `adapter/sqlite.js` fully.
- Rewire configuration service to use `loadAdapter('sqlite', {filename})` and run tests.

If you'd like, I can start Phase 2 now: locate the current SQLite access code in the repo, extract it to `adapter/sqlite.js`, and run a quick smoke test. Say "Start Phase 2" to begin.