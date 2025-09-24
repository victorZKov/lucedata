import type { MCPTool, MCPToolRegistry, SQLContext } from '../types.js';import type { MCPTool, MCPToolRegistry, SQLContext } from '../types.js';import type { MCPTool, MCPToolRegistry, SQLContext } from '../types.js';



export class MCPToolRegistryImpl implements MCPToolRegistry {

  private tools = new Map<string, MCPTool>();

export class MCPToolRegistryImpl implements MCPToolRegistry {export class MCPToolRegistryImpl implements MCPToolRegistry {

  registerTool(tool: MCPTool): void {

    this.tools.set(tool.name, tool);  private tools = new Map<string, MCPTool>();  private tools = new Map<string, MCPTool>();

  }



  getTool(name: string): MCPTool | undefined {

    return this.tools.get(name);  registerTool(tool: MCPTool): void {  registerTool(tool: MCPTool): void {

  }

    this.tools.set(tool.name, tool);    this.tools.set(tool.name, tool);

  listTools(): MCPTool[] {

    return Array.from(this.tools.values());  }  }

  }



  async executeTool(name: string, args: Record<string, unknown>, context: SQLContext): Promise<Record<string, unknown>> {

    const tool = this.tools.get(name);  getTool(name: string): MCPTool | undefined {  getTool(name: string): MCPTool | undefined {

    

    if (!tool) {    return this.tools.get(name);    return this.tools.get(name);

      throw new Error(`Tool '${name}' not found`);

    }  }  }



    return await tool.execute(args, context);

  }

}  listTools(): MCPTool[] {  listTools(): MCPTool[] {



// Built-in SQL tools    return Array.from(this.tools.values());    return Array.from(this.tools.values());

export const createBuiltinTools = (): MCPTool[] => {

  return [  }  }

    {

      name: 'describe_table',

      description: 'Get the schema and structure of a database table',

      parameters: {  async executeTool(name: string, args: Record<string, unknown>, context: SQLContext): Promise<Record<string, unknown>> {  async executeTool(name: string, args: Record<string, unknown>, context: SQLContext): Promise<Record<string, unknown>> {

        type: 'object',

        properties: {    const tool = this.tools.get(name);    const tool = this.tools.get(name);

          tableName: {

            type: 'string',        

            description: 'Name of the table to describe'

          }    if (!tool) {    if (!tool) {

        },

        required: ['tableName']      throw new Error(`Tool '${name}' not found`);      throw new Error(`Tool '${name}' not found`);

      },

      execute: async (args: Record<string, unknown>, context: SQLContext) => {    }    }

        const { tableName } = args as { tableName: string };

        

        if (!context.connection) {

          throw new Error('No active database connection');    return await tool.execute(args, context);    return await tool.execute(args, context);

        }

  }  }

        // This would need to be implemented based on the database type

        const result = await context.connection.query(`DESCRIBE ${tableName}`);}}

        return { result };

      }

    }

  ];// Built-in SQL tools// Built-in SQL tools

};
export const createBuiltinTools = (): MCPTool[] => {export const createBuiltinTools = (): MCPTool[] => {

  return [  return [

    {    {

      name: 'describe_table',      name: 'describe_table',

      description: 'Get the schema and structure of a database table',      description: 'Get the schema and structure of a database table',

      parameters: {      parameters: {

        type: 'object',        type: 'object',

        properties: {        properties: {

          tableName: {          tableName: {

            type: 'string',            type: 'string',

            description: 'Name of the table to describe'            description: 'Name of the table to describe'

          }          }

        },        },

        required: ['tableName']        required: ['tableName']

      },      },

      execute: async (args: Record<string, unknown>, context: SQLContext) => {      execute: async (args: Record<string, unknown>, context: SQLContext) => {

        const { tableName } = args as { tableName: string };        const { tableName } = args as { tableName: string };

                

        if (!context.connection) {        if (!context.connection) {

          throw new Error('No active database connection');          throw new Error('No active database connection');

        }        }



        // This would need to be implemented based on the database type        // This would need to be implemented based on the database type

        const result = await context.connection.query(`DESCRIBE ${tableName}`);        const result = await context.connection.query(`DESCRIBE ${tableName}`);

        return { result };        return { result };

      }      }

    },    },



    {    {

      name: 'list_tables',      name: 'list_tables',

      description: 'List all tables in the current database',      description: 'List all tables in the current database',

      parameters: {      parameters: {

        type: 'object',        type: 'object',

        properties: {}        properties: {}

      },      },

      execute: async (_args: Record<string, unknown>, context: SQLContext) => {      execute: async (_args: Record<string, unknown>, context: SQLContext) => {

        if (!context.connection) {        if (!context.connection) {

          throw new Error('No active database connection');          throw new Error('No active database connection');

        }        }



        // This would need to be implemented based on the database type        // This would need to be implemented based on the database type

        const result = await context.connection.query('SHOW TABLES');        const result = await context.connection.query('SHOW TABLES');

        return { result };        return { result };

      }      }

    },    },



    {    {

      name: 'execute_query',      name: 'execute_query',

      description: 'Execute a SQL query safely',      description: 'Execute a SQL query safely',

      parameters: {      parameters: {

        type: 'object',        type: 'object',

        properties: {        properties: {

          query: {          query: {

            type: 'string',            type: 'string',

            description: 'SQL query to execute'            description: 'SQL query to execute'

          },          },

          limit: {          limit: {

            type: 'number',            type: 'number',

            description: 'Maximum number of rows to return',            description: 'Maximum number of rows to return',

            default: 100            default: 100

          }          }

        },        },

        required: ['query']        required: ['query']

      },      },

      execute: async (args: Record<string, unknown>, context: SQLContext) => {      execute: async (args: Record<string, unknown>, context: SQLContext) => {

        const { query, limit = 100 } = args as { query: string; limit?: number };        const { query, limit = 100 } = args as { query: string; limit?: number };

                

        if (!context.connection) {        if (!context.connection) {

          throw new Error('No active database connection');          throw new Error('No active database connection');

        }        }



        // Apply safety checks and limits        // Apply safety checks and limits

        const safeQuery = query.trim();        const safeQuery = query.trim();

        if (safeQuery.toLowerCase().startsWith('drop') ||         if (safeQuery.toLowerCase().startsWith('drop') || 

            safeQuery.toLowerCase().startsWith('delete') ||            safeQuery.toLowerCase().startsWith('delete') ||

            safeQuery.toLowerCase().startsWith('update') ||            safeQuery.toLowerCase().startsWith('update') ||

            safeQuery.toLowerCase().startsWith('insert')) {            safeQuery.toLowerCase().startsWith('insert')) {

          throw new Error('Destructive operations not allowed through MCP tools');          throw new Error('Destructive operations not allowed through MCP tools');

        }        }



        const result = await context.connection.query(`${safeQuery} LIMIT ${limit}`);        const result = await context.connection.query(`${safeQuery} LIMIT ${limit}`);

        return { result };        return { result };

      }      }

    }    }

  ];  ];

};};

        const { tableName, columns } = args as {

  getTool(name: string): MCPTool | undefined {

    return this.tools.get(name);  registerTool(tool: MCPTool): void {          tableName: string;

  }

    this.tools.set(tool.name, tool);          columns: Array<{

  listTools(): MCPTool[] {

    return Array.from(this.tools.values());  }            name: string;

  }

            type: string;

  async executeTool(name: string, args: Record<string, unknown>, context: SQLContext): Promise<Record<string, unknown>> {

    const tool = this.tools.get(name);  getTool(name: string): MCPTool | undefined {            nullable?: boolean;

    if (!tool) {

      throw new Error(`Tool '${name}' not found`);    return this.tools.get(name);            primaryKey?: boolean;

    }

    return await tool.execute(args, context);  }            defaultValue?: string;

  }

}          }>;



