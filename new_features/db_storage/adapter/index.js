// Adapter loader
// Exports a function to load an adapter for a backend. Uses dynamic imports so adapters can be added later.

export async function loadAdapter(backend, opts = {}) {
  const name = String(backend).toLowerCase();
  switch (name) {
    case 'sqlite':
      return (await import('./sqlite.js')).default(opts);
    case 'inmemory':
    case 'memory':
    case 'test':
      return (await import('./inmemory.js')).default(opts);
    case 'postgres':
      return (await import('./postgres.js')).default(opts);
    case 'sqlserver':
      return (await import('./sqlserver.js')).default(opts);
    default:
      throw new Error(`Unknown backend: ${backend}`);
  }
}
