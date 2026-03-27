import type { MCPTool, MCPToolRegistry, SQLContext } from "../types.js";

export class MCPToolRegistryImpl implements MCPToolRegistry {
  private tools = new Map<string, MCPTool>();

  registerTool(tool: MCPTool): void {
    this.tools.set(tool.name, tool);
  }

  getTool(name: string): MCPTool | undefined {
    return this.tools.get(name);
  }

  listTools(): MCPTool[] {
    return Array.from(this.tools.values());
  }

  async executeTool(
    name: string,
    args: Record<string, unknown>,
    context: SQLContext
  ): Promise<Record<string, unknown>> {
    const tool = this.tools.get(name);
    if (!tool) {
      throw new Error(`Tool '${name}' not found`);
    }
    return await tool.execute(args, context);
  }
}

export function createBuiltinTools(): MCPTool[] {
  return [
    {
      name: "describe_table",
      description: "Get the schema and structure of a database table",
      parameters: {
        type: "object",
        properties: {
          tableName: {
            type: "string",
            description: "Name of the table to describe",
          },
        },
        required: ["tableName"],
      },
      execute: async (args: Record<string, unknown>, context: SQLContext) => {
        const { tableName } = args as { tableName: string };
        if (!context.connection) {
          throw new Error("No active database connection");
        }
        const result = await context.connection.query(`DESCRIBE ${tableName}`);
        return { result };
      },
    },

    {
      name: "list_tables",
      description: "List all tables in the current database",
      parameters: {
        type: "object",
        properties: {},
      },
      execute: async (_args: Record<string, unknown>, context: SQLContext) => {
        if (!context.connection) {
          throw new Error("No active database connection");
        }
        const result = await context.connection.query("SHOW TABLES");
        return { result };
      },
    },

    {
      name: "execute_query",
      description: "Execute a read-only SQL query safely",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "SQL query to execute",
          },
          limit: {
            type: "number",
            description: "Maximum number of rows to return",
            default: 100,
          },
        },
        required: ["query"],
      },
      execute: async (args: Record<string, unknown>, context: SQLContext) => {
        const { query, limit = 100 } = args as {
          query: string;
          limit?: number;
        };
        if (!context.connection) {
          throw new Error("No active database connection");
        }

        const safeQuery = query.trim();
        const lower = safeQuery.toLowerCase();
        if (
          lower.startsWith("drop") ||
          lower.startsWith("delete") ||
          lower.startsWith("update") ||
          lower.startsWith("insert")
        ) {
          throw new Error(
            "Destructive operations not allowed through MCP tools"
          );
        }

        const result = await context.connection.query(
          `${safeQuery} LIMIT ${limit}`
        );
        return { result };
      },
    },

    {
      name: "generate_insert_statement",
      description: "Generate INSERT statement for a table with provided values",
      parameters: {
        type: "object",
        properties: {
          tableName: {
            type: "string",
            description: "Name of the table",
          },
          columnValues: {
            type: "object",
            description: "Key-value pairs of column names and values",
          },
        },
        required: ["tableName", "columnValues"],
      },
      execute: async (args: Record<string, unknown>, _context: SQLContext) => {
        const { tableName, columnValues } = args as {
          tableName: string;
          columnValues: Record<string, unknown>;
        };

        const columns = Object.keys(columnValues).join(", ");
        const values = Object.values(columnValues)
          .map(v =>
            typeof v === "string"
              ? `'${String(v).replace(/'/g, "''")}'`
              : String(v)
          )
          .join(", ");

        return {
          query: `INSERT INTO ${tableName} (${columns}) VALUES (${values});`,
          description: `Insert statement for ${tableName}`,
        };
      },
    },

    {
      name: "generate_select_statement",
      description:
        "Generate SELECT statement with optional filtering and limiting",
      parameters: {
        type: "object",
        properties: {
          tableName: {
            type: "string",
            description: "Name of the table",
          },
          columns: {
            type: "array",
            items: { type: "string" },
            description: "Columns to select (empty for all)",
          },
          conditions: {
            type: "object",
            description: "WHERE conditions as key-value pairs",
          },
          limit: {
            type: "number",
            description: "Maximum number of rows to return",
          },
        },
        required: ["tableName"],
      },
      execute: async (args: Record<string, unknown>, _context: SQLContext) => {
        const {
          tableName,
          columns = [],
          conditions = {},
          limit,
        } = args as {
          tableName: string;
          columns?: string[];
          conditions?: Record<string, unknown>;
          limit?: number;
        };

        const selectColumns =
          Array.isArray(columns) && columns.length > 0
            ? columns.join(", ")
            : "*";
        let query = `SELECT ${selectColumns} FROM ${tableName}`;

        const condEntries = Object.entries(
          conditions as Record<string, unknown>
        );
        if (condEntries.length > 0) {
          const whereClause = condEntries
            .map(
              ([col, val]) =>
                `${col} = ${typeof val === "string" ? `'${String(val).replace(/'/g, "''")}'` : String(val)}`
            )
            .join(" AND ");
          query += ` WHERE ${whereClause}`;
        }

        if (limit) {
          query += ` LIMIT ${limit}`;
        }

        return {
          query: query + ";",
          description: `Select statement for ${tableName}${condEntries.length > 0 ? " with conditions" : ""}`,
        };
      },
    },

    {
      name: "analyze_query_performance",
      description:
        "Analyze a SQL query for potential performance issues and suggest optimizations",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "SQL query to analyze",
          },
        },
        required: ["query"],
      },
      execute: async (args: Record<string, unknown>, _context: SQLContext) => {
        const { query } = args as { query: string };
        const upper = query.toUpperCase();

        const analysis: string[] = [];
        let complexity: "low" | "medium" | "high" = "low";

        if (upper.includes("SELECT *")) {
          analysis.push("Avoid SELECT * — specify only needed columns");
        }

        if (!upper.includes("WHERE") && upper.includes("SELECT")) {
          analysis.push("Consider adding WHERE clause to limit results");
        }

        if (upper.includes("ORDER BY") && !upper.includes("LIMIT")) {
          analysis.push("ORDER BY without LIMIT can be expensive");
          complexity = "medium";
        }

        const joinCount = (query.match(/JOIN/gi) || []).length;
        if (joinCount > 3) {
          analysis.push(
            `Query has ${joinCount} joins, which may impact performance`
          );
          complexity = "high";
        }

        const subqueryCount = (query.match(/\(SELECT/gi) || []).length;
        if (subqueryCount > 2) {
          analysis.push(
            "Consider using CTEs instead of nested subqueries for readability"
          );
          complexity = "high";
        }

        if (!upper.includes("LIMIT") && upper.includes("SELECT")) {
          analysis.push("Consider adding LIMIT to prevent large result sets");
        }

        return {
          analysis,
          recommendations:
            analysis.length > 0
              ? analysis
              : ["Query looks good from a basic performance perspective"],
          complexity,
          query: query.trim(),
        };
      },
    },

    {
      name: "generate_create_table",
      description:
        "Generate CREATE TABLE statement with columns and constraints",
      parameters: {
        type: "object",
        properties: {
          tableName: {
            type: "string",
            description: "Name of the table to create",
          },
          columns: {
            type: "array",
            items: {
              type: "object",
              properties: {
                name: { type: "string", description: "Column name" },
                type: { type: "string", description: "Column data type" },
                nullable: { type: "boolean" },
                primaryKey: { type: "boolean" },
                defaultValue: { type: "string" },
              },
              required: ["name", "type"],
            },
            description: "Array of column definitions",
          },
        },
        required: ["tableName", "columns"],
      },
      execute: async (args: Record<string, unknown>, _context: SQLContext) => {
        const { tableName, columns } = args as {
          tableName: string;
          columns: Array<{
            name: string;
            type: string;
            nullable?: boolean;
            primaryKey?: boolean;
            defaultValue?: string;
          }>;
        };

        const columnDefs = columns
          .map(col => {
            let def = `${col.name} ${col.type}`;
            if (col.primaryKey) def += " PRIMARY KEY";
            if (col.nullable === false) def += " NOT NULL";
            if (col.defaultValue) def += ` DEFAULT ${col.defaultValue}`;
            return def;
          })
          .join(",\n  ");

        const query = `CREATE TABLE ${tableName} (\n  ${columnDefs}\n);`;

        return {
          query,
          description: `CREATE TABLE statement for ${tableName} with ${columns.length} columns`,
        };
      },
    },
  ];
}
