export class CredentialManager {
  private readonly serviceName = 'SQLHelper';
  private isKeytarAvailable = false;
  private keytar: any = null;
  private loadPromise: Promise<void> | null = null;

  constructor() {
    // Lazy-load keytar using ESM-friendly dynamic import
    this.loadPromise = this.loadKeytar();
  }

  private async loadKeytar(): Promise<void> {
    try {
      // Dynamic import works in ESM and CommonJS builds
      const mod: any = await import('keytar');
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
    if (!this.isKeytarAvailable) {
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
    if (!this.isKeytarAvailable) {
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
    if (!this.isKeytarAvailable) {
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
    if (!this.isKeytarAvailable) {
      return [];
    }

    try {
      const credentials = await this.keytar.findCredentials(this.serviceName);
      return credentials.map((cred: any) => cred.account);
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
    if (!this.isKeytarAvailable) {
      return;
    }

    try {
      const credentials = await this.keytar.findCredentials(this.serviceName);
      await Promise.all(
        credentials.map((cred: any) => this.keytar.deletePassword(this.serviceName, cred.account))
      );
    } catch (error) {
      console.warn('Failed to clear all passwords:', error);
    }
  }
}