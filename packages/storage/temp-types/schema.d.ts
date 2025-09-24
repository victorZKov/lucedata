export declare const connections: import("drizzle-orm/sqlite-core").SQLiteTableWithColumns<{
    name: "connections";
    schema: undefined;
    columns: {
        id: import("drizzle-orm/sqlite-core").SQLiteColumn<{
            name: "id";
            tableName: "connections";
            dataType: "string";
            columnType: "SQLiteText";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            isPrimaryKey: true;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {
            length: number;
        }>;
        name: import("drizzle-orm/sqlite-core").SQLiteColumn<{
            name: "name";
            tableName: "connections";
            dataType: "string";
            columnType: "SQLiteText";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {
            length: number;
        }>;
        type: import("drizzle-orm/sqlite-core").SQLiteColumn<{
            name: "type";
            tableName: "connections";
            dataType: "string";
            columnType: "SQLiteText";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {
            length: number;
        }>;
        host: import("drizzle-orm/sqlite-core").SQLiteColumn<{
            name: "host";
            tableName: "connections";
            dataType: "string";
            columnType: "SQLiteText";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {
            length: number;
        }>;
        port: import("drizzle-orm/sqlite-core").SQLiteColumn<{
            name: "port";
            tableName: "connections";
            dataType: "number";
            columnType: "SQLiteInteger";
            data: number;
            driverParam: number;
            notNull: true;
            hasDefault: false;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: undefined;
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {}>;
        database: import("drizzle-orm/sqlite-core").SQLiteColumn<{
            name: "database";
            tableName: "connections";
            dataType: "string";
            columnType: "SQLiteText";
            data: string;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {
            length: number;
        }>;
        username: import("drizzle-orm/sqlite-core").SQLiteColumn<{
            name: "username";
            tableName: "connections";
            dataType: "string";
            columnType: "SQLiteText";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {
            length: number;
        }>;
        connectionString: import("drizzle-orm/sqlite-core").SQLiteColumn<{
            name: "connection_string";
            tableName: "connections";
            dataType: "string";
            columnType: "SQLiteText";
            data: string;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {
            length: number;
        }>;
        ssl: import("drizzle-orm/sqlite-core").SQLiteColumn<{
            name: "ssl";
            tableName: "connections";
            dataType: "boolean";
            columnType: "SQLiteBoolean";
            data: boolean;
            driverParam: number;
            notNull: false;
            hasDefault: true;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: undefined;
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {}>;
        options: import("drizzle-orm/sqlite-core").SQLiteColumn<{
            name: "options";
            tableName: "connections";
            dataType: "string";
            columnType: "SQLiteText";
            data: string;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {
            length: number;
        }>;
        createdAt: import("drizzle-orm/sqlite-core").SQLiteColumn<{
            name: "created_at";
            tableName: "connections";
            dataType: "string";
            columnType: "SQLiteText";
            data: string;
            driverParam: string;
            notNull: false;
            hasDefault: true;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {
            length: number;
        }>;
        updatedAt: import("drizzle-orm/sqlite-core").SQLiteColumn<{
            name: "updated_at";
            tableName: "connections";
            dataType: "string";
            columnType: "SQLiteText";
            data: string;
            driverParam: string;
            notNull: false;
            hasDefault: true;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {
            length: number;
        }>;
        lastUsed: import("drizzle-orm/sqlite-core").SQLiteColumn<{
            name: "last_used";
            tableName: "connections";
            dataType: "string";
            columnType: "SQLiteText";
            data: string;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {
            length: number;
        }>;
    };
    dialect: "sqlite";
}>;
export declare const queryHistory: import("drizzle-orm/sqlite-core").SQLiteTableWithColumns<{
    name: "query_history";
    schema: undefined;
    columns: {
        id: import("drizzle-orm/sqlite-core").SQLiteColumn<{
            name: "id";
            tableName: "query_history";
            dataType: "string";
            columnType: "SQLiteText";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            isPrimaryKey: true;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {
            length: number;
        }>;
        connectionId: import("drizzle-orm/sqlite-core").SQLiteColumn<{
            name: "connection_id";
            tableName: "query_history";
            dataType: "string";
            columnType: "SQLiteText";
            data: string;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {
            length: number;
        }>;
        query: import("drizzle-orm/sqlite-core").SQLiteColumn<{
            name: "query";
            tableName: "query_history";
            dataType: "string";
            columnType: "SQLiteText";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {
            length: number;
        }>;
        executionTime: import("drizzle-orm/sqlite-core").SQLiteColumn<{
            name: "execution_time";
            tableName: "query_history";
            dataType: "number";
            columnType: "SQLiteInteger";
            data: number;
            driverParam: number;
            notNull: false;
            hasDefault: false;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: undefined;
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {}>;
        rowCount: import("drizzle-orm/sqlite-core").SQLiteColumn<{
            name: "row_count";
            tableName: "query_history";
            dataType: "number";
            columnType: "SQLiteInteger";
            data: number;
            driverParam: number;
            notNull: false;
            hasDefault: false;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: undefined;
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {}>;
        success: import("drizzle-orm/sqlite-core").SQLiteColumn<{
            name: "success";
            tableName: "query_history";
            dataType: "boolean";
            columnType: "SQLiteBoolean";
            data: boolean;
            driverParam: number;
            notNull: true;
            hasDefault: false;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: undefined;
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {}>;
        errorMessage: import("drizzle-orm/sqlite-core").SQLiteColumn<{
            name: "error_message";
            tableName: "query_history";
            dataType: "string";
            columnType: "SQLiteText";
            data: string;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {
            length: number;
        }>;
        createdAt: import("drizzle-orm/sqlite-core").SQLiteColumn<{
            name: "created_at";
            tableName: "query_history";
            dataType: "string";
            columnType: "SQLiteText";
            data: string;
            driverParam: string;
            notNull: false;
            hasDefault: true;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {
            length: number;
        }>;
    };
    dialect: "sqlite";
}>;
export declare const savedQueries: import("drizzle-orm/sqlite-core").SQLiteTableWithColumns<{
    name: "saved_queries";
    schema: undefined;
    columns: {
        id: import("drizzle-orm/sqlite-core").SQLiteColumn<{
            name: "id";
            tableName: "saved_queries";
            dataType: "string";
            columnType: "SQLiteText";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            isPrimaryKey: true;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {
            length: number;
        }>;
        name: import("drizzle-orm/sqlite-core").SQLiteColumn<{
            name: "name";
            tableName: "saved_queries";
            dataType: "string";
            columnType: "SQLiteText";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {
            length: number;
        }>;
        description: import("drizzle-orm/sqlite-core").SQLiteColumn<{
            name: "description";
            tableName: "saved_queries";
            dataType: "string";
            columnType: "SQLiteText";
            data: string;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {
            length: number;
        }>;
        query: import("drizzle-orm/sqlite-core").SQLiteColumn<{
            name: "query";
            tableName: "saved_queries";
            dataType: "string";
            columnType: "SQLiteText";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {
            length: number;
        }>;
        tags: import("drizzle-orm/sqlite-core").SQLiteColumn<{
            name: "tags";
            tableName: "saved_queries";
            dataType: "string";
            columnType: "SQLiteText";
            data: string;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {
            length: number;
        }>;
        favorite: import("drizzle-orm/sqlite-core").SQLiteColumn<{
            name: "favorite";
            tableName: "saved_queries";
            dataType: "boolean";
            columnType: "SQLiteBoolean";
            data: boolean;
            driverParam: number;
            notNull: false;
            hasDefault: true;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: undefined;
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {}>;
        createdAt: import("drizzle-orm/sqlite-core").SQLiteColumn<{
            name: "created_at";
            tableName: "saved_queries";
            dataType: "string";
            columnType: "SQLiteText";
            data: string;
            driverParam: string;
            notNull: false;
            hasDefault: true;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {
            length: number;
        }>;
        updatedAt: import("drizzle-orm/sqlite-core").SQLiteColumn<{
            name: "updated_at";
            tableName: "saved_queries";
            dataType: "string";
            columnType: "SQLiteText";
            data: string;
            driverParam: string;
            notNull: false;
            hasDefault: true;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {
            length: number;
        }>;
    };
    dialect: "sqlite";
}>;
export declare const settings: import("drizzle-orm/sqlite-core").SQLiteTableWithColumns<{
    name: "settings";
    schema: undefined;
    columns: {
        key: import("drizzle-orm/sqlite-core").SQLiteColumn<{
            name: "key";
            tableName: "settings";
            dataType: "string";
            columnType: "SQLiteText";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            isPrimaryKey: true;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {
            length: number;
        }>;
        value: import("drizzle-orm/sqlite-core").SQLiteColumn<{
            name: "value";
            tableName: "settings";
            dataType: "string";
            columnType: "SQLiteText";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {
            length: number;
        }>;
        type: import("drizzle-orm/sqlite-core").SQLiteColumn<{
            name: "type";
            tableName: "settings";
            dataType: "string";
            columnType: "SQLiteText";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {
            length: number;
        }>;
        updatedAt: import("drizzle-orm/sqlite-core").SQLiteColumn<{
            name: "updated_at";
            tableName: "settings";
            dataType: "string";
            columnType: "SQLiteText";
            data: string;
            driverParam: string;
            notNull: false;
            hasDefault: true;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {
            length: number;
        }>;
    };
    dialect: "sqlite";
}>;
export declare const auditLog: import("drizzle-orm/sqlite-core").SQLiteTableWithColumns<{
    name: "audit_log";
    schema: undefined;
    columns: {
        id: import("drizzle-orm/sqlite-core").SQLiteColumn<{
            name: "id";
            tableName: "audit_log";
            dataType: "string";
            columnType: "SQLiteText";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            isPrimaryKey: true;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {
            length: number;
        }>;
        connectionId: import("drizzle-orm/sqlite-core").SQLiteColumn<{
            name: "connection_id";
            tableName: "audit_log";
            dataType: "string";
            columnType: "SQLiteText";
            data: string;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {
            length: number;
        }>;
        query: import("drizzle-orm/sqlite-core").SQLiteColumn<{
            name: "query";
            tableName: "audit_log";
            dataType: "string";
            columnType: "SQLiteText";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {
            length: number;
        }>;
        queryType: import("drizzle-orm/sqlite-core").SQLiteColumn<{
            name: "query_type";
            tableName: "audit_log";
            dataType: "string";
            columnType: "SQLiteText";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {
            length: number;
        }>;
        success: import("drizzle-orm/sqlite-core").SQLiteColumn<{
            name: "success";
            tableName: "audit_log";
            dataType: "boolean";
            columnType: "SQLiteBoolean";
            data: boolean;
            driverParam: number;
            notNull: true;
            hasDefault: false;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: undefined;
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {}>;
        rowsAffected: import("drizzle-orm/sqlite-core").SQLiteColumn<{
            name: "rows_affected";
            tableName: "audit_log";
            dataType: "number";
            columnType: "SQLiteInteger";
            data: number;
            driverParam: number;
            notNull: false;
            hasDefault: false;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: undefined;
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {}>;
        executionTime: import("drizzle-orm/sqlite-core").SQLiteColumn<{
            name: "execution_time";
            tableName: "audit_log";
            dataType: "number";
            columnType: "SQLiteInteger";
            data: number;
            driverParam: number;
            notNull: false;
            hasDefault: false;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: undefined;
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {}>;
        userAction: import("drizzle-orm/sqlite-core").SQLiteColumn<{
            name: "user_action";
            tableName: "audit_log";
            dataType: "string";
            columnType: "SQLiteText";
            data: string;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {
            length: number;
        }>;
        riskLevel: import("drizzle-orm/sqlite-core").SQLiteColumn<{
            name: "risk_level";
            tableName: "audit_log";
            dataType: "string";
            columnType: "SQLiteText";
            data: string;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {
            length: number;
        }>;
        createdAt: import("drizzle-orm/sqlite-core").SQLiteColumn<{
            name: "created_at";
            tableName: "audit_log";
            dataType: "string";
            columnType: "SQLiteText";
            data: string;
            driverParam: string;
            notNull: false;
            hasDefault: true;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {
            length: number;
        }>;
    };
    dialect: "sqlite";
}>;
export type Connection = typeof connections.$inferSelect;
export type NewConnection = typeof connections.$inferInsert;
export type QueryHistoryEntry = typeof queryHistory.$inferSelect;
export type NewQueryHistoryEntry = typeof queryHistory.$inferInsert;
export type SavedQuery = typeof savedQueries.$inferSelect;
export type NewSavedQuery = typeof savedQueries.$inferInsert;
export type Setting = typeof settings.$inferSelect;
export type NewSetting = typeof settings.$inferInsert;
export type AuditLogEntry = typeof auditLog.$inferSelect;
export type NewAuditLogEntry = typeof auditLog.$inferInsert;
export declare const aiEngines: import("drizzle-orm/sqlite-core").SQLiteTableWithColumns<{
    name: "ai_engines";
    schema: undefined;
    columns: {
        id: import("drizzle-orm/sqlite-core").SQLiteColumn<{
            name: "id";
            tableName: "ai_engines";
            dataType: "string";
            columnType: "SQLiteText";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            isPrimaryKey: true;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {
            length: number;
        }>;
        name: import("drizzle-orm/sqlite-core").SQLiteColumn<{
            name: "name";
            tableName: "ai_engines";
            dataType: "string";
            columnType: "SQLiteText";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {
            length: number;
        }>;
        provider: import("drizzle-orm/sqlite-core").SQLiteColumn<{
            name: "provider";
            tableName: "ai_engines";
            dataType: "string";
            columnType: "SQLiteText";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {
            length: number;
        }>;
        endpoint: import("drizzle-orm/sqlite-core").SQLiteColumn<{
            name: "endpoint";
            tableName: "ai_engines";
            dataType: "string";
            columnType: "SQLiteText";
            data: string;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {
            length: number;
        }>;
        apiKeyRef: import("drizzle-orm/sqlite-core").SQLiteColumn<{
            name: "api_key_ref";
            tableName: "ai_engines";
            dataType: "string";
            columnType: "SQLiteText";
            data: string;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {
            length: number;
        }>;
        defaultModel: import("drizzle-orm/sqlite-core").SQLiteColumn<{
            name: "default_model";
            tableName: "ai_engines";
            dataType: "string";
            columnType: "SQLiteText";
            data: string;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {
            length: number;
        }>;
        temperature: import("drizzle-orm/sqlite-core").SQLiteColumn<{
            name: "temperature";
            tableName: "ai_engines";
            dataType: "number";
            columnType: "SQLiteReal";
            data: number;
            driverParam: number;
            notNull: false;
            hasDefault: true;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: undefined;
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {}>;
        maxTokens: import("drizzle-orm/sqlite-core").SQLiteColumn<{
            name: "max_tokens";
            tableName: "ai_engines";
            dataType: "number";
            columnType: "SQLiteInteger";
            data: number;
            driverParam: number;
            notNull: false;
            hasDefault: true;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: undefined;
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {}>;
        timeoutMs: import("drizzle-orm/sqlite-core").SQLiteColumn<{
            name: "timeout_ms";
            tableName: "ai_engines";
            dataType: "number";
            columnType: "SQLiteInteger";
            data: number;
            driverParam: number;
            notNull: false;
            hasDefault: true;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: undefined;
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {}>;
        retryPolicy: import("drizzle-orm/sqlite-core").SQLiteColumn<{
            name: "retry_policy";
            tableName: "ai_engines";
            dataType: "string";
            columnType: "SQLiteText";
            data: string;
            driverParam: string;
            notNull: false;
            hasDefault: true;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {
            length: number;
        }>;
        jsonMode: import("drizzle-orm/sqlite-core").SQLiteColumn<{
            name: "json_mode";
            tableName: "ai_engines";
            dataType: "boolean";
            columnType: "SQLiteBoolean";
            data: boolean;
            driverParam: number;
            notNull: false;
            hasDefault: true;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: undefined;
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {}>;
        rateLimit: import("drizzle-orm/sqlite-core").SQLiteColumn<{
            name: "rate_limit";
            tableName: "ai_engines";
            dataType: "number";
            columnType: "SQLiteInteger";
            data: number;
            driverParam: number;
            notNull: false;
            hasDefault: true;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: undefined;
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {}>;
        notes: import("drizzle-orm/sqlite-core").SQLiteColumn<{
            name: "notes";
            tableName: "ai_engines";
            dataType: "string";
            columnType: "SQLiteText";
            data: string;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {
            length: number;
        }>;
        isDefault: import("drizzle-orm/sqlite-core").SQLiteColumn<{
            name: "is_default";
            tableName: "ai_engines";
            dataType: "boolean";
            columnType: "SQLiteBoolean";
            data: boolean;
            driverParam: number;
            notNull: false;
            hasDefault: true;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: undefined;
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {}>;
        createdAt: import("drizzle-orm/sqlite-core").SQLiteColumn<{
            name: "created_at";
            tableName: "ai_engines";
            dataType: "string";
            columnType: "SQLiteText";
            data: string;
            driverParam: string;
            notNull: false;
            hasDefault: true;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {
            length: number;
        }>;
        updatedAt: import("drizzle-orm/sqlite-core").SQLiteColumn<{
            name: "updated_at";
            tableName: "ai_engines";
            dataType: "string";
            columnType: "SQLiteText";
            data: string;
            driverParam: string;
            notNull: false;
            hasDefault: true;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {
            length: number;
        }>;
    };
    dialect: "sqlite";
}>;
export declare const chatConversations: import("drizzle-orm/sqlite-core").SQLiteTableWithColumns<{
    name: "chat_conversations";
    schema: undefined;
    columns: {
        id: import("drizzle-orm/sqlite-core").SQLiteColumn<{
            name: "id";
            tableName: "chat_conversations";
            dataType: "string";
            columnType: "SQLiteText";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            isPrimaryKey: true;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {
            length: number;
        }>;
        title: import("drizzle-orm/sqlite-core").SQLiteColumn<{
            name: "title";
            tableName: "chat_conversations";
            dataType: "string";
            columnType: "SQLiteText";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {
            length: number;
        }>;
        aiEngineId: import("drizzle-orm/sqlite-core").SQLiteColumn<{
            name: "ai_engine_id";
            tableName: "chat_conversations";
            dataType: "string";
            columnType: "SQLiteText";
            data: string;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {
            length: number;
        }>;
        connectionId: import("drizzle-orm/sqlite-core").SQLiteColumn<{
            name: "connection_id";
            tableName: "chat_conversations";
            dataType: "string";
            columnType: "SQLiteText";
            data: string;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {
            length: number;
        }>;
        isDeleted: import("drizzle-orm/sqlite-core").SQLiteColumn<{
            name: "is_deleted";
            tableName: "chat_conversations";
            dataType: "boolean";
            columnType: "SQLiteBoolean";
            data: boolean;
            driverParam: number;
            notNull: false;
            hasDefault: true;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: undefined;
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {}>;
        createdAt: import("drizzle-orm/sqlite-core").SQLiteColumn<{
            name: "created_at";
            tableName: "chat_conversations";
            dataType: "string";
            columnType: "SQLiteText";
            data: string;
            driverParam: string;
            notNull: false;
            hasDefault: true;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {
            length: number;
        }>;
        updatedAt: import("drizzle-orm/sqlite-core").SQLiteColumn<{
            name: "updated_at";
            tableName: "chat_conversations";
            dataType: "string";
            columnType: "SQLiteText";
            data: string;
            driverParam: string;
            notNull: false;
            hasDefault: true;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {
            length: number;
        }>;
    };
    dialect: "sqlite";
}>;
export declare const chatMessages: import("drizzle-orm/sqlite-core").SQLiteTableWithColumns<{
    name: "chat_messages";
    schema: undefined;
    columns: {
        id: import("drizzle-orm/sqlite-core").SQLiteColumn<{
            name: "id";
            tableName: "chat_messages";
            dataType: "string";
            columnType: "SQLiteText";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            isPrimaryKey: true;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {
            length: number;
        }>;
        conversationId: import("drizzle-orm/sqlite-core").SQLiteColumn<{
            name: "conversation_id";
            tableName: "chat_messages";
            dataType: "string";
            columnType: "SQLiteText";
            data: string;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {
            length: number;
        }>;
        role: import("drizzle-orm/sqlite-core").SQLiteColumn<{
            name: "role";
            tableName: "chat_messages";
            dataType: "string";
            columnType: "SQLiteText";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {
            length: number;
        }>;
        content: import("drizzle-orm/sqlite-core").SQLiteColumn<{
            name: "content";
            tableName: "chat_messages";
            dataType: "string";
            columnType: "SQLiteText";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {
            length: number;
        }>;
        toolCalls: import("drizzle-orm/sqlite-core").SQLiteColumn<{
            name: "tool_calls";
            tableName: "chat_messages";
            dataType: "string";
            columnType: "SQLiteText";
            data: string;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {
            length: number;
        }>;
        toolResults: import("drizzle-orm/sqlite-core").SQLiteColumn<{
            name: "tool_results";
            tableName: "chat_messages";
            dataType: "string";
            columnType: "SQLiteText";
            data: string;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {
            length: number;
        }>;
        tokens: import("drizzle-orm/sqlite-core").SQLiteColumn<{
            name: "tokens";
            tableName: "chat_messages";
            dataType: "number";
            columnType: "SQLiteInteger";
            data: number;
            driverParam: number;
            notNull: false;
            hasDefault: false;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: undefined;
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {}>;
        cost: import("drizzle-orm/sqlite-core").SQLiteColumn<{
            name: "cost";
            tableName: "chat_messages";
            dataType: "number";
            columnType: "SQLiteReal";
            data: number;
            driverParam: number;
            notNull: false;
            hasDefault: false;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: undefined;
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {}>;
        createdAt: import("drizzle-orm/sqlite-core").SQLiteColumn<{
            name: "created_at";
            tableName: "chat_messages";
            dataType: "string";
            columnType: "SQLiteText";
            data: string;
            driverParam: string;
            notNull: false;
            hasDefault: true;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {
            length: number;
        }>;
    };
    dialect: "sqlite";
}>;
export type AiEngine = typeof aiEngines.$inferSelect;
export type NewAiEngine = typeof aiEngines.$inferInsert;
export type ChatConversation = typeof chatConversations.$inferSelect;
export type NewChatConversation = typeof chatConversations.$inferInsert;
export type ChatMessage = typeof chatMessages.$inferSelect;
export type NewChatMessage = typeof chatMessages.$inferInsert;
