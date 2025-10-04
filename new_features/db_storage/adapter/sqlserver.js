import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import sql from 'mssql';

export default function createAdapter(opts = {}) {
  let pool = null;
  let ownsPool = false;

  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const migrationsDir = opts.migrationsDir || path.join(__dirname, '..', 'migrations', 'sqlserver');

  return {
    async connect() {
      if (opts.pool) {
        pool = opts.pool;
        ownsPool = false;
        return;
      }

      const cfg = opts.connectionString
        ? { connectionString: opts.connectionString }
        : {
            user: opts.username,
            password: opts.password,
            server: opts.host || 'localhost',
            port: opts.port || 1433,
            database: opts.database || 'master',
            options: {
              encrypt: false,
              trustServerCertificate: true,
            },
          };

      pool = new sql.ConnectionPool(cfg);
      await pool.connect();
      ownsPool = true;
    },

    async close() {
      if (pool && ownsPool) {
        await pool.close();
      }
      pool = null;
    },

    async migrate() {
      if (!pool) throw new Error('Not connected');
      const file = path.join(migrationsDir, '001_init.sql');
      if (!fs.existsSync(file)) return;
      const sqlText = fs.readFileSync(file, 'utf8');
      // Note: if migration file contains GO separators this may fail; consider splitting on /^GO$/m
      await pool.request().batch(sqlText);
    },

    async getConfig(key) {
      if (!pool) throw new Error('Not connected');
      const req = pool.request();
      req.input('k', sql.NVarChar, key);
      const res = await req.query('SELECT [value] FROM configs WHERE [key] = @k');
      return res.recordset.length ? res.recordset[0].value : null;
    },

    async setConfig(key, value) {
      if (!pool) throw new Error('Not connected');
      const req = pool.request();
      req.input('k', sql.NVarChar, key);
      req.input('v', sql.NVarChar, value);
      // Upsert pattern using MERGE
      const upsert = `MERGE configs AS target
USING (SELECT @k AS [key], @v AS [value]) AS source
ON (target.[key] = source.[key])
WHEN MATCHED THEN UPDATE SET [value] = source.[value]
WHEN NOT MATCHED THEN INSERT ([key], [value]) VALUES (source.[key], source.[value]);`;
      await req.query(upsert);
    },

    async getAllConfigs() {
      if (!pool) throw new Error('Not connected');
      const res = await pool.request().query('SELECT [key], [value] FROM configs');
      const obj = {};
      for (const r of res.recordset) obj[r.key] = r.value;
      return obj;
    },

    async deleteConfig(key) {
      if (!pool) throw new Error('Not connected');
      const req = pool.request();
      req.input('k', sql.NVarChar, key);
      await req.query('DELETE FROM configs WHERE [key] = @k');
    },

    get rawPool() {
      return pool;
    },
  };
}
