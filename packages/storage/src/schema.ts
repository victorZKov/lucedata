import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

// Connections table - stores connection metadata (not credentials)
export const connections = sqliteTable("connections", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  type: text("type").notNull(), // 'sqlserver', 'postgresql', 'mysql', etc.
  host: text("host").notNull(),
  port: integer("port").notNull(),
  database: text("database"),
  username: text("username").notNull(),
  connectionString: text("connection_string"), // Optional connection string for direct connection
  ssl: integer("ssl", { mode: "boolean" }).default(false),
  options: text("options"), // JSON string for additional options
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").default(sql`CURRENT_TIMESTAMP`),
  lastUsed: text("last_used"),
});

// Query history table
export const queryHistory = sqliteTable("query_history", {
  id: text("id").primaryKey(),
  connectionId: text("connection_id").references(() => connections.id, {
    onDelete: "cascade",
  }),
  query: text("query").notNull(),
  executionTime: integer("execution_time"), // milliseconds
  rowCount: integer("row_count"),
  success: integer("success", { mode: "boolean" }).notNull(),
  errorMessage: text("error_message"),
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`),
});

// Saved queries/snippets table
export const savedQueries = sqliteTable("saved_queries", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  query: text("query").notNull(),
  tags: text("tags"), // JSON array of tags
  favorite: integer("favorite", { mode: "boolean" }).default(false),
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").default(sql`CURRENT_TIMESTAMP`),
});

// Application settings table
export const settings = sqliteTable("settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  type: text("type").notNull(), // 'string', 'number', 'boolean', 'object'
  updatedAt: text("updated_at").default(sql`CURRENT_TIMESTAMP`),
});

// Query execution audit log
export const auditLog = sqliteTable("audit_log", {
  id: text("id").primaryKey(),
  connectionId: text("connection_id").references(() => connections.id, {
    onDelete: "cascade",
  }),
  query: text("query").notNull(),
  queryType: text("query_type").notNull(), // 'SELECT', 'INSERT', 'UPDATE', 'DELETE', 'DDL'
  success: integer("success", { mode: "boolean" }).notNull(),
  rowsAffected: integer("rows_affected"),
  executionTime: integer("execution_time"),
  userAction: text("user_action"), // 'executed', 'reviewed', 'blocked'
  riskLevel: text("risk_level"), // 'low', 'medium', 'high'
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`),
});

export type Connection = typeof connections.$inferSelect;
export type NewConnection = typeof connections.$inferInsert;

export type QueryHistoryEntry = typeof queryHistory.$inferSelect;
export type NewQueryHistoryEntry = typeof queryHistory.$inferInsert;

export type SavedQuery = typeof savedQueries.$inferSelect;
export type NewSavedQuery = typeof savedQueries.$inferInsert;

export type Setting = typeof settings.$inferSelect;
export type NewSetting = typeof settings.$inferInsert;

export type AuditLogEntry = typeof auditLog.$inferSelect;
export type NewAuditLogEntry = typeof auditLog.$inferInsert;

// AI Engines table - stores AI provider configurations
export const aiEngines = sqliteTable("ai_engines", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  provider: text("provider").notNull(), // 'openai', 'azure-openai', 'anthropic', 'google', 'ollama', 'custom'
  endpoint: text("endpoint"), // API endpoint URL (for custom/ollama)
  apiKeyRef: text("api_key_ref"), // Reference to keytar stored API key
  defaultModel: text("default_model"),
  temperature: real("temperature").default(0.7),
  maxTokens: integer("max_tokens").default(2048),
  timeoutMs: integer("timeout_ms").default(30000),
  retryPolicy: text("retry_policy").default("exponential"), // 'exponential', 'linear', 'none'
  jsonMode: integer("json_mode", { mode: "boolean" }).default(false),
  rateLimit: integer("rate_limit").default(60), // requests per minute
  notes: text("notes"),
  isDefault: integer("is_default", { mode: "boolean" }).default(false),
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").default(sql`CURRENT_TIMESTAMP`),
});

// Chat conversations table
export const chatConversations = sqliteTable("chat_conversations", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  aiEngineId: text("ai_engine_id").references(() => aiEngines.id, {
    onDelete: "set null",
  }),
  connectionId: text("connection_id").references(() => connections.id, {
    onDelete: "set null",
  }),
  isDeleted: integer("is_deleted", { mode: "boolean" }).default(false),
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").default(sql`CURRENT_TIMESTAMP`),
});

// Chat messages table
export const chatMessages = sqliteTable("chat_messages", {
  id: text("id").primaryKey(),
  conversationId: text("conversation_id").references(
    () => chatConversations.id,
    { onDelete: "cascade" }
  ),
  role: text("role").notNull(), // 'system', 'user', 'assistant', 'tool'
  content: text("content").notNull(),
  toolCalls: text("tool_calls"), // JSON string of tool calls
  toolResults: text("tool_results"), // JSON string of tool results
  tokens: integer("tokens"), // Token count for this message
  cost: real("cost"), // Cost in USD for this message
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`),
});

export type AiEngine = typeof aiEngines.$inferSelect;
export type NewAiEngine = typeof aiEngines.$inferInsert;

export type ChatConversation = typeof chatConversations.$inferSelect;
export type NewChatConversation = typeof chatConversations.$inferInsert;

export type ChatMessage = typeof chatMessages.$inferSelect;
export type NewChatMessage = typeof chatMessages.$inferInsert;

// Tips table - stores application tips/hints
export const tips = sqliteTable("tips", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  category: text("category").notNull(), // 'general', 'query', 'connection', 'ai', 'performance', etc.
  priority: integer("priority").default(0), // Higher numbers show first
  isActive: integer("is_active", { mode: "boolean" }).default(true),
  showCount: integer("show_count").default(0), // How many times this tip has been shown
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").default(sql`CURRENT_TIMESTAMP`),
});

export type Tip = typeof tips.$inferSelect;
export type NewTip = typeof tips.$inferInsert;
