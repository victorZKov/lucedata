import Store from 'electron-store';

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

const defaultSettings: AppSettings = {
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
  private store: any;

  constructor() {
    this.store = new Store<AppSettings>({
      defaults: defaultSettings,
      name: 'sqlhelper-settings',
      fileExtension: 'json'
    });
  }

  get<K extends keyof AppSettings>(key: K): AppSettings[K] {
    return this.store.get(key);
  }

  set<K extends keyof AppSettings>(key: K, value: AppSettings[K]): void {
    this.store.set(key, value);
  }

  getAll(): AppSettings {
    return this.store.store;
  }

  setAll(settings: Partial<AppSettings>): void {
    Object.entries(settings).forEach(([key, value]) => {
      this.store.set(key as keyof AppSettings, value);
    });
  }

  reset(): void {
    this.store.clear();
  }

  resetToDefaults(): void {
    this.store.store = defaultSettings;
  }

  has(key: keyof AppSettings): boolean {
    return this.store.has(key);
  }

  delete(key: keyof AppSettings): void {
    this.store.delete(key);
  }

  // File operations
  getPath(): string {
    return this.store.path;
  }

  openInEditor(): void {
    this.store.openInEditor();
  }
}

export type { AppSettings };