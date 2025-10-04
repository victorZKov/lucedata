/* eslint-disable @typescript-eslint/no-explicit-any */
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { fileURLToPath } from "url";

import { type AiEngine, type CredentialManager } from "@sqlhelper/storage";
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
  EnhancedAIManager,
  AutonomousAIManager,
  type AIEngineConfig,
  AIProvider,
} from "@sqlhelper/ai-integration";

import { loadAdapter as loadDbAdapter } from "../../../new_features/db_storage/adapter/index.js";

// ============================================================================
// STARTUP LOGGING SYSTEM
// ============================================================================
// Create a dedicated log file that's accessible even if the app crashes
const logFilePath = path.join(
  app.getPath("temp"),
  `sqlhelper-startup-${Date.now()}.log`
);
const logStream = fs.createWriteStream(logFilePath, { flags: "a" });

function log(message: string, data?: any) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}${data ? "\n" + JSON.stringify(data, null, 2) : ""}\n`;

  // Write to file
  logStream.write(logMessage);

  // Also write to console
  console.log(message, data || "");
}

function logError(message: string, error?: any) {
  const timestamp = new Date().toISOString();
  const errorDetails = error
    ? {
        message: error.message,
        stack: error.stack,
        name: error.name,
        code: error.code,
      }
    : null;
  const logMessage = `[${timestamp}] ❌ ERROR: ${message}${errorDetails ? "\n" + JSON.stringify(errorDetails, null, 2) : ""}\n`;

  logStream.write(logMessage);
  console.error(message, error || "");
}

// Log startup information
log("=".repeat(80));
log("SQL Helper Application Starting");
log("=".repeat(80));
log("Log file location:", { logFilePath });
log("Platform:", {
  platform: process.platform,
  arch: process.arch,
  version: process.version,
  electronVersion: process.versions.electron,
  chromeVersion: process.versions.chrome,
});
log("Environment:", {
  NODE_ENV: process.env.NODE_ENV,
  argv: process.argv,
  cwd: process.cwd(),
  execPath: process.execPath,
});

// Catch all unhandled errors
process.on("uncaughtException", error => {
  logError("Uncaught Exception", error);

  // Show error dialog to user
  dialog.showErrorBox(
    "SQL Helper - Fatal Error",
    `The application encountered a fatal error and cannot continue.\n\n` +
      `Error: ${error.message}\n\n` +
      `A detailed log has been saved to:\n${logFilePath}\n\n` +
      `Please share this log file when reporting this issue.`
  );

  logStream.end(() => {
    app.exit(1);
  });
});

process.on("unhandledRejection", (reason, promise) => {
  logError("Unhandled Promise Rejection", { reason, promise });
});

// Log when app is ready
app.on("ready", () => {
  log("✅ Electron app.ready event fired");
});

// ============================================================================

// Set application name immediately and comprehensively
log("Setting application name...");
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
log("Application paths:", { __filename, __dirname });

// Enable live reload for development
if (process.env.NODE_ENV === "development") {
  log("🔧 DEVELOPMENT MODE DETECTED");
  try {
    const { default: electronReload } = await import("electron-reload");
    electronReload(__dirname, {
      electron: path.join(process.cwd(), "node_modules", ".bin", "electron"),
      hardResetMethod: "exit",
    });
    log("✅ electron-reload enabled");
  } catch (_error) {
    log("⚠️ electron-reload not available");
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
log("Initializing electron-store...");
let store: Store<StoreSchema>;
try {
  store = new Store<StoreSchema>({
    defaults: {
      windowBounds: { width: 1200, height: 800 },
      theme: "system",
      telemetry: false,
    },
  });
  log("✅ electron-store initialized");
} catch (error) {
  logError("Failed to initialize electron-store", error);
  throw error;
}

// Initialize local database
const dbPath = path.join(app.getPath("userData"), "sqlhelper.db");
log(`Initializing database...`, {
  dbPath,
  userDataPath: app.getPath("userData"),
});

let database: any;
try {
  // Load the pluggable database adapter (sqlite by default)
  database = await loadDbAdapter("sqlite", { filename: dbPath });
  log("✅ Database adapter loaded");
} catch (error) {
  logError(
    "Failed to load database adapter, falling back to LocalDatabase",
    error
  );
  // Fallback: instantiate the LocalDatabase directly for compatibility
  const { LocalDatabase: LD } = await import("@sqlhelper/storage");
  database = new LD(dbPath);
  log("✅ LocalDatabase fallback created");
}

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

/**
 * Normalize some common SQL Server DDL/expressions into PostgreSQL-friendly SQL.
 * This is a lightweight set of replacements intended to help quick migrations
 * and editing of SQL authored with SQL Server syntax. It is intentionally
 * conservative and only targets common patterns we encountered (brackets,
 * IDENTITY(1,1), DATETIME2, GETDATE(), NVARCHAR, CLUSTERED). It is applied
 * only when the connection provider is PostgreSQL.
 */
function normalizeSqlForPostgres(sql: string): string {
  if (!sql || typeof sql !== "string") return sql;

  let out = sql;

  // Replace SQL Server-style quoted identifiers [Name] -> "Name"
  out = out.replace(/\[([^\]]+)\]/g, '"$1"');

  // Replace NVARCHAR -> VARCHAR (preserve length/params)
  out = out.replace(/\bNVARCHAR\b/gi, "VARCHAR");

  // Replace DATETIME2 -> TIMESTAMP
  out = out.replace(/\bDATETIME2\b/gi, "TIMESTAMP");

  // Replace GETDATE() -> now()
  out = out.replace(/\bGETDATE\s*\(\s*\)/gi, "now()");

  // Remove CLUSTERED (PG doesn't support clustering keyword in CREATE TABLE)
  out = out.replace(/\bCLUSTERED\b/gi, "");

  // Convert IDENTITY(1,1) to modern PostgreSQL identity columns. Use
  // GENERATED BY DEFAULT AS IDENTITY which is the SQL-standard form and
  // supported by Postgres 10+. We preserve the integer type and attach the
  // identity clause.
  out = out.replace(
    /\bINT\s+IDENTITY\s*\(\s*1\s*,\s*1\s*\)/gim,
    "INTEGER GENERATED BY DEFAULT AS IDENTITY"
  );
  out = out.replace(
    /\bBIGINT\s+IDENTITY\s*\(\s*1\s*,\s*1\s*\)/gim,
    "BIGINT GENERATED BY DEFAULT AS IDENTITY"
  );
  out = out.replace(
    /\bSMALLINT\s+IDENTITY\s*\(\s*1\s*,\s*1\s*\)/gim,
    "SMALLINT GENERATED BY DEFAULT AS IDENTITY"
  );

  // Normalize constraint names but avoid touching arbitrary parenthesized
  // expressions (types like VARCHAR(255), function calls like now(), or
  // CHECK expressions). Previously we naively rewrote every '(...)' which
  // could turn VARCHAR(255) into VARCHAR("255") and break PostgreSQL
  // parsing. Instead we target only column-list contexts that appear after
  // constraint/key keywords.
  out = out.replace(
    /CONSTRAINT\s+"?([^\s("]+)"?\s+/gi,
    (m, p1: string) => `CONSTRAINT "${p1}" `
  );

  // Helper to quote a comma-separated identifier list without touching
  // expressions that contain non-identifier characters.
  const quoteIdentifierList = (inner: string) => {
    const parts = (inner as string)
      .split(/\s*,\s*/)
      .map(p => p.trim())
      .filter(Boolean);
    // If any part contains characters that aren't simple identifiers
    // (letters, digits, underscore, or optional schema dot), abort — it's
    // likely an expression and we shouldn't modify it.
    const simpleIdent = /^[A-Za-z0-9_.]+$/;
    if (!parts.every(p => simpleIdent.test(p))) return null;
    return `(${parts.map(p => `"${p.replace(/"/g, '""')}"`).join(", ")})`;
  };

  // PRIMARY KEY (...)  -> quote identifiers inside parentheses
  out = out.replace(/PRIMARY\s+KEY\s*\(\s*([^)]+?)\s*\)/gi, (m, p1: string) => {
    const q = quoteIdentifierList(p1);
    return q ? `PRIMARY KEY ${q}` : m;
  });

  // FOREIGN KEY (...) -> quote identifiers
  out = out.replace(/FOREIGN\s+KEY\s*\(\s*([^)]+?)\s*\)/gi, (m, p1: string) => {
    const q = quoteIdentifierList(p1);
    return q ? `FOREIGN KEY ${q}` : m;
  });

  // UNIQUE (...) -> quote identifiers
  out = out.replace(/UNIQUE\s*\(\s*([^)]+?)\s*\)/gi, (m, p1: string) => {
    const q = quoteIdentifierList(p1);
    return q ? `UNIQUE ${q}` : m;
  });

  // CONSTRAINT <name> (...) -> quote identifiers inside the parentheses
  out = out.replace(
    /CONSTRAINT\s+"?([^\s("]+)"?\s*\(\s*([^)]+?)\s*\)/gi,
    (m, name: string, cols: string) => {
      const q = quoteIdentifierList(cols);
      return q ? `CONSTRAINT "${name}" ${q}` : m;
    }
  );

  // Tidy up multiple spaces introduced by removals
  out = out.replace(/\s{2,}/g, " ");

  return out;
}

// Initialize AI manager for chat functionality
const aiManager = new AIManager();
const _enhancedAIManager = new EnhancedAIManager();
const autonomousAIManager = new AutonomousAIManager();

// Initialize database tables
log("Initializing database tables...");
database
  .initialize()
  .then(async () => {
    log("✅ Database initialized successfully");

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
      credentialManager = new (StorageModule as any).CredentialManager();
      aiEnginesRepository = new (StorageModule as any).AIEnginesRepository(
        database,
        credentialManager
      );
      console.log("AI engines components initialized");
    } catch (_error) {
      console.error("Failed to initialize AI engines components:", _error);
    }
  })
  .catch((error: any) => {
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
  log("Creating main window...");

  // Get stored window bounds
  const { width, height } = (store as any).get("windowBounds") as {
    width: number;
    height: number;
  };
  log("Window bounds:", { width, height });

  const preloadPath = path.join(__dirname, "preload.cjs");
  const preloadExists = fs.existsSync(preloadPath);
  log("Preload script:", { preloadPath, exists: preloadExists });

  if (!preloadExists) {
    logError("Preload script not found!", { preloadPath, __dirname });
  }

  // Create the browser window
  log("Creating BrowserWindow...");
  try {
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
    log("✅ BrowserWindow created");
  } catch (error) {
    logError("Failed to create BrowserWindow", error);
    throw error;
  }

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
    const rendererUrl = process.env.RENDERER_URL || "http://localhost:3000";
    log(`Loading development URL: ${rendererUrl}`);
    mainWindow.loadURL(rendererUrl).catch(error => {
      logError("Failed to load development URL", error);
    });
  } else {
    log("Loading production renderer file...");

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

    const repoRoot = findRepoRoot(__dirname);
    log("Repository root search:", { repoRoot, __dirname });

    const rendererCandidates = [
      path.join(app.getAppPath(), "dist", "renderer", "index.html"),
      path.resolve(app.getAppPath(), "../renderer/dist/index.html"),
      path.join(process.resourcesPath, "renderer", "index.html"),
      repoRoot
        ? path.join(repoRoot, "apps", "renderer", "dist", "index.html")
        : null,
      path.resolve(__dirname, "../../../renderer/index.html"),
      path.resolve(__dirname, "../../../renderer/dist/index.html"),
      path.resolve(__dirname, "../../renderer/dist/index.html"),
    ]
      .filter((candidate): candidate is string => Boolean(candidate))
      .map(candidate => path.normalize(candidate));

    log("Searching for renderer index.html...", {
      appPath: app.getAppPath(),
      resourcesPath: process.resourcesPath,
      candidateCount: rendererCandidates.length,
    });

    // Check each candidate
    const candidateStatus = rendererCandidates.map(candidate => ({
      path: candidate,
      exists: fs.existsSync(candidate),
    }));
    log("Candidate status:", candidateStatus);

    const toLoad = rendererCandidates.find(candidate =>
      fs.existsSync(candidate)
    );

    if (!toLoad) {
      logError("❌ Could not locate renderer index.html", {
        rendererCandidates,
        __dirname,
        appPath: app.getAppPath(),
        resourcesPath: process.resourcesPath,
      });

      // Show error dialog
      dialog.showErrorBox(
        "SQL Helper - Missing Renderer",
        `Could not locate the application interface files.\n\n` +
          `A detailed log has been saved to:\n${logFilePath}\n\n` +
          `Please share this log file when reporting this issue.`
      );

      throw new Error("Renderer bundle not found");
    }

    log("✅ Found renderer index.html:", toLoad);
    mainWindow.loadFile(toLoad).catch(error => {
      logError("Failed to load renderer file", error);
    });
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
            label: "New Query",
            accelerator: "CmdOrCtrl+T",
            click: () => {
              console.log("New Query clicked from menu");
              if (mainWindow) {
                mainWindow.webContents.send("menu-action", "new-query");
              }
            },
          },
          { type: "separator" },
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
            label: "Preferences...",
            accelerator: "CmdOrCtrl+,",
            click: () => {
              console.log("Preferences menu clicked");
              if (mainWindow) {
                mainWindow.webContents.send("menu-action", "preferences");
              }
            },
          },
          {
            label: "Migrate configuration...",
            click: () => {
              console.log("Migrate configuration clicked from menu");
              if (mainWindow) {
                mainWindow.webContents.send(
                  "menu-action",
                  "migrate-configuration"
                );
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
                mainWindow.webContents.send("menu-action", "new-chat");
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
          {
            label: "Open Startup Log...",
            click: () => {
              console.log("Open Startup Log clicked from menu");
              try {
                // Reveal the log file in the system file manager
                shell.showItemInFolder(logFilePath);
              } catch (err) {
                console.error("Failed to open startup log location:", err);
              }

              if (mainWindow) {
                mainWindow.webContents.send(
                  "menu-action",
                  "open-startup-log",
                  logFilePath
                );
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
  log("=".repeat(80));
  log("App Ready - Starting window creation");
  log("=".repeat(80));

  // Ensure app name is set when ready (try multiple approaches)
  app.setName("SQL Helper");

  // On macOS, try to set additional properties to ensure correct name display
  if (process.platform === "darwin") {
    // Force the app name in the dock and menu bar
    try {
      const iconPath = path.join(__dirname, "../assets/icon.png");
      log("Setting dock icon:", { iconPath, exists: fs.existsSync(iconPath) });
      app.dock?.setIcon(iconPath);
    } catch (error) {
      logError("Could not set dock icon", error);
    }
  }

  try {
    createWindow();
    log("✅ Window creation completed");
  } catch (error) {
    logError("Failed to create window", error);

    // Show error to user
    dialog.showErrorBox(
      "SQL Helper - Startup Failed",
      `The application failed to start.\n\n` +
        `Error: ${error instanceof Error ? error.message : String(error)}\n\n` +
        `A detailed log has been saved to:\n${logFilePath}\n\n` +
        `Please share this log file when reporting this issue.`
    );

    logStream.end(() => {
      app.quit();
    });
  }

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
        (process.env.RENDERER_URL || "http://localhost:3000") &&
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

ipcMain.handle("get-log-file-path", () => {
  return logFilePath;
});

ipcMain.handle("open-log-file", () => {
  shell.showItemInFolder(logFilePath);
  return { success: true, path: logFilePath };
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
      // Get database connection for context - auto-connect if needed
      let provider = databaseManager.getProvider(connectionId);
      if (!provider) {
        console.log(
          `🔗 Database connection ${connectionId} not found, attempting to connect...`
        );

        const connectionData =
          await database.getConnectionWithCredentials(connectionId);
        if (!connectionData) {
          throw new Error(`Database connection ${connectionId} not found`);
        }

        console.log(`🔍 Connection data for ${connectionId}:`, {
          name: connectionData.name,
          type: connectionData.type,
          host: connectionData.host,
          port: connectionData.port,
          database: connectionData.database,
          username: connectionData.username,
          hasPassword: !!connectionData.password,
          hasConnectionString: !!connectionData.connectionString,
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
          connectionString: connectionString || undefined,
        };

        console.log(`🔧 Final connection object for ${connectionId}:`, {
          ...dbConnection,
          password: dbConnection.password ? "[REDACTED]" : undefined,
          connectionString: dbConnection.connectionString
            ? "[REDACTED]"
            : undefined,
          usingConnectionString,
        });

        await databaseManager.connect(dbConnection);
        provider = databaseManager.getProvider(connectionId);
      }

      if (!provider) {
        throw new Error(`No active connection found for id '${connectionId}'`);
      }

      // If provider is PostgreSQL, attempt lightweight normalization of
      // SQL Server-flavored DDL to PostgreSQL-compatible SQL to improve
      // UX for users pasting SQL Server scripts into the editor.
      let execQuery = query;
      try {
        if (provider && (provider as any).type === DatabaseType.PostgreSQL) {
          execQuery = normalizeSqlForPostgres(query);
        }
      } catch (e) {
        console.warn(
          "Failed to normalize SQL for Postgres; using original SQL",
          e
        );
        execQuery = query;
      }

      const result = await provider.executeQuery(execQuery);
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
      // Get database connection for context - auto-connect if needed
      let provider = databaseManager.getProvider(connectionId);
      if (!provider) {
        console.log(
          `🔗 Database connection ${connectionId} not found for XML plan, attempting to connect...`
        );

        const connectionData =
          await database.getConnectionWithCredentials(connectionId);
        if (!connectionData) {
          throw new Error(`Database connection ${connectionId} not found`);
        }

        console.log(`🔍 XML Plan - Connection data for ${connectionId}:`, {
          name: connectionData.name,
          type: connectionData.type,
          host: connectionData.host,
          port: connectionData.port,
          database: connectionData.database,
          username: connectionData.username,
          hasPassword: !!connectionData.password,
          hasConnectionString: !!connectionData.connectionString,
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
          connectionString: connectionString || undefined,
        };

        console.log(
          `🔧 XML Plan - Final connection object for ${connectionId}:`,
          {
            ...dbConnection,
            password: dbConnection.password ? "[REDACTED]" : undefined,
            connectionString: dbConnection.connectionString
              ? "[REDACTED]"
              : undefined,
            usingConnectionString,
          }
        );

        await databaseManager.connect(dbConnection);
        provider = databaseManager.getProvider(connectionId);
      }

      if (!provider) {
        throw new Error(`No active connection found for id '${connectionId}'`);
      }

      // Check if provider supports XML execution plans
      if (provider.getXmlExecutionPlan) {
        const xmlPlan = await provider.getXmlExecutionPlan(query);
        return xmlPlan;
      } else {
        throw new Error(
          "XML execution plans not supported for this database type"
        );
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
      workspaceContext?: {
        currentQuery?: string;
        results?: any;
        activeTabTitle?: string;
        activeTabId?: string;
      };
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

      // Configure autonomous AI manager with database access for autonomous query execution
      autonomousAIManager.setDatabaseProvider(dbProvider, connectionId);
      autonomousAIManager.setAIProvider(aiManager.getCurrentProvider()!);

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

      // Get or create conversation history
      let conversationHistory: any[] = [];
      let conversationId = params.conversationId;

      if (conversationId) {
        // Load existing conversation
        try {
          console.log("📜 Loading conversation history for:", conversationId);
          const savedChats = (store as any).get("savedChats") || [];
          const chatSession = savedChats.find(
            (chat: any) => chat.id === conversationId
          );
          conversationHistory = chatSession?.messages || [];
          console.log(
            "📜 Loaded",
            conversationHistory.length,
            "previous messages"
          );
        } catch (error) {
          console.warn("📜 Could not load conversation history:", error);
        }
      } else {
        // Auto-create a new conversation for the first message
        conversationId = crypto.randomUUID();
        console.log("📜 Auto-creating new conversation:", conversationId);

        const newConversation = {
          id: conversationId,
          title: `Chat ${new Date().toLocaleTimeString()}`,
          engineId,
          connectionId,
          createdAt: new Date().toISOString(),
          lastActivity: new Date().toISOString(),
          messages: [],
        };

        const savedChats = (store as any).get("savedChats") || [];
        savedChats.push(newConversation);
        (store as any).set("savedChats", savedChats);
        console.log("📜 New conversation created and saved");
      }

      // Add workspace context to system message if available
      let workspaceContextText = "";
      if (params.workspaceContext) {
        console.log(
          "🔧 Including workspace context in AI request:",
          params.workspaceContext
        );

        workspaceContextText = `

