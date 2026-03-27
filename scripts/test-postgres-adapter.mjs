#!/usr/bin/env node
import path from 'path';

const conn = process.argv[2];
if (!conn) {
  console.error('Usage: node scripts/test-postgres-adapter.mjs <connectionString>');
  process.exit(2);
}

const modulePath = path.resolve(process.cwd(), 'new_features', 'db_storage', 'adapter', 'index.js');
const fileUrl = `file://${modulePath}`;

try {
  const mod = await import(fileUrl);
  const { loadAdapter } = mod;
  const target = await loadAdapter('postgres', { connectionString: conn });

  try {
    if (typeof target.connect === 'function') {
      console.log('Connecting to postgres...');
      await target.connect();
      console.log('connected');
    }

    if (typeof target.migrate === 'function') {
      try {
        console.log('Running migrate()...');
        await target.migrate();
        console.log('migrate OK');
      } catch (merr) {
        console.error('migrate failed', merr);
      }
    }

    if (typeof target.listConnections === 'function') {
      const conns = await target.listConnections();
      console.log('listConnections returned', conns.length, 'rows');
      console.dir(conns, { depth: 2 });
    } else if (typeof target.runQuery === 'function') {
      console.log('runQuery available, testing simple query...');
      try {
        const res = await target.runQuery('SELECT 1 as v');
        console.log('runQuery OK, rows:', res && res.rows ? res.rows.length : 'unknown');
      } catch (rqerr) {
        console.error('runQuery failed', rqerr);
      }
    } else {
      console.warn('Adapter has neither listConnections nor runQuery');
    }

    try {
      if (typeof target.close === 'function') await target.close();
    } catch (_) {}
  } catch (err) {
    console.error('Adapter operation failed', err);
    try { if (typeof target.close === 'function') await target.close(); } catch(_){}
    process.exit(3);
  }
} catch (err) {
  console.error('Failed to import adapter loader or run test', err);
  process.exit(4);
}
