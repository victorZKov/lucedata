// Type definitions for keytar
interface KeytarCredential {
  account: string;
  password: string;
}

interface KeytarModule {
  setPassword(service: string, account: string, password: string): Promise<void>;
  getPassword(service: string, account: string): Promise<string | null>;
  deletePassword(service: string, account: string): Promise<boolean>;
  findCredentials(service: string): Promise<KeytarCredential[]>;
}

export class CredentialManager {
  private readonly serviceName = 'SQLHelper';
  private isKeytarAvailable = false;
  private keytar: KeytarModule | null = null;
  private loadPromise: Promise<void> | null = null;

  constructor() {
    // Lazy-load keytar using ESM-friendly dynamic import
    this.loadPromise = this.loadKeytar();
  }

  private async loadKeytar(): Promise<void> {
    try {
      // Dynamic import works in ESM and CommonJS builds
      const mod = await import('keytar') as { default?: KeytarModule } & KeytarModule;
      this.keytar = mod?.default ?? mod;
      this.isKeytarAvailable = typeof this.keytar?.setPassword === 'function';
    } catch (error) {
      console.warn('Keytar not available, passwords will not be stored securely:', error);
      this.isKeytarAvailable = false;
    }
  }

  private async ensureLoaded() {
    if (!this.loadPromise) this.loadPromise = this.loadKeytar();
    await this.loadPromise;
  }

  async savePassword(connectionId: string, password: string): Promise<void> {
    await this.ensureLoaded();
    if (!this.isKeytarAvailable || !this.keytar) {
      console.warn('Keytar not available, skipping password save for connection:', connectionId);
      return;
    }

    try {
      await this.keytar.setPassword(this.serviceName, connectionId, password);
    } catch (error) {
      console.warn(`Failed to save password for connection ${connectionId}:`, error);
      // Don't throw error, just log warning - password saving is optional
    }
  }

  async getPassword(connectionId: string): Promise<string | null> {
    await this.ensureLoaded();
    if (!this.isKeytarAvailable || !this.keytar) {
      return null;
    }

    try {
      return await this.keytar.getPassword(this.serviceName, connectionId);
    } catch (error) {
      console.warn(`Failed to retrieve password for connection ${connectionId}:`, error);
      return null;
    }
  }

  async deletePassword(connectionId: string): Promise<boolean> {
    await this.ensureLoaded();
    if (!this.isKeytarAvailable || !this.keytar) {
      return true; // Return true as if successful since there's nothing to delete
    }

    try {
      return await this.keytar.deletePassword(this.serviceName, connectionId);
    } catch (error) {
      console.warn(`Failed to delete password for connection ${connectionId}:`, error);
      return false;
    }
  }

  async listStoredConnections(): Promise<string[]> {
    await this.ensureLoaded();
    if (!this.isKeytarAvailable || !this.keytar) {
      return [];
    }

    try {
      const credentials = await this.keytar.findCredentials(this.serviceName);
      return credentials.map((cred: KeytarCredential) => cred.account);
    } catch (error) {
      console.warn('Failed to list stored connections:', error);
      return [];
    }
  }

  async hasPassword(connectionId: string): Promise<boolean> {
    await this.ensureLoaded();
    const password = await this.getPassword(connectionId);
    return password !== null;
  }

  async clearAllPasswords(): Promise<void> {
    await this.ensureLoaded();
    if (!this.isKeytarAvailable || !this.keytar) {
      return;
    }

    try {
      const credentials = await this.keytar.findCredentials(this.serviceName);
      await Promise.all(
        credentials.map((cred: KeytarCredential) => this.keytar!.deletePassword(this.serviceName, cred.account))
      );
    } catch (error) {
      console.warn('Failed to clear all passwords:', error);
    }
  }

  // AI Engine API Key Management
  async saveApiKey(engineId: string, apiKey: string): Promise<string> {
    await this.ensureLoaded();
    const keyRef = `ai_engine_${engineId}`;
    
    if (!this.isKeytarAvailable || !this.keytar) {
      console.warn('Keytar not available, API key will not be stored securely for engine:', engineId);
      return keyRef;
    }

    try {
      await this.keytar.setPassword(this.serviceName, keyRef, apiKey);
      return keyRef;
    } catch (error) {
      console.warn(`Failed to save API key for engine ${engineId}:`, error);
      throw new Error('Failed to securely store API key');
    }
  }

  async getApiKey(keyRef: string): Promise<string | null> {
    await this.ensureLoaded();
    if (!this.isKeytarAvailable || !this.keytar) {
      return null;
    }

    try {
      return await this.keytar.getPassword(this.serviceName, keyRef);
    } catch (error) {
      console.warn(`Failed to retrieve API key for ref ${keyRef}:`, error);
      return null;
    }
  }

  async deleteApiKey(keyRef: string): Promise<boolean> {
    await this.ensureLoaded();
    if (!this.isKeytarAvailable || !this.keytar) {
      return true;
    }

    try {
      return await this.keytar.deletePassword(this.serviceName, keyRef);
    } catch (error) {
      console.warn(`Failed to delete API key for ref ${keyRef}:`, error);
      return false;
    }
  }

  async hasApiKey(keyRef: string): Promise<boolean> {
    await this.ensureLoaded();
    const apiKey = await this.getApiKey(keyRef);
    return apiKey !== null;
  }
}