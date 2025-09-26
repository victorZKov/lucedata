import fs from "fs";
import path from "path";
import crypto from "crypto";
import { fileURLToPath } from "url";

import {
  LocalDatabase,
  type AiEngine,
  type CredentialManager,
} from "@sqlhelper/storage";
import {
  app,
  BrowserWindow,
  Menu,
  shell,
  ipcMain,
  dialog,
  Event,
  WebContents,
  IpcMainInvokeEvent,
  MenuItemConstructorOptions,
} from "electron";
import Store from "electron-store";
// eslint-disable-next-line import/order
import electronUpdater from "electron-updater";

const { autoUpdater } = electronUpdater;

import { DatabaseManager, DatabaseType } from "@sqlhelper/database-core";
import {
  AIManager,
  type AIEngineConfig,
  AIProvider,
} from "@sqlhelper/ai-integration";

// Set application name immediately and comprehensively
app.setName("SQL Helper");

// On macOS, also set the app user model ID which can affect the display name
if (process.platform === "darwin") {
  app.setAppUserModelId("com.sqlhelper.desktop");

  // In development mode, try to override Electron's default name
  if (process.env.NODE_ENV === "development") {
    // This is a workaround for development mode on macOS
    process.title = "SQL Helper";

    // Try to set the process name (this affects some system dialogs)
    try {
      process.argv[0] = "SQL Helper";
    } catch (_error) {
      // Ignore if we can't set it
    }
  }
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Enable live reload for development
if (process.env.NODE_ENV === "development") {
  console.log("🔧 DEVELOPMENT MODE DETECTED");
  try {
    const { default: electronReload } = await import("electron-reload");
    electronReload(__dirname, {
      electron: path.join(process.cwd(), "node_modules", ".bin", "electron"),
      hardResetMethod: "exit",
    });
  } catch (_error) {
    console.log("electron-reload not available");
  }
}

// Define store schema interface
interface StoreSchema {
  windowBounds: { width: number; height: number };
  theme: string;
  telemetry: boolean;
  [key: string]: unknown; // Allow additional dynamic keys
}

// Initialize electron store for settings
const store = new Store<StoreSchema>({
  defaults: {
    windowBounds: { width: 1200, height: 800 },
    theme: "system",
    telemetry: false,
  },
});

// Initialize local database
const dbPath = path.join(app.getPath("userData"), "sqlhelper.db");
console.log(`🔧 Database path: ${dbPath}`);
const database = new LocalDatabase(dbPath);

// Define interfaces for AI engines components
interface IAIEnginesRepository {
  findAll(): Promise<unknown[]>;
  findById(id: string): Promise<unknown | null>;
  create(engine: unknown): Promise<unknown>;
  update(id: string, updates: unknown): Promise<unknown | null>;
  delete(id: string): Promise<void>;
  testConnection(id: string): Promise<unknown>;
  validateEngine(engine: unknown): Promise<unknown>;
}

// Initialize AI engines components (using dynamic access due to type issues)
let credentialManager: CredentialManager | null = null;
let aiEnginesRepository: IAIEnginesRepository | null = null;

// Initialize database manager for live connections
const databaseManager = new DatabaseManager();

// Initialize AI manager for chat functionality
const aiManager = new AIManager();

// Initialize database tables
database
  .initialize()
  .then(async () => {
    console.log("Database initialized successfully");

    // Test database persistence
    try {
      const existingConnections = await database.listConnections();
      console.log(
        `🔧 Found ${existingConnections.length} existing connections on startup`
      );

      // If no connections exist, create a test one
      if (existingConnections.length === 0) {
        console.log("🔧 No connections found, creating test connection...");
        const testConnection = {
          id: "test-connection-1",
          name: "Test Connection",
          type: "sqlite",
          host: "localhost",
          port: 5432,
          database: "test",
          username: "test",
        };
        await database.saveConnection(testConnection);
        console.log("🔧 Test connection created");

        // Verify it was saved
        const afterSave = await database.listConnections();
        console.log(`🔧 After saving: ${afterSave.length} connections found`);
      }
    } catch (error) {
      console.error("🔧 Error testing database:", error);
    }

    // Initialize AI engines components after database is ready
    try {
      const StorageModule = await import("@sqlhelper/storage");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      credentialManager = new (StorageModule as any).CredentialManager();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      aiEnginesRepository = new (StorageModule as any).AIEnginesRepository(
        database,
        credentialManager
      );
      console.log("AI engines components initialized");
    } catch (_error) {
      console.error("Failed to initialize AI engines components:", _error);
    }
  })
  .catch(error => {
    console.error("Failed to initialize database:", error);
  });

let mainWindow: BrowserWindow | null = null;

const isDev =
  process.env.NODE_ENV === "development" || process.argv.includes("--dev");
const isDebug = process.argv.includes("--debug");

console.log("🔧 Environment flags:", {
  isDev,
  isDebug,
  nodeEnv: process.env.NODE_ENV,
  argv: process.argv,
});

function createWindow(): void {
  // Get stored window bounds
  const { width, height } = (store as any).get("windowBounds") as {
    width: number;
    height: number;
  };

  const preloadPath = path.join(__dirname, "preload.cjs");
  console.log("🔧 Preload script path:", preloadPath);
  console.log("🔧 Preload script exists:", fs.existsSync(preloadPath));

  // Create the browser window
  mainWindow = new BrowserWindow({
    width,
    height,
    minWidth: 800,
    minHeight: 600,
    title: "SQL Helper",
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: preloadPath,
      webSecurity: !isDev,
      sandbox: false, // Keep sandbox disabled to allow preload script
    },
    titleBarStyle: process.platform === "darwin" ? "hiddenInset" : "default",
    show: false, // Don't show until ready
    icon: path.join(__dirname, "../assets/icon.png"),
    movable: true,
    resizable: true,
    trafficLightPosition:
      process.platform === "darwin" ? { x: 20, y: 16 } : undefined,
  });

  // Add error handling for preload script
  mainWindow.webContents.on(
    "console-message",
    (_event, level, message, _line, _sourceId) => {
      if (message.includes("preload") || message.includes("ElectronAPI")) {
        console.log(`🔧 Renderer Console [${level}]:`, message);
      }
    }
  );

  mainWindow.webContents.on("preload-error", (event, preloadPath, error) => {
    console.error(`❌ Preload script error in ${preloadPath}:`, error);
  });

  // Load the app
  if (isDev) {
    const rendererUrl = process.env.RENDERER_URL || "http://localhost:5173";
    console.log(`🌐 Loading development URL: ${rendererUrl}`);
    mainWindow.loadURL(rendererUrl);
  } else {
    console.log("📁 Loading production file");
    // Resolve renderer build index.html when running unpackaged
    // Try to locate monorepo root (pnpm-workspace.yaml) and load apps/renderer/dist/index.html
    const findRepoRoot = (startDir: string) => {
      let dir = startDir;
      for (let i = 0; i < 8; i++) {
        const ws = path.join(dir, "pnpm-workspace.yaml");
        if (fs.existsSync(ws)) return dir;
        const next = path.dirname(dir);
        if (next === dir) break;
        dir = next;
      }
      return null;
    };

    // Prefer resolving relative to the application root (unpackaged app path)
    const candidateFromAppPath = path.resolve(
      app.getAppPath(),
      "../renderer/dist/index.html"
    );
    const repoRoot = findRepoRoot(__dirname);
    const candidateFromRoot = repoRoot
      ? path.join(repoRoot, "apps", "renderer", "dist", "index.html")
      : null;
    // Packaged or alternative compiled layout fallback
    const fallbackA = path.resolve(
      __dirname,
      "../../../renderer/dist/index.html"
    );
    const fallbackB = path.resolve(__dirname, "../../renderer/dist/index.html");
    const toLoad = [
      candidateFromAppPath,
      candidateFromRoot,
      fallbackA,
      fallbackB,
    ].find(p => p && fs.existsSync(p)) as string | undefined;
    if (!toLoad) {
      console.error("❌ Could not locate renderer index.html. Checked:", {
        candidateFromRoot,
        fallbackA,
        fallbackB,
        __dirname,
      });
      throw new Error("Renderer bundle not found");
    }
    console.log("🔧 Resolved renderer index:", toLoad);
    mainWindow.loadFile(toLoad);
  }

  // Do not auto-open DevTools; only open when explicitly requested with --debug
  if (isDebug) {
    console.log("🔧 Opening DevTools (explicit --debug)");
    mainWindow.webContents.once("dom-ready", () => {
      mainWindow?.webContents.openDevTools();
    });
  }

  // Enable right-click context menu
  // We no longer inject a global context menu; renderer shows custom menus.

  // Show window when ready
  mainWindow.once("ready-to-show", () => {
    console.log("🖥️ Window ready to show");
    mainWindow?.show();

    // Focus window on macOS
    if (process.platform === "darwin") {
      mainWindow?.focus();
    }

    // Force menu creation after window is ready
    setTimeout(() => {
      createMenu();
    }, 500);
  });

  // Save window bounds on resize/move
  mainWindow.on("resize", () => {
    if (mainWindow) {
      (store as any).set("windowBounds", mainWindow.getBounds());
    }
  });

  mainWindow.on("move", () => {
    if (mainWindow) {
      (store as any).set("windowBounds", mainWindow.getBounds());
    }
  });

  // Handle window closed
  mainWindow.on("closed", () => {
    mainWindow = null;
  });

  // Handle external links
  mainWindow.webContents.setWindowOpenHandler(({ url }: { url: string }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });

  // Set up menu
  createMenu();
}