CURRENT WORKSPACE CONTEXT (ACTIVE TAB ONLY):
The user is currently working on the following in their active SQL tab "${params.workspaceContext.activeTabTitle || "Untitled"}" (other open tabs are excluded from this context):

Current Query: ${params.workspaceContext.currentQuery || "No query currently active"}`;

        if (params.workspaceContext.results) {
          const results = params.workspaceContext.results;
          workspaceContextText += `

Query Results:
- Connection: ${results.connectionName || "Unknown"} (${results.connectionType || "Unknown"}) 
- Database: ${results.database || "Unknown"}
- Columns: [${results.columns.join(", ")}]
- Row Count: ${results.rowCount}
- Execution Time: ${results.executionTime}ms`;

          if (results.error) {
            workspaceContextText += `
- Error: ${results.error}`;
          } else if (results.sampleData && results.sampleData.length > 0) {
            workspaceContextText += `

Sample Data (first few rows):
${JSON.stringify(results.sampleData, null, 2)}`;
          }
        }

        workspaceContextText += `

When answering the user's question, consider this current workspace context. The user may be asking about the current query, results, or wanting to modify/extend their current work.

`;
      }

      // Create system message with enhanced capabilities
      const systemMessage = {
        role: "system" as const,
        content: `You are an expert SQL assistant with autonomous database inspection capabilities connected to a ${sqlContext.databaseType} database named "${sqlContext.connectionName}".

