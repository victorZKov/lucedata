import { 
  IDatabaseProvider, 
  DatabaseConnection, 
  DatabaseType 
} from './types';
import { SqlServerProvider } from './providers/sqlserver';
import { PostgreSQLProvider } from './providers/postgresql';
import { SQLiteProvider } from './providers/sqlite';

export class DatabaseProviderFactory {
  private static providers = new Map<DatabaseType, () => IDatabaseProvider>([
    [DatabaseType.SqlServer, () => new SqlServerProvider()],
    [DatabaseType.PostgreSQL, () => new PostgreSQLProvider()],
    [DatabaseType.SQLite, () => new SQLiteProvider()]
  ]);

  static createProvider(type: DatabaseType): IDatabaseProvider {
    const providerFactory = this.providers.get(type);
    if (!providerFactory) {
      throw new Error(`Database provider not found for type: ${type}`);
    }
    return providerFactory();
  }

  static getSupportedTypes(): DatabaseType[] {
    return Array.from(this.providers.keys());
  }

  static registerProvider(type: DatabaseType, factory: () => IDatabaseProvider): void {
    this.providers.set(type, factory);
  }
}

export class DatabaseManager {
  private connections = new Map<string, IDatabaseProvider>();

  async connect(connection: DatabaseConnection): Promise<void> {
    const existing = this.connections.get(connection.id);
    if (existing) {
      if (existing.isConnected()) {
        // Already connected; treat as idempotent
        return;
      }
      // If provider exists but not connected, attempt to reconnect
      await existing.connect(connection);
      return;
    }

    const provider = DatabaseProviderFactory.createProvider(connection.type);
    await provider.connect(connection);
    this.connections.set(connection.id, provider);
  }

  async disconnect(connectionId: string): Promise<void> {
    const provider = this.connections.get(connectionId);
    if (provider) {
      await provider.disconnect();
      this.connections.delete(connectionId);
    }
  }

  async disconnectAll(): Promise<void> {
    const disconnectPromises = Array.from(this.connections.entries()).map(
      ([id, provider]) => this.disconnect(id)
    );
    await Promise.all(disconnectPromises);
  }

  getProvider(connectionId: string): IDatabaseProvider | undefined {
    return this.connections.get(connectionId);
  }

  getConnections(): string[] {
    return Array.from(this.connections.keys());
  }

  async testConnection(connection: DatabaseConnection): Promise<boolean> {
    const provider = DatabaseProviderFactory.createProvider(connection.type);
    return provider.testConnection(connection);
  }
}