function createMenu(): void {
  console.log("Creating menu...");

  try {
    // Ultra simple menu for testing
    const template: MenuItemConstructorOptions[] = [
      {
        label: "File",
        submenu: [
          {
            label: "New Connection",
            accelerator: "CmdOrCtrl+N",
            click: () => {
              console.log("New Connection clicked from menu");
              if (mainWindow) {
                // Send IPC event to renderer to open connection dialog
                mainWindow.webContents.send("menu-action", "new-connection");
              }
            },
          },
          { type: "separator" },
          {
            label: "Open…",
            accelerator: "CmdOrCtrl+O",
            click: () =>
              mainWindow?.webContents.send("menu-action", "file-open"),
          },
          {
            label: "Save",
            accelerator: "CmdOrCtrl+S",
            click: () =>
              mainWindow?.webContents.send("menu-action", "file-save"),
          },
          {
            label: "Save As…",
            accelerator: "CmdOrCtrl+Shift+S",
            click: () =>
              mainWindow?.webContents.send("menu-action", "file-save-as"),
          },
          { type: "separator" },
          {
            label: "Refresh Connections",
            accelerator: "CmdOrCtrl+R",
            click: () => {
              console.log("Refresh Connections clicked from menu");
              if (mainWindow) {
                mainWindow.webContents.send(
                  "menu-action",
                  "refresh-connections"
                );
              }
            },
          },
          {
            label: "Disconnect All",
            click: () => {
              console.log("Disconnect All clicked from menu");
              if (mainWindow) {
                mainWindow.webContents.send("menu-action", "disconnect-all");
              }
            },
          },
          { type: "separator" },
          {
            label: "AI Engines",
            click: () => {
              console.log("AI Engines menu clicked");
              if (mainWindow) {
                mainWindow.webContents.send("menu-action", "manage-ai-engines");
              }
            },
          },
          { role: "quit" },
        ],
      },
      {
        label: "Edit",
        submenu: [
          { role: "undo" },
          { role: "redo" },
          { type: "separator" },
          { role: "cut" },
          { role: "copy" },
          { role: "paste" },
          { type: "separator" },
          { role: "selectAll" },
        ],
      },
      {
        label: "View",
        submenu: [
          { role: "reload" },
          { role: "forceReload" },
          {
            label: "Developer Tools",
            accelerator:
              process.platform === "darwin" ? "Alt+Command+I" : "Ctrl+Shift+I",
            click: () => mainWindow?.webContents.toggleDevTools(),
          },
          { type: "separator" },
          { role: "resetZoom" },
          { role: "zoomIn" },
          { role: "zoomOut" },
          { type: "separator" },
          {
            label: "Theme",
            submenu: (() => {
              const current =
                ((store as any).get("theme") as string) || "system";
              const setTheme = (mode: "system" | "light" | "dark") => {
                (store as any).set("theme", mode);
                mainWindow?.webContents.send(
                  "menu-action",
                  "set-theme-mode",
                  mode
                );
              };
              return [
                {
                  label: "System",
                  type: "radio",
                  checked: current === "system",
                  click: () => setTheme("system"),
                },
                {
                  label: "Light",
                  type: "radio",
                  checked: current === "light",
                  click: () => setTheme("light"),
                },
                {
                  label: "Dark",
                  type: "radio",
                  checked: current === "dark",
                  click: () => setTheme("dark"),
                },
              ] as MenuItemConstructorOptions[];
            })(),
          },
          { type: "separator" },
          { role: "togglefullscreen" },
        ],
      },
      {
        label: "Records",
        submenu: [
          {
            label: "Copy CSV",
            accelerator: "CmdOrCtrl+Shift+C",
            click: () =>
              mainWindow?.webContents.send("menu-action", "records-copy-csv"),
          },
          {
            label: "Copy JSON",
            accelerator: "CmdOrCtrl+Shift+J",
            click: () =>
              mainWindow?.webContents.send("menu-action", "records-copy-json"),
          },
          { type: "separator" },
          {
            label: "Export CSV…",
            accelerator: "CmdOrCtrl+E",
            click: () =>
              mainWindow?.webContents.send("menu-action", "records-export-csv"),
          },
          {
            label: "Export JSON…",
            click: () =>
              mainWindow?.webContents.send(
                "menu-action",
                "records-export-json"
              ),
          },
        ],
      },
      {
        label: "Chat",
        submenu: [
          {
            label: "New Chat",
            accelerator: "CmdOrCtrl+Alt+N",
            click: () => {
              console.log("New Chat clicked from menu");
              if (mainWindow) {
                mainWindow.webContents.send("menu-action", "chat-new");
              }
            },
          },
          { type: "separator" },
          {
            label: "Save Chat…",
            accelerator: "CmdOrCtrl+Alt+S",
            click: () => {
              console.log("Save Chat clicked from menu");
              if (mainWindow) {
                mainWindow.webContents.send("menu-action", "chat-save");
              }
            },
          },
          {
            label: "Load Chat…",
            accelerator: "CmdOrCtrl+Alt+O",
            click: () => {
              console.log("Load Chat clicked from menu");
              if (mainWindow) {
                mainWindow.webContents.send("menu-action", "chat-load");
              }
            },
          },
          { type: "separator" },
          {
            label: "Chat History",
            accelerator: "CmdOrCtrl+Alt+H",
            click: () => {
              console.log("Chat History clicked from menu");
              if (mainWindow) {
                mainWindow.webContents.send("menu-action", "chat-history");
              }
            },
          },
        ],
      },
      {
        label: "Window",
        submenu: [{ role: "minimize" }, { role: "close" }],
      },
      {
        label: "Help",
        submenu: [
          {
            label: "About...",
            click: () => {
              console.log("About clicked from menu");
              if (mainWindow) {
                mainWindow.webContents.send("menu-action", "show-version");
              }
            },
          },
        ],
      },
    ];

    // macOS specific menu adjustments
    if (process.platform === "darwin") {
      template.unshift({
        label: app.getName(),
        submenu: [
          {
            label: "About SQL Helper",
            click: () => {
              console.log("About SQL Helper clicked from app menu");
              if (mainWindow) {
                mainWindow.webContents.send("menu-action", "show-version");
              }
            },
          },
          { type: "separator" },
          { role: "hide" },
          { role: "hideOthers" },
          { role: "unhide" },
          { type: "separator" },
          { role: "quit" },
        ],
      });
    }

    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);
    console.log(
      "Menu set successfully with",
      template.length,
      "top-level items"
    );

    // Force menu refresh on macOS
    if (process.platform === "darwin") {
      app.dock?.setMenu(menu);
    }
  } catch (error) {
    console.error("Failed to create menu:", error);
  }
}