Available tables: ${sqlContext.tables.map(t => `${t.schema}.${t.name}`).join(", ")}${workspaceContextText}

AUTONOMOUS CAPABILITIES:
You have the ability to execute schema inspection queries directly to understand table structures. When you need to inspect table columns, relationships, or data patterns, you should:

1. **Execute schema queries immediately** to discover actual column names and types
2. **Inspect table relationships** by examining foreign key constraints
3. **Analyze sample data** to understand data patterns and relationships
4. **Run multiple queries** as needed to fully understand the schema before answering

IMPORTANT: Never assume column names like "ShipmentID" or "OrderID". Always inspect the actual schema first.

When generating SQL queries:
1. Use appropriate SQL syntax for ${sqlContext.databaseType}
2. Always include schema names in table references
3. Use TOP instead of LIMIT for SQL Server
4. First inspect schema if you don't know the exact column names
5. Execute queries to understand data relationships

Format your responses with:
- Brief explanation of what you understood  
- Any schema inspection queries you executed
- Final SQL query in a code block
- Explanation of what the query does
- Insights about the data structure

You can execute queries directly - use your autonomous capabilities to provide accurate responses.`,
      };

      // Build full conversation with history
      const messages = [
        systemMessage,
        ...conversationHistory.map((msg: any) => ({
          role: msg.role,
          content: msg.content,
        })),
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

      // Call autonomous AI provider with query execution capabilities
      const apiResponse = await autonomousAIManager.chat(messages, sqlContext);

      console.log("🤖 AI response received:", {
        contentLength: apiResponse.content?.length || 0,
        hasContent: !!apiResponse.content,
        executedQueries: apiResponse.executedQueries?.length || 0,
      });

      // Log executed queries for debugging
      if (
        apiResponse.executedQueries &&
        apiResponse.executedQueries.length > 0
      ) {
        console.log("🔍 Autonomous queries executed:");
        apiResponse.executedQueries.forEach((query, index) => {
          console.log(`  ${index + 1}. ${query.query.substring(0, 100)}...`);
          console.log(
            `     → ${query.error ? "ERROR: " + query.error : "Success: " + (query.result?.rowCount || 0) + " rows"}`
          );
        });
      }

      // Parse potential SQL from AI response
      let finalSQL: string | undefined;

      const sqlBlockMatch = apiResponse.content?.match(
        /```sql\s*([\s\S]*?)```/i
      );
      if (sqlBlockMatch) {
        finalSQL = sqlBlockMatch[1].trim();
      }

      if (!finalSQL) {
        const resultTagMatch = apiResponse.content?.match(
          /<RESULT_QUERY>([\s\S]*?)<\/RESULT_QUERY>/i
        );
        if (resultTagMatch) {
          finalSQL = resultTagMatch[1].trim();
        }
      }

      if (!finalSQL && apiResponse.executedQueries?.length) {
        const lastSuccessfulQuery = [...apiResponse.executedQueries]
          .reverse()
          .find(
            queryExecution => !queryExecution.error && queryExecution.query
          );
        if (lastSuccessfulQuery?.query) {
          finalSQL = lastSuccessfulQuery.query.trim();
        }
      }

      // Check if AI executed result queries and offer to create tabs
      let autoExecutedQueries = 0;
      if (
        apiResponse.executedQueries &&
        apiResponse.executedQueries.length > 0
      ) {
        apiResponse.executedQueries.forEach((queryExecution: any) => {
          if (
            queryExecution.query &&
            !queryExecution.error &&
            queryExecution.result?.rows?.length > 0
          ) {
            autoExecutedQueries++;
          }
        });
      }

      // If the AI executed queries with results, mention it in the response
      let responseContent =
        apiResponse.content || "I'm sorry, I couldn't generate a response.";
      if (autoExecutedQueries > 0) {
        responseContent += `\n\n*🔍 I executed ${autoExecutedQueries} ${autoExecutedQueries === 1 ? "query" : "queries"} to analyze your data and provide this response.*`;
      }

      const response = {
        id: crypto.randomUUID(),
        role: "assistant" as const,
        content: `*Connected to: **${dbContext}** using **${engine.name}***\n\n${responseContent}`,
        timestamp: new Date().toISOString(),
        finalSQL,
        conversationId, // Return conversation ID so frontend can track it
      };

      console.log("🤖 Final response prepared:", {
        hasSQL: !!finalSQL,
        sqlLength: finalSQL?.length || 0,
      });

      // Save conversation history (conversationId is always set now due to auto-creation)
      if (conversationId) {
        try {
          console.log("💾 Saving conversation history for:", conversationId);
          const savedChats = (store as any).get("savedChats") || [];
          let chatSession = savedChats.find(
            (chat: any) => chat.id === conversationId
          );

          if (chatSession) {
            // Add user message and AI response to existing conversation
            chatSession.messages = chatSession.messages || [];

            // Add user message
            const userMessage = {
              id: crypto.randomUUID(),
              role: "user" as const,
              content: message,
              timestamp: new Date().toISOString(),
            };

            chatSession.messages.push(userMessage);
            chatSession.messages.push(response);
            chatSession.lastActivity = new Date().toISOString();

            // Update the conversation in storage
            const updatedChats = savedChats.map((chat: any) =>
              chat.id === conversationId ? chatSession : chat
            );
            (store as any).set("savedChats", updatedChats);

            console.log(
              "💾 Conversation updated with",
              chatSession.messages.length,
              "total messages"
            );
          } else {
            console.warn(
              "💾 Conversation not found for saving:",
              conversationId
            );
          }
        } catch (error) {
          console.error("💾 Error saving conversation history:", error);
        }
      }

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
      console.log("📜 Getting conversation history for:", conversationId);
      const savedChats = (store as any).get("savedChats") || [];
      const chatSession = savedChats.find(
        (chat: any) => chat.id === conversationId
      );

      if (!chatSession) {
        console.log("📜 No chat session found, returning empty history");
        return [];
      }

      const messages = chatSession.messages || [];
      console.log(
        "📜 Retrieved conversation history:",
        messages.length,
        "messages"
      );
      return messages;
    } catch (error) {
      console.error("📜 Error getting conversation history:", error);
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
        role: "user" | "assistant" | "system";
        content: string;
        timestamp: string;
        finalSQL?: string;
        renderMarkdown?: boolean;
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
        pinned: false,
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
    const chatList = savedChats
      .map((chat: any) => ({
        id: chat.id,
        title: chat.title,
        createdAt: chat.createdAt,
        updatedAt: chat.updatedAt,
        connectionId: chat.connectionId,
        engineId: chat.engineId,
        messageCount: chat.messages?.length || 0,
        pinned: Boolean(chat.pinned),
      }))
      .sort((a: any, b: any) => {
        if (a.pinned !== b.pinned) {
          return a.pinned ? -1 : 1;
        }

        const dateA = new Date(a.updatedAt || a.createdAt).getTime();
        const dateB = new Date(b.updatedAt || b.createdAt).getTime();
        return dateB - dateA;
      });

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

ipcMain.handle(
  "chat-update-title",
  async (_event, params: { chatId: string; title: string }) => {
    try {
      const savedChats = (store as any).get("savedChats") || [];
      const chatIndex = savedChats.findIndex(
        (chat: any) => chat.id === params.chatId
      );

      if (chatIndex === -1) {
        throw new Error("Chat session not found");
      }

      savedChats[chatIndex].title = params.title;
      savedChats[chatIndex].updatedAt = new Date().toISOString();
      (store as any).set("savedChats", savedChats);

      console.log("✏️ Chat title updated:", params.chatId);
      return { success: true };
    } catch (error) {
      console.error("✏️ Error updating chat title:", error);
      throw error;
    }
  }
);

ipcMain.handle(
  "chat-toggle-pin",
  async (_event, params: { chatId: string; pinned: boolean }) => {
    try {
      const savedChats = (store as any).get("savedChats") || [];
      const chatIndex = savedChats.findIndex(
        (chat: any) => chat.id === params.chatId
      );

      if (chatIndex === -1) {
        throw new Error("Chat session not found");
      }

      savedChats[chatIndex].pinned = params.pinned;
      savedChats[chatIndex].updatedAt = new Date().toISOString();
      (store as any).set("savedChats", savedChats);

      console.log(
        params.pinned ? "📌 Chat pinned:" : "📌 Chat unpinned:",
        params.chatId
      );
      return { success: true };
    } catch (error) {
      console.error("📌 Error updating chat pin state:", error);
      throw error;
    }
  }
);

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
      role?: "user" | "assistant" | "system";
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

      if (params.role) {
        allMessages = allMessages.filter(msg => msg.role === params.role);
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

// Tips management handlers
ipcMain.handle(
  "tips-create",
  async (
    _,
    tipData: {
      title: string;
      content: string;
      category?: string;
      priority?: number;
    }
  ) => {
    try {
      console.log("🔍 Creating tip:", tipData.title);
      const tipWithDefaults = {
        id: `tip_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        title: tipData.title,
        content: tipData.content,
        category: tipData.category || "general",
        priority: tipData.priority || 0,
        isActive: true,
        showCount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      const tip = await database.createTip(tipWithDefaults);
      return tip;
    } catch (error) {
      console.error("🔍 Failed to create tip:", error);
      throw error;
    }
  }
);