// Built-in MCP tools for SQL operations  listTools(): MCPTool[] {        };sterTool(tool: MCPTool): void {

export function createBuiltinTools(): MCPTool[] {

  return [    return Array.from(this.tools.values());    this.tools.set(tool.name, tool);

    {

      name: 'generate_insert_statement',  }  }

      description: 'Generate INSERT statement for a table with sample data',

      parameters: {

        type: 'object',

        properties: {  async executeTool(name: string, args: Record<string, unknown>, context: SQLContext): Promise<Record<string, unknown>> {  getTool(name: string): MCPTool | undefined {

          tableName: { type: 'string', description: 'Name of the table' },

          columnValues: {     const tool = this.tools.get(name);    return this.tools.get(name);

            type: 'object', 

            description: 'Key-value pairs of column names and values'     if (!tool) {  }

          }

        },      throw new Error(`Tool '${name}' not found`);

        required: ['tableName', 'columnValues']

      },    }  listTools(): MCPTool[] {

      execute: async (args: Record<string, unknown>, _context: SQLContext) => {

        const { tableName, columnValues } = args as {     return await tool.execute(args, context);    return Array.from(this.tools.values());

          tableName: string; 

          columnValues: Record<string, unknown>;   }  }

        };

        const columns = Object.keys(columnValues).join(', ');}

        const values = Object.values(columnValues)

          .map(v => typeof v === 'string' ? `'${String(v).replace(/'/g, "''")}'` : String(v))  async executeTool(name: string, args: Record<string, unknown>, context: SQLContext): Promise<Record<string, unknown>> {

          .join(', ');

        // Built-in MCP tools for SQL operations    const tool = this.tools.get(name);

        return {

          query: `INSERT INTO ${tableName} (${columns}) VALUES (${values})`,export function createBuiltinTools(): MCPTool[] {    if (!tool) {

          description: `Insert a new record into ${tableName}`,

          table: tableName  return [      throw new Error(`Tool '${name}' not found`);

        };

      }    {    }

    },

      name: 'generate_insert_statement',    return await tool.execute(args, context);

    {

      name: 'generate_select_statement',      description: 'Generate INSERT statement for a table with sample data',  }

      description: 'Generate SELECT statement with optional filtering and limiting',

      parameters: {      parameters: {}

        type: 'object',

        properties: {        type: 'object',

          tableName: { type: 'string', description: 'Name of the table' },

          columns: {         properties: {// Built-in MCP tools for SQL operations

            type: 'array', 

            items: { type: 'string' },          tableName: { type: 'string', description: 'Name of the table' },export function createBuiltinTools(): MCPTool[] {

            description: 'Columns to select (optional, defaults to all)' 

          },          columnValues: {   return [

          conditions: { 

            type: 'object',            type: 'object',     {

            description: 'WHERE conditions as key-value pairs' 

          },            description: 'Key-value pairs of column names and values'       name: 'generate_insert_statement',

          limit: { type: 'number', description: 'Maximum number of rows to return' }

        },          }      description: 'Generate INSERT statement for a table with sample data',

        required: ['tableName']

      },        },      parameters: {

      execute: async (args: Record<string, unknown>, _context: SQLContext) => {

        const {         required: ['tableName', 'columnValues']        type: 'object',

          tableName, 

          columns = [],       },        properties: {

          conditions = {}, 

          limit       execute: async (args: Record<string, unknown>, _context: SQLContext) => {          tableName: { type: 'string', description: 'Name of the table' },

        } = args as { 

          tableName: string;         const { tableName, columnValues } = args as {           columnValues: { 

          columns?: string[]; 

          conditions?: Record<string, unknown>;           tableName: string;             type: 'object', 

          limit?: number 

        };          columnValues: Record<string, unknown>;             description: 'Key-value pairs of column names and values' 

        

        const selectColumns = Array.isArray(columns) && columns.length > 0 ? columns.join(', ') : '*';        };          }

        let query = `SELECT ${selectColumns} FROM ${tableName}`;

                const columns = Object.keys(columnValues).join(', ');        },

        if (Object.keys(conditions).length > 0) {

          const whereClause = Object.entries(conditions)        const values = Object.values(columnValues)        required: ['tableName', 'columnValues']

            .map(([col, val]) => `${col} = ${typeof val === 'string' ? `'${String(val)}'` : String(val)}`)

            .join(' AND ');          .map(v => typeof v === 'string' ? `'${v.replace(/'/g, "''")}'` : v)      },

          query += ` WHERE ${whereClause}`;

        }          .join(', ');      execute: async (args: Record<string, unknown>, _context: SQLContext) => {

        

        if (limit) {                const { tableName, columnValues } = args as { 

          query += ` LIMIT ${limit}`;

        }        return {          tableName: string; 

        

        return {          query: `INSERT INTO ${tableName} (${columns}) VALUES (${values})`,          columnValues: Record<string, unknown>; 

          query,

          description: `Select data from ${tableName}`,          description: `Insert a new record into ${tableName}`,        };

          table: tableName

        };          table: tableName        const columns = Object.keys(columnValues).join(', ');

      }

    },        };        const values = Object.values(columnValues)



    {      }          .map(v => typeof v === 'string' ? `'${v.replace(/'/g, "''")}'` : v)

      name: 'analyze_query_performance',

      description: 'Analyze a SQL query for performance implications and suggest optimizations',    },          .join(', ');

      parameters: {

        type: 'object',        

        properties: {

          query: { type: 'string', description: 'SQL query to analyze' }    {        return {

        },

        required: ['query']      name: 'generate_select_statement',          query: `INSERT INTO ${tableName} (${columns}) VALUES (${values});`,

      },

      execute: async (args: Record<string, unknown>, _context: SQLContext) => {      description: 'Generate SELECT statement with optional filtering and limiting',          description: `Insert statement for ${tableName} with provided values`

        const { query } = args as { query: string };

              parameters: {        };

        // Basic query analysis (in a real implementation, this would be more sophisticated)

        const analysis = [];        type: 'object',      }

        const recommendations = [];

        let complexity = 'medium';        properties: {    },



        if (query.toLowerCase().includes('select *')) {          tableName: { type: 'string', description: 'Name of the table' },

          analysis.push('Query uses SELECT *, which may return unnecessary columns');

          recommendations.push('Consider specifying only needed columns');          columns: {     {

        }

            type: 'array',       name: 'generate_select_with_conditions',

        if (!query.toLowerCase().includes('limit') && query.toLowerCase().includes('select')) {

          analysis.push('Query has no LIMIT clause');            items: { type: 'string' },      description: 'Generate SELECT statement with WHERE conditions',

          recommendations.push('Consider adding LIMIT to prevent large result sets');

        }            description: 'Columns to select (optional, defaults to all)'       parameters: {



        if (query.toLowerCase().includes('order by') && !query.toLowerCase().includes('limit')) {          },        type: 'object',

          complexity = 'high';

          analysis.push('ORDER BY without LIMIT can be expensive');          conditions: {         properties: {

          recommendations.push('Add LIMIT when using ORDER BY for large tables');

        }            type: 'object',          tableName: { type: 'string', description: 'Name of the table' },



        const joinCount = (query.toLowerCase().match(/join/g) || []).length;            description: 'WHERE conditions as key-value pairs'           columns: { 

        if (joinCount > 3) {

          complexity = 'high';          },            type: 'array', 

          analysis.push(`Query has ${joinCount} joins, which may impact performance`);

          recommendations.push('Consider if all joins are necessary or can be optimized');          limit: { type: 'number', description: 'Maximum number of rows to return' }            items: { type: 'string' },

        }

        },            description: 'Columns to select (empty for all)' 

        return {

          analysis,        required: ['tableName']          },

          recommendations,

          complexity,      },          conditions: {

          query: query.trim()

        };      execute: async (args: Record<string, unknown>, _context: SQLContext) => {            type: 'object',

      }

    }        const {             description: 'WHERE conditions as key-value pairs'

  ];

}          tableName,           },

          columns = [],           limit: { type: 'number', description: 'LIMIT clause value' }

          conditions = {},         },

          limit         required: ['tableName']

        } = args as {       },

          tableName: string;       execute: async (args: Record<string, unknown>, _context: SQLContext) => {

          columns?: string[];         const { 

          conditions?: Record<string, unknown>;           tableName, 

          limit?: number           columns = [], 

        };          conditions = {}, 

                  limit 

        const selectColumns = Array.isArray(columns) && columns.length > 0 ? columns.join(', ') : '*';        } = args as { 

        let query = `SELECT ${selectColumns} FROM ${tableName}`;          tableName: string; 

                  columns?: string[]; 

        if (Object.keys(conditions).length > 0) {          conditions?: Record<string, unknown>; 

          const whereClause = Object.entries(conditions)          limit?: number 

            .map(([col, val]) => `${col} = ${typeof val === 'string' ? `'${val}'` : val}`)        };

            .join(' AND ');        

          query += ` WHERE ${whereClause}`;        const selectColumns = columns.length > 0 ? columns.join(', ') : '*';

        }        let query = `SELECT ${selectColumns} FROM ${tableName}`;

                

        if (limit) {        if (Object.keys(conditions).length > 0) {

          query += ` LIMIT ${limit}`;          const whereClause = Object.entries(conditions)

        }            .map(([col, val]) => `${col} = ${typeof val === 'string' ? `'${val}'` : val}`)

                    .join(' AND ');

        return {          query += ` WHERE ${whereClause}`;

          query,        }

          description: `Select data from ${tableName}`,        

          table: tableName        if (limit) {

        };          query += ` LIMIT ${limit}`;

      }        }

    },        

        return {

    {          query: query + ';',

      name: 'analyze_query_performance',          description: `Select statement for ${tableName}${Object.keys(conditions).length > 0 ? ' with conditions' : ''}`

      description: 'Analyze a SQL query for performance implications and suggest optimizations',        };

      parameters: {      }

        type: 'object',    },

        properties: {

          query: { type: 'string', description: 'SQL query to analyze' }    {

        },      name: 'analyze_query_performance',

        required: ['query']      description: 'Analyze query for potential performance issues',

      },      parameters: {

      execute: async (args: Record<string, unknown>, _context: SQLContext) => {        type: 'object',

        const { query } = args as { query: string };        properties: {

                  query: { type: 'string', description: 'SQL query to analyze' }

        // Basic query analysis (in a real implementation, this would be more sophisticated)        },

        const analysis = [];        required: ['query']

        const recommendations = [];      },

        let complexity = 'medium';      execute: async (args: Record<string, unknown>, _context: SQLContext) => {

        const { query } = args as { query: string };

        if (query.toLowerCase().includes('select *')) {        const analysis: string[] = [];

          analysis.push('Query uses SELECT *, which may return unnecessary columns');        

          recommendations.push('Consider specifying only needed columns');        // Basic performance analysis

        }        if (query.toUpperCase().includes('SELECT *')) {

          analysis.push('Avoid SELECT * - specify only needed columns');

        if (!query.toLowerCase().includes('limit') && query.toLowerCase().includes('select')) {        }

          analysis.push('Query has no LIMIT clause');        

          recommendations.push('Consider adding LIMIT to prevent large result sets');        if (!query.toUpperCase().includes('WHERE') && query.toUpperCase().includes('SELECT')) {

        }          analysis.push('Consider adding WHERE clause to limit results');

        }

        if (query.toLowerCase().includes('order by') && !query.toLowerCase().includes('limit')) {        

          complexity = 'high';        if (query.match(/JOIN.*ON.*=/gi)?.length && !query.toUpperCase().includes('INDEX')) {

          analysis.push('ORDER BY without LIMIT can be expensive');          analysis.push('Ensure proper indexes exist on JOIN columns');

          recommendations.push('Add LIMIT when using ORDER BY for large tables');        }

        }        

        const subqueryCount = (query.match(/\(SELECT/gi) || []).length;

        const joinCount = (query.toLowerCase().match(/join/g) || []).length;        if (subqueryCount > 2) {

        if (joinCount > 3) {          analysis.push('Consider using CTEs instead of nested subqueries for readability');

          complexity = 'high';        }

          analysis.push(`Query has ${joinCount} joins, which may impact performance`);        

          recommendations.push('Consider if all joins are necessary or can be optimized');        return {

        }          analysis,

          recommendations: analysis.length > 0 ? analysis : ['Query looks good from a basic performance perspective'],

        return {          complexity: subqueryCount > 1 ? 'high' : analysis.length > 2 ? 'medium' : 'low'

          analysis,        };

          recommendations,      }

          complexity,    },

          query: query.trim()

        };    {

      }      name: 'generate_create_table',

    },      description: 'Generate CREATE TABLE statement with columns and constraints',

      parameters: {

    {        type: 'object',

      name: 'generate_create_table',        properties: {

      description: 'Generate CREATE TABLE statement based on column specifications',          tableName: { type: 'string', description: 'Name of the table' },

      parameters: {          columns: {

        type: 'object',            type: 'array',

        properties: {            items: {

          tableName: { type: 'string', description: 'Name of the table to create' },              type: 'object',

          columns: {              properties: {

            type: 'array',                name: { type: 'string' },

            items: {                type: { type: 'string' },

              type: 'object',                nullable: { type: 'boolean' },

              properties: {                primaryKey: { type: 'boolean' },

                name: { type: 'string', description: 'Column name' },                defaultValue: { type: 'string' }

                type: { type: 'string', description: 'Column data type' },              },

                nullable: { type: 'boolean', description: 'Whether column allows NULL values' },              required: ['name', 'type']

                primaryKey: { type: 'boolean', description: 'Whether column is primary key' },            }

                defaultValue: { type: 'string', description: 'Default value for column' }          }

              },        },

              required: ['name', 'type']        required: ['tableName', 'columns']

            },      },

            description: 'Array of column definitions'      execute: async (args: { 

          }        tableName: string; 

        },        columns: Array<{

        required: ['tableName', 'columns']          name: string;

      },          type: string;

      execute: async (args: Record<string, unknown>, _context: SQLContext) => {          nullable?: boolean;

        const { tableName, columns } = args as {          primaryKey?: boolean;

          tableName: string;          defaultValue?: string;

          columns: Array<{        }>

            name: string;      }, context: SQLContext) => {

            type: string;        const { tableName, columns } = args;

            nullable?: boolean;        

            primaryKey?: boolean;        const columnDefs = columns.map(col => {

            defaultValue?: string;          let def = `${col.name} ${col.type}`;

          }>;          if (col.primaryKey) def += ' PRIMARY KEY';

        };          if (col.nullable === false) def += ' NOT NULL';

          if (col.defaultValue) def += ` DEFAULT ${col.defaultValue}`;

        const columnDefinitions = columns.map(col => {          return def;

          let def = `${col.name} ${col.type}`;        }).join(',\n  ');

                  

          if (col.primaryKey) {        const query = `CREATE TABLE ${tableName} (\n  ${columnDefs}\n);`;

            def += ' PRIMARY KEY';        

          }        return {

                    query,

          if (col.nullable === false) {          description: `CREATE TABLE statement for ${tableName} with ${columns.length} columns`

            def += ' NOT NULL';        };

          }      }

              }

          if (col.defaultValue) {  ];

            def += ` DEFAULT ${col.defaultValue}`;}
          }
          
          return def;
        }).join(',\n  ');

        const query = `CREATE TABLE ${tableName} (\n  ${columnDefinitions}\n)`;

        return {
          query,
          description: `Create table ${tableName} with ${columns.length} columns`,
          table: tableName,
          columns: columns.length
        };
      }
    }
  ];
}