// App event handlers
app.whenReady().then(() => {
  // Ensure app name is set when ready (try multiple approaches)
  app.setName("SQL Helper");

  // On macOS, try to set additional properties to ensure correct name display
  if (process.platform === "darwin") {
    // Force the app name in the dock and menu bar
    try {
      app.dock?.setIcon(path.join(__dirname, "../assets/icon.png"));
    } catch (error) {
      console.log("Could not set dock icon:", error);
    }
  }

  createWindow();

  // Create menu on all platforms
  setTimeout(() => {
    createMenu();
  }, 100);

  // macOS specific behavior
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });

  // Check for updates in production
  if (!isDev) {
    autoUpdater.checkForUpdatesAndNotify();
  }
});

app.on("window-all-closed", async () => {
  // Cleanup database connections
  try {
    await databaseManager.disconnectAll();
  } catch (error) {
    console.error("Error cleaning up database connections:", error);
  }

  if (process.platform !== "darwin") {
    app.quit();
  }
});

// Security: Prevent new window creation
app.on("web-contents-created", (_: Event, contents: WebContents) => {
  contents.on("will-navigate", (event: Event, navigationUrl: string) => {
    const parsedUrl = new URL(navigationUrl);

    if (
      parsedUrl.origin !==
        (process.env.RENDERER_URL || "http://localhost:5173") &&
      parsedUrl.origin !== "file://"
    ) {
      event.preventDefault();
    }
  });

  contents.setWindowOpenHandler(({ url }: { url: string }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });
});

// IPC handlers
ipcMain.handle("get-app-version", () => {
  return app.getVersion();
});

ipcMain.handle("get-platform", () => {
  return process.platform;
});

ipcMain.handle("store-get", (_: IpcMainInvokeEvent, key: string) => {
  return (store as any).get(key);
});

ipcMain.handle(
  "store-set",
  (_: IpcMainInvokeEvent, key: string, value: any) => {
    (store as any).set(key, value);
  }
);

ipcMain.handle("store-delete", (_: IpcMainInvokeEvent, key: string) => {
  return (store as any).delete(key);
});

// Connection management IPC handlers
ipcMain.handle(
  "connection-save",
  async (_: IpcMainInvokeEvent, connection: any, password?: string) => {
    try {
      return await database.saveConnection(connection, password);
    } catch (error) {
      console.error("Error saving connection:", error);
      throw error;
    }
  }
);

ipcMain.handle("connection-list", async () => {
  try {
    console.log("🔧 [IPC] Frontend requested connection list...");
    const connections = await database.listConnections();
    console.log(
      `🔧 [IPC] Returning ${connections.length} connections to frontend`
    );
    return connections;
  } catch (error) {
    console.error("🔧 [IPC] Error listing connections:", error);
    throw error;
  }
});

ipcMain.handle("connection-get", async (_: IpcMainInvokeEvent, id: string) => {
  try {
    return await database.getConnection(id);
  } catch (error) {
    console.error("Error getting connection:", error);
    throw error;
  }
});

ipcMain.handle(
  "connection-delete",
  async (_: IpcMainInvokeEvent, id: string) => {
    try {
      return await database.deleteConnection(id);
    } catch (error) {
      console.error("Error deleting connection:", error);
      throw error;
    }
  }
);

ipcMain.handle(
  "connection-test",
  async (_: IpcMainInvokeEvent, connection: any) => {
    try {
      // Handle special placeholders for database paths
      let databasePath = connection.database;
      let connectionString = connection.connectionString;

      if (databasePath && databasePath.includes("{{APP_DATA}}")) {
        const appDataPath = app.getPath("userData");
        databasePath = databasePath.replace("{{APP_DATA}}", appDataPath);
      }

      if (connectionString && connectionString.includes("{{APP_DATA}}")) {
        const appDataPath = app.getPath("userData");
        connectionString = connectionString.replace(
          "{{APP_DATA}}",
          appDataPath
        );
      }

      // Create test connection object
      const testConnection = {
        ...connection,
        database: databasePath,
        connectionString: connectionString,
        type: connection.type as DatabaseType,
      };

      // Use database manager to test the connection
      await databaseManager.testConnection(testConnection);
      return { success: true, message: "Connection test successful" };
    } catch (error) {
      console.error("Error testing connection:", error);
      return {
        success: false,
        message:
          error instanceof Error ? error.message : "Connection test failed",
      };
    }
  }
);

