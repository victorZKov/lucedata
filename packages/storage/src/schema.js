import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';
// Connections table - stores connection metadata (not credentials)
export const connections = sqliteTable('connections', {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    type: text('type').notNull(), // 'sqlserver', 'postgresql', 'mysql', etc.
    host: text('host').notNull(),
    port: integer('port').notNull(),
    database: text('database'),
    username: text('username').notNull(),
    connectionString: text('connection_string'), // Optional connection string for direct connection
    ssl: integer('ssl', { mode: 'boolean' }).default(false),
    options: text('options'), // JSON string for additional options
    createdAt: text('created_at').default(sql `CURRENT_TIMESTAMP`),
    updatedAt: text('updated_at').default(sql `CURRENT_TIMESTAMP`),
    lastUsed: text('last_used')
});
// Query history table
export const queryHistory = sqliteTable('query_history', {
    id: text('id').primaryKey(),
    connectionId: text('connection_id')
        .references(() => connections.id, { onDelete: 'cascade' }),
    query: text('query').notNull(),
    executionTime: integer('execution_time'), // milliseconds
    rowCount: integer('row_count'),
    success: integer('success', { mode: 'boolean' }).notNull(),
    errorMessage: text('error_message'),
    createdAt: text('created_at').default(sql `CURRENT_TIMESTAMP`)
});
// Saved queries/snippets table
export const savedQueries = sqliteTable('saved_queries', {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    description: text('description'),
    query: text('query').notNull(),
    tags: text('tags'), // JSON array of tags
    favorite: integer('favorite', { mode: 'boolean' }).default(false),
    createdAt: text('created_at').default(sql `CURRENT_TIMESTAMP`),
    updatedAt: text('updated_at').default(sql `CURRENT_TIMESTAMP`)
});
// Application settings table
export const settings = sqliteTable('settings', {
    key: text('key').primaryKey(),
    value: text('value').notNull(),
    type: text('type').notNull(), // 'string', 'number', 'boolean', 'object'
    updatedAt: text('updated_at').default(sql `CURRENT_TIMESTAMP`)
});
// Query execution audit log
export const auditLog = sqliteTable('audit_log', {
    id: text('id').primaryKey(),
    connectionId: text('connection_id')
        .references(() => connections.id, { onDelete: 'cascade' }),
    query: text('query').notNull(),
    queryType: text('query_type').notNull(), // 'SELECT', 'INSERT', 'UPDATE', 'DELETE', 'DDL'
    success: integer('success', { mode: 'boolean' }).notNull(),
    rowsAffected: integer('rows_affected'),
    executionTime: integer('execution_time'),
    userAction: text('user_action'), // 'executed', 'reviewed', 'blocked'
    riskLevel: text('risk_level'), // 'low', 'medium', 'high'
    createdAt: text('created_at').default(sql `CURRENT_TIMESTAMP`)
});
//# sourceMappingURL=schema.js.map