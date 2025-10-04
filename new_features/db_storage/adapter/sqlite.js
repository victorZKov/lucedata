// Production SQLite adapter that delegates to the existing LocalDatabase implementation
// Uses the built @sqlhelper/storage package dist artifacts so behavior matches the app.

import fs from 'fs';
import path from 'path';
import { LocalDatabase } from '../../../packages/storage/dist/index.js';

export default function createAdapter(opts = {}) {
  const filename = opts.filename || path.join(process.cwd(), 'sqlhelper.db');
  const makeBackup = opts.backup !== false;
  let db = null;
  const adapter = {
    async connect() {
      // If the file exists and backup is enabled, create a timestamped copy
      try {
        if (makeBackup && fs.existsSync(filename)) {
          const ts = new Date().toISOString().replace(/[:.]/g, '-');
          const backupPath = `${filename}.backup.${ts}`;
          fs.copyFileSync(filename, backupPath);
        }
      } catch (err) {
        // non-fatal but log to console
        console.warn('SQLite adapter backup failed:', err);
      }

      db = new LocalDatabase(filename);
      await db.initialize();
    },

    async close() {
      if (db) await db.close();
      db = null;
    },

    async migrate() {
      if (!db) throw new Error('Not connected');
      // LocalDatabase.initialize already ensures tables/migrations
    },

    // expose the raw instance when needed
    get instance() {
      return db;
    }
  };

  // Proxy unknown properties and method calls to the underlying LocalDatabase instance
  return new Proxy(adapter, {
    get(target, prop) {
      if (prop in target) return target[prop];
      if (db && prop in db) {
        const val = db[prop];
        // If it's a function, bind it to db
        if (typeof val === 'function') return val.bind(db);
        return val;
      }
      return undefined;
    }
  });
}
