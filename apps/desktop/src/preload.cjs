/* eslint-env node */
/* global console */
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
    getColumns: (connectionId, tableName, schema) => {
      console.log('🔗 preload.js: database.getColumns called with:', { connectionId, tableName, schema });
      return ipcRenderer.invoke("database-get-columns", connectionId, tableName, schema);
    },
    getKeys: (connectionId, tableName, schema) => {
      console.log('🔗 preload.js: database.getKeys called with:', { connectionId, tableName, schema });
      return ipcRenderer.invoke("database-get-keys", connectionId, tableName, schema);
    },
    getConstraints: (connectionId, tableName, schema) => {
      console.log('🔗 preload.js: database.getConstraints called with:', { connectionId, tableName, schema });
      return ipcRenderer.invoke("database-get-constraints", connectionId, tableName, schema);
    },
    getTriggers: (connectionId, tableName, schema) => {
      console.log('🔗 preload.js: database.getTriggers called with:', { connectionId, tableName, schema });
      return ipcRenderer.invoke("database-get-triggers", connectionId, tableName, schema);
    },
    getIndexes: (connectionId, tableName, schema) => {
      console.log('🔗 preload.js: database.getIndexes called with:', { connectionId, tableName, schema });
      return ipcRenderer.invoke("database-get-indexes", connectionId, tableName, schema);
    },
    createDatabase: (connectionId, databaseData) => {
      console.log('🔗 preload.js: database.createDatabase called with:', { connectionId, databaseName: databaseData.name });
      return ipcRenderer.invoke("database-create-database", connectionId, databaseData);
    },
    getRandomTips: (count, category) => {
      console.log('🔗 preload.js: database.getRandomTips called with:', { count, category });
      return ipcRenderer.invoke("tips-get-random", count, category);
    },
    getTips: (category, activeOnly) => {
      console.log('🔗 preload.js: database.getTips called with:', { category, activeOnly });
      return ipcRenderer.invoke("tips-get-all", category, activeOnly);
    },
    createTip: (tipData) => {
      console.log('🔗 preload.js: database.createTip called with:', tipData);
      return ipcRenderer.invoke("tips-create", tipData);
    },
    updateTip: (id, updates) => {
      console.log('🔗 preload.js: database.updateTip called with:', { id, updates });
      return ipcRenderer.invoke("tips-update", id, updates);
    },
    deleteTip: (id) => {
      console.log('🔗 preload.js: database.deleteTip called with:', id);
      return ipcRenderer.invoke("tips-delete", id);
    },
    incrementTipShowCount: (id) => {
      console.log('🔗 preload.js: database.incrementTipShowCount called with:', id);
      return ipcRenderer.invoke("tips-increment-show-count", id);
    },
    getSetting: (key, defaultValue) => {
      console.log('🔗 preload.js: database.getSetting called with:', { key, defaultValue });
      return ipcRenderer.invoke("settings-get", key, defaultValue);
    },
    setSetting: (key, value) => {
      console.log('🔗 preload.js: database.setSetting called with:', { key, value });
      return ipcRenderer.invoke("settings-set", key, value);
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

  // Ollama functionality
  ollama: {
    fetchModels: (baseUrl) => ipcRenderer.invoke("ollama-fetch-models", baseUrl),
  },

  // Chat functionality
  chat: {
    sendMessage: (params) => ipcRenderer.invoke("chat-send-message", params),
    getConversationHistory: (conversationId) => ipcRenderer.invoke("chat-get-conversation-history", conversationId),
    createConversation: (params) => ipcRenderer.invoke("chat-create-conversation", params),
    
    // Save and Load functionality
    save: (params) => {
      console.log("🔗 preload.cjs: chat.save called with:", {
        title: params.title,
        messageCount: params.messages.length,
        connectionId: params.connectionId,
        engineId: params.engineId,
      });
      return ipcRenderer.invoke("chat-save", params);
    },
    loadList: () => {
      console.log("🔗 preload.cjs: chat.loadList called");
      return ipcRenderer.invoke("chat-load-list");
    },
    load: (chatId) => {
      console.log("🔗 preload.cjs: chat.load called with:", chatId);
      return ipcRenderer.invoke("chat-load", chatId);
    },
  },

  // Cleanup
  removeAllListeners: (channel) => {
    ipcRenderer.removeAllListeners(channel);
  },

  // SQL Tab creation
  createSqlTab: (params) => {
    console.log("🔗 preload.ts: createSqlTab called with:", params);
    return ipcRenderer.invoke("create-sql-tab", params);
  },

  // Event listeners for main process events
  onCreateNewTab: (callback) => {
    console.log("🔗 preload.ts: onCreateNewTab listener registered");
    ipcRenderer.on("create-new-tab", (_, tabData) => {
      console.log("🔗 preload.ts: onCreateNewTab event received:", tabData);
      callback(tabData);
    });
  },
  });
  console.log("✅ ElectronAPI exposed successfully to window.electronAPI");
  console.log("🔍 createSqlTab and onCreateNewTab functions added to src preload");
} catch (error) {
  console.error("❌ Failed to expose ElectronAPI:", error);
}

console.log("🔗 preload.js: Preload script completed");