// Database connection management IPC handlers
ipcMain.handle(
  "database-connect",
  async (_: IpcMainInvokeEvent, connectionId: string) => {
    try {
      // Get connection details from storage including password
      const connectionData =
        await database.getConnectionWithCredentials(connectionId);
      if (!connectionData) {
        throw new Error(`Connection with id '${connectionId}' not found`);
      }

      console.log("🔍 Original connection data:", {
        id: connectionData.id,
        name: connectionData.name,
        type: connectionData.type,
        host: connectionData.host,
        database: connectionData.database,
        connectionString: connectionData.connectionString,
        hasPassword: !!connectionData.password,
      });

      // Handle special placeholders for database paths
      let databasePath = connectionData.database;
      let connectionString = connectionData.connectionString;

      if (databasePath && databasePath.includes("{{APP_DATA}}")) {
        const appDataPath = app.getPath("userData");
        databasePath = databasePath.replace("{{APP_DATA}}", appDataPath);
      }

      if (connectionString && connectionString.includes("{{APP_DATA}}")) {
        const appDataPath = app.getPath("userData");
        connectionString = connectionString.replace(
          "{{APP_DATA}}",
          appDataPath
        );
      }

      // Create database connection object
      const usingConnectionString = !!connectionString;
      const dbConnection = {
        id: connectionId,
        name: connectionData.name,
        type: connectionData.type as DatabaseType,
        // Only include host/port when NOT using a connection string
        host: usingConnectionString
          ? (undefined as unknown as string)
          : connectionData.host || "localhost",
        port: usingConnectionString
          ? (undefined as unknown as number)
          : parseInt(String(connectionData.port || "1433")),
        database: databasePath || undefined,
        username: connectionData.username,
        password: connectionData.password,
        connectionString: connectionString || undefined, // Use processed connection string
        ssl: connectionData.ssl || false,
        options: {
          encrypt: true, // Required for Azure SQL
          trustServerCertificate: false, // Azure SQL uses proper certificates
          enableArithAbort: true,
          requestTimeout: 30000,
          connectionTimeout: 30000,
          // Azure SQL specific options
          authentication: {
            type: "default",
          },
          // Add Azure-specific settings
          connectTimeout: 30000,
          maxRetriesOnFailure: 3,
          multipleActiveResultSets: false,
        },
      };

      console.log("🔍 Final connection object:", {
        id: dbConnection.id,
        name: dbConnection.name,
        type: dbConnection.type,
        host: usingConnectionString
          ? "(via connectionString)"
          : dbConnection.host,
        database: dbConnection.database,
        usingConnectionString,
        hasPassword: !!dbConnection.password,
      });

      await databaseManager.connect(dbConnection);

      // Update last used timestamp
      await database.updateLastUsed(connectionId);

      return { success: true, message: "Connected successfully" };
    } catch (error) {
      console.error("Error connecting to database:", error);
      throw error;
    }
  }
);

ipcMain.handle(
  "database-disconnect",
  async (_: IpcMainInvokeEvent, connectionId: string) => {
    try {
      await databaseManager.disconnect(connectionId);
      return { success: true, message: "Disconnected successfully" };
    } catch (error) {
      console.error("Error disconnecting from database:", error);
      throw error;
    }
  }
);

ipcMain.handle(
  "database-get-schema",
  async (_: IpcMainInvokeEvent, connectionId: string) => {
    try {
      const provider = databaseManager.getProvider(connectionId);
      if (!provider) {
        throw new Error(`No active connection found for id '${connectionId}'`);
      }

      const [schemas, schemaInfo] = await Promise.all([
        provider.getSchemas(),
        provider.getSchemaInfo(),
      ]);

      // Transform the schema info into a tree structure
      const databases = [
        {
          name: "default", // We'll use a default database name for now
          type: "database" as const,
          children: schemas.map(schemaName => ({
            name: schemaName,
            type: "schema" as const,
            children: [
              ...schemaInfo.tables
                .filter(table => table.schema === schemaName)
                .map(table => ({
                  name: table.name,
                  type: "table" as const,
                  schema: table.schema,
                  rowCount: table.rowCount,
                })),
              ...schemaInfo.views
                .filter(view => view.schema === schemaName)
                .map(view => ({
                  name: view.name,
                  type: "view" as const,
                  schema: view.schema,
                })),
              ...schemaInfo.procedures
                .filter(proc => proc.schema === schemaName)
                .map(proc => ({
                  name: proc.name,
                  type: "procedure" as const,
                  schema: proc.schema,
                })),
              ...schemaInfo.functions
                .filter(func => func.schema === schemaName)
                .map(func => ({
                  name: func.name,
                  type: "function" as const,
                  schema: func.schema,
                })),
            ],
          })),
        },
      ];

      return { databases };
    } catch (error) {
      console.error("Error getting schema:", error);
      throw error;
    }
  }
);

ipcMain.handle(
  "database-execute-query",
  async (_: IpcMainInvokeEvent, connectionId: string, query: string) => {
    try {
      const provider = databaseManager.getProvider(connectionId);
      if (!provider) {
        throw new Error(`No active connection found for id '${connectionId}'`);
      }

      const result = await provider.executeQuery(query);
      return result;
    } catch (error) {
      console.error("Error executing query:", error);
      throw error;
    }
  }
);

ipcMain.handle(
  "database-get-xml-execution-plan",
  async (_: IpcMainInvokeEvent, connectionId: string, query: string) => {
    try {
      const provider = databaseManager.getProvider(connectionId);
      if (!provider) {
        throw new Error(`No active connection found for id '${connectionId}'`);
      }

      // Check if provider supports XML execution plans
      if (provider.getXmlExecutionPlan) {
        const xmlPlan = await provider.getXmlExecutionPlan(query);
        return xmlPlan;
      } else {
        throw new Error("XML execution plans not supported for this database type");
      }
    } catch (error) {
      console.error("Error getting XML execution plan:", error);
      throw error;
    }
  }
);

ipcMain.handle(
  "database-get-table-data",
  async (
    _: IpcMainInvokeEvent,
    connectionId: string,
    tableName: string,
    schema?: string
  ) => {
    try {
      const provider = databaseManager.getProvider(connectionId);
      if (!provider) {
        throw new Error(`No active connection found for id '${connectionId}'`);
      }

      const qualifiedName = schema
        ? `${provider.escapeIdentifier(schema)}.${provider.escapeIdentifier(tableName)}`
        : provider.escapeIdentifier(tableName);
      const query = `SELECT TOP 1000 * FROM ${qualifiedName}`;

      const result = await provider.executeQuery(query);
      return result;
    } catch (error) {
      console.error("Error getting table data:", error);
      throw error;
    }
  }
);

