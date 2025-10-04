Adapter Contract

Purpose

Define the minimal JavaScript runtime contract each storage adapter must implement so the rest of the app can remain backend-agnostic.

Interface (as JS/TS shape)

- async connect(options): Connect to the backend. Returns adapter instance or throws.
- async close(): Close connections and release resources.
- async migrate(): Ensure schema exists and run migrations.
- async getConfig(key: string): Promise<string | null>
- async setConfig(key: string, value: string): Promise<void>
- async getAllConfigs(): Promise<Record<string,string>>
- async deleteConfig(key: string): Promise<void>
- async runQuery(sql: string, params?: any[]): Promise<any>  // optional, for advanced operations

Error modes
- connect should throw on invalid credentials/connection errors.
- getConfig/setConfig should throw on failure; caller should handle by falling back to SQLite if appropriate.

Notes
- Adapters should be implemented as ES modules and export a default factory: export default function createAdapter(opts) { return {connect, close, ...}; }
- Migrations should be stored under `new_features/db_storage/migrations/<backend>/` and be idempotent.
