import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { eq, desc, and, or } from 'drizzle-orm';
import * as schema from './schema';

// Simple UUID v4 generator that doesn't depend on crypto module
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}
import type { 
  Connection, 
  NewConnection, 
  QueryHistoryEntry, 
  NewQueryHistoryEntry,
  SavedQuery,
  NewSavedQuery,
  Setting,
  NewSetting,
  AuditLogEntry,
  NewAuditLogEntry
} from './schema';
import { CredentialManager } from './credentials';

export class LocalDatabase {
  private db: Database.Database;
  private drizzle: ReturnType<typeof drizzle>;
  private credentialManager: CredentialManager;

  constructor(dbPath: string) {
    this.db = new Database(dbPath);
    this.drizzle = drizzle(this.db, { schema });
    this.credentialManager = new CredentialManager();
    
    // Enable WAL mode for better concurrency
    this.db.exec('PRAGMA journal_mode = WAL;');
    this.db.exec('PRAGMA synchronous = NORMAL;');
    this.db.exec('PRAGMA cache_size = 1000;');
    this.db.exec('PRAGMA foreign_keys = ON;');
  }

  async initialize(): Promise<void> {
    // Run migrations
    try {
      await migrate(this.drizzle, { migrationsFolder: './migrations' });
    } catch (error) {
      // If no migrations folder exists, create tables manually
      this.createTables();
    }
    
    // Handle schema migrations for existing databases
    this.handleSchemaMigrations();
  }

  private handleSchemaMigrations(): void {
    // Check if connection_string column exists and add it if not
    try {
      const tableInfo = this.db.prepare("PRAGMA table_info(connections)").all() as any[];
      const hasConnectionString = tableInfo.some((col: any) => col.name === 'connection_string');
      
      if (!hasConnectionString) {
        console.log('Adding connection_string column to connections table...');
        this.db.exec('ALTER TABLE connections ADD COLUMN connection_string TEXT');
      }
    } catch (error) {
      console.warn('Schema migration warning:', error);
    }
  }

  private createTables(): void {
    // Create tables if they don't exist
    this.db.exec(`
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

    this.db.exec(`
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

    this.db.exec(`
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

    this.db.exec(`
      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        type TEXT NOT NULL,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);

    this.db.exec(`
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

    // Create indexes
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_query_history_connection_id ON query_history(connection_id);
      CREATE INDEX IF NOT EXISTS idx_query_history_created_at ON query_history(created_at);
      CREATE INDEX IF NOT EXISTS idx_audit_log_connection_id ON audit_log(connection_id);
      CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON audit_log(created_at);
      CREATE INDEX IF NOT EXISTS idx_saved_queries_favorite ON saved_queries(favorite);
    `);
  }

  async close(): Promise<void> {
    this.db.close();
  }

  // Connection management
  async saveConnection(connection: NewConnection, password?: string): Promise<Connection> {
    const id = connection.id || generateUUID();
    
    // Save password securely if provided
    if (password) {
      await this.credentialManager.savePassword(id, password);
    }

    const newConnection = {
      ...connection,
      id,
      updatedAt: new Date().toISOString()
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

  async getConnectionWithCredentials(id: string): Promise<(Connection & { password?: string }) | null> {
    const connection = await this.getConnection(id);
    if (!connection) return null;

    const password = await this.credentialManager.getPassword(id);
    return { ...connection, password: password ?? undefined };
  }

  async listConnections(): Promise<Connection[]> {
    return await this.drizzle
      .select()
      .from(schema.connections)
      .orderBy(desc(schema.connections.lastUsed), schema.connections.name);
  }

  async updateConnection(id: string, updates: Partial<NewConnection>, password?: string): Promise<Connection | null> {
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
  async addQueryHistory(entry: NewQueryHistoryEntry): Promise<QueryHistoryEntry> {
    const id = generateUUID();
    const newEntry = {
      ...entry,
      id,
      createdAt: new Date().toISOString()
    };

    const result = await this.drizzle
      .insert(schema.queryHistory)
      .values(newEntry)
      .returning();

    return result[0];
  }

  async getQueryHistory(connectionId?: string, limit = 100): Promise<QueryHistoryEntry[]> {
    const baseQuery = this.drizzle
      .select()
      .from(schema.queryHistory)
      .orderBy(desc(schema.queryHistory.createdAt))
      .limit(limit);

    if (connectionId) {
      return await baseQuery.where(eq(schema.queryHistory.connectionId, connectionId));
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
      updatedAt: new Date().toISOString()
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
      .orderBy(desc(schema.savedQueries.favorite), desc(schema.savedQueries.updatedAt));
  }

  async updateSavedQuery(id: string, updates: Partial<NewSavedQuery>): Promise<SavedQuery | null> {
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
    const serializedValue = type === 'object' ? JSON.stringify(value) : String(value);

    await this.drizzle
      .insert(schema.settings)
      .values({
        key,
        value: serializedValue,
        type,
        updatedAt: new Date().toISOString()
      })
      .onConflictDoUpdate({
        target: schema.settings.key,
        set: {
          value: serializedValue,
          type,
          updatedAt: new Date().toISOString()
        }
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
      case 'boolean':
        return (setting.value === 'true') as T;
      case 'number':
        return Number(setting.value) as T;
      case 'object':
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
      createdAt: new Date().toISOString()
    };

    const result = await this.drizzle
      .insert(schema.auditLog)
      .values(newEntry)
      .returning();

    return result[0];
  }

  async getAuditLog(connectionId?: string, limit = 100): Promise<AuditLogEntry[]> {
    const baseQuery = this.drizzle
      .select()
      .from(schema.auditLog)
      .orderBy(desc(schema.auditLog.createdAt))
      .limit(limit);

    if (connectionId) {
      return await baseQuery.where(eq(schema.auditLog.connectionId, connectionId));
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
      riskyQueries: logs.filter(l => l.riskLevel === 'high').length
    };
  }
}