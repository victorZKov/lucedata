import createAdapter from './adapter/sqlserver.js';

async function run() {
  const connStr = process.env.SQLSERVER_CONN;
  if (!connStr) {
    console.log('Skipping SQL Server adapter test because SQLSERVER_CONN is not set.');
    return;
  }

  const adapter = createAdapter({ connectionString: connStr });
  try {
    console.log('Connecting to SQL Server...');
    await adapter.connect();
    console.log('Connected. Running CRUD test...');

    await adapter.setConfig('test.key', 'hello from mssql');
    const v = await adapter.getConfig('test.key');
    console.log('Read value:', v);

    const all = await adapter.getAllConfigs();
    console.log('All configs:', Object.keys(all));

    await adapter.deleteConfig('test.key');
    const after = await adapter.getConfig('test.key');
    console.log('After delete:', after);

    console.log('SQL Server adapter test complete');
  } finally {
    await adapter.close();
  }
}

run().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
