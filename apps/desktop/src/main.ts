import { app, BrowserWindow, Menu, shell, ipcMain, dialog, Event, WebContents, IpcMainInvokeEvent, MenuItemConstructorOptions } from "electron";
import fs from "fs";
import electronUpdater from "electron-updater";
const { autoUpdater } = electronUpdater;
import Store from "electron-store";
import path from "path";
import { fileURLToPath } from "url";
import { LocalDatabase } from "@sqlhelper/storage";
import { DatabaseManager, DatabaseType } from "@sqlhelper/database-core";

// Set application name immediately
app.setName("SQL Helper");

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Enable live reload for development
if (process.env.NODE_ENV === "development") {
  console.log("🔧 DEVELOPMENT MODE DETECTED");
  try {
    const { default: electronReload } = await import("electron-reload");
    electronReload(__dirname, {
      electron: path.join(process.cwd(), "node_modules", ".bin", "electron"),
      hardResetMethod: "exit"
    });
  } catch (error) {
    console.log("electron-reload not available");
  }
}

// Define store schema interface
interface StoreSchema {
  windowBounds: { width: number; height: number };
  theme: string;
  telemetry: boolean;
  [key: string]: any; // Allow additional dynamic keys
}

// Initialize electron store for settings
const store = new Store<StoreSchema>({
  defaults: {
    windowBounds: { width: 1200, height: 800 },
    theme: "system",
    telemetry: false
  }
});

// Initialize local database
const dbPath = path.join(app.getPath('userData'), 'sqlhelper.db');
const database = new LocalDatabase(dbPath);

// Initialize database manager for live connections
const databaseManager = new DatabaseManager();

// Initialize database tables
database.initialize().catch(error => {
  console.error('Failed to initialize database:', error);
});

let mainWindow: BrowserWindow | null = null;

const isDev = process.env.NODE_ENV === "development" || process.argv.includes("--dev");
const isDebug = process.argv.includes("--debug");

console.log("🔧 Environment flags:", { isDev, isDebug, nodeEnv: process.env.NODE_ENV, argv: process.argv });

function createWindow(): void {
  // Get stored window bounds
  const { width, height } = store.get("windowBounds") as { width: number; height: number };

  const preloadPath = path.join(__dirname, "preload.js");
  console.log("🔧 Preload script path:", preloadPath);

  // Create the browser window
  mainWindow = new BrowserWindow({
    width,
    height,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: preloadPath,
      webSecurity: !isDev
    },
    titleBarStyle: process.platform === "darwin" ? "hiddenInset" : "default",
    show: false, // Don't show until ready
    icon: path.join(__dirname, "../assets/icon.png"),
    movable: true,
    resizable: true,
    trafficLightPosition: process.platform === "darwin" ? { x: 20, y: 16 } : undefined
  });

  // Load the app
  if (isDev) {
    console.log("🌐 Loading development URL: http://localhost:5173");
    mainWindow.loadURL("http://localhost:5173");
  } else {
    console.log("📁 Loading production file");
    mainWindow.loadFile(path.join(__dirname, "../../renderer/dist/index.html"));
  }

  // Always open dev tools for debugging (even in production mode for now)
  console.log("🔧 Opening DevTools for debugging");
  mainWindow.webContents.once('dom-ready', () => {
    console.log("🔧 DOM ready, opening DevTools");
    mainWindow?.webContents.openDevTools();
  });

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
      store.set("windowBounds", mainWindow.getBounds());
    }
  });

  mainWindow.on("move", () => {
    if (mainWindow) {
      store.set("windowBounds", mainWindow.getBounds());
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
                mainWindow.webContents.send('menu-action', 'new-connection');
              }
            }
          },
          { type: "separator" },
          {
            label: "Open…",
            accelerator: "CmdOrCtrl+O",
            click: () => mainWindow?.webContents.send('menu-action', 'file-open')
          },
          {
            label: "Save",
            accelerator: "CmdOrCtrl+S",
            click: () => mainWindow?.webContents.send('menu-action', 'file-save')
          },
          {
            label: "Save As…",
            accelerator: "CmdOrCtrl+Shift+S",
            click: () => mainWindow?.webContents.send('menu-action', 'file-save-as')
          },
          { type: "separator" },
          {
            label: "Refresh Connections",
            accelerator: "CmdOrCtrl+R",
            click: () => {
              console.log("Refresh Connections clicked from menu");
              if (mainWindow) {
                mainWindow.webContents.send('menu-action', 'refresh-connections');
              }
            }
          },
          {
            label: "Disconnect All",
            click: () => {
              console.log("Disconnect All clicked from menu");
              if (mainWindow) {
                mainWindow.webContents.send('menu-action', 'disconnect-all');
              }
            }
          },
          { type: "separator" },
          {
            label: "AI Engines",
            click: () => {
              console.log("AI Engines clicked - MENU WORKING!");
            }
          },
          { role: "quit" }
        ]
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
          { role: "selectAll" }
        ]
      },
      {
        label: "View",
        submenu: [
          { role: "reload" },
          { role: "forceReload" },
          { role: "toggleDevTools" },
          { type: "separator" },
          { role: "resetZoom" },
          { role: "zoomIn" },
          { role: "zoomOut" },
          { type: "separator" },
          { role: "togglefullscreen" }
        ]
      },
      {
        label: "Records",
        submenu: [
          {
            label: "Copy CSV",
            accelerator: "CmdOrCtrl+Shift+C",
            click: () => mainWindow?.webContents.send('menu-action', 'records-copy-csv')
          },
          {
            label: "Copy JSON",
            accelerator: "CmdOrCtrl+Shift+J",
            click: () => mainWindow?.webContents.send('menu-action', 'records-copy-json')
          },
          { type: 'separator' },
          {
            label: "Export CSV…",
            accelerator: "CmdOrCtrl+E",
            click: () => mainWindow?.webContents.send('menu-action', 'records-export-csv')
          },
          {
            label: "Export JSON…",
            click: () => mainWindow?.webContents.send('menu-action', 'records-export-json')
          },
        ]
      },
      {
        label: "Window",
        submenu: [
          { role: "minimize" },
          { role: "close" }
        ]
      }
    ];

  // macOS specific menu adjustments
  if (process.platform === "darwin") {
    template.unshift({
      label: app.getName(),
      submenu: [
        { role: "about" },
        { type: "separator" },
        { role: "hide" },
        { role: "hideOthers" },
        { role: "unhide" },
        { type: "separator" },
        { role: "quit" }
      ]
    });
  }

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
  console.log("Menu set successfully with", template.length, "top-level items");
  
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
  createWindow();

  // Ensure menu is set on macOS
  if (process.platform === "darwin") {
    setTimeout(() => {
      createMenu();
    }, 100);
  }

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
    console.error('Error cleaning up database connections:', error);
  }
  
  if (process.platform !== "darwin") {
    app.quit();
  }
});