// Enhanced metadata IPC handlers for table tree enhancements
ipcMain.handle(
  "database-get-columns",
  async (
    _: IpcMainInvokeEvent,
    connectionId: string,
    tableName: string,
    schema?: string
  ) => {
    try {
      const provider = databaseManager.getProvider(connectionId);
      if (!provider) {
        throw new Error(`No active connection found for id '${connectionId}'`);
      }

      const result = await provider.getColumns(tableName, schema);
      return result;
    } catch (error) {
      console.error("Error getting table columns:", error);
      throw error;
    }
  }
);

ipcMain.handle(
  "database-get-keys",
  async (
    _: IpcMainInvokeEvent,
    connectionId: string,
    tableName: string,
    schema?: string
  ) => {
    try {
      const provider = databaseManager.getProvider(connectionId);
      if (!provider) {
        throw new Error(`No active connection found for id '${connectionId}'`);
      }

      if (!provider.getKeys) {
        console.warn(
          `Provider for connection ${connectionId} does not support getKeys`
        );
        return [];
      }

      const result = await provider.getKeys(tableName, schema);
      return result;
    } catch (error) {
      console.error("Error getting table keys:", error);
      throw error;
    }
  }
);

ipcMain.handle(
  "database-get-constraints",
  async (
    _: IpcMainInvokeEvent,
    connectionId: string,
    tableName: string,
    schema?: string
  ) => {
    try {
      const provider = databaseManager.getProvider(connectionId);
      if (!provider) {
        throw new Error(`No active connection found for id '${connectionId}'`);
      }

      if (!provider.getConstraints) {
        console.warn(
          `Provider for connection ${connectionId} does not support getConstraints`
        );
        return [];
      }

      const result = await provider.getConstraints(tableName, schema);
      return result;
    } catch (error) {
      console.error("Error getting table constraints:", error);
      throw error;
    }
  }
);

ipcMain.handle(
  "database-get-triggers",
  async (
    _: IpcMainInvokeEvent,
    connectionId: string,
    tableName: string,
    schema?: string
  ) => {
    try {
      const provider = databaseManager.getProvider(connectionId);
      if (!provider) {
        throw new Error(`No active connection found for id '${connectionId}'`);
      }

      if (!provider.getTriggers) {
        console.warn(
          `Provider for connection ${connectionId} does not support getTriggers`
        );
        return [];
      }

      const result = await provider.getTriggers(tableName, schema);
      return result;
    } catch (error) {
      console.error("Error getting table triggers:", error);
      throw error;
    }
  }
);

ipcMain.handle(
  "database-get-indexes",
  async (
    _: IpcMainInvokeEvent,
    connectionId: string,
    tableName: string,
    schema?: string
  ) => {
    try {
      const provider = databaseManager.getProvider(connectionId);
      if (!provider) {
        throw new Error(`No active connection found for id '${connectionId}'`);
      }

      if (!provider.getIndexes) {
        console.warn(
          `Provider for connection ${connectionId} does not support getIndexes`
        );
        return [];
      }

      const result = await provider.getIndexes(tableName, schema);
      return result;
    } catch (error) {
      console.error("Error getting table indexes:", error);
      throw error;
    }
  }
);

// Database management operations
ipcMain.handle(
  "database-create-database",
  async (
    _: IpcMainInvokeEvent,
    connectionId: string,
    databaseData: {
      name: string;
      collation?: string;
      owner?: string;
      template?: string;
      encoding?: string;
    }
  ) => {
    try {
      const provider = databaseManager.getProvider(connectionId);
      if (!provider) {
        throw new Error(`No active connection found for id '${connectionId}'`);
      }

      // Get connection info to determine database type
      const connectionData =
        await database.getConnectionWithCredentials(connectionId);
      if (!connectionData) {
        throw new Error(`Connection data not found for id '${connectionId}'`);
      }

      let sql = "";
      const dbName = provider.escapeIdentifier(databaseData.name);

      switch (connectionData.type) {
        case "postgresql":
          sql = `CREATE DATABASE ${dbName}`;
          if (databaseData.owner) {
            sql += ` OWNER ${provider.escapeIdentifier(databaseData.owner)}`;
          }
          if (databaseData.template) {
            sql += ` TEMPLATE ${provider.escapeIdentifier(databaseData.template)}`;
          }
          if (databaseData.encoding) {
            sql += ` ENCODING '${databaseData.encoding}'`;
          }
          break;

        case "sqlserver":
          sql = `CREATE DATABASE ${dbName}`;
          if (databaseData.collation) {
            sql += ` COLLATE ${databaseData.collation}`;
          }
          break;

        case "mysql":
          sql = `CREATE DATABASE ${dbName}`;
          if (databaseData.encoding) {
            sql += ` CHARACTER SET ${databaseData.encoding}`;
          }
          if (databaseData.collation) {
            sql += ` COLLATE ${databaseData.collation}`;
          }
          break;

        default:
          throw new Error(
            `Database creation not supported for ${connectionData.type}`
          );
      }

      console.log(`Creating database with SQL: ${sql}`);
      await provider.executeNonQuery(sql);

      return {
        success: true,
        message: `Database '${databaseData.name}' created successfully`,
      };
    } catch (error) {
      console.error("Error creating database:", error);
      throw error;
    }
  }
);

// Save text file (CSV/JSON export)
ipcMain.handle(
  "export-save-file",
  async (
    _: IpcMainInvokeEvent,
    opts: {
      defaultPath?: string;
      filters?: { name: string; extensions: string[] }[];
      content: string;
    }
  ) => {
    try {
      const win = mainWindow || BrowserWindow.getFocusedWindow();
      const { canceled, filePath } = await (win
        ? dialog.showSaveDialog(win, {
            defaultPath: opts.defaultPath,
            filters: opts.filters,
          })
        : dialog.showSaveDialog({
            defaultPath: opts.defaultPath,
            filters: opts.filters,
          }));
      if (canceled || !filePath) {
        return { canceled: true };
      }
      await fs.promises.writeFile(filePath, opts.content, "utf8");
      return { canceled: false, filePath };
    } catch (error) {
      console.error("Error saving file:", error);
      throw error;
    }
  }
);

// Generic file open/save handlers for SQL files
ipcMain.handle("file-open-dialog", async () => {
  try {
    const win = mainWindow || BrowserWindow.getFocusedWindow();
    const { canceled, filePaths } = await (win
      ? dialog.showOpenDialog(win, {
          properties: ["openFile"],
          filters: [
            { name: "SQL", extensions: ["sql"] },
            { name: "All Files", extensions: ["*"] },
          ],
        })
      : dialog.showOpenDialog({
          properties: ["openFile"],
          filters: [
            { name: "SQL", extensions: ["sql"] },
            { name: "All Files", extensions: ["*"] },
          ],
        }));
    if (canceled || !filePaths || filePaths.length === 0)
      return { canceled: true };
    const filePath = filePaths[0];
    const content = await fs.promises.readFile(filePath, "utf8");
    return { canceled: false, filePath, content };
  } catch (error) {
    console.error("Error opening file:", error);
    throw error;
  }
});

