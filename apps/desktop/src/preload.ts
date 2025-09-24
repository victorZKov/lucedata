import { contextBridge, ipcRenderer } from "electron";

console.log("🔧 Preload script starting...");

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld("electronAPI", {
  // App information
  getAppVersion: () => ipcRenderer.invoke("get-app-version"),
  getPlatform: () => ipcRenderer.invoke("get-platform"),

  // Store methods
  store: {
    get: (key: string) => ipcRenderer.invoke("store-get", key),
    set: (key: string, value: unknown) =>
      ipcRenderer.invoke("store-set", key, value),
    delete: (key: string) => ipcRenderer.invoke("store-delete", key),
  },

  // Connection management
  connections: {
    save: (connection: unknown, password?: string) => {
      console.log("🔗 preload.ts: connections.save called with:", {
        connection,
        hasPassword: !!password,
      });
      return ipcRenderer.invoke("connection-save", connection, password);
    },
    list: () => ipcRenderer.invoke("connection-list"),
    get: (id: string) => ipcRenderer.invoke("connection-get", id),
    delete: (id: string) => ipcRenderer.invoke("connection-delete", id),
    test: (connection: any) =>
      ipcRenderer.invoke("connection-test", connection),
  },

  // Database connection and operations
  database: {
    connect: (connectionId: string) => {
      console.log("🔗 preload.ts: database.connect called with:", connectionId);
      return ipcRenderer.invoke("database-connect", connectionId);
    },
    disconnect: (connectionId: string) => {
      console.log(
        "🔗 preload.ts: database.disconnect called with:",
        connectionId
      );
      return ipcRenderer.invoke("database-disconnect", connectionId);
    },
    getSchema: (connectionId: string) => {
      console.log(
        "🔗 preload.ts: database.getSchema called with:",
        connectionId
      );
      return ipcRenderer.invoke("database-get-schema", connectionId);
    },
    executeQuery: (connectionId: string, query: string) => {
      console.log("🔗 preload.ts: database.executeQuery called with:", {
        connectionId,
        queryLength: query.length,
      });
      return ipcRenderer.invoke("database-execute-query", connectionId, query);
    },
    getTableData: (
      connectionId: string,
      tableName: string,
      schema?: string
    ) => {
      console.log("🔗 preload.ts: database.getTableData called with:", {
        connectionId,
        tableName,
        schema,
      });
      return ipcRenderer.invoke(
        "database-get-table-data",
        connectionId,
        tableName,
        schema
      );
    },
  },

  // Export helpers
  export: {
    save: (options: {
      defaultPath?: string;
      filters?: { name: string; extensions: string[] }[];
      content: string;
    }) => ipcRenderer.invoke("export-save-file", options),
  },

  // File open/save helpers for SQL
  files: {
    open: () => ipcRenderer.invoke("file-open-dialog"),
    saveDialog: (opts?: { defaultPath?: string }) =>
      ipcRenderer.invoke("file-save-dialog", opts || {}),
    write: (filePath: string, content: string) =>
      ipcRenderer.invoke("file-write", { filePath, content }),
  },

  // Menu actions
  onMenuAction: (callback: (action: string, ...args: any[]) => void) => {
    ipcRenderer.on("menu-action", (_: any, action: string, ...args: any[]) =>
      callback(action, ...args)
    );
  },

  // AI Engines management
  aiEngines: {
    list: () => ipcRenderer.invoke("ai-engines-list"),
    get: (id: string) => ipcRenderer.invoke("ai-engines-get", id),
    create: (engine: any) => ipcRenderer.invoke("ai-engines-create", engine),
    update: (id: string, updates: any) =>
      ipcRenderer.invoke("ai-engines-update", id, updates),
    delete: (id: string) => ipcRenderer.invoke("ai-engines-delete", id),
    test: (config: any) => ipcRenderer.invoke("ai-engines-test", config),
    validate: (config: any) =>
      ipcRenderer.invoke("ai-engines-validate", config),
  },

  // Chat functionality
  chat: {
    sendMessage: (params: {
      message: string;
      connectionId: string;
      engineId: string;
      conversationId?: string;
    }) => ipcRenderer.invoke("chat-send-message", params),
    getConversationHistory: (conversationId: string) =>
      ipcRenderer.invoke("chat-get-conversation-history", conversationId),
    createConversation: (params: {
      title: string;
      engineId: string;
      connectionId: string;
    }) => ipcRenderer.invoke("chat-create-conversation", params),
  },

  // Cleanup
  removeAllListeners: (channel: string) => {
    ipcRenderer.removeAllListeners(channel);
  },
});

console.log("✅ ElectronAPI exposed to window.electronAPI");
console.log("🔗 preload.ts: Exposing electronAPI to renderer");
