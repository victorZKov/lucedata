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
          connection: any
        ) => Promise<{ success: boolean; message: string }>;
      };
      database: {
        connect: (
          connectionId: string
        ) => Promise<{ success: boolean; message: string }>;
        disconnect: (
          connectionId: string
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
          id: string
        ) => Promise<{ success: boolean; latency?: number; error?: string }>;
        validate: (
          engine: any
        ) => Promise<{ valid: boolean; errors: string[] }>;
      };
      ollama: {
        fetchModels: (baseUrl?: string) => Promise<string[]>;
      };
      chat: {
        sendMessage: (params: {
          message: string;
          connectionId: string;
          engineId: string;
          conversationId?: string;
        }) => Promise<{
          id: string;
          role: "assistant";
          content: string;
          timestamp: string;
          finalSQL?: string;
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
            role: "user" | "assistant";
            content: string;
            timestamp: string;
            finalSQL?: string;
          }>;
          connectionId?: string;
          engineId?: string;
        }) => Promise<{ success: boolean; id: string }>;
        loadList: () => Promise<
          Array<{
            id: string;
            title: string;
            createdAt: string;
            updatedAt: string;
            connectionId?: string;
            engineId?: string;
            messageCount: number;
          }>
        >;
        load: (chatId: string) => Promise<{
          id: string;
          title: string;
          messages: Array<{
            id: string;
            role: "user" | "assistant";
            content: string;
            timestamp: string;
            finalSQL?: string;
          }>;
          connectionId?: string;
          engineId?: string;
          createdAt: string;
          updatedAt: string;
        }>;
        delete: (chatId: string) => Promise<{ success: boolean }>;
        searchHistory: (params: {
          query?: string;
          connectionId?: string;
          engineId?: string;
          dateFrom?: string;
          dateTo?: string;
        }) => Promise<
          Array<{
            id: string;
            role: "user" | "assistant";
            content: string;
            timestamp: string;
            finalSQL?: string;
            chatId: string;
            chatTitle: string;
            connectionId?: string;
            engineId?: string;
            chatCreatedAt: string;
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
    };
  }
}

export {};