ipcMain.handle(
  "tips-get-all",
  async (_, category?: string, activeOnly: boolean = true) => {
    try {
      console.log(
        "🔍 Getting all tips, category:",
        category,
        "activeOnly:",
        activeOnly
      );
      const tips = await database.getTips(category, activeOnly);
      return tips;
    } catch (error) {
      console.error("🔍 Failed to get tips:", error);
      throw error;
    }
  }
);

ipcMain.handle(
  "tips-get-random",
  async (_, count: number = 1, category?: string) => {
    try {
      console.log(
        "🔍 Getting random tips, count:",
        count,
        "category:",
        category
      );
      const tips = await database.getRandomTips(count, category);
      return tips;
    } catch (error) {
      console.error("🔍 Failed to get random tips:", error);
      throw error;
    }
  }
);

ipcMain.handle(
  "tips-update",
  async (
    _,
    id: string,
    updates: {
      title?: string;
      content?: string;
      category?: string;
      priority?: number;
      isActive?: boolean;
    }
  ) => {
    try {
      console.log("🔍 Updating tip:", id);
      const tip = await database.updateTip(id, updates);
      return tip;
    } catch (error) {
      console.error("🔍 Failed to update tip:", error);
      throw error;
    }
  }
);

ipcMain.handle("tips-delete", async (_, id: string) => {
  try {
    console.log("🔍 Deleting tip:", id);
    await database.deleteTip(id);
    return { success: true };
  } catch (error) {
    console.error("🔍 Failed to delete tip:", error);
    throw error;
  }
});

