interface AppSettings {
    theme: 'light' | 'dark' | 'system';
    autoSave: boolean;
    queryTimeout: number;
    maxHistoryEntries: number;
    enableAuditLog: boolean;
    defaultConnectionTimeout: number;
    editorFontSize: number;
    editorTabSize: number;
    enableAutoComplete: boolean;
    enableSyntaxHighlighting: boolean;
    confirmDestructiveOperations: boolean;
    enableReadOnlyMode: boolean;
    maxRowsToDisplay: number;
    enableQueryOptimizations: boolean;
}
export declare class SettingsStore {
    private store;
    constructor();
    get<K extends keyof AppSettings>(key: K): AppSettings[K];
    set<K extends keyof AppSettings>(key: K, value: AppSettings[K]): void;
    getAll(): AppSettings;
    setAll(settings: Partial<AppSettings>): void;
    reset(): void;
    resetToDefaults(): void;
    has(key: keyof AppSettings): boolean;
    delete(key: keyof AppSettings): void;
    getPath(): string;
    openInEditor(): void;
}
export type { AppSettings };
//# sourceMappingURL=settings.d.ts.map