ipcMain.handle(
  "file-save-dialog",
  async (_: IpcMainInvokeEvent, opts: { defaultPath?: string }) => {
    try {
      const win = mainWindow || BrowserWindow.getFocusedWindow();
      const { canceled, filePath } = await (win
        ? dialog.showSaveDialog(win, {
            defaultPath: opts?.defaultPath,
            filters: [
              { name: "SQL", extensions: ["sql"] },
              { name: "All Files", extensions: ["*"] },
            ],
          })
        : dialog.showSaveDialog({
            defaultPath: opts?.defaultPath,
            filters: [
              { name: "SQL", extensions: ["sql"] },
              { name: "All Files", extensions: ["*"] },
            ],
          }));
      if (canceled || !filePath) return { canceled: true };
      return { canceled: false, filePath };
    } catch (error) {
      console.error("Error showing save dialog:", error);
      throw error;
    }
  }
);

ipcMain.handle(
  "file-write",
  async (
    _: IpcMainInvokeEvent,
    args: { filePath: string; content: string }
  ) => {
    try {
      await fs.promises.writeFile(args.filePath, args.content, "utf8");
      return { success: true };
    } catch (error) {
      console.error("Error writing file:", error);
      throw error;
    }
  }
);

// AI Engines IPC handlers
ipcMain.handle("ai-engines-list", async () => {
  try {
    if (!aiEnginesRepository) {
      throw new Error("AI engines repository not initialized");
    }
    return await aiEnginesRepository.findAll();
  } catch (error) {
    console.error("Error listing AI engines:", error);
    throw error;
  }
});

ipcMain.handle("ai-engines-get", async (_: IpcMainInvokeEvent, id: string) => {
  try {
    if (!aiEnginesRepository) {
      throw new Error("AI engines repository not initialized");
    }
    return await aiEnginesRepository.findById(id);
  } catch (error) {
    console.error("Error getting AI engine:", error);
    throw error;
  }
});

ipcMain.handle(
  "ai-engines-create",
  async (_: IpcMainInvokeEvent, engineData: any) => {
    try {
      if (!aiEnginesRepository || !credentialManager) {
        throw new Error(
          "AI engines repository or credential manager not initialized"
        );
      }

      // Extract API key from engine data
      const { apiKey, ...engine } = engineData;

      // Create the engine first to get the actual ID
      const createdEngine = (await aiEnginesRepository.create(
        engine
      )) as AiEngine;

      // Store API key securely if provided and update the engine
      if (apiKey && apiKey.trim()) {
        const keyRef = await credentialManager.saveApiKey(
          createdEngine.id,
          apiKey
        );
        console.log(
          "🔑 Stored API key for engine:",
          createdEngine.name,
          "with ref:",
          keyRef
        );

        // Update the engine with the API key reference
        const updatedEngine = await aiEnginesRepository.update(
          createdEngine.id,
          { apiKeyRef: keyRef }
        );
        return updatedEngine || createdEngine;
      }

      return createdEngine;
    } catch (error) {
      console.error("Error creating AI engine:", error);
      throw error;
    }
  }
);

ipcMain.handle(
  "ai-engines-update",
  async (_: IpcMainInvokeEvent, id: string, updateData: any) => {
    try {
      if (!aiEnginesRepository || !credentialManager) {
        throw new Error(
          "AI engines repository or credential manager not initialized"
        );
      }

      // Extract API key from update data
      const { apiKey, ...updates } = updateData;

      // Update API key securely if provided
      if (apiKey && apiKey.trim()) {
        const keyRef = await credentialManager.saveApiKey(id, apiKey);
        updates.apiKeyRef = keyRef;
        console.log("🔑 Updated API key for engine:", id, "with ref:", keyRef);
      }

      return await aiEnginesRepository.update(id, updates);
    } catch (error) {
      console.error("Error updating AI engine:", error);
      throw error;
    }
  }
);

ipcMain.handle(
  "ai-engines-delete",
  async (_: IpcMainInvokeEvent, id: string) => {
    try {
      if (!aiEnginesRepository) {
        throw new Error("AI engines repository not initialized");
      }
      await aiEnginesRepository.delete(id);
      return { success: true };
    } catch (error) {
      console.error("Error deleting AI engine:", error);
      throw error;
    }
  }
);

ipcMain.handle("ai-engines-test", async (_: IpcMainInvokeEvent, id: string) => {
  try {
    if (!aiEnginesRepository) {
      throw new Error("AI engines repository not initialized");
    }
    return await aiEnginesRepository.testConnection(id);
  } catch (error) {
    console.error("Error testing AI engine connection:", error);
    throw error;
  }
});

ipcMain.handle(
  "ai-engines-validate",
  async (_: IpcMainInvokeEvent, engine: any) => {
    try {
      if (!aiEnginesRepository) {
        throw new Error("AI engines repository not initialized");
      }
      return await aiEnginesRepository.validateEngine(engine);
    } catch (error) {
      console.error("Error validating AI engine:", error);
      throw error;
    }
  }
);

