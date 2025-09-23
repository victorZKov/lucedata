import { Pool, Client } from 'pg';
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

export class PostgreSQLProvider implements IDatabaseProvider {
  readonly type = DatabaseType.PostgreSQL;
  private pool: Pool | null = null;
  private config: any = null;

  async connect(connection: DatabaseConnection): Promise<void> {
    try {
      this.config = this.buildConfig(connection);
      this.pool = new Pool(this.config);
      
      // Test the connection
      const client = await this.pool.connect();
      client.release();
    } catch (error) {
      throw new Error(`Failed to connect to PostgreSQL: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async disconnect(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
      this.config = null;
    }
  }

  isConnected(): boolean {
    return this.pool !== null;
  }

  async testConnection(connection: DatabaseConnection): Promise<boolean> {
    try {
      const config = this.buildConfig(connection);
      const client = new Client(config);
      await client.connect();
      await client.end();
      return true;
    } catch {
      return false;
    }
  }

  async executeQuery(query: string, params?: unknown[]): Promise<QueryResult> {
    if (!this.pool) {
      throw new Error('Not connected to database');
    }

    const startTime = Date.now();
    try {
      const client = await this.pool.connect();
      const result = await client.query(query, params);
      client.release();
      
      const executionTime = Date.now() - startTime;

      // Convert result to our format
      const columns: ColumnInfo[] = result.fields.map(field => ({
        name: field.name,
        dataType: this.getPostgreSQLTypeName(field.dataTypeID),
        nullable: true, // PostgreSQL doesn't provide this in query results
        isPrimaryKey: false,
        isForeignKey: false,
        maxLength: field.dataTypeSize > 0 ? field.dataTypeSize : undefined,
        precision: field.dataTypeModifier > 0 ? field.dataTypeModifier : undefined,
        scale: undefined
      }));

      return {
        columns,
        rows: result.rows,
        rowCount: result.rowCount || result.rows.length,
        executionTime,
        messages: []
      };
    } catch (error) {
      throw new Error(`Query execution failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async executeNonQuery(query: string, params?: unknown[]): Promise<number> {
    if (!this.pool) {
      throw new Error('Not connected to database');
    }

    try {
      const client = await this.pool.connect();
      const result = await client.query(query, params);
      client.release();
      return result.rowCount || 0;
    } catch (error) {
      throw new Error(`Non-query execution failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async getExecutionPlan(query: string): Promise<ExecutionPlan> {
    if (!this.pool) {
      throw new Error('Not connected to database');
    }

    try {
      const client = await this.pool.connect();
      const planQuery = `EXPLAIN (FORMAT JSON, ANALYZE, BUFFERS) ${query}`;
      const result = await client.query(planQuery);
      client.release();

      const plan = result.rows[0]['QUERY PLAN'][0];
      const operations = this.extractPlanOperations(plan);
      const totalCost = plan['Total Cost'] || 0;

      return {
        query,
        estimatedCost: totalCost,
        operations
      };
    } catch (error) {
      throw new Error(`Failed to get execution plan: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async getSchemas(): Promise<string[]> {
    const result = await this.executeQuery(`
      SELECT schema_name 
      FROM information_schema.schemata 
      WHERE schema_name NOT IN ('information_schema', 'pg_catalog', 'pg_toast')
      ORDER BY schema_name
    `);
    
    return result.rows.map(row => row.schema_name as string);
  }

  async getTables(schema = 'public'): Promise<TableInfo[]> {
    const result = await this.executeQuery(`
      SELECT 
        t.table_name as name,
        t.table_schema as schema,
        t.table_type as type
      FROM information_schema.tables t
      WHERE t.table_schema = $1
      ORDER BY t.table_name
    `, [schema]);

    return result.rows.map(row => ({
      name: row.name as string,
      schema: row.schema as string,
      type: (row.type as string).toLowerCase().includes('view') ? 'view' : 'table'
    }));
  }

  async getColumns(table: string, schema = 'public'): Promise<ColumnInfo[]> {
    const result = await this.executeQuery(`
      SELECT 
        c.column_name as name,
        c.data_type as dataType,
        c.is_nullable as nullable,
        CASE WHEN pk.column_name IS NOT NULL THEN true ELSE false END as isPrimaryKey,
        CASE WHEN fk.column_name IS NOT NULL THEN true ELSE false END as isForeignKey,
        c.column_default as defaultValue,
        c.character_maximum_length as maxLength,
        c.numeric_precision as precision,
        c.numeric_scale as scale
      FROM information_schema.columns c
      LEFT JOIN (
        SELECT ku.column_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage ku ON tc.constraint_name = ku.constraint_name
        WHERE tc.constraint_type = 'PRIMARY KEY' 
          AND tc.table_name = $1 
          AND tc.table_schema = $2
      ) pk ON c.column_name = pk.column_name
      LEFT JOIN (
        SELECT ku.column_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage ku ON tc.constraint_name = ku.constraint_name
        WHERE tc.constraint_type = 'FOREIGN KEY' 
          AND tc.table_name = $1 
          AND tc.table_schema = $2
      ) fk ON c.column_name = fk.column_name
      WHERE c.table_name = $1 AND c.table_schema = $2
      ORDER BY c.ordinal_position
    `, [table, schema]);

    return result.rows.map(row => ({
      name: row.name as string,
      dataType: row.dataType as string,
      nullable: row.nullable === 'YES',
      isPrimaryKey: !!row.isPrimaryKey,
      isForeignKey: !!row.isForeignKey,
      defaultValue: row.defaultValue as string,
      maxLength: row.maxLength as number,
      precision: row.precision as number,
      scale: row.scale as number
    }));
  }

  async getSchemaInfo(): Promise<SchemaInfo> {
    const schemas = await this.getSchemas();
    const allTables: TableInfo[] = [];
    const views: TableInfo[] = [];
    const procedures: TableInfo[] = [];
    const functions: TableInfo[] = [];

    for (const schema of schemas) {
      const tables = await this.getTables(schema);
      allTables.push(...tables.filter(t => t.type === 'table'));
      views.push(...tables.filter(t => t.type === 'view'));
    }

    // Get functions and procedures
    const funcResult = await this.executeQuery(`
      SELECT 
        routine_name as name,
        routine_schema as schema,
        routine_type as type
      FROM information_schema.routines
      WHERE routine_schema NOT IN ('information_schema', 'pg_catalog')
      ORDER BY routine_name
    `);

    funcResult.rows.forEach(row => {
      const item: TableInfo = {
        name: row.name as string,
        schema: row.schema as string,
        type: (row.type as string).toLowerCase() === 'function' ? 'function' : 'procedure'
      };
      
      if (item.type === 'function') {
        functions.push(item);
      } else {
        procedures.push(item);
      }
    });

    return {
      tables: allTables,
      views,
      procedures,
      functions
    };
  }

  escapeIdentifier(identifier: string): string {
    return `"${identifier.replace(/"/g, '""')}"`;
  }

  async formatQuery(query: string): Promise<string> {
    // Basic SQL formatting for PostgreSQL
    return query
      .replace(/\s+/g, ' ')
      .replace(/\s*,\s*/g, ',\n  ')
      .replace(/\s*(SELECT|FROM|WHERE|JOIN|ORDER BY|GROUP BY)\s+/gi, '\n$1 ')
      .trim();
  }

  async validateQuery(query: string): Promise<{ isValid: boolean; errors: string[] }> {
    if (!this.pool) {
      return { isValid: false, errors: ['Not connected to database'] };
    }

    try {
      const client = await this.pool.connect();
      
      // Use EXPLAIN to validate syntax without executing
      await client.query(`EXPLAIN ${query}`);
      client.release();
      
      return { isValid: true, errors: [] };
    } catch (error) {
      return { 
        isValid: false, 
        errors: [error instanceof Error ? error.message : String(error)] 
      };
    }
  }

  private buildConfig(connection: DatabaseConnection): any {
    const poolConfig: PoolConfig = {
      min: 2,
      max: 10,
      acquireTimeoutMillis: 60000,
      idleTimeoutMillis: 30000
    };

    return {
      host: connection.host,
      port: connection.port,
      database: connection.database,
      user: connection.username,
      password: connection.password,
      ssl: connection.ssl ? { rejectUnauthorized: false } : false,
      min: poolConfig.min,
      max: poolConfig.max,
      acquireTimeoutMillis: poolConfig.acquireTimeoutMillis,
      idleTimeoutMillis: poolConfig.idleTimeoutMillis,
      ...connection.options
    };
  }

  private getPostgreSQLTypeName(typeId: number): string {
    // Map PostgreSQL type OIDs to readable names
    const typeMap: Record<number, string> = {
      16: 'boolean',
      17: 'bytea',
      20: 'bigint',
      21: 'smallint',
      23: 'integer',
      25: 'text',
      700: 'real',
      701: 'double precision',
      1043: 'varchar',
      1082: 'date',
      1114: 'timestamp',
      1184: 'timestamptz'
    };
    
    return typeMap[typeId] || 'unknown';
  }

  private extractPlanOperations(plan: any): any[] {
    const operations: any[] = [];
    
    const traverse = (node: any) => {
      operations.push({
        operation: node['Node Type'] || 'Unknown',
        table: node['Relation Name'] || undefined,
        cost: (node['Total Cost'] || 0) - (node['Startup Cost'] || 0),
        rows: node['Plan Rows'] || 0,
        details: node
      });
      
      if (node.Plans) {
        node.Plans.forEach(traverse);
      }
    };
    
    traverse(plan);
    return operations;
  }
}