ipcMain.handle("tips-increment-show-count", async (_, id: string) => {
  try {
    console.log("🔍 Incrementing show count for tip:", id);
    await database.incrementTipShowCount(id);
    return { success: true };
  } catch (error) {
    console.error("🔍 Failed to increment tip show count:", error);
    throw error;
  }
});

// Settings handlers for tips
ipcMain.handle(
  "settings-get",
  async (_, key: string, defaultValue?: unknown) => {
    try {
      console.log("🔍 Getting setting:", key);
      const value = await database.getSetting(key, defaultValue);
      return value;
    } catch (error) {
      console.error("🔍 Failed to get setting:", error);
      throw error;
    }
  }
);

ipcMain.handle("settings-set", async (_, key: string, value: unknown) => {
  try {
    console.log("🔍 Setting:", key);
    await database.setSetting(key, value);
    return { success: true };
  } catch (error) {
    console.error("🔍 Failed to set setting:", error);
    throw error;
  }
});

// First-run wizard helpers
ipcMain.handle("first-run-status", async () => {
  try {
    const done = (store as any).get("bootstrap.done");
    return { done: !!done };
  } catch (error) {
    return { done: false, error: String(error) };
  }
});

// Programmatic migrate configuration entry (callable from renderer)
ipcMain.handle(
  "migrate-configuration",
  async (
    _: IpcMainInvokeEvent,
    opts: { backend: string; connString?: string; migrateExisting?: boolean }
  ) => {
    // Delegate to first-run-migrate handler
    return (await (ipcMain.emit as any))
      ? await (ipcMain as any).invoke?.("first-run-migrate", opts)
      : await (async () => {
          return { ok: false, error: "Not implemented" };
        })();
  }
);