// Chat IPC Handlers
ipcMain.handle(
  "chat-send-message",
  async (
    _: IpcMainInvokeEvent,
    params: {
      message: string;
      connectionId: string;
      engineId: string;
      conversationId?: string;
    }
  ) => {
    try {
      const { message, connectionId, engineId } = params;

      console.log("🤖 Chat message received:", {
        message: message.substring(0, 100) + "...",
        connectionId,
        engineId,
      });

      // Get AI engine configuration
      if (!aiEnginesRepository) {
        throw new Error("AI engines repository not initialized");
      }

      const engine = (await aiEnginesRepository.findById(engineId)) as
        | AiEngine
        | undefined;
      if (!engine) {
        throw new Error(`AI engine with id ${engineId} not found`);
      }

      console.log("🤖 Using AI engine:", engine.name, engine.provider);

      // Get the actual API key from the credential manager
      let apiKey: string | undefined;
      console.log("🔑 API Key Debug:", {
        hasApiKeyRef: !!engine.apiKeyRef,
        apiKeyRef: engine.apiKeyRef,
        hasCredentialManager: !!credentialManager,
        credentialManagerType: typeof credentialManager,
      });

      if (engine.apiKeyRef && credentialManager) {
        try {
          apiKey =
            (await credentialManager.getApiKey(engine.apiKeyRef)) || undefined;
          console.log(
            "🔑 Retrieved API key:",
            apiKey ? "✅ Found" : "❌ Not found"
          );
        } catch (error) {
          console.warn("⚠️ Failed to retrieve API key:", error);
        }
      } else {
        console.log(
          "🔑 Skipping API key retrieval:",
          !engine.apiKeyRef ? "No apiKeyRef" : "No credentialManager"
        );
      }

      // Configure AI manager with the selected engine
      const aiEngineConfig: AIEngineConfig = {
        name: engine.name,
        provider: engine.provider as AIProvider,
        endpoint: engine.endpoint || undefined,
        apiKey: apiKey,
        defaultModel: engine.defaultModel || undefined,
        temperature: engine.temperature || 0.7,
        maxTokens: engine.maxTokens || 2048,
        timeoutMs: engine.timeoutMs || 30000,
      };

      console.log("🤖 Configuring AI provider:", {
        provider: aiEngineConfig.provider,
        hasApiKey: !!aiEngineConfig.apiKey,
        endpoint: aiEngineConfig.endpoint,
        model: aiEngineConfig.defaultModel,
      });

      await aiManager.configureProvider(aiEngineConfig);

      // Get database connection for context - auto-connect if needed
      let dbProvider = databaseManager.getProvider(connectionId);
      if (!dbProvider) {
        console.log(
          `🔗 Database connection ${connectionId} not found, attempting to connect...`
        );

        const connectionData =
          await database.getConnectionWithCredentials(connectionId);
        if (!connectionData) {
          throw new Error(`Database connection ${connectionId} not found`);
        }

        const dbConnection = {
          id: connectionId,
          name: connectionData.name,
          type: connectionData.type as DatabaseType,
          host: connectionData.host || "localhost",
          port: parseInt(String(connectionData.port || "1433")),
          database: connectionData.database || undefined,
          username: connectionData.username,
          password: connectionData.password,
          connectionString: connectionData.connectionString || undefined,
          ssl: connectionData.ssl || false,
          options: {
            encrypt: true,
            trustServerCertificate: false,
            enableArithAbort: true,
          },
        };

        await databaseManager.connect(dbConnection);
        dbProvider = databaseManager.getProvider(connectionId);
        console.log(`✅ Connected database ${connectionId} for chat`);
      }

      if (!dbProvider) {
        throw new Error(`Database connection ${connectionId} not available`);
      }

      // Get database schema and context
      let schemaInfo: {
        tables?: Array<{ name: string; schema: string; rowCount?: number }>;
      } | null = null;

      try {
        const schemas = await dbProvider.getSchemas();
        schemaInfo = await dbProvider.getSchemaInfo();
        console.log("📊 Schema context loaded:", {
          schemas: schemas.length,
          tables: schemaInfo.tables?.length || 0,
        });
      } catch (schemaError) {
        console.warn("⚠️ Could not load schema context:", schemaError);
      }

      // Get connection info for context
      const connectionData =
        await database.getConnectionWithCredentials(connectionId);
      const dbContext = connectionData
        ? `${connectionData.name} (${connectionData.type})`
        : connectionId;

      // Prepare SQL context for AI
      const tablesWithType = (schemaInfo?.tables || []).map(table => ({
        ...table,
        type: "table" as const,
      }));

      const sqlContext = {
        databaseType:
          (connectionData?.type as DatabaseType) || DatabaseType.SqlServer,
        schema: {
          tables: tablesWithType,
          views: [],
          procedures: [],
          functions: [],
        },
        tables: tablesWithType,
        connectionName: connectionData?.name || "Unknown",
      };

      // Create conversation messages for AI
      const messages = [
        {
          role: "system" as const,
          content: `You are an expert SQL assistant connected to a ${sqlContext.databaseType} database named "${sqlContext.connectionName}".

Available tables: ${sqlContext.tables.map(t => `${t.schema}.${t.name}`).join(", ")}

When generating SQL queries:
1. Use appropriate SQL syntax for ${sqlContext.databaseType}
2. Always include schema names in table references
3. Use TOP instead of LIMIT for SQL Server
4. Provide clear explanations of what the query does
5. If the user asks about executing queries, mention they can use the "Run" or "Insert to New Tab" buttons

Format your responses with:
- Brief explanation of what you understood
- SQL query in a code block
- Explanation of what the query does
- Any relevant insights about the data structure

Always be helpful and provide working SQL queries when possible.`,
        },
        {
          role: "user" as const,
          content: message,
        },
      ];

      console.log("🤖 Calling AI provider with context:", {
        provider: engine.provider,
        tablesCount: sqlContext.tables.length,
        messageLength: message.length,
      });

      // Call AI provider
      const apiResponse = await aiManager.chat(messages, sqlContext);

      console.log("🤖 AI response received:", {
        contentLength: apiResponse.content?.length || 0,
        hasContent: !!apiResponse.content,
      });

      // Parse potential SQL from AI response
      let finalSQL: string | undefined;
      const sqlMatch = apiResponse.content?.match(/```sql\n([\s\S]*?)\n```/);
      if (sqlMatch) {
        finalSQL = sqlMatch[1].trim();
      }

      const response = {
        id: crypto.randomUUID(),
        role: "assistant" as const,
        content: `*Connected to: **${dbContext}** using **${engine.name}***\n\n${apiResponse.content || "I'm sorry, I couldn't generate a response."}`,
        timestamp: new Date().toISOString(),
        finalSQL,
      };

      console.log("🤖 Final response prepared:", {
        hasSQL: !!finalSQL,
        sqlLength: finalSQL?.length || 0,
      });

      return response;
    } catch (error) {
      console.error("❌ Error processing chat message:", error);

      // Return error response instead of throwing
      return {
        id: crypto.randomUUID(),
        role: "assistant" as const,
        content: `*Error: ${(error as Error).message}*\n\nI encountered an issue processing your request. Please check:
1. Your AI engine configuration is correct
2. Your database connection is working
3. Try a simpler question to test the connection

If the problem persists, please check the console for more details.`,
        timestamp: new Date().toISOString(),
        finalSQL: undefined,
      };
    }
  }
);

ipcMain.handle(
  "chat-get-conversation-history",
  async (_: IpcMainInvokeEvent, conversationId: string) => {
    try {
      // TODO: Implement conversation history retrieval from database
      console.log("Getting conversation history for:", conversationId);

      // Return empty array for now
      return [];
    } catch (error) {
      console.error("Error getting conversation history:", error);
      throw error;
    }
  }
);

ipcMain.handle(
  "chat-create-conversation",
  async (
    _: IpcMainInvokeEvent,
    params: {
      title: string;
      engineId: string;
      connectionId: string;
    }
  ) => {
    try {
      // TODO: Implement conversation creation in database
      console.log("Creating conversation:", params);

      const conversationId = crypto.randomUUID();
      return {
        id: conversationId,
        ...params,
        createdAt: new Date().toISOString(),
      };
    } catch (error) {
      console.error("Error creating conversation:", error);
      throw error;
    }
  }
);

