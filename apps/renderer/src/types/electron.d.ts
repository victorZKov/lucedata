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
        test: (connection: any) => Promise<{ success: boolean; message: string }>;
      };
      database: {
        connect: (connectionId: string) => Promise<{ success: boolean; message: string }>;
        disconnect: (connectionId: string) => Promise<{ success: boolean; message: string }>;
        getSchema: (connectionId: string) => Promise<{
          databases: Array<{
            name: string;
            type: 'database';
            children?: Array<{
              name: string;
              type: 'schema';
              children?: Array<{
                name: string;
                type: 'table' | 'view' | 'procedure' | 'function';
                schema: string;
                rowCount?: number;
              }>;
            }>;
          }>;
        }>;
        executeQuery: (connectionId: string, query: string) => Promise<{
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
        getTableData: (connectionId: string, tableName: string, schema?: string) => Promise<{
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
        save: (options: { defaultPath?: string; filters?: { name: string; extensions: string[] }[]; content: string }) => Promise<{ canceled?: boolean; filePath?: string }>;
      };
      files: {
        open: () => Promise<{ canceled?: boolean; filePath?: string; content?: string }>;
        saveDialog: (opts?: { defaultPath?: string }) => Promise<{ canceled?: boolean; filePath?: string }>;
        write: (filePath: string, content: string) => Promise<{ success: boolean }>;
      };
      onMenuAction: (callback: (action: string, ...args: any[]) => void) => void;
      removeAllListeners: (channel: string) => void;
      aiEngines: {
        list: () => Promise<any[]>;
        get: (id: string) => Promise<any>;
        create: (engine: any) => Promise<any>;
        update: (id: string, updates: any) => Promise<any>;
        delete: (id: string) => Promise<{ success: boolean }>;
        test: (id: string) => Promise<{ success: boolean; latency?: number; error?: string }>;
        validate: (engine: any) => Promise<{ valid: boolean; errors: string[] }>;
      };
    };
  }
}

export {};