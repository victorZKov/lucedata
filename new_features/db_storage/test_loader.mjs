import { loadAdapter } from './adapter/index.js';

async function run() {
  console.log('Loading in-memory adapter via loader...');
  const a = await loadAdapter('inmemory');
  await a.connect();
  await a.setConfig('loader.test', 'ok');
  const v = await a.getConfig('loader.test');
  console.log('loader read:', v);
  await a.close();

  console.log('Attempting to load sqlite adapter (may fail if native modules mismatch)...');
  try {
    const s = await loadAdapter('sqlite', { filename: './new_features/db_storage/test_sqlite.db' });
    await s.connect();
    console.log('sqlite adapter connected - running simple set/get');
    await s.setConfig('loader.sqlite', 'ok');
    const vs = await s.getConfig('loader.sqlite');
    console.log('sqlite loader read:', vs);
    await s.close();
  } catch (err) {
    console.error('sqlite adapter load failed (expected on some envs):', err.message);
  }
}

run().catch(err => {
  console.error('loader test failed:', err);
  process.exit(1);
});
