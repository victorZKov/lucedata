// Lightweight SQLite adapter that reuses the existing LocalDatabase from @sqlhelper/storage
// This adapter implements the adapter contract defined in docs/adapter-contract.md

import { LocalDatabase } from '../../../packages/storage/dist/index.js';
import path from 'path';

export default function createAdapter(opts = {}) {
  const filename = opts.filename || path.join(process.cwd(), 'sqlhelper.db');
  let db = null;

  return {
    async connect() {
      // The LocalDatabase class expects a path, and will create tables/migrate itself
      db = new LocalDatabase(filename);
      await db.initialize();
    },
    async close() {
      if (db) await db.close();
      db = null;
    },
    async migrate() {
      if (!db) throw new Error('Not connected');
      // LocalDatabase.initialize runs migrations; nothing else here
    },
    async getConfig(key) {
      if (!db) throw new Error('Not connected');
      return await db.getSetting(key);
    },
    async setConfig(key, value) {
      if (!db) throw new Error('Not connected');
      await db.setSetting(key, value);
    },
    async getAllConfigs() {
      if (!db) throw new Error('Not connected');
      // settings table stored as key/value; use drizzle directly via db.db
      const rows = await db.db.select().from('settings');
      const result = {};
      for (const r of rows) result[r.key] = r.value;
      return result;
    },
    async deleteConfig(key) {
      if (!db) throw new Error('Not connected');
      return await db.deleteSetting(key);
    }
  };
}
