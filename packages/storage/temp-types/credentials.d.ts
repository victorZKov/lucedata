export declare class CredentialManager {
    private readonly serviceName;
    private isKeytarAvailable;
    private keytar;
    private loadPromise;
    constructor();
    private loadKeytar;
    private ensureLoaded;
    savePassword(connectionId: string, password: string): Promise<void>;
    getPassword(connectionId: string): Promise<string | null>;
    deletePassword(connectionId: string): Promise<boolean>;
    listStoredConnections(): Promise<string[]>;
    hasPassword(connectionId: string): Promise<boolean>;
    clearAllPasswords(): Promise<void>;
    saveApiKey(engineId: string, apiKey: string): Promise<string>;
    getApiKey(keyRef: string): Promise<string | null>;
    deleteApiKey(keyRef: string): Promise<boolean>;
    hasApiKey(keyRef: string): Promise<boolean>;
}
