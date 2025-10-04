# Phase 2 - Adapter Implementation: SQLite (Completed)

Summary
-------
Phase 2 extracted the existing SQLite persistence into a pluggable adapter and added an in-memory adapter for fast validation. The desktop app was rewired to load the adapter at runtime and fall back to the original `LocalDatabase` when adapter loading fails. Test scripts for the adapters were added.

What changed
- `adapter/sqlite.js` — production SQLite adapter (proxies to `@sqlhelper/storage` `LocalDatabase`).
- `adapter/inmemory.js` — fast in-memory adapter implementing the adapter contract.
- `adapter/index.js` — dynamic adapter loader used by the desktop `main.ts`.
- `run_sqlite_adapter_test.mjs`, `test_loader.mjs` — test harnesses for adapters.
- `apps/desktop/src/main.ts` — now loads adapter via the loader and falls back to `LocalDatabase`.

Validation (how to run tests locally)

1) In-memory adapter smoke test (recommended for development / CI):

```bash
# from workspace root
node new_features/db_storage/run_sqlite_adapter_test.mjs --backend inmemory
```

Expected output: sequence of set/get/delete operations and "Adapter test complete".

2) Adapter loader smoke test:

```bash
node new_features/db_storage/test_loader.mjs
```

Expected output: in-memory adapter loads successfully; sqlite adapter may fail in developer environments where native modules are mismatched.

3) Running the desktop app (development):

Use the existing workspace tasks to build and run the renderer and desktop. In development the app will attempt to load the sqlite adapter by default. If the environment cannot load the native `better-sqlite3` binary the app will fall back to the `LocalDatabase` import (which may also fail in the same way). For development, use the in-memory adapter for adapter-level tests.

Blocker: native `better-sqlite3` validation

On some developer machines (including CI) `better-sqlite3` may be compiled against different Node/Electron headers and will fail to load with a `NODE_MODULE_VERSION` mismatch. Attempts to rebuild native modules with `electron-rebuild` can fail when the local C++ toolchain lacks C++20 support. This is an environment/toolchain issue (not application code). Recommended mitigations:

- Use the in-memory adapter for development/CI tests.
- Ensure your dev machine has a modern C++ toolchain (clang with C++20) and a node-gyp-compatible build toolchain if you need to rebuild native modules.
- Consider shipping prebuilt native binaries for supported Electron versions (electron-builder does this) or using a pure-JS fallback for some features.

Next steps
- Phase 3: Implement Postgres adapter and CI tests (can leverage in-memory adapter while developing).
- Phase 5: Implement a first-time-run UI (renderer + main process) that prompts users for backend choice and connection details and persists the chosen adapter in a bootstrap configuration.
- Add integration tests that exercise the adapter contract with Postgres/SQL Server in CI (using containers).

If you'd like, I can now:
- Implement the Postgres adapter scaffold (Phase 3) and tests.
- Add the first-run UI flow that prompts for backend selection (Phase 5).

---
Phase 2 completed: adapter extraction + in-memory test harness + desktop wiring validated (in-memory). Native sqlite validation remains an environment blocker.