// Handler for creating new tabs with SQL content from chat
ipcMain.handle(
  "create-sql-tab",
  async (
    _: IpcMainInvokeEvent,
    params: {
      sql: string;
      connectionId?: string;
      connectionName?: string;
      connectionType?: string;
      database?: string;
      autoExecute?: boolean;
    }
  ) => {
    try {
      console.log("Creating new SQL tab with content:", params);

      // Send a message to the renderer to create the new tab
      if (mainWindow) {
        mainWindow.webContents.send("create-new-tab", {
          id: crypto.randomUUID(),
          title: params.autoExecute
            ? "Query from Chat (Auto-Run)"
            : "Query from Chat",
          sql: params.sql,
          connectionId: params.connectionId,
          connectionName: params.connectionName,
          connectionType: params.connectionType,
          database: params.database,
          activeResultTab: "results",
          autoExecute: params.autoExecute || false,
        });
      }

      return { success: true };
    } catch (error) {
      console.error("Error creating SQL tab:", error);
      throw error;
    }
  }
);

// Chat persistence handlers
ipcMain.handle(
  "chat-save",
  async (
    _,
    params: {
      title: string;
      messages: Array<{
        id: string;
        role: "user" | "assistant";
        content: string;
        timestamp: string;
        finalSQL?: string;
      }>;
      connectionId?: string;
      engineId?: string;
    }
  ) => {
    try {
      console.log("💾 Saving chat session:", params.title);

      const chatSession = {
        id: crypto.randomUUID(),
        title: params.title,
        messages: params.messages,
        connectionId: params.connectionId,
        engineId: params.engineId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // Get existing saved chats
      const savedChats = (store as any).get("savedChats") || [];
      savedChats.push(chatSession);
      (store as any).set("savedChats", savedChats);

      console.log("💾 Chat session saved successfully:", chatSession.id);
      return { success: true, id: chatSession.id };
    } catch (error) {
      console.error("💾 Error saving chat session:", error);
      throw error;
    }
  }
);

ipcMain.handle("chat-load-list", async () => {
  try {
    console.log("📂 Loading saved chat sessions list");
    const savedChats = (store as any).get("savedChats") || [];

    // Return list with metadata only (not full messages)
    const chatList = savedChats.map((chat: any) => ({
      id: chat.id,
      title: chat.title,
      createdAt: chat.createdAt,
      updatedAt: chat.updatedAt,
      connectionId: chat.connectionId,
      engineId: chat.engineId,
      messageCount: chat.messages?.length || 0,
    }));

    console.log("📂 Found", chatList.length, "saved chat sessions");
    return chatList;
  } catch (error) {
    console.error("📂 Error loading chat sessions list:", error);
    throw error;
  }
});

ipcMain.handle("chat-load", async (_, chatId: string) => {
  try {
    console.log("📥 Loading chat session:", chatId);
    const savedChats = (store as any).get("savedChats") || [];
    const chatSession = savedChats.find((chat: any) => chat.id === chatId);

    if (!chatSession) {
      throw new Error("Chat session not found");
    }

    console.log("📥 Chat session loaded successfully:", chatSession.title);
    return chatSession;
  } catch (error) {
    console.error("📥 Error loading chat session:", error);
    throw error;
  }
});

ipcMain.handle("chat-delete", async (_, chatId: string) => {
  try {
    console.log("🗑️ Deleting chat session:", chatId);
    const savedChats = (store as any).get("savedChats") || [];
    const filteredChats = savedChats.filter((chat: any) => chat.id !== chatId);
    (store as any).set("savedChats", filteredChats);

    console.log("🗑️ Chat session deleted successfully");
    return { success: true };
  } catch (error) {
    console.error("🗑️ Error deleting chat session:", error);
    throw error;
  }
});

ipcMain.handle(
  "chat-history-search",
  async (
    _,
    params: {
      query?: string;
      connectionId?: string;
      engineId?: string;
      dateFrom?: string;
      dateTo?: string;
    }
  ) => {
    try {
      console.log("🔍 Searching chat history with params:", params);
      const savedChats = (store as any).get("savedChats") || [];

      let allMessages: any[] = [];

      // Extract all messages from all saved chats
      savedChats.forEach((chat: any) => {
        chat.messages?.forEach((message: any) => {
          allMessages.push({
            ...message,
            chatId: chat.id,
            chatTitle: chat.title,
            connectionId: chat.connectionId,
            engineId: chat.engineId,
            chatCreatedAt: chat.createdAt,
          });
        });
      });

      // Apply filters
      if (params.query) {
        const query = params.query.toLowerCase();
        allMessages = allMessages.filter(
          msg =>
            msg.content.toLowerCase().includes(query) ||
            (msg.finalSQL && msg.finalSQL.toLowerCase().includes(query))
        );
      }

      if (params.connectionId) {
        allMessages = allMessages.filter(
          msg => msg.connectionId === params.connectionId
        );
      }

      if (params.engineId) {
        allMessages = allMessages.filter(
          msg => msg.engineId === params.engineId
        );
      }

      if (params.dateFrom) {
        allMessages = allMessages.filter(
          msg => msg.timestamp >= params.dateFrom!
        );
      }

      if (params.dateTo) {
        allMessages = allMessages.filter(
          msg => msg.timestamp <= params.dateTo!
        );
      }

      // Sort by timestamp descending (newest first)
      allMessages.sort(
        (a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );

      console.log("🔍 Found", allMessages.length, "matching messages");
      return allMessages;
    } catch (error) {
      console.error("🔍 Error searching chat history:", error);
      throw error;
    }
  }
);

// Ollama handler for fetching models
ipcMain.handle("ollama-fetch-models", async (_, baseUrl?: string) => {
  try {
    console.log(
      "🔍 Fetching Ollama models from:",
      baseUrl || "http://localhost:11434"
    );

    const url = `${baseUrl || "http://localhost:11434"}/api/tags`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = (await response.json()) as { models?: { name: string }[] };
    const models = data.models?.map(model => model.name) || [];

    console.log("🔍 Found Ollama models:", models);
    return models;
  } catch (error) {
    console.error("🔍 Failed to fetch Ollama models:", error);
    throw error;
  }
});

// Auto-updater events
autoUpdater.on("checking-for-update", () => {
  console.log("Checking for update...");
});

autoUpdater.on("update-available", (info: any) => {
  console.log("Update available.", info);
});

autoUpdater.on("update-not-available", (info: any) => {
  console.log("Update not available.", info);
});

autoUpdater.on("error", (err: any) => {
  console.log("Error in auto-updater. " + err);
});

autoUpdater.on("download-progress", (progressObj: any) => {
  let log_message = "Download speed: " + progressObj.bytesPerSecond;
  log_message = log_message + " - Downloaded " + progressObj.percent + "%";
  log_message =
    log_message +
    " (" +
    progressObj.transferred +
    "/" +
    progressObj.total +
    ")";
  console.log(log_message);
});

autoUpdater.on("update-downloaded", (info: any) => {
  console.log("Update downloaded", info);
  autoUpdater.quitAndInstall();
});

export { mainWindow };
