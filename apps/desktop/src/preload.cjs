const { contextBridge, ipcRenderer } = require("electron");

console.log("🔧 Preload script starting...");
console.log("🔧 contextBridge available:", !!contextBridge);
console.log("🔧 ipcRenderer available:", !!ipcRenderer);

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
try {
  console.log("🔧 About to expose electronAPI...");
  contextBridge.exposeInMainWorld("electronAPI", {
  // App information
  getAppVersion: () => ipcRenderer.invoke("get-app-version"),
  getPlatform: () => ipcRenderer.invoke("get-platform"),

  // Store methods
  store: {
    get: (key) => ipcRenderer.invoke("store-get", key),
    set: (key, value) => ipcRenderer.invoke("store-set", key, value),
    delete: (key) => ipcRenderer.invoke("store-delete", key),
  },

  // Connection management
  connections: {
    save: (connection, password) => {
      console.log('🔗 preload.js: connections.save called with:', { connection: !!connection, hasPassword: !!password });
      return ipcRenderer.invoke("connection-save", connection, password);
    },
    list: () => ipcRenderer.invoke("connection-list"),
    get: (id) => ipcRenderer.invoke("connection-get", id),
    delete: (id) => ipcRenderer.invoke("connection-delete", id),
    test: (connection) => ipcRenderer.invoke("connection-test", connection),
  },

  // Database connection and operations
  database: {
    connect: (connectionId) => {
      console.log('🔗 preload.js: database.connect called with:', connectionId);
      return ipcRenderer.invoke("database-connect", connectionId);
    },
    disconnect: (connectionId) => {
      console.log('🔗 preload.js: database.disconnect called with:', connectionId);
      return ipcRenderer.invoke("database-disconnect", connectionId);
    },
    getSchema: (connectionId) => {
      console.log('🔗 preload.js: database.getSchema called with:', connectionId);
      return ipcRenderer.invoke("database-get-schema", connectionId);
    },
    executeQuery: (connectionId, query) => {
      console.log('🔗 preload.js: database.executeQuery called with:', { connectionId, queryLength: query.length });
      return ipcRenderer.invoke("database-execute-query", connectionId, query);
    },
    getTableData: (connectionId, tableName, schema) => {
      console.log('🔗 preload.js: database.getTableData called with:', { connectionId, tableName, schema });
      return ipcRenderer.invoke("database-get-table-data", connectionId, tableName, schema);
    },
  },

  // Export helpers
  export: {
    save: (options) =>
      ipcRenderer.invoke("export-save-file", options),
  },

  // File open/save helpers for SQL
  files: {
    open: () => ipcRenderer.invoke('file-open-dialog'),
    saveDialog: (opts) => ipcRenderer.invoke('file-save-dialog', opts || {}),
    write: (filePath, content) => ipcRenderer.invoke('file-write', { filePath, content }),
  },

  // Menu actions
  onMenuAction: (callback) => {
    ipcRenderer.on("menu-action", (_, action, ...args) => callback(action, ...args));
  },

  // AI Engines management
  aiEngines: {
    list: () => ipcRenderer.invoke("ai-engines-list"),
    get: (id) => ipcRenderer.invoke("ai-engines-get", id),
    create: (engine) => ipcRenderer.invoke("ai-engines-create", engine),
    update: (id, updates) => ipcRenderer.invoke("ai-engines-update", id, updates),
    delete: (id) => ipcRenderer.invoke("ai-engines-delete", id),
    test: (config) => ipcRenderer.invoke("ai-engines-test", config),
    validate: (config) => ipcRenderer.invoke("ai-engines-validate", config),
  },

  // Chat functionality
  chat: {
    sendMessage: (params) => ipcRenderer.invoke("chat-send-message", params),
    getConversationHistory: (conversationId) => ipcRenderer.invoke("chat-get-conversation-history", conversationId),
    createConversation: (params) => ipcRenderer.invoke("chat-create-conversation", params),
  },

  // Cleanup
  removeAllListeners: (channel) => {
    ipcRenderer.removeAllListeners(channel);
  },
  });
  console.log("✅ ElectronAPI exposed successfully to window.electronAPI");
} catch (error) {
  console.error("❌ Failed to expose ElectronAPI:", error);
}

console.log("🔗 preload.js: Preload script completed");