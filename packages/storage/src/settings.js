import Store from 'electron-store';
const defaultSettings = {
    theme: 'system',
    autoSave: true,
    queryTimeout: 30000,
    maxHistoryEntries: 1000,
    enableAuditLog: true,
    defaultConnectionTimeout: 30000,
    editorFontSize: 14,
    editorTabSize: 2,
    enableAutoComplete: true,
    enableSyntaxHighlighting: true,
    confirmDestructiveOperations: true,
    enableReadOnlyMode: false,
    maxRowsToDisplay: 1000,
    enableQueryOptimizations: true
};
export class SettingsStore {
    store;
    constructor() {
        this.store = new Store({
            defaults: defaultSettings,
            name: 'sqlhelper-settings',
            fileExtension: 'json'
        });
    }
    get(key) {
        return this.store.get(key);
    }
    set(key, value) {
        this.store.set(key, value);
    }
    getAll() {
        return this.store.store;
    }
    setAll(settings) {
        Object.entries(settings).forEach(([key, value]) => {
            this.store.set(key, value);
        });
    }
    reset() {
        this.store.clear();
    }
    resetToDefaults() {
        this.store.store = defaultSettings;
    }
    has(key) {
        return this.store.has(key);
    }
    delete(key) {
        this.store.delete(key);
    }
    // File operations
    getPath() {
        return this.store.path;
    }
    openInEditor() {
        this.store.openInEditor();
    }
}
//# sourceMappingURL=settings.js.map