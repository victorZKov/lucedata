import type { MCPTool, MCPToolRegistry, SQLContext } from '../types.js';

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

  async executeTool(name: string, args: any, context: SQLContext): Promise<any> {
    const tool = this.tools.get(name);
    if (!tool) {
      throw new Error(`Tool '${name}' not found`);
    }
    return await tool.execute(args, context);
  }
}

// Built-in MCP tools for SQL operations
export function createBuiltinTools(): MCPTool[] {
  return [
    {
      name: 'generate_insert_statement',
      description: 'Generate INSERT statement for a table with sample data',
      parameters: {
        type: 'object',
        properties: {
          tableName: { type: 'string', description: 'Name of the table' },
          columnValues: { 
            type: 'object', 
            description: 'Key-value pairs of column names and values' 
          }
        },
        required: ['tableName', 'columnValues']
      },
      execute: async (args: { tableName: string; columnValues: Record<string, any> }, context: SQLContext) => {
        const { tableName, columnValues } = args;
        const columns = Object.keys(columnValues).join(', ');
        const values = Object.values(columnValues)
          .map(v => typeof v === 'string' ? `'${v.replace(/'/g, "''")}'` : v)
          .join(', ');
        
        return {
          query: `INSERT INTO ${tableName} (${columns}) VALUES (${values});`,
          description: `Insert statement for ${tableName} with provided values`
        };
      }
    },

    {
      name: 'generate_select_with_conditions',
      description: 'Generate SELECT statement with WHERE conditions',
      parameters: {
        type: 'object',
        properties: {
          tableName: { type: 'string', description: 'Name of the table' },
          columns: { 
            type: 'array', 
            items: { type: 'string' },
            description: 'Columns to select (empty for all)' 
          },
          conditions: {
            type: 'object',
            description: 'WHERE conditions as key-value pairs'
          },
          limit: { type: 'number', description: 'LIMIT clause value' }
        },
        required: ['tableName']
      },
      execute: async (args: { 
        tableName: string; 
        columns?: string[]; 
        conditions?: Record<string, any>; 
        limit?: number 
      }, context: SQLContext) => {
        const { tableName, columns = [], conditions = {}, limit } = args;
        
        const selectColumns = columns.length > 0 ? columns.join(', ') : '*';
        let query = `SELECT ${selectColumns} FROM ${tableName}`;
        
        if (Object.keys(conditions).length > 0) {
          const whereClause = Object.entries(conditions)
            .map(([col, val]) => `${col} = ${typeof val === 'string' ? `'${val}'` : val}`)
            .join(' AND ');
          query += ` WHERE ${whereClause}`;
        }
        
        if (limit) {
          query += ` LIMIT ${limit}`;
        }
        
        return {
          query: query + ';',
          description: `Select statement for ${tableName}${Object.keys(conditions).length > 0 ? ' with conditions' : ''}`
        };
      }
    },

    {
      name: 'analyze_query_performance',
      description: 'Analyze query for potential performance issues',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'SQL query to analyze' }
        },
        required: ['query']
      },
      execute: async (args: { query: string }, context: SQLContext) => {
        const { query } = args;
        const analysis: string[] = [];
        
        // Basic performance analysis
        if (query.toUpperCase().includes('SELECT *')) {
          analysis.push('Avoid SELECT * - specify only needed columns');
        }
        
        if (!query.toUpperCase().includes('WHERE') && query.toUpperCase().includes('SELECT')) {
          analysis.push('Consider adding WHERE clause to limit results');
        }
        
        if (query.match(/JOIN.*ON.*=/gi)?.length && !query.toUpperCase().includes('INDEX')) {
          analysis.push('Ensure proper indexes exist on JOIN columns');
        }
        
        const subqueryCount = (query.match(/\(SELECT/gi) || []).length;
        if (subqueryCount > 2) {
          analysis.push('Consider using CTEs instead of nested subqueries for readability');
        }
        
        return {
          analysis,
          recommendations: analysis.length > 0 ? analysis : ['Query looks good from a basic performance perspective'],
          complexity: subqueryCount > 1 ? 'high' : analysis.length > 2 ? 'medium' : 'low'
        };
      }
    },

    {
      name: 'generate_create_table',
      description: 'Generate CREATE TABLE statement with columns and constraints',
      parameters: {
        type: 'object',
        properties: {
          tableName: { type: 'string', description: 'Name of the table' },
          columns: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                type: { type: 'string' },
                nullable: { type: 'boolean' },
                primaryKey: { type: 'boolean' },
                defaultValue: { type: 'string' }
              },
              required: ['name', 'type']
            }
          }
        },
        required: ['tableName', 'columns']
      },
      execute: async (args: { 
        tableName: string; 
        columns: Array<{
          name: string;
          type: string;
          nullable?: boolean;
          primaryKey?: boolean;
          defaultValue?: string;
        }>
      }, context: SQLContext) => {
        const { tableName, columns } = args;
        
        const columnDefs = columns.map(col => {
          let def = `${col.name} ${col.type}`;
          if (col.primaryKey) def += ' PRIMARY KEY';
          if (col.nullable === false) def += ' NOT NULL';
          if (col.defaultValue) def += ` DEFAULT ${col.defaultValue}`;
          return def;
        }).join(',\n  ');
        
        const query = `CREATE TABLE ${tableName} (\n  ${columnDefs}\n);`;
        
        return {
          query,
          description: `CREATE TABLE statement for ${tableName} with ${columns.length} columns`
        };
      }
    }
  ];
}