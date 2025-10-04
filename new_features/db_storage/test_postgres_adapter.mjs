import { newDb } from 'pg-mem';
import createAdapter from './adapter/postgres.js';

async function run() {
  // Create an in-memory Postgres using pg-mem and expose a node-postgres compatible pool
  const pgmem = newDb();
  // load our migration SQL
  const migrationSQL = `
    CREATE TABLE IF NOT EXISTS configs (
      key text PRIMARY KEY,
      value text
    );
  `;
  pgmem.public.none(migrationSQL);

  // Create a node-postgres client factory
  const pool = pgmem.adapters.createPg().Pool({});

  const adapter = createAdapter({ pool, migrationsDir: './new_features/db_storage/migrations/postgres' });
  try {
    console.log('Connecting to postgres adapter (pg-mem)...');
    await adapter.connect();
    console.log('Connected. Running config CRUD test...');

    await adapter.setConfig('test.key', 'hello from pg');
    const v = await adapter.getConfig('test.key');
    console.log('Read value:', v);

    const all = await adapter.getAllConfigs();
    console.log('All configs:', Object.keys(all));

    await adapter.deleteConfig('test.key');
    const after = await adapter.getConfig('test.key');
    console.log('After delete:', after);

    console.log('Postgres adapter test complete');
  } finally {
    await adapter.close();
  }
}

run().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
