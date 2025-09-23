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
  SqlServer = 'sqlserver',
  PostgreSQL = 'postgresql', 
  MySQL = 'mysql',
  SQLite = 'sqlite',
  Oracle = 'oracle'
}

export interface TableInfo {
  name: string;
  schema: string;
  type: 'table' | 'view' | 'procedure' | 'function';
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
  
  // Utility methods
  escapeIdentifier(identifier: string): string;
  formatQuery(query: string): Promise<string>;
  validateQuery(query: string): Promise<{ isValid: boolean; errors: string[] }>;
}