ipcMain.handle(
  "first-run-validate",
  async (
    _: IpcMainInvokeEvent,
    opts: { backend: string; connString?: string }
  ) => {
    try {
      const { backend, connString } = opts || {};
      let adapter: any | null = null;
      try {
        adapter = await loadDbAdapter(
          backend as any,
          connString ? { connectionString: connString } : {}
        );
      } catch (e) {
        console.warn(
          "Adapter load failed during validation, will try fallback if sqlite",
          e
        );
        // Friendly handling for missing runtime deps (common in dev)
        const msg = String((e && (e as any).message) || e);
        if (
          /Cannot find package '(.+?)'/.test(msg) ||
          /Cannot find module '(.+?)'/.test(msg) ||
          (e && (e as any).code === "ERR_MODULE_NOT_FOUND")
        ) {
          const m =
            msg.match(/Cannot find package '(.+?)'/) ||
            msg.match(/Cannot find module '(.+?)'/);
          const pkg = m ? m[1] : "required package";
          return {
            ok: false,
            error: `Missing runtime dependency: ${pkg}. In development install it (for example: pnpm -w --filter @sqlhelper/desktop add ${pkg})`,
          };
        }
        if (backend === "sqlite") {
          const { LocalDatabase: LD } = await import("@sqlhelper/storage");
          adapter = new LD(dbPath);
        } else throw e;
      }

      if (!adapter) return { ok: false, message: "No adapter available" };
      if (typeof adapter.connect === "function") {
        await adapter.connect();
        if (typeof adapter.close === "function") await adapter.close();
      }
      return { ok: true };
    } catch (error) {
      console.error("first-run-validate failed", error);
      const msg = String((error && (error as any).message) || error);
      if (
        /Cannot find package '(.+?)'/.test(msg) ||
        /Cannot find module '(.+?)'/.test(msg) ||
        (error && (error as any).code === "ERR_MODULE_NOT_FOUND")
      ) {
        const m =
          msg.match(/Cannot find package '(.+?)'/) ||
          msg.match(/Cannot find module '(.+?)'/);
        const pkg = m ? m[1] : "required package";
        return {
          ok: false,
          error: `Missing runtime dependency: ${pkg}. In development install it (for example: pnpm -w --filter @sqlhelper/desktop add ${pkg})`,
        };
      }
      return { ok: false, error: String(error) };
    }
  }
);

