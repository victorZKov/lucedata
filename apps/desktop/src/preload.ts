import { contextBridge, ipcRenderer } from "electron";

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
    getAppConfigInfo: () => ipcRenderer.invoke("app-config-info"),
    getPlatform: () => ipcRenderer.invoke("get-platform"),
    getLogFilePath: () => ipcRenderer.invoke("get-log-file-path"),
    openLogFile: () => ipcRenderer.invoke("open-log-file"),

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
        console.log(
          "🔗 preload.ts: database.connect called with:",
          connectionId
        );
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
        return ipcRenderer.invoke(
          "database-execute-query",
          connectionId,
          query
        );
      },
      testMethod: () => {
        console.log("test method works");
        return "test";
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
      // Enhanced metadata methods for table tree enhancements
      getColumns: (
        connectionId: string,
        tableName: string,
        schema?: string
      ) => {
        console.log("🔗 preload.ts: database.getColumns called with:", {
          connectionId,
          tableName,
          schema,
        });
        return ipcRenderer.invoke(
          "database-get-columns",
          connectionId,
          tableName,
          schema
        );
      },
      getKeys: (connectionId: string, tableName: string, schema?: string) => {
        console.log("🔗 preload.ts: database.getKeys called with:", {
          connectionId,
          tableName,
          schema,
        });
        return ipcRenderer.invoke(
          "database-get-keys",
          connectionId,
          tableName,
          schema
        );
      },
      getConstraints: (
        connectionId: string,
        tableName: string,
        schema?: string
      ) => {
        console.log("🔗 preload.ts: database.getConstraints called with:", {
          connectionId,
          tableName,
          schema,
        });
        return ipcRenderer.invoke(
          "database-get-constraints",
          connectionId,
          tableName,
          schema
        );
      },
      getTriggers: (
        connectionId: string,
        tableName: string,
        schema?: string
      ) => {
        console.log("🔗 preload.ts: database.getTriggers called with:", {
          connectionId,
          tableName,
          schema,
        });
        return ipcRenderer.invoke(
          "database-get-triggers",
          connectionId,
          tableName,
          schema
        );
      },
      createDatabase: (
        connectionId: string,
        databaseData: {
          name: string;
          collation?: string;
          owner?: string;
          template?: string;
          encoding?: string;
        }
      ) => {
        console.log("🔗 preload.ts: database.createDatabase called with:", {
          connectionId,
          databaseName: databaseData.name,
        });
        return ipcRenderer.invoke(
          "database-create-database",
          connectionId,
          databaseData
        );
      },
      getIndexes: (
        connectionId: string,
        tableName: string,
        schema?: string
      ) => {
        console.log("🔗 preload.ts: database.getIndexes called with:", {
          connectionId,
          tableName,
          schema,
        });
        return ipcRenderer.invoke(
          "database-get-indexes",
          connectionId,
          tableName,
          schema
        );
      },

      // Tips management
      getRandomTips: (count?: number, category?: string) => {
        console.log("🔗 preload.ts: database.getRandomTips called with:", {
          count,
          category,
        });
        return ipcRenderer.invoke("tips-get-random", count, category);
      },
      getTips: (category?: string, activeOnly?: boolean) => {
        console.log("🔗 preload.ts: database.getTips called with:", {
          category,
          activeOnly,
        });
        return ipcRenderer.invoke("tips-get-all", category, activeOnly);
      },
      createTip: (tipData: {
        title: string;
        content: string;
        category?: string;
        priority?: number;
      }) => {
        console.log("🔗 preload.ts: database.createTip called with:", tipData);
        return ipcRenderer.invoke("tips-create", tipData);
      },
      updateTip: (
        id: string,
        updates: {
          title?: string;
          content?: string;
          category?: string;
          priority?: number;
          isActive?: boolean;
        }
      ) => {
        console.log("🔗 preload.ts: database.updateTip called with:", {
          id,
          updates,
        });
        return ipcRenderer.invoke("tips-update", id, updates);
      },
      deleteTip: (id: string) => {
        console.log("🔗 preload.ts: database.deleteTip called with:", id);
        return ipcRenderer.invoke("tips-delete", id);
      },
      incrementTipShowCount: (id: string) => {
        console.log(
          "🔗 preload.ts: database.incrementTipShowCount called with:",
          id
        );
        return ipcRenderer.invoke("tips-increment-show-count", id);
      },

      // Settings management
      getSetting: (key: string, defaultValue?: unknown) => {
        console.log("🔗 preload.ts: database.getSetting called with:", {
          key,
          defaultValue,
        });
        return ipcRenderer.invoke("settings-get", key, defaultValue);
      },
      setSetting: (key: string, value: unknown) => {
        console.log("🔗 preload.ts: database.setSetting called with:", {
          key,
          value,
        });
        return ipcRenderer.invoke("settings-set", key, value);
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

    // Ollama functionality
    ollama: {
      fetchModels: (baseUrl?: string) =>
        ipcRenderer.invoke("ollama-fetch-models", baseUrl),
    },

    // First-run wizard helpers
    firstRun: {
      status: () => ipcRenderer.invoke("first-run-status"),
      validate: (opts: { backend: string; connString?: string }) =>
        ipcRenderer.invoke("first-run-validate", opts),
      migrate: (opts: {
        backend: string;
        connString?: string;
        migrateExisting?: boolean;
      }) => ipcRenderer.invoke("first-run-migrate", opts),
      migrateFromSqlite: (opts: { backend: string; connString?: string }) =>
        ipcRenderer.invoke("first-run-migrate-from-sqlite", opts),
      complete: (opts: { backend: string }) =>
        ipcRenderer.invoke("first-run-complete", opts),
    },

    // Chat functionality
    chat: {
      sendMessage: (params: {
        message: string;
        connectionId: string;
        engineId: string;
        conversationId?: string;
        workspaceContext?: {
          currentQuery?: string;
          results?: any;
          activeTabTitle?: string;
          activeTabId?: string;
        };
      }) => ipcRenderer.invoke("chat-send-message", params),
      getConversationHistory: (conversationId: string) =>
        ipcRenderer.invoke("chat-get-conversation-history", conversationId),
      createConversation: (params: {
        title: string;
        engineId: string;
        connectionId: string;
      }) => ipcRenderer.invoke("chat-create-conversation", params),

      // Save and Load functionality
      save: (params: {
        title: string;
        messages: Array<{
          id: string;
          role: "user" | "assistant" | "system";
          content: string;
          timestamp: string;
          finalSQL?: string;
          renderMarkdown?: boolean;
        }>;
        connectionId?: string;
        engineId?: string;
        database?: string | null;
      }) => {
        console.log("🔗 preload.ts: chat.save called with:", {
          title: params.title,
          messageCount: params.messages.length,
          connectionId: params.connectionId,
          engineId: params.engineId,
          database: params.database,
        });
        return ipcRenderer.invoke("chat-save", params);
      },
      loadList: () => {
        console.log("🔗 preload.ts: chat.loadList called");
        return ipcRenderer.invoke("chat-load-list");
      },
      load: (chatId: string) => {
        console.log("🔗 preload.ts: chat.load called with:", chatId);
        return ipcRenderer.invoke("chat-load", chatId);
      },
      delete: (chatId: string) => {
        console.log("🔗 preload.ts: chat.delete called with:", chatId);
        return ipcRenderer.invoke("chat-delete", chatId);
      },
      updateTitle: (chatId: string, title: string) => {
        console.log("🔗 preload.ts: chat.updateTitle called with:", {
          chatId,
          titleLength: title.length,
        });
        return ipcRenderer.invoke("chat-update-title", { chatId, title });
      },
      togglePin: (chatId: string, pinned: boolean) => {
        console.log("🔗 preload.ts: chat.togglePin called with:", {
          chatId,
          pinned,
        });
        return ipcRenderer.invoke("chat-toggle-pin", { chatId, pinned });
      },
      getCurrentState: () => {
        console.log("🔗 preload.ts: chat.getCurrentState called");
        return ipcRenderer.invoke("chat-get-current-state");
      },
    },

    // Cleanup
    removeAllListeners: (channel: string) => {
      ipcRenderer.removeAllListeners(channel);
    },

    // SQL Tab creation
    createSqlTab: (params: {
      sql: string;
      connectionId?: string;
      connectionName?: string;
      connectionType?: string;
      database?: string;
      autoExecute?: boolean;
    }) => {
      console.log("🔗 preload.ts: createSqlTab called with:", params);
      return ipcRenderer.invoke("create-sql-tab", params);
    },

    // Event listeners for main process events
    onCreateNewTab: (callback: (tabData: unknown) => void) => {
      console.log("🔗 preload.ts: onCreateNewTab listener registered");
      ipcRenderer.on("create-new-tab", (_, tabData) => {
        console.log("🔗 preload.ts: onCreateNewTab event received:", tabData);
        callback(tabData);
      });
    },

    // Auto-update methods
    updates: {
      checkForUpdates: () => ipcRenderer.invoke("check-for-updates"),
      downloadUpdate: () => ipcRenderer.invoke("download-update"),
      installUpdate: () => ipcRenderer.invoke("install-update"),
      onUpdateChecking: (callback: () => void) => {
        ipcRenderer.on("update-checking", () => callback());
      },
      onUpdateAvailable: (
        callback: (info: {
          version: string;
          releaseDate?: string;
          releaseNotes?: string;
        }) => void
      ) => {
        ipcRenderer.on("update-available", (_, info) => callback(info));
      },
      onUpdateNotAvailable: (callback: (info: { version: string }) => void) => {
        ipcRenderer.on("update-not-available", (_, info) => callback(info));
      },
      onUpdateError: (callback: (info: { error: string }) => void) => {
        ipcRenderer.on("update-error", (_, info) => callback(info));
      },
      onDownloadProgress: (
        callback: (progress: {
          percent: number;
          bytesPerSecond: number;
          transferred: number;
          total: number;
        }) => void
      ) => {
        ipcRenderer.on("update-download-progress", (_, progress) =>
          callback(progress)
        );
      },
      onUpdateDownloaded: (callback: (info: { version: string }) => void) => {
        ipcRenderer.on("update-downloaded", (_, info) => callback(info));
      },
      removeAllListeners: () => {
        ipcRenderer.removeAllListeners("update-checking");
        ipcRenderer.removeAllListeners("update-available");
        ipcRenderer.removeAllListeners("update-not-available");
        ipcRenderer.removeAllListeners("update-error");
        ipcRenderer.removeAllListeners("update-download-progress");
        ipcRenderer.removeAllListeners("update-downloaded");
      },
    },
  });
  console.log("✅ ElectronAPI exposed successfully to window.electronAPI");

  // Simple verification that the API was exposed
  console.log(
    "🔍 createSqlTab function defined in preload:",
    typeof ipcRenderer.invoke
  );
} catch (error) {
  console.error("❌ Failed to expose ElectronAPI:", error);
}

console.log("🔗 preload.js: Preload script completed");

// Debug logging for createSqlTab - simplified to avoid errors
try {
  console.log(
    "🔍 preload.js: Debug - ipcRenderer.invoke type:",
    typeof ipcRenderer.invoke
  );
  console.log("🔍 preload.js: Debug - electronAPI exposed successfully");
} catch (debugError) {
  console.error("🔍 preload.js: Debug logging failed:", debugError);
}
