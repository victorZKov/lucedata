import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { eq, desc, asc, and, sql } from "drizzle-orm";

import type {
  Connection,
  NewConnection,
  QueryHistoryEntry,
  NewQueryHistoryEntry,
  SavedQuery,
  NewSavedQuery,
  AuditLogEntry,
  NewAuditLogEntry,
  Tip,
  NewTip,
} from "./schema";
import * as schema from "./schema";
import { CredentialManager } from "./credentials";

// Simple UUID v4 generator that doesn't depend on crypto module
function generateUUID(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export class LocalDatabase {
  private sqlite: Database.Database;
  private drizzle: ReturnType<typeof drizzle>;
  private credentialManager: CredentialManager;

  constructor(dbPath: string) {
    this.sqlite = new Database(dbPath);
    this.drizzle = drizzle(this.sqlite, { schema });
    this.credentialManager = new CredentialManager();

    // Enable WAL mode for better concurrency
    this.sqlite.exec("PRAGMA journal_mode = WAL;");
    this.sqlite.exec("PRAGMA synchronous = NORMAL;");
    this.sqlite.exec("PRAGMA cache_size = 1000;");
    this.sqlite.exec("PRAGMA foreign_keys = ON;");
  }

  get db() {
    return this.drizzle;
  }

  async initialize(): Promise<void> {
    console.log("🔧 Database initialization starting...");

    // Always run table creation since CREATE TABLE IF NOT EXISTS is safe
    console.log("🔧 Ensuring all tables exist...");
    this.createTables();

    // Handle schema migrations for existing databases
    this.handleSchemaMigrations();
    await this.createDefaultTips();

    console.log("🔧 Database initialization completed");
  }

  private checkTablesExist(): boolean {
    try {
      const result = this.sqlite
        .prepare(
          "SELECT name FROM sqlite_master WHERE type='table' AND name='connections'"
        )
        .get();
      return !!result;
    } catch (error) {
      console.warn("Error checking if tables exist:", error);
      return false;
    }
  }

  private handleSchemaMigrations(): void {
    // Check if connection_string column exists and add it if not
    try {
      const tableInfo = this.sqlite
        .prepare("PRAGMA table_info(connections)")
        .all() as Array<{ name: string }>;
      const hasConnectionString = tableInfo.some(
        col => col.name === "connection_string"
      );

      if (!hasConnectionString) {
        console.log("Adding connection_string column to connections table...");
        this.sqlite.exec(
          "ALTER TABLE connections ADD COLUMN connection_string TEXT"
        );
      }
    } catch (error) {
      console.warn("Schema migration warning:", error);
    }
  }

  private createTables(): void {
    // Create tables if they don't exist
    this.sqlite.exec(`
      CREATE TABLE IF NOT EXISTS connections (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        type TEXT NOT NULL,
        host TEXT NOT NULL,
        port INTEGER NOT NULL,
        database TEXT,
        username TEXT NOT NULL,
        connection_string TEXT,
        ssl INTEGER DEFAULT 0,
        options TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
        last_used TEXT
      )
    `);

    this.sqlite.exec(`
      CREATE TABLE IF NOT EXISTS query_history (
        id TEXT PRIMARY KEY,
        connection_id TEXT REFERENCES connections(id) ON DELETE CASCADE,
        query TEXT NOT NULL,
        execution_time INTEGER,
        row_count INTEGER,
        success INTEGER NOT NULL,
        error_message TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);

    this.sqlite.exec(`
      CREATE TABLE IF NOT EXISTS saved_queries (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        query TEXT NOT NULL,
        tags TEXT,
        favorite INTEGER DEFAULT 0,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);

    this.sqlite.exec(`
      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        type TEXT NOT NULL,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);

    this.sqlite.exec(`
      CREATE TABLE IF NOT EXISTS audit_log (
        id TEXT PRIMARY KEY,
        connection_id TEXT REFERENCES connections(id) ON DELETE CASCADE,
        query TEXT NOT NULL,
        query_type TEXT NOT NULL,
        success INTEGER NOT NULL,
        rows_affected INTEGER,
        execution_time INTEGER,
        user_action TEXT,
        risk_level TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // AI Engines table
    this.sqlite.exec(`
      CREATE TABLE IF NOT EXISTS ai_engines (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        provider TEXT NOT NULL,
        endpoint TEXT,
        api_key_ref TEXT,
        default_model TEXT,
        temperature REAL DEFAULT 0.7,
        max_tokens INTEGER DEFAULT 2048,
        timeout_ms INTEGER DEFAULT 30000,
        retry_policy TEXT DEFAULT 'exponential',
        json_mode INTEGER DEFAULT 0,
        rate_limit INTEGER DEFAULT 60,
        notes TEXT,
        is_default INTEGER DEFAULT 0,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Chat conversations table
    this.sqlite.exec(`
      CREATE TABLE IF NOT EXISTS chat_conversations (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        ai_engine_id TEXT REFERENCES ai_engines(id) ON DELETE SET NULL,
        connection_id TEXT REFERENCES connections(id) ON DELETE SET NULL,
        is_deleted INTEGER DEFAULT 0,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Chat messages table
    this.sqlite.exec(`
      CREATE TABLE IF NOT EXISTS chat_messages (
        id TEXT PRIMARY KEY,
        conversation_id TEXT REFERENCES chat_conversations(id) ON DELETE CASCADE,
        role TEXT NOT NULL,
        content TEXT NOT NULL,
        tool_calls TEXT,
        tool_results TEXT,
        tokens INTEGER,
        cost REAL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);

    this.sqlite.exec(`
      CREATE TABLE IF NOT EXISTS tips (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        category TEXT NOT NULL,
        priority INTEGER DEFAULT 0,
        is_active INTEGER DEFAULT 1,
        show_count INTEGER DEFAULT 0,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create indexes
    this.sqlite.exec(`
      CREATE INDEX IF NOT EXISTS idx_query_history_connection_id ON query_history(connection_id);
      CREATE INDEX IF NOT EXISTS idx_query_history_created_at ON query_history(created_at);
      CREATE INDEX IF NOT EXISTS idx_audit_log_connection_id ON audit_log(connection_id);
      CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON audit_log(created_at);
      CREATE INDEX IF NOT EXISTS idx_saved_queries_favorite ON saved_queries(favorite);
      CREATE INDEX IF NOT EXISTS idx_ai_engines_is_default ON ai_engines(is_default);
      CREATE INDEX IF NOT EXISTS idx_chat_conversations_ai_engine_id ON chat_conversations(ai_engine_id);
      CREATE INDEX IF NOT EXISTS idx_chat_conversations_connection_id ON chat_conversations(connection_id);
      CREATE INDEX IF NOT EXISTS idx_chat_messages_conversation_id ON chat_messages(conversation_id);
      CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON chat_messages(created_at);
      CREATE INDEX IF NOT EXISTS idx_tips_category ON tips(category);
      CREATE INDEX IF NOT EXISTS idx_tips_is_active ON tips(is_active);
      CREATE INDEX IF NOT EXISTS idx_tips_priority ON tips(priority);
    `);
  }

  async close(): Promise<void> {
    this.sqlite.close();
  }

  // Connection management
  async saveConnection(
    connection: NewConnection,
    password?: string
  ): Promise<Connection> {
    const id = connection.id || generateUUID();

    // Save password securely if provided
    if (password) {
      await this.credentialManager.savePassword(id, password);
    }

    const newConnection = {
      ...connection,
      id,
      updatedAt: new Date().toISOString(),
    };

    const result = await this.drizzle
      .insert(schema.connections)
      .values(newConnection)
      .returning();

    return result[0];
  }

  async getConnection(id: string): Promise<Connection | null> {
    const result = await this.drizzle
      .select()
      .from(schema.connections)
      .where(eq(schema.connections.id, id))
      .limit(1);

    return result[0] || null;
  }

  async getConnectionWithCredentials(
    id: string
  ): Promise<(Connection & { password?: string }) | null> {
    const connection = await this.getConnection(id);
    if (!connection) return null;

    const password = await this.credentialManager.getPassword(id);
    return { ...connection, password: password ?? undefined };
  }

  async listConnections(): Promise<Connection[]> {
    console.log("🔧 Listing connections from database...");
    const result = await this.drizzle
      .select()
      .from(schema.connections)
      .orderBy(desc(schema.connections.lastUsed), schema.connections.name);
    console.log(`🔧 Found ${result.length} connections in database`);
    return result;
  }

  async updateConnection(
    id: string,
    updates: Partial<NewConnection>,
    password?: string
  ): Promise<Connection | null> {
    // Update password if provided
    if (password !== undefined) {
      if (password) {
        await this.credentialManager.savePassword(id, password);
      } else {
        await this.credentialManager.deletePassword(id);
      }
    }

    const result = await this.drizzle
      .update(schema.connections)
      .set({ ...updates, updatedAt: new Date().toISOString() })
      .where(eq(schema.connections.id, id))
      .returning();

    return result[0] || null;
  }

  async deleteConnection(id: string): Promise<boolean> {
    // Delete password from keychain
    await this.credentialManager.deletePassword(id);

    const result = await this.drizzle
      .delete(schema.connections)
      .where(eq(schema.connections.id, id));

    return result.changes > 0;
  }

  async updateLastUsed(connectionId: string): Promise<void> {
    await this.drizzle
      .update(schema.connections)
      .set({ lastUsed: new Date().toISOString() })
      .where(eq(schema.connections.id, connectionId));
  }

  // Query history management
  async addQueryHistory(
    entry: NewQueryHistoryEntry
  ): Promise<QueryHistoryEntry> {
    const id = generateUUID();
    const newEntry = {
      ...entry,
      id,
      createdAt: new Date().toISOString(),
    };

    const result = await this.drizzle
      .insert(schema.queryHistory)
      .values(newEntry)
      .returning();

    return result[0];
  }

  async getQueryHistory(
    connectionId?: string,
    limit = 100
  ): Promise<QueryHistoryEntry[]> {
    const baseQuery = this.drizzle
      .select()
      .from(schema.queryHistory)
      .orderBy(desc(schema.queryHistory.createdAt))
      .limit(limit);

    if (connectionId) {
      return await baseQuery.where(
        eq(schema.queryHistory.connectionId, connectionId)
      );
    }

    return await baseQuery;
  }

  async clearQueryHistory(connectionId?: string): Promise<number> {
    if (connectionId) {
      const result = await this.drizzle
        .delete(schema.queryHistory)
        .where(eq(schema.queryHistory.connectionId, connectionId));
      return result.changes;
    } else {
      const result = await this.drizzle.delete(schema.queryHistory);
      return result.changes;
    }
  }

  // Saved queries management
  async saveQuery(query: NewSavedQuery): Promise<SavedQuery> {
    const id = generateUUID();
    const newQuery = {
      ...query,
      id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const result = await this.drizzle
      .insert(schema.savedQueries)
      .values(newQuery)
      .returning();

    return result[0];
  }

  async getSavedQueries(): Promise<SavedQuery[]> {
    return await this.drizzle
      .select()
      .from(schema.savedQueries)
      .orderBy(
        desc(schema.savedQueries.favorite),
        desc(schema.savedQueries.updatedAt)
      );
  }

  async updateSavedQuery(
    id: string,
    updates: Partial<NewSavedQuery>
  ): Promise<SavedQuery | null> {
    const result = await this.drizzle
      .update(schema.savedQueries)
      .set({ ...updates, updatedAt: new Date().toISOString() })
      .where(eq(schema.savedQueries.id, id))
      .returning();

    return result[0] || null;
  }

  async deleteSavedQuery(id: string): Promise<boolean> {
    const result = await this.drizzle
      .delete(schema.savedQueries)
      .where(eq(schema.savedQueries.id, id));

    return result.changes > 0;
  }

  // Settings management
  async setSetting<T>(key: string, value: T): Promise<void> {
    const type = typeof value;
    const serializedValue =
      type === "object" ? JSON.stringify(value) : String(value);

    await this.drizzle
      .insert(schema.settings)
      .values({
        key,
        value: serializedValue,
        type,
        updatedAt: new Date().toISOString(),
      })
      .onConflictDoUpdate({
        target: schema.settings.key,
        set: {
          value: serializedValue,
          type,
          updatedAt: new Date().toISOString(),
        },
      });
  }

  async getSetting<T>(key: string, defaultValue?: T): Promise<T | undefined> {
    const result = await this.drizzle
      .select()
      .from(schema.settings)
      .where(eq(schema.settings.key, key))
      .limit(1);

    if (!result[0]) return defaultValue;

    const setting = result[0];

    switch (setting.type) {
      case "boolean":
        return (setting.value === "true") as T;
      case "number":
        return Number(setting.value) as T;
      case "object":
        return JSON.parse(setting.value) as T;
      default:
        return setting.value as T;
    }
  }

  async deleteSetting(key: string): Promise<boolean> {
    const result = await this.drizzle
      .delete(schema.settings)
      .where(eq(schema.settings.key, key));

    return result.changes > 0;
  }

  // Audit logging
  async addAuditLog(entry: NewAuditLogEntry): Promise<AuditLogEntry> {
    const id = generateUUID();
    const newEntry = {
      ...entry,
      id,
      createdAt: new Date().toISOString(),
    };

    const result = await this.drizzle
      .insert(schema.auditLog)
      .values(newEntry)
      .returning();

    return result[0];
  }

  async getAuditLog(
    connectionId?: string,
    limit = 100
  ): Promise<AuditLogEntry[]> {
    const baseQuery = this.drizzle
      .select()
      .from(schema.auditLog)
      .orderBy(desc(schema.auditLog.createdAt))
      .limit(limit);

    if (connectionId) {
      return await baseQuery.where(
        eq(schema.auditLog.connectionId, connectionId)
      );
    }

    return await baseQuery;
  }

  async getAuditStats(connectionId?: string): Promise<{
    totalQueries: number;
    successfulQueries: number;
    failedQueries: number;
    riskyQueries: number;
  }> {
    // This would require more complex aggregation queries
    // For now, return basic stats
    const logs = await this.getAuditLog(connectionId, 1000);

    return {
      totalQueries: logs.length,
      successfulQueries: logs.filter(l => l.success).length,
      failedQueries: logs.filter(l => !l.success).length,
      riskyQueries: logs.filter(l => l.riskLevel === "high").length,
    };
  }

  // Tips management
  async createTip(tip: NewTip): Promise<Tip> {
    const id = generateUUID();
    const newTip = {
      ...tip,
      id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const result = await this.drizzle
      .insert(schema.tips)
      .values(newTip)
      .returning();

    return result[0];
  }

  async getTips(category?: string, activeOnly: boolean = true): Promise<Tip[]> {
    if (category && activeOnly) {
      return await this.drizzle
        .select()
        .from(schema.tips)
        .where(
          and(
            eq(schema.tips.isActive, true),
            eq(schema.tips.category, category)
          )
        )
        .orderBy(desc(schema.tips.priority), asc(schema.tips.createdAt));
    }

    if (activeOnly) {
      return await this.drizzle
        .select()
        .from(schema.tips)
        .where(eq(schema.tips.isActive, true))
        .orderBy(desc(schema.tips.priority), asc(schema.tips.createdAt));
    }

    if (category) {
      return await this.drizzle
        .select()
        .from(schema.tips)
        .where(eq(schema.tips.category, category))
        .orderBy(desc(schema.tips.priority), asc(schema.tips.createdAt));
    }

    return await this.drizzle
      .select()
      .from(schema.tips)
      .orderBy(desc(schema.tips.priority), asc(schema.tips.createdAt));
  }

  async getTip(id: string): Promise<Tip | null> {
    const result = await this.drizzle
      .select()
      .from(schema.tips)
      .where(eq(schema.tips.id, id))
      .limit(1);

    return result[0] || null;
  }

  async updateTip(
    id: string,
    updates: Partial<Omit<Tip, "id" | "createdAt">>
  ): Promise<Tip | null> {
    const updateData = {
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    const result = await this.drizzle
      .update(schema.tips)
      .set(updateData)
      .where(eq(schema.tips.id, id))
      .returning();

    return result[0] || null;
  }

  async deleteTip(id: string): Promise<boolean> {
    const result = await this.drizzle
      .delete(schema.tips)
      .where(eq(schema.tips.id, id));

    return result.changes > 0;
  }

  async incrementTipShowCount(id: string): Promise<void> {
    await this.drizzle
      .update(schema.tips)
      .set({ showCount: sql`${schema.tips.showCount} + 1` })
      .where(eq(schema.tips.id, id));
  }

  async getRandomTips(count: number = 1, category?: string): Promise<Tip[]> {
    const tips = await this.getTips(category);

    // Simple random shuffle using Fisher-Yates algorithm
    const shuffled = [...tips];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    return shuffled.slice(0, count);
  }

  private async createDefaultTips(): Promise<void> {
    try {
      // Check if any tips already exist
      const existingTips = await this.getTips(undefined, false);
      if (existingTips.length > 0) {
        return; // Don't create defaults if tips already exist
      }

      const defaultTips = [
        {
          id: "tip_welcome",
          title: "Welcome to SQL Helper",
          content:
            "SQL Helper is designed to make working with databases easier and more productive. Use the connection manager to set up your database connections, write SQL queries in the editor, and get AI-powered assistance with your queries.",
          category: "general",
          priority: 10,
          isActive: true,
          showCount: 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: "tip_connections",
          title: "Setting Up Database Connections",
          content:
            "Click the 'New Connection' button to add your first database connection. SQL Helper supports various database types including SQL Server, PostgreSQL, MySQL, and more. Test your connection before saving to ensure it works correctly.",
          category: "connection",
          priority: 9,
          isActive: true,
          showCount: 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: "tip_ai_engines",
          title: "AI-Powered Query Assistance",
          content:
            "Set up AI engines in the settings to get intelligent help with your SQL queries. The AI can help you write queries, explain existing ones, optimize performance, and troubleshoot errors. Support for OpenAI, Azure OpenAI, Ollama, and more.",
          category: "ai",
          priority: 8,
          isActive: true,
          showCount: 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: "tip_query_editor",
          title: "Query Editor Features",
          content:
            "The SQL editor includes syntax highlighting, auto-completion, and multiple query execution. Use Ctrl+Enter (Cmd+Enter on Mac) to execute the current query or selected text. View results in a tabbed interface with export capabilities.",
          category: "query",
          priority: 7,
          isActive: true,
          showCount: 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: "tip_shortcuts",
          title: "Keyboard Shortcuts",
          content:
            "Learn these helpful shortcuts: F5 to execute queries, Ctrl+N for new query tab, Ctrl+O to open SQL files, Ctrl+S to save, and Ctrl+Shift+C to format SQL. Toggle the explorer with Ctrl+B and chat panel with Ctrl+Shift+B.",
          category: "shortcuts",
          priority: 6,
          isActive: true,
          showCount: 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: "tip_performance",
          title: "Query Performance Tips",
          content:
            "For better query performance: use indexes on frequently queried columns, avoid SELECT *, use WHERE clauses to limit result sets, and consider using EXPLAIN to analyze query execution plans. The AI assistant can help optimize slow queries.",
          category: "performance",
          priority: 5,
          isActive: true,
          showCount: 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ];

      // Create each default tip
      for (const tip of defaultTips) {
        await this.createTip(tip);
      }

      console.log("🔧 Created default tips");
    } catch (error) {
      console.error("🔧 Failed to create default tips:", error);
    }
  }
}
