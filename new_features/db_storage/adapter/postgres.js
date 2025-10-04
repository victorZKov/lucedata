import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import crypto from 'crypto';

import { Pool } from 'pg';

export default function createAdapter(opts = {}) {
  let pool = null;
  let ownsPool = false;
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const migrationsDir = opts.migrationsDir || path.join(__dirname, '..', 'migrations', 'postgres');

  return {
    async connect() {
      if (opts.pool) {
        pool = opts.pool;
        ownsPool = false;
        // quick smoke test
        const client = await pool.connect();
        client.release();
        return;
      }

      if (!pool) {
        const cfg = opts.connectionString
          ? { connectionString: opts.connectionString }
          : {
              host: opts.host || 'localhost',
              port: opts.port || 5432,
              database: opts.database || 'postgres',
              user: opts.username,
              password: opts.password,
            };

        pool = new Pool(cfg);
        ownsPool = true;
      }

      // smoke test
      const client = await pool.connect();
      try {
        await client.query('SELECT 1');
      } finally {
        client.release();
      }
    },

    async close() {
      if (pool && ownsPool) {
        await pool.end();
      }
      pool = null;
    },

    async migrate() {
      if (!pool) throw new Error('Not connected');
      const file = path.join(migrationsDir, '001_init.sql');
      if (!fs.existsSync(file)) return;
      const sql = fs.readFileSync(file, 'utf8');
      // run as a single multi-statement command
      await pool.query(sql);
    },

    // Basic connections persistence (to mirror LocalDatabase API used by the app)
    // We provide simple CRUD operations on a `connections` table. The migrate()
    // above should create this table when SQL file is present; however to be
    // resilient in development, create it lazily if missing.
    async ensureConnectionsTable() {
      // try a simple query - if it fails, attempt to create the table
      try {
        await pool.query('SELECT 1 FROM connections LIMIT 1');
  } catch {
        // create a compatible connections table
        await pool.query(`
          CREATE TABLE IF NOT EXISTS connections (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            type TEXT NOT NULL,
            host TEXT NOT NULL,
            port INTEGER NOT NULL,
            database TEXT,
            username TEXT NOT NULL,
            connection_string TEXT,
            ssl INTEGER DEFAULT 0,
            options TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            last_used TIMESTAMP
          )
        `);
      }
    },

    async saveConnection(connection) {
      if (!pool) throw new Error('Not connected');
      await this.ensureConnectionsTable();
      const id = connection.id || crypto.randomUUID?.() || String(Date.now());
      const now = new Date().toISOString();
      // Upsert using ON CONFLICT
      const res = await pool.query(
        `INSERT INTO connections(id, name, type, host, port, database, username, connection_string, ssl, options, created_at, updated_at, last_used)
         VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
         ON CONFLICT (id) DO UPDATE SET
           name = EXCLUDED.name,
           type = EXCLUDED.type,
           host = EXCLUDED.host,
           port = EXCLUDED.port,
           database = EXCLUDED.database,
           username = EXCLUDED.username,
           connection_string = EXCLUDED.connection_string,
           ssl = EXCLUDED.ssl,
           options = EXCLUDED.options,
           updated_at = EXCLUDED.updated_at,
           last_used = EXCLUDED.last_used
         RETURNING *;`,
        [
          id,
          connection.name,
          connection.type,
          connection.host,
          connection.port || null,
          connection.database || null,
          connection.username || null,
          connection.connection_string || null,
          connection.ssl ? 1 : 0,
          connection.options ? JSON.stringify(connection.options) : null,
          connection.created_at || now,
          now,
          connection.last_used || null,
        ]
      );
      return res.rows[0];
    },

    async listConnections() {
      if (!pool) throw new Error('Not connected');
      await this.ensureConnectionsTable();
      const res = await pool.query('SELECT * FROM connections ORDER BY last_used DESC NULLS LAST, name');
      return res.rows;
    },

    async getConnection(id) {
      if (!pool) throw new Error('Not connected');
      await this.ensureConnectionsTable();
      const res = await pool.query('SELECT * FROM connections WHERE id = $1 LIMIT 1', [id]);
      return res.rows[0] || null;
    },

    async deleteConnection(id) {
      if (!pool) throw new Error('Not connected');
      await this.ensureConnectionsTable();
      const res = await pool.query('DELETE FROM connections WHERE id = $1', [id]);
      return res.rowCount > 0;
    },

    // Config helpers - assumes a simple `configs(key primary key, value text)` table exists in migration
    async getConfig(key) {
      if (!pool) throw new Error('Not connected');
      const res = await pool.query('SELECT value FROM configs WHERE key = $1 LIMIT 1', [key]);
      return res.rows.length ? res.rows[0].value : null;
    },

    async setConfig(key, value) {
      if (!pool) throw new Error('Not connected');
      // upsert using primary key or unique constraint on key
      await pool.query(
        'INSERT INTO configs(key, value) VALUES($1, $2) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value',
        [key, value]
      );
    },

    async getAllConfigs() {
      if (!pool) throw new Error('Not connected');
      const res = await pool.query('SELECT key, value FROM configs');
      const obj = {};
      for (const r of res.rows) obj[r.key] = r.value;
      return obj;
    },

    async deleteConfig(key) {
      if (!pool) throw new Error('Not connected');
      await pool.query('DELETE FROM configs WHERE key = $1', [key]);
    },

    // Expose raw pool for advanced operations
    get pool() {
      return pool;
    },

    async runQuery(sql, params = []) {
      if (!pool) throw new Error('Not connected');
      return await pool.query(sql, params);
    },
  };
}