ipcMain.handle(
  "first-run-migrate",
  async (
    _: IpcMainInvokeEvent,
    opts: { backend: string; connString?: string; migrateExisting?: boolean }
  ) => {
    try {
      const { backend, connString, migrateExisting } = opts || {};
      const _migrationsDir = path.join(
        __dirname,
        "..",
        "..",
        "new_features",
        "db_storage",
        "migrations",
        backend
      );
      const target = await loadDbAdapter(
        backend as any,
        connString ? { connectionString: connString } : { filename: dbPath }
      );

      // Ensure target is connected before running migrations
      try {
        if (typeof (target as any).connect === "function") {
          await (target as any).connect();
        }
      } catch (_e) {
        console.error("target.connect failed", _e);
        return {
          ok: false,
          error: `Could not connect to target backend: ${String(_e)}`,
        };
      }

      // Run migrations and surface any errors
      if (typeof (target as any).migrate === "function") {
        try {
          await (target as any).migrate();
        } catch (e) {
          console.error("migration run failed", e);
          try {
            if (typeof (target as any).close === "function")
              await (target as any).close();
          } catch (_) {
            /*ignore*/
          }
          return { ok: false, error: `Migration failed: ${String(e)}` };
        }
      }

      // Optionally copy connections from sqlite
      if (migrateExisting) {
        try {
          const sqliteAdapter = await loadDbAdapter("sqlite", {
            filename: dbPath,
          });
          try {
            if (typeof (sqliteAdapter as any).connect === "function")
              await (sqliteAdapter as any).connect();
          } catch (_) {
            /* ignore */
          }
          if (
            sqliteAdapter &&
            typeof (sqliteAdapter as any).listConnections === "function"
          ) {
            const conns = await (sqliteAdapter as any).listConnections();
            for (const c of conns) {
              try {
                if (typeof (target as any).saveConnection === "function") {
                  await (target as any).saveConnection(c);
                } else if (typeof (target as any).runQuery === "function") {
                  // Fallback: try to upsert into a connections table directly
                  try {
                    await (target as any).runQuery(`
                    CREATE TABLE IF NOT EXISTS connections (
                      id TEXT PRIMARY KEY,
                      name TEXT NOT NULL,
                      type TEXT NOT NULL,
                      host TEXT NOT NULL,
                      port INTEGER NOT NULL,
                      database TEXT,
                      username TEXT NOT NULL,
                      connection_string TEXT,
                      ssl INTEGER DEFAULT 0,
                      options TEXT,
                      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                      last_used TIMESTAMP
                    );
                  `);
                    await (target as any).runQuery(
                      `INSERT INTO connections(id, name, type, host, port, database, username, connection_string, ssl, options, created_at, updated_at, last_used)
                     VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
                     ON CONFLICT (id) DO UPDATE SET
                       name = EXCLUDED.name,
                       type = EXCLUDED.type,
                       host = EXCLUDED.host,
                       port = EXCLUDED.port,
                       database = EXCLUDED.database,
                       username = EXCLUDED.username,
                       connection_string = EXCLUDED.connection_string,
                       ssl = EXCLUDED.ssl,
                       options = EXCLUDED.options,
                       updated_at = EXCLUDED.updated_at,
                       last_used = EXCLUDED.last_used;`,
                      [
                        c.id || null,
                        c.name || null,
                        c.type || null,
                        c.host || null,
                        c.port || null,
                        c.database || null,
                        c.username || null,
                        c.connection_string || null,
                        c.ssl ? 1 : 0,
                        c.options ? JSON.stringify(c.options) : null,
                        c.created_at || new Date().toISOString(),
                        new Date().toISOString(),
                        c.last_used || null,
                      ]
                    );
                  } catch (uq) {
                    console.warn("fallback upsert failed", uq);
                  }
                } else {
                  console.warn(
                    "target.saveConnection not available and no runQuery fallback"
                  );
                }
              } catch (_e) {
                console.warn("saveConnection failed", _e);
              }
            }
          }
          try {
            if (typeof (sqliteAdapter as any).close === "function")
              await (sqliteAdapter as any).close();
          } catch (_) {
            /*ignore*/
          }
        } catch (e) {
          console.warn("migrateExisting: sqlite read failed", e);
        }
      }

      try {
        if (typeof (target as any).close === "function")
          await (target as any).close();
      } catch (_) {
        /*ignore*/
      }

      return { ok: true };
    } catch (error) {
      console.error("first-run-migrate failed", error);
      const msg = String((error && (error as any).message) || error);
      if (
        /Cannot find package '(.+?)'/.test(msg) ||
        /Cannot find module '(.+?)'/.test(msg) ||
        (error && (error as any).code === "ERR_MODULE_NOT_FOUND")
      ) {
        const m =
          msg.match(/Cannot find package '(.+?)'/) ||
          msg.match(/Cannot find module '(.+?)'/);
        const pkg = m ? m[1] : "required package";
        return {
          ok: false,
          error: `Missing runtime dependency: ${pkg}. In development install it (for example: pnpm -w --filter @sqlhelper/desktop add ${pkg})`,
        };
      }
      return { ok: false, error: String(error) };
    }
  }
);

