import sql from 'mssql';
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

export class SqlServerProvider implements IDatabaseProvider {
  readonly type = DatabaseType.SqlServer;
  private pool: sql.ConnectionPool | null = null;
  private config: sql.config | string | null = null;

  async connect(connection: DatabaseConnection): Promise<void> {
    try {
      console.log('🔗 SqlServerProvider: connect called');
      this.config = this.buildConfig(connection);
      if (typeof this.config === 'string') {
        console.log('🔧 Using connection string for ConnectionPool');
        this.pool = new sql.ConnectionPool(this.config);
      } else {
        const safeServer = (this.config as sql.config).server;
        const safePort = (this.config as sql.config).port;
        const safeDb = (this.config as sql.config).database;
        console.log('🔧 Using object config for ConnectionPool', { server: safeServer, port: safePort, database: safeDb });
        this.pool = new sql.ConnectionPool(this.config as sql.config);
      }
      await this.pool.connect();
    } catch (error) {
      throw new Error(`Failed to connect to SQL Server: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async disconnect(): Promise<void> {
    if (this.pool) {
      await this.pool.close();
      this.pool = null;
      this.config = null;
    }
  }

  isConnected(): boolean {
    return this.pool?.connected ?? false;
  }

  async testConnection(connection: DatabaseConnection): Promise<boolean> {
    try {
      const config = this.buildConfig(connection);
      let testPool: sql.ConnectionPool;
      if (typeof config === 'string') {
        console.log('🧪 Test connection using connection string');
        testPool = new sql.ConnectionPool(config);
      } else {
        console.log('🧪 Test connection using object config', { server: (config as sql.config).server, port: (config as sql.config).port, database: (config as sql.config).database });
        testPool = new sql.ConnectionPool(config as sql.config);
      }
      await testPool.connect();
      await testPool.close();
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
      console.log('🧵 SQL Server executeQuery:', query.replace(/\s+/g, ' ').trim().slice(0, 500));
      if (params && params.length) {
        console.log('🧵 Params:', params);
      }
      const request = new sql.Request(this.pool);
      const infoMessages: string[] = [];
      try {
        // @ts-ignore mssql Request emits 'info' for PRINT/RAISERROR messages
        request.on('info', (m: any) => {
          if (m && m.message) infoMessages.push(String(m.message));
        });
      } catch {}
      
      // Add parameters if provided
      if (params) {
        params.forEach((param, index) => {
          request.input(`param${index}`, param);
        });
      }

      const result = await request.query(query);
  const executionTime = Date.now() - startTime;

      // Convert result to our format
      const columns: ColumnInfo[] = result.recordset?.columns ? 
        Object.entries(result.recordset.columns).map(([name, col]: [string, any]) => ({
          name,
          dataType: typeof col.type === 'function' ? col.type().name : col.type?.name || 'unknown',
          nullable: col.nullable ?? true,
          isPrimaryKey: false, // SQL Server result doesn't include this info
          isForeignKey: false,
          maxLength: col.length,
          precision: col.precision,
          scale: col.scale
        })) : [];

  const messages: string[] = [...infoMessages];
      if (Array.isArray(result.rowsAffected)) {
        const total = result.rowsAffected.reduce((a: number, b: number) => a + b, 0);
        messages.push(`Rows affected: ${total}`);
      }
      messages.push(`Execution time: ${executionTime} ms`);

      return {
        columns,
        rows: result.recordset || [],
        rowCount: result.rowsAffected?.[0] ?? result.recordset?.length ?? 0,
        executionTime,
        messages
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
      const request = new sql.Request(this.pool);
      
      if (params) {
        params.forEach((param, index) => {
          request.input(`param${index}`, param);
        });
      }

      const result = await request.query(query);
      return result.rowsAffected?.[0] ?? 0;
    } catch (error) {
      throw new Error(`Non-query execution failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async getExecutionPlan(query: string): Promise<ExecutionPlan> {
    if (!this.pool) {
      throw new Error('Not connected to database');
    }

    try {
      const request = new sql.Request(this.pool);
      
      // Enable execution plan
      await request.query('SET SHOWPLAN_ALL ON');
      const planResult = await request.query(query);
      await request.query('SET SHOWPLAN_ALL OFF');

      // Parse the execution plan (simplified)
      const operations = planResult.recordset?.map((row: any) => ({
        operation: row.PhysicalOp || row.LogicalOp || 'Unknown',
        table: row.Argument || undefined,
        cost: parseFloat(row.EstimateCPU || '0') + parseFloat(row.EstimateIO || '0'),
        rows: parseInt(row.EstimateRows || '0'),
        details: row
      })) || [];

      const totalCost = operations.reduce((sum: number, op: any) => sum + op.cost, 0);

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
      SELECT DISTINCT schema_name 
      FROM information_schema.schemata 
      WHERE schema_name NOT IN ('information_schema', 'sys')
      ORDER BY schema_name
    `);
    
    return result.rows.map(row => (row.schema_name ?? row.schema) as string);
  }

  async getTables(schema = 'dbo'): Promise<TableInfo[]> {
    const result = await this.executeQuery(`
      SELECT 
        t.table_name as name,
        t.table_schema as [schema],
        t.table_type as [type]
      FROM information_schema.tables t
      WHERE t.table_schema = @param0
      ORDER BY t.table_name
    `, [schema]);

    return result.rows.map(row => ({
      name: row.name as string,
      schema: row.schema as string,
      type: (row.type as string).toLowerCase().includes('view') ? 'view' : 'table'
    }));
  }

  async getColumns(table: string, schema = 'dbo'): Promise<ColumnInfo[]> {
    const result = await this.executeQuery(`
      SELECT 
        c.column_name as name,
        c.data_type as dataType,
        c.is_nullable as nullable,
        CASE WHEN pk.column_name IS NOT NULL THEN 1 ELSE 0 END as isPrimaryKey,
        CASE WHEN fk.column_name IS NOT NULL THEN 1 ELSE 0 END as isForeignKey,
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
          AND tc.table_name = @param0 
          AND tc.table_schema = @param1
      ) pk ON c.column_name = pk.column_name
      LEFT JOIN (
        SELECT ku.column_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage ku ON tc.constraint_name = ku.constraint_name
        WHERE tc.constraint_type = 'FOREIGN KEY' 
          AND tc.table_name = @param0 
          AND tc.table_schema = @param1
      ) fk ON c.column_name = fk.column_name
      WHERE c.table_name = @param0 AND c.table_schema = @param1
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

    // Get stored procedures and functions
    const procResult = await this.executeQuery(`
      SELECT 
        routine_name as name,
        routine_schema as [schema],
        routine_type as [type]
      FROM information_schema.routines
      WHERE routine_schema NOT IN ('information_schema', 'sys')
      ORDER BY routine_name
    `);

    procResult.rows.forEach(row => {
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
    return `[${identifier.replace(/\]/g, ']]')}]`;
  }

  async formatQuery(query: string): Promise<string> {
    // Basic SQL formatting - in production you'd use a proper SQL formatter
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
      const request = new sql.Request(this.pool);
      
      // Use SET PARSEONLY to validate syntax without executing
      await request.query('SET PARSEONLY ON');
      await request.query(query);
      await request.query('SET PARSEONLY OFF');
      
      return { isValid: true, errors: [] };
    } catch (error) {
      return { 
        isValid: false, 
        errors: [error instanceof Error ? error.message : String(error)] 
      };
    }
  }

  private buildConfig(connection: DatabaseConnection): sql.config | string {
    // If connection string is provided, use it directly
    if (connection.connectionString) {
      return connection.connectionString;
    }

    // Otherwise, build config from individual parameters
    const config: sql.config = {
      user: connection.username,
      password: connection.password,
      server: connection.host,
      port: connection.port,
      database: connection.database,
      options: {
        encrypt: true, // Required for Azure SQL
        trustServerCertificate: false, // Don't trust self-signed certificates for Azure
        enableArithAbort: true,
        ...connection.options
      },
      pool: {
        max: 10,
        min: 0,
        idleTimeoutMillis: 30000
      }
    };

    return config;
  }
}