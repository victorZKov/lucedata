export class CredentialManager {
    serviceName = 'SQLHelper';
    isKeytarAvailable = false;
    keytar = null;
    constructor() {
        try {
            this.keytar = require('keytar');
            this.isKeytarAvailable = typeof this.keytar?.setPassword === 'function';
        }
        catch (error) {
            console.warn('Keytar not available, passwords will not be stored securely:', error);
            this.isKeytarAvailable = false;
        }
    }
    async savePassword(connectionId, password) {
        if (!this.isKeytarAvailable) {
            console.warn('Keytar not available, skipping password save for connection:', connectionId);
            return;
        }
        try {
            await this.keytar.setPassword(this.serviceName, connectionId, password);
        }
        catch (error) {
            console.warn(`Failed to save password for connection ${connectionId}:`, error);
            // Don't throw error, just log warning - password saving is optional
        }
    }
    async getPassword(connectionId) {
        if (!this.isKeytarAvailable) {
            return null;
        }
        try {
            return await this.keytar.getPassword(this.serviceName, connectionId);
        }
        catch (error) {
            console.warn(`Failed to retrieve password for connection ${connectionId}:`, error);
            return null;
        }
    }
    async deletePassword(connectionId) {
        if (!this.isKeytarAvailable) {
            return true; // Return true as if successful since there's nothing to delete
        }
        try {
            return await this.keytar.deletePassword(this.serviceName, connectionId);
        }
        catch (error) {
            console.warn(`Failed to delete password for connection ${connectionId}:`, error);
            return false;
        }
    }
    async listStoredConnections() {
        if (!this.isKeytarAvailable) {
            return [];
        }
        try {
            const credentials = await this.keytar.findCredentials(this.serviceName);
            return credentials.map((cred) => cred.account);
        }
        catch (error) {
            console.warn('Failed to list stored connections:', error);
            return [];
        }
    }
    async hasPassword(connectionId) {
        const password = await this.getPassword(connectionId);
        return password !== null;
    }
    async clearAllPasswords() {
        if (!this.isKeytarAvailable) {
            return;
        }
        try {
            const credentials = await this.keytar.findCredentials(this.serviceName);
            await Promise.all(credentials.map((cred) => this.keytar.deletePassword(this.serviceName, cred.account)));
        }
        catch (error) {
            console.warn('Failed to clear all passwords:', error);
        }
    }
}
//# sourceMappingURL=credentials.js.map