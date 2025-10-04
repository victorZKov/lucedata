import path from 'path';

const argv = process.argv.slice(2);
const backendArgIndex = argv.indexOf('--backend');
let backend = 'sqlite';
if (backendArgIndex !== -1 && argv.length > backendArgIndex + 1) {
  backend = argv[backendArgIndex + 1];
}

let createAdapter;
if (backend === 'inmemory' || backend === 'test') {
  createAdapter = (await import('./adapter/inmemory.js')).default;
} else {
  createAdapter = (await import('./adapter/sqlite_impl.js')).default;
}

async function run() {
  const filename = path.join(process.cwd(), 'new_features', 'db_storage', 'test_sqlite.db');
  const adapter = createAdapter({ filename });
  console.log('Connecting to sqlite adapter...');
  await adapter.connect();
  console.log('Connected. Setting test key...');
  await adapter.setConfig('test.key', 'hello world');
  const value = await adapter.getConfig('test.key');
  console.log('Read value:', value);
  const all = await adapter.getAllConfigs();
  console.log('All configs sample:', Object.keys(all).slice(0,10));
  await adapter.deleteConfig('test.key');
  const after = await adapter.getConfig('test.key');
  console.log('After delete:', after);
  await adapter.close();
  console.log('Adapter test complete');
}

run().catch(err => {
  console.error('Adapter test failed:', err);
  process.exit(1);
});
