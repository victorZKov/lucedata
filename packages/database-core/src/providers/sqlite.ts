import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { 
  IDatabaseProvider, 
  DatabaseConnection, 
  DatabaseType, 
  QueryResult, 
  TableInfo, 
  ColumnInfo,
  SchemaInfo,
  ExecutionPlan,
  PoolConfig 
} from '../types.js';

export class SQLiteProvider implements IDatabaseProvider {
  readonly type = DatabaseType.SQLite;
  private db: Database.Database | null = null;
  private config: DatabaseConnection | null = null;

  async connect(connection: DatabaseConnection): Promise<void> {
    try {
      this.config = connection;
      
      // For SQLite, the database path is either in connectionString or database field
      const dbPath = connection.connectionString || connection.database;
      if (!dbPath) {
        throw new Error('Database path is required for SQLite connection');
      }

      // Ensure the directory exists
      const dir = path.dirname(dbPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      this.db = new Database(dbPath);
      
      // Test the connection with a simple query
      this.db.prepare('SELECT 1').get();
    } catch (error) {
      throw new Error(`Failed to connect to SQLite: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async disconnect(): Promise<void> {
    if (this.db) {
      this.db.close();
      this.db = null;
      this.config = null;
    }
  }

  isConnected(): boolean {
    return this.db !== null && this.db.open;
  }

  async testConnection(connection: DatabaseConnection): Promise<boolean> {
    try {
      const dbPath = connection.connectionString || connection.database;
      if (!dbPath) {
        return false;
      }

      const testDb = new Database(dbPath);
      testDb.prepare('SELECT 1').get();
      testDb.close();
      return true;
    } catch {
      return false;
    }
  }

  async query(sql: string, params?: any[]): Promise<QueryResult> {
    if (!this.db) {
      throw new Error('Not connected to database');
    }

    const startTime = Date.now();

    try {
      const stmt = this.db.prepare(sql);
      let result: any;
      let affectedRows = 0;

      // Determine if this is a SELECT query
      const isSelect = sql.trim().toLowerCase().startsWith('select');
      
      if (isSelect) {
        result = params ? stmt.all(...params) : stmt.all();
      } else {
        result = params ? stmt.run(...params) : stmt.run();
        affectedRows = result.changes || 0;
      }

      const executionTime = Date.now() - startTime;

      // For SELECT queries, build column info from result
      const columns: ColumnInfo[] = [];
      if (isSelect && result.length > 0) {
        Object.keys(result[0]).forEach(key => {
          columns.push({
            name: key,
            dataType: typeof result[0][key] === 'number' ? 'INTEGER' : 'TEXT',
            nullable: true,
            isPrimaryKey: false,
            isForeignKey: false,
          });
        });
      }

      return {
        rows: isSelect ? result : [],
        rowCount: isSelect ? result.length : affectedRows,
        columns,
        executionTime,
        messages: [],
      };
    } catch (error) {
      throw new Error(`Query failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async getSchemaInfo(): Promise<SchemaInfo> {
    if (!this.db) {
      throw new Error('Not connected to database');
    }

    try {
      // Get all tables
      const tablesResult = this.db.prepare(`
        SELECT name, type 
        FROM sqlite_master 
        WHERE type IN ('table', 'view') 
        AND name NOT LIKE 'sqlite_%'
        ORDER BY name
      `).all() as any[];

      const tables: TableInfo[] = [];
      const views: TableInfo[] = [];
      
      for (const tableRow of tablesResult) {
        if (tableRow.type === 'table') {
          tables.push({
            name: tableRow.name,
            schema: 'main', // SQLite uses 'main' as default schema
            type: 'table',
            rowCount: 0, // Could get this with SELECT COUNT(*) if needed
          });
        } else if (tableRow.type === 'view') {
          views.push({
            name: tableRow.name,
            schema: 'main',
            type: 'view',
            rowCount: 0,
          });
        }
      }

      return {
        tables,
        views,
        procedures: [], // SQLite doesn't have stored procedures
        functions: [], // SQLite has limited function support
      };
    } catch (error) {
      throw new Error(`Failed to get schema: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async getTables(schema?: string): Promise<TableInfo[]> {
    const schemaInfo = await this.getSchemaInfo();
    return schemaInfo.tables || [];
  }

  async getSchemas(): Promise<string[]> {
    return ['main']; // SQLite typically uses 'main' as the default schema
  }

  async getColumns(table: string, schema?: string): Promise<ColumnInfo[]> {
    if (!this.db) {
      throw new Error('Not connected to database');
    }

    try {
      const columns = this.db.prepare(`PRAGMA table_info(${table})`).all() as any[];
      
      return columns.map(col => ({
        name: col.name,
        dataType: col.type || 'TEXT',
        nullable: !col.notnull,
        isPrimaryKey: !!col.pk,
        isForeignKey: false, // We'd need to check foreign keys separately
        maxLength: undefined,
      }));
    } catch (error) {
      throw new Error(`Failed to get columns for table ${table}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async executeNonQuery(query: string, params?: unknown[]): Promise<number> {
    if (!this.db) {
      throw new Error('Not connected to database');
    }

    try {
      const stmt = this.db.prepare(query);
      const result = params ? stmt.run(...params) : stmt.run();
      return result.changes || 0;
    } catch (error) {
      throw new Error(`Non-query execution failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  escapeIdentifier(identifier: string): string {
    // SQLite uses double quotes for identifiers
    return `"${identifier.replace(/"/g, '""')}"`;
  }

  async formatQuery(query: string): Promise<string> {
    // Basic formatting - in a real implementation, you might use a SQL formatter library
    return query.trim();
  }

  async validateQuery(query: string): Promise<{ isValid: boolean; errors: string[] }> {
    if (!this.db) {
      return { isValid: false, errors: ['Not connected to database'] };
    }

    try {
      // Try to prepare the query to validate syntax
      const stmt = this.db.prepare(query);
      return { isValid: true, errors: [] };
    } catch (error) {
      return { 
        isValid: false, 
        errors: [error instanceof Error ? error.message : String(error)] 
      };
    }
  }

  async getTableInfo(tableName: string, schema?: string): Promise<TableInfo | null> {
    const tables = await this.getTables(schema);
    return tables.find(t => t.name === tableName) || null;
  }

  async executeQuery(sql: string, params?: any[]): Promise<QueryResult> {
    return this.query(sql, params);
  }

  async getExecutionPlan(sql: string): Promise<ExecutionPlan> {
    if (!this.db) {
      throw new Error('Not connected to database');
    }

    try {
      const plan = this.db.prepare(`EXPLAIN QUERY PLAN ${sql}`).all();
      
      return {
        query: sql,
        estimatedCost: 0, // SQLite doesn't provide cost estimates
        operations: plan.map((row: any) => ({
          operation: row.detail,
          table: undefined,
          cost: 0,
          rows: 0,
          details: row,
        })),
      };
    } catch (error) {
      throw new Error(`Failed to get execution plan: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}