ipcMain.handle(
  "first-run-migrate-from-sqlite",
  async (
    _: IpcMainInvokeEvent,
    opts: { backend: string; connString?: string }
  ) => {
    try {
      const { backend, connString } = opts || {};
      let source: any;
      try {
        source = await loadDbAdapter("sqlite", { filename: dbPath });
      } catch (e) {
        const { LocalDatabase: LD } = await import("@sqlhelper/storage");
        source = new LD(dbPath);
      }
      const target = await loadDbAdapter(
        backend as any,
        connString ? { connectionString: connString } : { filename: dbPath }
      );

      if (source && typeof (source as any).listConnections === "function") {
        const conns = await (source as any).listConnections();
        for (const c of conns) {
          try {
            if (typeof (target as any).saveConnection === "function") {
              await (target as any).saveConnection(c);
            } else if (typeof (target as any).runQuery === "function") {
              try {
                await (target as any).runQuery(`
                CREATE TABLE IF NOT EXISTS connections (
                  id TEXT PRIMARY KEY,
                  name TEXT NOT NULL,
                  type TEXT NOT NULL,
                  host TEXT NOT NULL,
                  port INTEGER NOT NULL,
                  database TEXT,
                  username TEXT NOT NULL,
                  connection_string TEXT,
                  ssl INTEGER DEFAULT 0,
                  options TEXT,
                  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                  last_used TIMESTAMP
                );
              `);
                await (target as any).runQuery(
                  `INSERT INTO connections(id, name, type, host, port, database, username, connection_string, ssl, options, created_at, updated_at, last_used)
                 VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
                 ON CONFLICT (id) DO UPDATE SET
                   name = EXCLUDED.name,
                   type = EXCLUDED.type,
                   host = EXCLUDED.host,
                   port = EXCLUDED.port,
                   database = EXCLUDED.database,
                   username = EXCLUDED.username,
                   connection_string = EXCLUDED.connection_string,
                   ssl = EXCLUDED.ssl,
                   options = EXCLUDED.options,
                   updated_at = EXCLUDED.updated_at,
                   last_used = EXCLUDED.last_used;`,
                  [
                    c.id || null,
                    c.name || null,
                    c.type || null,
                    c.host || null,
                    c.port || null,
                    c.database || null,
                    c.username || null,
                    c.connection_string || null,
                    c.ssl ? 1 : 0,
                    c.options ? JSON.stringify(c.options) : null,
                    c.created_at || new Date().toISOString(),
                    new Date().toISOString(),
                    c.last_used || null,
                  ]
                );
              } catch (uq) {
                console.warn("fallback upsert failed", uq);
              }
            } else {
              console.warn(
                "target.saveConnection not available and no runQuery fallback"
              );
            }
          } catch (_e) {
            console.warn("saveConnection failed", _e);
          }
        }
      }

      return { ok: true };
    } catch (error) {
      console.error("first-run-migrate-from-sqlite failed", error);
      const msg = String((error && (error as any).message) || error);
      if (
        /Cannot find package '(.+?)'/.test(msg) ||
        /Cannot find module '(.+?)'/.test(msg) ||
        (error && (error as any).code === "ERR_MODULE_NOT_FOUND")
      ) {
        const m =
          msg.match(/Cannot find package '(.+?)'/) ||
          msg.match(/Cannot find module '(.+?)'/);
        const pkg = m ? m[1] : "required package";
        return {
          ok: false,
          error: `Missing runtime dependency: ${pkg}. In development install it (for example: pnpm -w --filter @sqlhelper/desktop add ${pkg})`,
        };
      }
      return { ok: false, error: String(error) };
    }
  }
);

ipcMain.handle(
  "first-run-complete",
  async (_: IpcMainInvokeEvent, opts: { backend: string }) => {
    try {
      (store as any).set("bootstrap.done", true);
      (store as any).set("bootstrap.backend", opts?.backend ?? "sqlite");
      return { ok: true };
    } catch (error) {
      console.error("first-run-complete failed", error);
      return { ok: false, error: String(error) };
    }
  }
);

// Provide an app-level config info helper so the renderer can display
// what backend is used for configuration and a human-readable descriptor.
ipcMain.handle("app-config-info", async () => {
  try {
    const backend = (store as any).get("bootstrap.backend") || "sqlite";
    let descriptor: string | null = null;
    if (backend === "sqlite") {
      // The app's sqlite file used for configuration
      descriptor = dbPath;
    } else {
      // For other backends try to read a stored connString set during first-run
      descriptor = (store as any).get("bootstrap.connString") || null;
    }
    return { backend, descriptor };
  } catch (error) {
    console.error("app-config-info failed", error);
    return { backend: "sqlite", descriptor: null };
  }
});

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
