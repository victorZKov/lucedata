// Core database types and interfaces
export interface DatabaseConnection {
  id: string;
  name: string;
  type: DatabaseType;
  host: string;
  port: number;
  database?: string;
  username: string;
  password?: string;
  connectionString?: string;
  ssl?: boolean;
  options?: Record<string, unknown>;
}

export enum DatabaseType {
  SqlServer = "sqlserver",
  PostgreSQL = "postgresql",
  MySQL = "mysql",
  SQLite = "sqlite",
  Oracle = "oracle",
}

export interface TableInfo {
  name: string;
  schema: string;
  type: "table" | "view" | "procedure" | "function";
  rowCount?: number;
}

export interface ColumnInfo {
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
}

export interface QueryResult {
  columns: ColumnInfo[];
  rows: Record<string, unknown>[];
  rowCount: number;
  executionTime: number;
  messages?: string[];
}

export interface SchemaInfo {
  tables: TableInfo[];
  views: TableInfo[];
  procedures: TableInfo[];
  functions: TableInfo[];
}

export interface ExecutionPlan {
  query: string;
  estimatedCost: number;
  operations: PlanOperation[];
}

export interface PlanOperation {
  operation: string;
  table?: string;
  cost: number;
  rows: number;
  details: Record<string, unknown>;
}

// Connection pooling
export interface PoolConfig {
  min: number;
  max: number;
  acquireTimeoutMillis: number;
  idleTimeoutMillis: number;
}

// Enhanced metadata types for tree enhancements
export type DbEngine = "sqlserver" | "postgres" | "sqlite";

export interface TableRef {
  engine: DbEngine;
  database?: string;
  schema?: string;
  name: string;
}

export interface KeyInfo {
  name: string;
  type: "PRIMARY" | "FOREIGN" | "UNIQUE";
  columns: string[];
  references?: {
    schema?: string;
    table: string;
    columns: string[];
  };
}

export interface ConstraintInfo {
  name: string;
  type: "CHECK" | "DEFAULT" | "UNIQUE" | "EXCLUDE" | "OTHER";
  definition?: string;
  columns?: string[];
}

export interface TriggerInfo {
  name: string;
  timing: "BEFORE" | "AFTER" | "INSTEAD OF" | "UNKNOWN";
  events: string[];
  enabled?: boolean;
  definition?: string;
}

export interface IndexInfo {
  name: string;
  unique: boolean;
  method?: string;
  columns: string[];
  include?: string[];
  where?: string | null;
  isPrimary?: boolean;
}

// Database provider interface
export interface IDatabaseProvider {
  readonly type: DatabaseType;

  // Connection management
  connect(connection: DatabaseConnection): Promise<void>;
  disconnect(): Promise<void>;
  isConnected(): boolean;
  testConnection(connection: DatabaseConnection): Promise<boolean>;

  // Query execution
  executeQuery(query: string, params?: unknown[]): Promise<QueryResult>;
  executeNonQuery(query: string, params?: unknown[]): Promise<number>;
  getExecutionPlan(query: string): Promise<ExecutionPlan>;

  // Schema introspection
  getSchemas(): Promise<string[]>;
  getTables(schema?: string): Promise<TableInfo[]>;
  getColumns(table: string, schema?: string): Promise<ColumnInfo[]>;
  getSchemaInfo(): Promise<SchemaInfo>;

  // Enhanced metadata methods for tree enhancements
  getKeys?(table: string, schema?: string): Promise<KeyInfo[]>;
  getConstraints?(table: string, schema?: string): Promise<ConstraintInfo[]>;
  getTriggers?(table: string, schema?: string): Promise<TriggerInfo[]>;
  getIndexes?(table: string, schema?: string): Promise<IndexInfo[]>;

  // Utility methods
  escapeIdentifier(identifier: string): string;
  formatQuery(query: string): Promise<string>;
  validateQuery(query: string): Promise<{ isValid: boolean; errors: string[] }>;
}
