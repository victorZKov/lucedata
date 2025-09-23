import type { Connection, NewConnection, QueryHistoryEntry, NewQueryHistoryEntry, SavedQuery, NewSavedQuery, AuditLogEntry, NewAuditLogEntry } from './schema.js';
export declare class LocalDatabase {
    private db;
    private drizzle;
    private credentialManager;
    constructor(dbPath: string);
    initialize(): Promise<void>;
    private createTables;
    close(): Promise<void>;
    saveConnection(connection: NewConnection, password?: string): Promise<Connection>;
    getConnection(id: string): Promise<Connection | null>;
    getConnectionWithCredentials(id: string): Promise<(Connection & {
        password?: string;
    }) | null>;
    listConnections(): Promise<Connection[]>;
    updateConnection(id: string, updates: Partial<NewConnection>, password?: string): Promise<Connection | null>;
    deleteConnection(id: string): Promise<boolean>;
    updateLastUsed(connectionId: string): Promise<void>;
    addQueryHistory(entry: NewQueryHistoryEntry): Promise<QueryHistoryEntry>;
    getQueryHistory(connectionId?: string, limit?: number): Promise<QueryHistoryEntry[]>;
    clearQueryHistory(connectionId?: string): Promise<number>;
    saveQuery(query: NewSavedQuery): Promise<SavedQuery>;
    getSavedQueries(): Promise<SavedQuery[]>;
    updateSavedQuery(id: string, updates: Partial<NewSavedQuery>): Promise<SavedQuery | null>;
    deleteSavedQuery(id: string): Promise<boolean>;
    setSetting<T>(key: string, value: T): Promise<void>;
    getSetting<T>(key: string, defaultValue?: T): Promise<T | undefined>;
    deleteSetting(key: string): Promise<boolean>;
    addAuditLog(entry: NewAuditLogEntry): Promise<AuditLogEntry>;
    getAuditLog(connectionId?: string, limit?: number): Promise<AuditLogEntry[]>;
    getAuditStats(connectionId?: string): Promise<{
        totalQueries: number;
        successfulQueries: number;
        failedQueries: number;
        riskyQueries: number;
    }>;
}
//# sourceMappingURL=database.d.ts.map