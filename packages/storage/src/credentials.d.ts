export declare class CredentialManager {
    private readonly serviceName;
    savePassword(connectionId: string, password: string): Promise<void>;
    getPassword(connectionId: string): Promise<string | null>;
    deletePassword(connectionId: string): Promise<boolean>;
    listStoredConnections(): Promise<string[]>;
    hasPassword(connectionId: string): Promise<boolean>;
    clearAllPasswords(): Promise<void>;
}
//# sourceMappingURL=credentials.d.ts.map