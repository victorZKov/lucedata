// Global type declarations for the renderer process

declare global {
  interface Window {
    electronAPI: {
      getAppVersion: () => Promise<string>;
      getPlatform: () => Promise<string>;
      store: {
        get: (key: string) => Promise<any>;
        set: (key: string, value: any) => Promise<void>;
        delete: (key: string) => Promise<void>;
      };
      connections: {
        save: (connection: any, password?: string) => Promise<any>;
        list: () => Promise<any[]>;
        get: (id: string) => Promise<any>;
        delete: (id: string) => Promise<boolean>;
        test: (
          connection: any,
          database?: string | null
        ) => Promise<{ success: boolean; message: string }>;
      };
      database: {
        connect: (
          connectionId: string
        ) => Promise<{ success: boolean; message: string }>;
        disconnect: (
          connectionId: string,
          database?: string | null
        ) => Promise<{ success: boolean; message: string }>;
        getSchema: (connectionId: string) => Promise<{
          databases: Array<{
            name: string;
            type: "database";
            children?: Array<{
              name: string;
              type: "schema";
              children?: Array<{
                name: string;
                type: "table" | "view" | "procedure" | "function";
                schema: string;
                rowCount?: number;
              }>;
            }>;
          }>;
        }>;
        executeQuery: (
          connectionId: string,
          query: string
        ) => Promise<{
          columns: Array<{
            name: string;
            dataType: string;
            nullable: boolean;
            isPrimaryKey: boolean;
            isForeignKey: boolean;
            defaultValue?: string;
            maxLength?: number;
            precision?: number;
            scale?: number;
          }>;
          rows: Array<Record<string, unknown>>;
          rowCount: number;
          executionTime: number;
          messages?: string[];
        }>;
        getXmlExecutionPlan: (
          connectionId: string,
          query: string
        ) => Promise<string | null>;
        getTableData: (
          connectionId: string,
          tableName: string,
          schema?: string
        ) => Promise<{
          columns: Array<{
            name: string;
            dataType: string;
            nullable: boolean;
            isPrimaryKey: boolean;
            isForeignKey: boolean;
            defaultValue?: string;
            maxLength?: number;
            precision?: number;
            scale?: number;
          }>;
          rows: Array<Record<string, unknown>>;
          rowCount: number;
          executionTime: number;
          messages?: string[];
        }>;
        // Enhanced metadata methods for table tree enhancements
        getColumns: (
          connectionId: string,
          tableName: string,
          schema?: string
        ) => Promise<
          Array<{
            name: string;
            dataType: string;
            nullable: boolean;
            isPrimaryKey: boolean;
            isForeignKey: boolean;
            defaultValue?: string;
            maxLength?: number;
            precision?: number;
            scale?: number;
            ordinal?: number;
            computed?: boolean;
          }>
        >;
        getKeys: (
          connectionId: string,
          tableName: string,
          schema?: string
        ) => Promise<
          Array<{
            name: string;
            type: "PRIMARY" | "FOREIGN" | "UNIQUE";
            columns: string[];
            references?: {
              schema?: string;
              table: string;
              columns: string[];
            };
          }>
        >;
        getConstraints: (
          connectionId: string,
          tableName: string,
          schema?: string
        ) => Promise<
          Array<{
            name: string;
            type: "CHECK" | "DEFAULT" | "UNIQUE" | "EXCLUDE" | "OTHER";
            definition?: string;
            columns?: string[];
          }>
        >;
        getTriggers: (
          connectionId: string,
          tableName: string,
          schema?: string
        ) => Promise<
          Array<{
            name: string;
            timing: "BEFORE" | "AFTER" | "INSTEAD OF" | "UNKNOWN";
            events: string[];
            enabled?: boolean;
            definition?: string;
          }>
        >;
        getIndexes: (
          connectionId: string,
          tableName: string,
          schema?: string
        ) => Promise<
          Array<{
            name: string;
            unique: boolean;
            method?: string;
            columns: string[];
            include?: string[];
            where?: string | null;
            isPrimary?: boolean;
          }>
        >;
        createDatabase: (
          connectionId: string,
          databaseData: {
            name: string;
            collation?: string;
            owner?: string;
            template?: string;
            encoding?: string;
          }
        ) => Promise<{ success: boolean; message: string }>;

        // Tips management
        getRandomTips: (
          count?: number,
          category?: string
        ) => Promise<
          Array<{
            id: string;
            title: string;
            content: string;
            category: string;
            priority: number;
            isActive: boolean;
            showCount: number;
            createdAt: string;
            updatedAt: string;
          }>
        >;
        getTips: (
          category?: string,
          activeOnly?: boolean
        ) => Promise<
          Array<{
            id: string;
            title: string;
            content: string;
            category: string;
            priority: number;
            isActive: boolean;
            showCount: number;
            createdAt: string;
            updatedAt: string;
          }>
        >;
        createTip: (tipData: {
          title: string;
          content: string;
          category?: string;
          priority?: number;
        }) => Promise<{
          id: string;
          title: string;
          content: string;
          category: string;
          priority: number;
          isActive: boolean;
          showCount: number;
          createdAt: string;
          updatedAt: string;
        }>;
        updateTip: (
          id: string,
          updates: {
            title?: string;
            content?: string;
            category?: string;
            priority?: number;
            isActive?: boolean;
          }
        ) => Promise<{
          id: string;
          title: string;
          content: string;
          category: string;
          priority: number;
          isActive: boolean;
          showCount: number;
          createdAt: string;
          updatedAt: string;
        }>;
        deleteTip: (id: string) => Promise<{ success: boolean }>;
        incrementTipShowCount: (id: string) => Promise<{ success: boolean }>;

        // Settings management
        getSetting: <T>(
          key: string,
          defaultValue?: T
        ) => Promise<T | undefined>;
        setSetting: <T>(key: string, value: T) => Promise<{ success: boolean }>;
      };
      export: {
        save: (options: {
          defaultPath?: string;
          filters?: { name: string; extensions: string[] }[];
          content: string;
        }) => Promise<{ canceled?: boolean; filePath?: string }>;
      };
      files: {
        open: () => Promise<{
          canceled?: boolean;
          filePath?: string;
          content?: string;
        }>;
        saveDialog: (opts?: {
          defaultPath?: string;
        }) => Promise<{ canceled?: boolean; filePath?: string }>;
        write: (
          filePath: string,
          content: string
        ) => Promise<{ success: boolean }>;
      };
      onMenuAction: (
        callback: (action: string, ...args: any[]) => void
      ) => void;
      removeAllListeners: (channel: string) => void;
      aiEngines: {
        list: () => Promise<any[]>;
        get: (id: string) => Promise<any>;
        create: (engine: any) => Promise<any>;
        update: (id: string, updates: any) => Promise<any>;
        delete: (id: string) => Promise<{ success: boolean }>;
        test: (
          config: any
        ) => Promise<{ success: boolean; latency?: number; error?: string }>;
        validate: (
          engine: any
        ) => Promise<{ valid: boolean; errors: string[] }>;
      };
      ollama: {
        fetchModels: (baseUrl?: string) => Promise<string[]>;
      };
      firstRun: {
        status: () => Promise<{ done: boolean; error?: string }>;
        validate: (opts: {
          backend: string;
          connString?: string;
        }) => Promise<{ ok: boolean; error?: string }>;
        migrate: (opts: {
          backend: string;
          connString?: string;
          migrateExisting?: boolean;
        }) => Promise<{ ok: boolean; error?: string }>;
        migrateFromSqlite: (opts: {
          backend: string;
          connString?: string;
        }) => Promise<{ ok: boolean; error?: string }>;
        complete: (opts: {
          backend: string;
        }) => Promise<{ ok: boolean; error?: string }>;
      };
      chat: {
        sendMessage: (params: {
          message: string;
          connectionId: string;
          engineId: string;
          conversationId?: string;
          workspaceContext?: {
            currentQuery: string;
            activeTabTitle?: string | null;
            activeTabId?: string | null;
            results?: {
              columns: string[];
              rowCount: number;
              executionTime: number;
              sampleData: Record<string, unknown>[];
              error?: string | null;
              connectionName?: string | null;
              database?: string | null;
              connectionType?: string | null;
            } | null;
          } | null;
        }) => Promise<{
          id: string;
          role: "assistant";
          content: string;
          timestamp: string;
          finalSQL?: string;
          conversationId?: string;
        }>;
        getConversationHistory: (conversationId: string) => Promise<any[]>;
        createConversation: (params: {
          title: string;
          engineId: string;
          connectionId: string;
        }) => Promise<{
          id: string;
          title: string;
          engineId: string;
          connectionId: string;
          createdAt: string;
        }>;
        // Chat persistence
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
        }) => Promise<{ success: boolean; id: string }>;
        loadList: () => Promise<
          Array<{
            id: string;
            title: string;
            createdAt: string;
            updatedAt: string;
            connectionId?: string;
            engineId?: string;
            database?: string | null;
            messageCount: number;
            pinned?: boolean;
          }>
        >;
        load: (chatId: string) => Promise<{
          id: string;
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
          createdAt: string;
          updatedAt: string;
        }>;
        delete: (chatId: string) => Promise<{ success: boolean }>;
        updateTitle: (
          chatId: string,
          title: string
        ) => Promise<{ success: boolean }>;
        togglePin: (
          chatId: string,
          pinned: boolean
        ) => Promise<{ success: boolean }>;
        searchHistory: (params: {
          query?: string;
          connectionId?: string;
          engineId?: string;
          dateFrom?: string;
          dateTo?: string;
        }) => Promise<
          Array<{
            id: string;
            role: "user" | "assistant" | "system";
            content: string;
            timestamp: string;
            finalSQL?: string;
            chatId: string;
            chatTitle: string;
            connectionId?: string;
            engineId?: string;
            chatCreatedAt: string;
            renderMarkdown?: boolean;
          }>
        >;
      };
      createSqlTab: (params: {
        sql: string;
        connectionId?: string;
        connectionName?: string;
        connectionType?: string;
        database?: string;
        autoExecute?: boolean;
      }) => Promise<{ success: boolean }>;
      onCreateNewTab: (
        callback: (tabData: {
          id: string;
          title: string;
          sql: string;
          connectionId?: string;
          connectionName?: string;
          connectionType?: string;
          database?: string;
          activeResultTab: "results" | "messages";
          autoExecute?: boolean;
        }) => void
      ) => void;
      removeAllListeners: (channel: string) => void;
      updates: {
        checkForUpdates: () => Promise<{
          available: boolean;
          updateInfo?: any;
          message?: string;
          error?: string;
        }>;
        downloadUpdate: () => Promise<{ success: boolean; error?: string }>;
        installUpdate: () => void;
        onUpdateChecking: (callback: () => void) => void;
        onUpdateAvailable: (
          callback: (info: {
            version: string;
            releaseDate?: string;
            releaseNotes?: string;
          }) => void
        ) => void;
        onUpdateNotAvailable: (
          callback: (info: { version: string }) => void
        ) => void;
        onUpdateError: (callback: (info: { error: string }) => void) => void;
        onDownloadProgress: (
          callback: (progress: {
            percent: number;
            bytesPerSecond: number;
            transferred: number;
            total: number;
          }) => void
        ) => void;
        onUpdateDownloaded: (
          callback: (info: { version: string }) => void
        ) => void;
        removeAllListeners: () => void;
      };
    };
  }
}

export {};
