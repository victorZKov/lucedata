// Simple in-memory adapter implementing the adapter contract
export default function createAdapter(opts = {}) {
  const store = new Map();
  let connected = false;

  return {
    async connect() {
      connected = true;
    },
    async close() {
      connected = false;
    },
    async migrate() {
      // noop for in-memory
    },
    async getConfig(key) {
      if (!connected) throw new Error('Not connected');
      return store.has(key) ? store.get(key) : null;
    },
    async setConfig(key, value) {
      if (!connected) throw new Error('Not connected');
      // store as string
      store.set(key, typeof value === 'string' ? value : JSON.stringify(value));
    },
    async getAllConfigs() {
      if (!connected) throw new Error('Not connected');
      const obj = {};
      for (const [k, v] of store.entries()) obj[k] = v;
      return obj;
    },
    async deleteConfig(key) {
      if (!connected) throw new Error('Not connected');
      return store.delete(key);
    }
  };
}