// Security: Prevent new window creation
app.on("web-contents-created", (_: Event, contents: WebContents) => {
  contents.on("will-navigate", (event: Event, navigationUrl: string) => {
    const parsedUrl = new URL(navigationUrl);
    
    if (parsedUrl.origin !== "http://localhost:5173" && parsedUrl.origin !== "file://") {
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
  return store.get(key);
});

ipcMain.handle("store-set", (_: IpcMainInvokeEvent, key: string, value: any) => {
  store.set(key, value);
});

ipcMain.handle("store-delete", (_: IpcMainInvokeEvent, key: string) => {
  return store.delete(key);
});

// Connection management IPC handlers
ipcMain.handle("connection-save", async (_: IpcMainInvokeEvent, connection: any, password?: string) => {
  try {
    return await database.saveConnection(connection, password);
  } catch (error) {
    console.error('Error saving connection:', error);
    throw error;
  }
});

ipcMain.handle("connection-list", async () => {
  try {
    return await database.listConnections();
  } catch (error) {
    console.error('Error listing connections:', error);
    throw error;
  }
});

ipcMain.handle("connection-get", async (_: IpcMainInvokeEvent, id: string) => {
  try {
    return await database.getConnection(id);
  } catch (error) {
    console.error('Error getting connection:', error);
    throw error;
  }
});

ipcMain.handle("connection-delete", async (_: IpcMainInvokeEvent, id: string) => {
  try {
    return await database.deleteConnection(id);
  } catch (error) {
    console.error('Error deleting connection:', error);
    throw error;
  }
});

ipcMain.handle("connection-test", async (_: IpcMainInvokeEvent, connection: any) => {
  try {
    // Handle special placeholders for database paths
    let databasePath = connection.database;
    let connectionString = connection.connectionString;
    
    if (databasePath && databasePath.includes('{{APP_DATA}}')) {
      const appDataPath = app.getPath('userData');
      databasePath = databasePath.replace('{{APP_DATA}}', appDataPath);
    }
    
    if (connectionString && connectionString.includes('{{APP_DATA}}')) {
      const appDataPath = app.getPath('userData');
      connectionString = connectionString.replace('{{APP_DATA}}', appDataPath);
    }

    // Create test connection object
    const testConnection = {
      ...connection,
      database: databasePath,
      connectionString: connectionString,
      type: connection.type as DatabaseType,
    };

    // Use database manager to test the connection
    const testResult = await databaseManager.testConnection(testConnection);
    return { success: true, message: 'Connection test successful' };
  } catch (error) {
    console.error('Error testing connection:', error);
    return { success: false, message: error instanceof Error ? error.message : 'Connection test failed' };
  }
});

// Database connection management IPC handlers
ipcMain.handle("database-connect", async (_: IpcMainInvokeEvent, connectionId: string) => {
  try {
    // Get connection details from storage including password
    const connectionData = await database.getConnectionWithCredentials(connectionId);
    if (!connectionData) {
      throw new Error(`Connection with id '${connectionId}' not found`);
    }
    
    console.log('🔍 Original connection data:', {
      id: connectionData.id,
      name: connectionData.name,
      type: connectionData.type,
      host: connectionData.host,
      database: connectionData.database,
      connectionString: connectionData.connectionString,
      hasPassword: !!connectionData.password
    });
    
    // Handle special placeholders for database paths
    let databasePath = connectionData.database;
    let connectionString = connectionData.connectionString;
    
    if (databasePath && databasePath.includes('{{APP_DATA}}')) {
      const appDataPath = app.getPath('userData');
      databasePath = databasePath.replace('{{APP_DATA}}', appDataPath);
    }
    
    if (connectionString && connectionString.includes('{{APP_DATA}}')) {
      const appDataPath = app.getPath('userData');
      connectionString = connectionString.replace('{{APP_DATA}}', appDataPath);
    }
    
    // Create database connection object
    const usingConnectionString = !!connectionString;
    const dbConnection = {
      id: connectionId,
      name: connectionData.name,
      type: connectionData.type as DatabaseType,
      // Only include host/port when NOT using a connection string
      host: usingConnectionString ? undefined as unknown as string : (connectionData.host || 'localhost'),
      port: usingConnectionString ? undefined as unknown as number : parseInt(String(connectionData.port || '1433')),
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
          type: 'default'
        },
        // Add Azure-specific settings
        connectTimeout: 30000,
        maxRetriesOnFailure: 3,
        multipleActiveResultSets: false
      }
    };

    console.log('🔍 Final connection object:', {
      id: dbConnection.id,
      name: dbConnection.name,
      type: dbConnection.type,
      host: usingConnectionString ? '(via connectionString)' : dbConnection.host,
      database: dbConnection.database,
      usingConnectionString,
      hasPassword: !!dbConnection.password
    });

    await databaseManager.connect(dbConnection);
    
    // Update last used timestamp
    await database.updateLastUsed(connectionId);
    
    return { success: true, message: 'Connected successfully' };
  } catch (error) {
    console.error('Error connecting to database:', error);
    throw error;
  }
});

ipcMain.handle("database-disconnect", async (_: IpcMainInvokeEvent, connectionId: string) => {
  try {
    await databaseManager.disconnect(connectionId);
    return { success: true, message: 'Disconnected successfully' };
  } catch (error) {
    console.error('Error disconnecting from database:', error);
    throw error;
  }
});

ipcMain.handle("database-get-schema", async (_: IpcMainInvokeEvent, connectionId: string) => {
  try {
    const provider = databaseManager.getProvider(connectionId);
    if (!provider) {
      throw new Error(`No active connection found for id '${connectionId}'`);
    }

    const [schemas, schemaInfo] = await Promise.all([
      provider.getSchemas(),
      provider.getSchemaInfo()
    ]);

    // Transform the schema info into a tree structure
    const databases = [{
      name: 'default', // We'll use a default database name for now
      type: 'database' as const,
      children: schemas.map(schemaName => ({
        name: schemaName,
        type: 'schema' as const,
        children: [
          ...schemaInfo.tables
            .filter(table => table.schema === schemaName)
            .map(table => ({
              name: table.name,
              type: 'table' as const,
              schema: table.schema,
              rowCount: table.rowCount
            })),
          ...schemaInfo.views
            .filter(view => view.schema === schemaName)
            .map(view => ({
              name: view.name,
              type: 'view' as const,
              schema: view.schema
            })),
          ...schemaInfo.procedures
            .filter(proc => proc.schema === schemaName)
            .map(proc => ({
              name: proc.name,
              type: 'procedure' as const,
              schema: proc.schema
            })),
          ...schemaInfo.functions
            .filter(func => func.schema === schemaName)
            .map(func => ({
              name: func.name,
              type: 'function' as const,
              schema: func.schema
            }))
        ]
      }))
    }];

    return { databases };
  } catch (error) {
    console.error('Error getting schema:', error);
    throw error;
  }
});

ipcMain.handle("database-execute-query", async (_: IpcMainInvokeEvent, connectionId: string, query: string) => {
  try {
    const provider = databaseManager.getProvider(connectionId);
    if (!provider) {
      throw new Error(`No active connection found for id '${connectionId}'`);
    }

    const result = await provider.executeQuery(query);
    return result;
  } catch (error) {
    console.error('Error executing query:', error);
    throw error;
  }
});

ipcMain.handle("database-get-table-data", async (_: IpcMainInvokeEvent, connectionId: string, tableName: string, schema?: string) => {
  try {
    const provider = databaseManager.getProvider(connectionId);
    if (!provider) {
      throw new Error(`No active connection found for id '${connectionId}'`);
    }

    const qualifiedName = schema ? `${provider.escapeIdentifier(schema)}.${provider.escapeIdentifier(tableName)}` : provider.escapeIdentifier(tableName);
    const query = `SELECT TOP 1000 * FROM ${qualifiedName}`;
    
    const result = await provider.executeQuery(query);
    return result;
  } catch (error) {
    console.error('Error getting table data:', error);
    throw error;
  }
});

// Save text file (CSV/JSON export)
ipcMain.handle("export-save-file", async (_: IpcMainInvokeEvent, opts: { defaultPath?: string; filters?: { name: string; extensions: string[] }[]; content: string }) => {
  try {
    const win = mainWindow || BrowserWindow.getFocusedWindow();
    const { canceled, filePath } = await (win ? dialog.showSaveDialog(win, {
      defaultPath: opts.defaultPath,
      filters: opts.filters,
    }) : dialog.showSaveDialog({
      defaultPath: opts.defaultPath,
      filters: opts.filters,
    }));
    if (canceled || !filePath) {
      return { canceled: true };
    }
    await fs.promises.writeFile(filePath, opts.content, "utf8");
    return { canceled: false, filePath };
  } catch (error) {
    console.error('Error saving file:', error);
    throw error;
  }
});

// Generic file open/save handlers for SQL files
ipcMain.handle("file-open-dialog", async () => {
  try {
    const win = mainWindow || BrowserWindow.getFocusedWindow();
    const { canceled, filePaths } = await (win ? dialog.showOpenDialog(win, {
      properties: ['openFile'],
      filters: [
        { name: 'SQL', extensions: ['sql'] },
        { name: 'All Files', extensions: ['*'] }
      ]
    }) : dialog.showOpenDialog({
      properties: ['openFile'],
      filters: [
        { name: 'SQL', extensions: ['sql'] },
        { name: 'All Files', extensions: ['*'] }
      ]
    }));
    if (canceled || !filePaths || filePaths.length === 0) return { canceled: true };
    const filePath = filePaths[0];
    const content = await fs.promises.readFile(filePath, 'utf8');
    return { canceled: false, filePath, content };
  } catch (error) {
    console.error('Error opening file:', error);
    throw error;
  }
});

ipcMain.handle("file-save-dialog", async (_: IpcMainInvokeEvent, opts: { defaultPath?: string }) => {
  try {
    const win = mainWindow || BrowserWindow.getFocusedWindow();
    const { canceled, filePath } = await (win ? dialog.showSaveDialog(win, {
      defaultPath: opts?.defaultPath,
      filters: [
        { name: 'SQL', extensions: ['sql'] },
        { name: 'All Files', extensions: ['*'] }
      ]
    }) : dialog.showSaveDialog({
      defaultPath: opts?.defaultPath,
      filters: [
        { name: 'SQL', extensions: ['sql'] },
        { name: 'All Files', extensions: ['*'] }
      ]
    }));
    if (canceled || !filePath) return { canceled: true };
    return { canceled: false, filePath };
  } catch (error) {
    console.error('Error showing save dialog:', error);
    throw error;
  }
});

ipcMain.handle("file-write", async (_: IpcMainInvokeEvent, args: { filePath: string; content: string }) => {
  try {
    await fs.promises.writeFile(args.filePath, args.content, 'utf8');
    return { success: true };
  } catch (error) {
    console.error('Error writing file:', error);
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
  log_message = log_message + " (" + progressObj.transferred + "/" + progressObj.total + ")";
  console.log(log_message);
});

autoUpdater.on("update-downloaded", (info: any) => {
  console.log("Update downloaded", info);
  autoUpdater.quitAndInstall();
});

export { mainWindow };