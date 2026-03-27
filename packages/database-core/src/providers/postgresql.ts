import { Pool, Client } from "pg";

import {
  IDatabaseProvider,
  DatabaseConnection,
  DatabaseType,
  QueryResult,
  TableInfo,
  ColumnInfo,
  SchemaInfo,
  ExecutionPlan,
  PoolConfig,
  KeyInfo,
  ConstraintInfo,
  TriggerInfo,
  IndexInfo,
} from "../types.js";

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
      throw new Error(
        `Failed to connect to PostgreSQL: ${error instanceof Error ? error.message : String(error)}`
      );
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
      throw new Error("Not connected to database");
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
        precision:
          field.dataTypeModifier > 0 ? field.dataTypeModifier : undefined,
        scale: undefined,
      }));

      return {
        columns,
        rows: result.rows,
        rowCount: result.rowCount || result.rows.length,
        executionTime,
        messages: [],
      };
    } catch (error) {
      throw new Error(
        `Query execution failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  async executeNonQuery(query: string, params?: unknown[]): Promise<number> {
    if (!this.pool) {
      throw new Error("Not connected to database");
    }

    try {
      const client = await this.pool.connect();
      const result = await client.query(query, params);
      client.release();
      return result.rowCount || 0;
    } catch (error) {
      throw new Error(
        `Non-query execution failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  async getExecutionPlan(query: string): Promise<ExecutionPlan> {
    if (!this.pool) {
      throw new Error("Not connected to database");
    }

    try {
      const client = await this.pool.connect();
      const planQuery = `EXPLAIN (FORMAT JSON, ANALYZE, BUFFERS) ${query}`;
      const result = await client.query(planQuery);
      client.release();

      const plan = result.rows[0]["QUERY PLAN"][0];
      const operations = this.extractPlanOperations(plan);
      const totalCost = plan["Total Cost"] || 0;

      return {
        query,
        estimatedCost: totalCost,
        operations,
      };
    } catch (error) {
      throw new Error(
        `Failed to get execution plan: ${error instanceof Error ? error.message : String(error)}`
      );
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

  async getTables(schema = "public"): Promise<TableInfo[]> {
    const result = await this.executeQuery(
      `
      SELECT 
        t.table_name as name,
        t.table_schema as schema,
        t.table_type as type
      FROM information_schema.tables t
      WHERE t.table_schema = $1
      ORDER BY t.table_name
    `,
      [schema]
    );

    return result.rows.map(row => ({
      name: row.name as string,
      schema: row.schema as string,
      type: (row.type as string).toLowerCase().includes("view")
        ? "view"
        : "table",
    }));
  }

  async getColumns(table: string, schema = "public"): Promise<ColumnInfo[]> {
    const result = await this.executeQuery(
      `
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
    `,
      [table, schema]
    );

    return result.rows.map(row => ({
      name: row.name as string,
      dataType: row.dataType as string,
      nullable: row.nullable === "YES",
      isPrimaryKey: !!row.isPrimaryKey,
      isForeignKey: !!row.isForeignKey,
      defaultValue: row.defaultValue as string,
      maxLength: row.maxLength as number,
      precision: row.precision as number,
      scale: row.scale as number,
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
      allTables.push(...tables.filter(t => t.type === "table"));
      views.push(...tables.filter(t => t.type === "view"));
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
        type:
          (row.type as string).toLowerCase() === "function"
            ? "function"
            : "procedure",
      };

      if (item.type === "function") {
        functions.push(item);
      } else {
        procedures.push(item);
      }
    });

    return {
      tables: allTables,
      views,
      procedures,
      functions,
    };
  }

  escapeIdentifier(identifier: string): string {
    return `"${identifier.replace(/"/g, '""')}"`;
  }

  async formatQuery(query: string): Promise<string> {
    // Basic SQL formatting for PostgreSQL
    return query
      .replace(/\s+/g, " ")
      .replace(/\s*,\s*/g, ",\n  ")
      .replace(/\s*(SELECT|FROM|WHERE|JOIN|ORDER BY|GROUP BY)\s+/gi, "\n$1 ")
      .trim();
  }

  async validateQuery(
    query: string
  ): Promise<{ isValid: boolean; errors: string[] }> {
    if (!this.pool) {
      return { isValid: false, errors: ["Not connected to database"] };
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
        errors: [error instanceof Error ? error.message : String(error)],
      };
    }
  }

  async getKeys(table: string, schema = "public"): Promise<KeyInfo[]> {
    const result = await this.executeQuery(
      `
      SELECT 
        tc.constraint_name as name,
        tc.constraint_type as type,
        kcu.column_name,
        ccu.table_schema as referenced_schema,
        ccu.table_name as referenced_table,
        ccu.column_name as referenced_column
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
      LEFT JOIN information_schema.constraint_column_usage ccu ON tc.constraint_name = ccu.constraint_name
      WHERE tc.table_name = $1 AND tc.table_schema = $2
        AND tc.constraint_type IN ('PRIMARY KEY', 'FOREIGN KEY', 'UNIQUE')
      ORDER BY tc.constraint_name, kcu.ordinal_position
    `,
      [table, schema]
    );

    const keyMap = new Map<string, KeyInfo>();

    result.rows.forEach(row => {
      const keyName = row.name as string;
      if (!keyMap.has(keyName)) {
        const keyType: KeyInfo["type"] =
          (row.type as string) === "PRIMARY KEY"
            ? "PRIMARY"
            : (row.type as string) === "FOREIGN KEY"
              ? "FOREIGN"
              : "UNIQUE";
        keyMap.set(keyName, {
          name: keyName,
          type: keyType,
          columns: [],
          references: row.referenced_table
            ? {
                schema: row.referenced_schema as string,
                table: row.referenced_table as string,
                columns: [],
              }
            : undefined,
        });
      }

      const key = keyMap.get(keyName)!;
      key.columns.push(row.column_name as string);
      if (key.references && row.referenced_column) {
        key.references.columns.push(row.referenced_column as string);
      }
    });

    return Array.from(keyMap.values());
  }

  async getConstraints(
    table: string,
    schema = "public"
  ): Promise<ConstraintInfo[]> {
    const result = await this.executeQuery(
      `
      SELECT 
        tc.constraint_name as name,
        tc.constraint_type as type,
        cc.check_clause as definition,
        kcu.column_name
      FROM information_schema.table_constraints tc
      LEFT JOIN information_schema.check_constraints cc ON tc.constraint_name = cc.constraint_name
      LEFT JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
      WHERE tc.table_name = $1 AND tc.table_schema = $2
        AND tc.constraint_type IN ('CHECK', 'UNIQUE', 'EXCLUDE')
      ORDER BY tc.constraint_name
    `,
      [table, schema]
    );

    const constraintMap = new Map<string, ConstraintInfo>();

    result.rows.forEach(row => {
      const constraintName = row.name as string;
      if (!constraintMap.has(constraintName)) {
        let type: ConstraintInfo["type"];
        switch (row.type as string) {
          case "CHECK":
            type = "CHECK";
            break;
          case "UNIQUE":
            type = "UNIQUE";
            break;
          case "EXCLUDE":
            type = "EXCLUDE";
            break;
          default:
            type = "OTHER";
            break;
        }

        constraintMap.set(constraintName, {
          name: constraintName,
          type,
          definition: row.definition as string,
          columns: [],
        });
      }

      const constraint = constraintMap.get(constraintName)!;
      if (
        row.column_name &&
        !constraint.columns!.includes(row.column_name as string)
      ) {
        constraint.columns!.push(row.column_name as string);
      }
    });

    return Array.from(constraintMap.values());
  }

  async getTriggers(table: string, schema = "public"): Promise<TriggerInfo[]> {
    const result = await this.executeQuery(
      `
      SELECT 
        t.trigger_name as name,
        t.action_timing as timing,
        t.event_manipulation as events,
        t.action_statement as definition,
        CASE WHEN t.status = 'ENABLED' THEN true ELSE false END as enabled
      FROM information_schema.triggers t
      WHERE t.event_object_table = $1 AND t.event_object_schema = $2
      ORDER BY t.trigger_name
    `,
      [table, schema]
    );

    return result.rows.map(row => {
      const timing = row.timing as string;
      const validTiming: TriggerInfo["timing"] =
        timing === "BEFORE" || timing === "AFTER" || timing === "INSTEAD OF"
          ? timing
          : "UNKNOWN";

      return {
        name: row.name as string,
        timing: validTiming,
        events: [row.events as string],
        enabled: !!row.enabled,
        definition: row.definition as string,
      };
    });
  }

  async getIndexes(table: string, schema = "public"): Promise<IndexInfo[]> {
    const result = await this.executeQuery(
      `
      SELECT 
        i.relname as name,
        ix.indisunique as is_unique,
        am.amname as method,
        array_agg(a.attname ORDER BY array_position(ix.indkey, a.attnum)) as columns,
        ix.indisprimary as is_primary,
        pg_get_expr(ix.indpred, ix.indrelid) as where_clause
      FROM pg_index ix
      JOIN pg_class i ON i.oid = ix.indexrelid
      JOIN pg_class t ON t.oid = ix.indrelid
      JOIN pg_namespace n ON n.oid = t.relnamespace
      JOIN pg_am am ON i.relam = am.oid
      JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = ANY(ix.indkey)
      WHERE t.relname = $1 AND n.nspname = $2
      GROUP BY i.relname, ix.indisunique, am.amname, ix.indisprimary, ix.indpred
      ORDER BY i.relname
    `,
      [table, schema]
    );

    return result.rows.map(row => ({
      name: row.name as string,
      unique: !!row.is_unique,
      method: row.method as string,
      columns: row.columns as string[],
      include: [],
      where: (row.where_clause as string) || null,
      isPrimary: !!row.is_primary,
    }));
  }

  private buildConfig(connection: DatabaseConnection): Record<string, unknown> {
    const poolConfig: PoolConfig = {
      min: 2,
      max: 10,
      acquireTimeoutMillis: 60000,
      idleTimeoutMillis: 30000,
    };

    // If a full connection string (URI) is provided, prefer that. When pg
    // receives a user but no explicit database it will default the database
    // name to the username — which caused errors like
    // "database \"<username>\" does not exist" when the intended DB name
    // was embedded in the connection string. Respect the connectionString to
    // ensure the intended database is used.
    if ((connection as any).connectionString) {
      return {
        connectionString: (connection as any).connectionString,
        ssl: connection.ssl ? { rejectUnauthorized: false } : false,
        min: poolConfig.min,
        max: poolConfig.max,
        acquireTimeoutMillis: poolConfig.acquireTimeoutMillis,
        idleTimeoutMillis: poolConfig.idleTimeoutMillis,
        ...connection.options,
      };
    }

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
      ...connection.options,
    };
  }

  private getPostgreSQLTypeName(typeId: number): string {
    // Map PostgreSQL type OIDs to readable names
    const typeMap: Record<number, string> = {
      16: "boolean",
      17: "bytea",
      20: "bigint",
      21: "smallint",
      23: "integer",
      25: "text",
      700: "real",
      701: "double precision",
      1043: "varchar",
      1082: "date",
      1114: "timestamp",
      1184: "timestamptz",
    };

    return typeMap[typeId] || "unknown";
  }

  private extractPlanOperations(plan: any): any[] {
    const operations: any[] = [];

    const traverse = (node: any) => {
      operations.push({
        operation: node["Node Type"] || "Unknown",
        table: node["Relation Name"] || undefined,
        cost: (node["Total Cost"] || 0) - (node["Startup Cost"] || 0),
        rows: node["Plan Rows"] || 0,
        details: node,
      });

      if (node.Plans) {
        node.Plans.forEach(traverse);
      }
    };

    traverse(plan);
    return operations;
  }
}
