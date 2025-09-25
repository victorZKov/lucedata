import { useState, useEffect } from "react";
import { Plug, LogOut, Pencil, Trash2 } from "lucide-react";

import ConnectionDialog from "./ConnectionDialog";

interface Connection {
  id: string;
  name: string;
  type: string;
  host?: string;
  port?: string;
  database: string;
  username?: string;
  connectionString?: string;
  ssl?: boolean;
  createdAt: string;
  updatedAt: string;
}

interface ConnectionState {
  connection: Connection;
  isConnected: boolean;
  isConnecting: boolean;
  error?: string;
  schemaData?: DatabaseSchema;
  expandedNodes: Set<string>;
}

interface DatabaseSchema {
  databases: DatabaseNode[];
}

interface DatabaseNode {
  name: string;
  type: "database";
  children?: SchemaNode[];
}

interface SchemaNode {
  name: string;
  type: "schema";
  children?: (
    | TableNode
    | ViewNode
    | ProcedureNode
    | FunctionNode
    | GroupNode
  )[];
}

interface TableNode {
  name: string;
  type: "table";
  schema: string;
  rowCount?: number;
}

interface ViewNode {
  name: string;
  type: "view";
  schema: string;
}

interface ProcedureNode {
  name: string;
  type: "procedure";
  schema: string;
}

interface FunctionNode {
  name: string;
  type: "function";
  schema: string;
}

interface GroupNode {
  name: string;
  type: "group";
  children?: (TableNode | ViewNode | ProcedureNode | FunctionNode)[];
}

export default function Explorer() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editConnection, setEditConnection] = useState<any>(null);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [connectionStates, setConnectionStates] = useState<
    Map<string, ConnectionState>
  >(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [apiReady, setApiReady] = useState(false);
  const [isElectronEnv, setIsElectronEnv] = useState(false);
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    visible: boolean;
    mode?: "table" | "schema" | "routine";
    connId?: string;
    schema?: string;
    table?: string;
    routine?: string;
    routineKind?: "procedure" | "function";
    type?: string;
    connName?: string;
    db?: string;
  }>({ x: 0, y: 0, visible: false });

  // Check if we're in Electron environment
  useEffect(() => {
    const isElectron = window.navigator.userAgent
      .toLowerCase()
      .includes("electron");
    setIsElectronEnv(isElectron);
    console.log("Environment check - isElectron:", isElectron);

    if (!isElectron) {
      console.log("Running in browser - electronAPI features will be limited");
      setIsLoading(false);
      setApiReady(false);
      return;
    }
  }, []);

  // Check if electronAPI is available
  useEffect(() => {
    if (!isElectronEnv) {
      return; // Skip if not in Electron
    }

    const checkAPI = () => {
      console.log("Checking electronAPI availability...");
      console.log("window.electronAPI:", window.electronAPI);
      console.log(
        "window.electronAPI?.connections:",
        window.electronAPI?.connections
      );

      if (window.electronAPI && window.electronAPI.connections) {
        console.log("ElectronAPI is ready!");
        setApiReady(true);
        return true;
      }
      console.log("ElectronAPI not ready yet...");
      return false;
    };

    // Try to check immediately
    if (checkAPI()) {
      return;
    }

    console.log("Starting to poll for ElectronAPI...");

    // Use a more aggressive polling strategy
    const interval = setInterval(() => {
      if (checkAPI()) {
        clearInterval(interval);
      }
    }, 50); // Check every 50ms instead of 100ms

    // Cleanup after 10 seconds instead of 5
    const timeout = setTimeout(() => {
      clearInterval(interval);
      console.error("ElectronAPI not available after 10 seconds");
      console.log("Final state - window.electronAPI:", window.electronAPI);

      // As a fallback, if we're in Electron but API isn't detected, assume it might be there
      if (isElectronEnv) {
        console.log(
          "Setting apiReady to true as fallback since we are in Electron"
        );
        setApiReady(true);
      }

      setIsLoading(false);
    }, 10000);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [isElectronEnv]);

  // Listen for header Add button command
  useEffect(() => {
    const handler = () => handleAddConnection();
    document.addEventListener("open-add-connection", handler);
    return () => document.removeEventListener("open-add-connection", handler);
  }, []);

  // Load connections when API becomes ready
  useEffect(() => {
    if (apiReady) {
      loadConnections();
    }
  }, [apiReady]);

  // Listen for menu events
  useEffect(() => {
    const handleMenuAction = (action: string) => {
      console.log("Menu action received:", action);
      switch (action) {
        case "new-connection":
          handleAddConnection();
          break;
        case "refresh-connections":
          loadConnections();
          break;
        case "disconnect-all":
          handleDisconnectAll();
          break;
        default:
          console.log("Unknown menu action:", action);
      }
    };

    // Add event listener for menu events
    if (window.electronAPI && window.electronAPI.onMenuAction) {
      window.electronAPI.onMenuAction(handleMenuAction);
    }

    return () => {
      // Cleanup if needed
      if (window.electronAPI && window.electronAPI.removeAllListeners) {
        window.electronAPI.removeAllListeners("menu-action");
      }
    };
  }, []);

  const handleDisconnectAll = async () => {
    try {
      // Disconnect all active connections
      const disconnectPromises = Array.from(connectionStates.entries())
        .filter(([_, state]) => state.isConnected)
        .map(([connectionId, _]) => handleDisconnect(connectionId));

      await Promise.all(disconnectPromises);
      console.log("All connections disconnected");
    } catch (error) {
      console.error("Failed to disconnect all connections:", error);
    }
  };

  const loadConnections = async () => {
    try {
      setIsLoading(true);
      console.log("🔧 [Explorer] Loading connections...");
      if (!window.electronAPI || !window.electronAPI.connections) {
        throw new Error("ElectronAPI not available");
      }
      const loadedConnections = await window.electronAPI.connections.list();
      console.log(
        `🔧 [Explorer] Loaded ${loadedConnections.length} connections:`,
        loadedConnections
      );
      setConnections(loadedConnections);

      // Initialize connection states
      const newConnectionStates = new Map<string, ConnectionState>();
      loadedConnections.forEach((connection: Connection) => {
        newConnectionStates.set(connection.id, {
          connection,
          isConnected: false,
          isConnecting: false,
          expandedNodes: new Set(),
        });
      });
      setConnectionStates(newConnectionStates);
      console.log(
        "🔧 [Explorer] Connection states initialized for",
        newConnectionStates.size,
        "connections"
      );
    } catch (error) {
      console.error("🔧 [Explorer] Failed to load connections:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleConnect = async (connectionId: string) => {
    const connectionState = connectionStates.get(connectionId);
    if (!connectionState || connectionState.isConnecting) return;

    setConnectionStates(prev => {
      const newStates = new Map(prev);
      const state = newStates.get(connectionId);
      if (state) {
        newStates.set(connectionId, {
          ...state,
          isConnecting: true,
          error: undefined,
        });
      }
      return newStates;
    });

    try {
      if (!window.electronAPI || !window.electronAPI.database) {
        throw new Error("ElectronAPI database methods not available");
      }
      console.log("Attempting to connect to", connectionId);
      console.log("window.electronAPI.database:", window.electronAPI.database);
      await window.electronAPI.database.connect(connectionId);
      const schemaData =
        await window.electronAPI.database.getSchema(connectionId);
      // Persist last used connection context for default New Query binding
      try {
        const conn = connectionState.connection;
        localStorage.setItem(
          "sqlhelper-last-connection",
          JSON.stringify({
            id: conn.id,
            name: conn.name,
            type: conn.type,
            database: conn.database,
          })
        );
      } catch {}

      setConnectionStates(prev => {
        const newStates = new Map(prev);
        const state = newStates.get(connectionId);
        if (state) {
          newStates.set(connectionId, {
            ...state,
            isConnected: true,
            isConnecting: false,
            schemaData,
            error: undefined,
          });
        }
        return newStates;
      });
    } catch (error) {
      console.error("Failed to connect:", error);
      setConnectionStates(prev => {
        const newStates = new Map(prev);
        const state = newStates.get(connectionId);
        if (state) {
          newStates.set(connectionId, {
            ...state,
            isConnected: false,
            isConnecting: false,
            error: error instanceof Error ? error.message : "Connection failed",
          });
        }
        return newStates;
      });
    }
  };

  const handleDisconnect = async (connectionId: string) => {
    try {
      if (!window.electronAPI || !window.electronAPI.database) {
        throw new Error("ElectronAPI database methods not available");
      }

      await window.electronAPI.database.disconnect(connectionId);

      setConnectionStates(prev => {
        const newStates = new Map(prev);
        const state = newStates.get(connectionId);
        if (state) {
          newStates.set(connectionId, {
            ...state,
            isConnected: false,
            isConnecting: false,
            schemaData: undefined,
            expandedNodes: new Set(),
            error: undefined,
          });
        }
        return newStates;
      });
    } catch (error) {
      console.error("Failed to disconnect:", error);
    }
  };

  const toggleNodeExpansion = (connectionId: string, nodeKey: string) => {
    setConnectionStates(prev => {
      const newStates = new Map(prev);
      const state = newStates.get(connectionId);
      if (state) {
        const expandedNodes = new Set(state.expandedNodes);
        if (expandedNodes.has(nodeKey)) {
          expandedNodes.delete(nodeKey);
        } else {
          expandedNodes.add(nodeKey);
        }
        newStates.set(connectionId, { ...state, expandedNodes });
      }
      return newStates;
    });
  };

  const handleDeleteConnection = async (id: string) => {
    try {
      if (!window.electronAPI || !window.electronAPI.connections) {
        throw new Error("ElectronAPI not available");
      }
      await window.electronAPI.connections.delete(id);
      await loadConnections(); // Reload the connections list
      // Dispatch event to update other components
      document.dispatchEvent(new CustomEvent("database-connections-updated"));
    } catch (error) {
      console.error("Failed to delete connection:", error);
    }
  };

  const handleAddConnection = () => {
    setEditConnection(null); // Clear any edit state
    setIsDialogOpen(true);
  };

  const handleEditConnection = (connection: Connection) => {
    // Convert connection to the format expected by ConnectionDialog
    const editData = {
      name: connection.name,
      type: connection.type as "postgresql" | "sqlserver" | "mysql" | "sqlite",
      host: connection.host || "",
      port: connection.port?.toString() || "",
      database: connection.database || "",
      username: connection.username || "",
      password: "", // Don't pre-populate password
      ssl: connection.ssl || false,
      connectionString: connection.connectionString || "",
      useConnectionString: !!connection.connectionString,
    };
    setEditConnection({ ...editData, id: connection.id }); // Add ID for updating
    setIsDialogOpen(true);
  };

  const handleSaveConnection = async (connectionData: any) => {
    try {
      console.log("🔄 handleSaveConnection: Starting save operation");
      console.log("🔍 window:", typeof window);
      console.log("🔍 window.electronAPI:", window.electronAPI);
      console.log(
        "🔍 Object.keys(window.electronAPI || {}):",
        Object.keys(window.electronAPI || {})
      );
      console.log(
        "🔍 window.electronAPI.connections:",
        window.electronAPI?.connections
      );

      // Wait a bit for the API to be available in case of timing issues
      if (!window.electronAPI) {
        console.log("⏳ ElectronAPI not available, waiting 100ms...");
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      if (!window.electronAPI || !window.electronAPI.connections) {
        console.error("❌ ElectronAPI check failed after wait");
        console.error("   - window.electronAPI:", !!window.electronAPI);
        console.error(
          "   - Available keys:",
          Object.keys(window.electronAPI || {})
        );
        console.error(
          "   - window.electronAPI.connections:",
          !!window.electronAPI?.connections
        );
        console.error("   - User Agent:", navigator.userAgent);
        console.error("   - Location:", window.location.href);

        // Provide helpful error messages based on the environment
        if (
          window.location.hostname === "localhost" &&
          !navigator.userAgent.includes("Electron")
        ) {
          throw new Error(
            "You're trying to use this in a web browser. Please open this in the Electron desktop application instead. The Electron app should be running as a separate desktop window."
          );
        } else if (window.location.hostname === "localhost") {
          throw new Error(
            "ElectronAPI not available. Please restart the Electron application and try again."
          );
        }

        throw new Error(
          "ElectronAPI not available. Please make sure you're running this within the Electron application."
        );
      }

      const isEditing = editConnection && connectionData.id;
      console.log(
        "✅ All API checks passed,",
        isEditing ? "updating" : "saving",
        "connection..."
      );

      const { password, connectionString, id, ...connectionInfo } =
        connectionData;

      // Include connection string in the connection info if provided
      const connectionToSave = connectionString
        ? { ...connectionInfo, connectionString }
        : connectionInfo;

      if (isEditing) {
        // For now, we'll delete and recreate since we don't have an update method
        // TODO: Add proper update method to the API
        await window.electronAPI.connections.delete(id);
        await window.electronAPI.connections.save(connectionToSave, password);
      } else {
        if (!window.electronAPI.connections.save) {
          console.error("❌ connections.save method not available");
          throw new Error("ElectronAPI connections.save method not available");
        }
        await window.electronAPI.connections.save(connectionToSave, password);
      }

      console.log(
        "✅ Connection",
        isEditing ? "updated" : "saved",
        "successfully"
      );
      setEditConnection(null); // Clear edit state
      await loadConnections(); // Reload the connections list
      // Dispatch event to update other components
      document.dispatchEvent(new CustomEvent("database-connections-updated"));
    } catch (error) {
      console.error("❌ Failed to save connection:", error);
      throw error; // Re-throw to let the dialog handle the error
    }
  };

  // Helpers: open a new script tab in the WorkArea
  const openScriptTab = (
    ctx: {
      connId?: string;
      type?: string;
      connName?: string;
      db?: string;
      schema?: string;
    },
    title: string,
    sql: string
  ) => {
    if (!ctx.connId) return;
    const detail = {
      connectionId: ctx.connId!,
      connectionType: ctx.type,
      connectionName: ctx.connName,
      database: ctx.db,
      schema: ctx.schema,
      title,
      sql,
    };
    document.dispatchEvent(new CustomEvent("open-sql-script", { detail }));
  };

  // Helpers: fetch routine definition (SQL Server only for now)
  const fetchRoutineDefinition = async (ctx: {
    connId?: string;
    schema?: string;
    routine?: string;
    type?: string;
  }) => {
    if (!ctx.connId || !ctx.schema || !ctx.routine) return "-- Missing context";
    const ident = (n: string) =>
      ctx.type === "sqlserver" ? `[${n}]` : `"${n}"`;
    try {
      if (ctx.type === "sqlserver") {
        const qualified = `${ident(ctx.schema)}.${ident(ctx.routine)}`;
        const q = `SELECT OBJECT_DEFINITION(OBJECT_ID('${ctx.schema}.${ctx.routine}')) AS definition;`;
        const res = await window.electronAPI?.database?.executeQuery(
          ctx.connId,
          q
        );
        const def = res?.rows?.[0]?.definition as string | undefined;
        if (def && def.trim()) return def;
        return `-- No definition found for ${qualified}`;
      }
      return `-- Scripting not yet implemented for ${ctx.type}`;
    } catch (e: any) {
      return `-- Failed to fetch definition: ${e?.message || String(e)}`;
    }
  };

  // Helpers: basic CREATE TABLE script (SQL Server)
  const generateCreateTableScript = async (ctx: {
    connId?: string;
    schema?: string;
    table?: string;
    type?: string;
  }) => {
    if (!ctx.connId || !ctx.schema || !ctx.table) return "-- Missing context";
    const ident = (n: string) =>
      ctx.type === "sqlserver" ? `[${n}]` : `"${n}"`;
    try {
      if (ctx.type === "sqlserver") {
        const qi = `SELECT c.COLUMN_NAME AS name, c.DATA_TYPE AS dataType, c.CHARACTER_MAXIMUM_LENGTH AS maxLength, c.NUMERIC_PRECISION AS precision, c.NUMERIC_SCALE AS scale, c.IS_NULLABLE AS isNullable, c.COLUMN_DEFAULT AS columnDefault FROM INFORMATION_SCHEMA.COLUMNS c WHERE c.TABLE_SCHEMA = '${ctx.schema}' AND c.TABLE_NAME = '${ctx.table}' ORDER BY c.ORDINAL_POSITION;`;
        const res2 = await window.electronAPI?.database?.executeQuery(
          ctx.connId,
          qi
        );
        const rows = (res2?.rows as any[]) || [];
        const lines = rows.map(col => {
          const name = ident(col.name);
          const dt = String(col.dataType).toLowerCase();
          let typeSpec = dt;
          if (
            [
              "varchar",
              "nvarchar",
              "char",
              "nchar",
              "binary",
              "varbinary",
            ].includes(dt)
          ) {
            const len = col.maxLength;
            const lenStr =
              len === -1 || len === "max"
                ? "MAX"
                : len
                  ? String(len)
                  : undefined;
            if (lenStr) typeSpec = `${dt}(${lenStr})`;
          } else if (["decimal", "numeric"].includes(dt)) {
            const p = col.precision ?? 18;
            const s = col.scale ?? 0;
            typeSpec = `${dt}(${p},${s})`;
          }
          const nullable =
            String(col.isNullable).toUpperCase() === "YES"
              ? "NULL"
              : "NOT NULL";
          const def = col.columnDefault ? ` DEFAULT ${col.columnDefault}` : "";
          return `  ${name} ${typeSpec} ${nullable}${def}`.trimEnd();
        });
        const qualified = `${ident(ctx.schema)}.${ident(ctx.table)}`;
        const script = `CREATE TABLE ${qualified} (\n${lines.join(",\n")}\n);`;
        return script;
      }
      return `-- CREATE TABLE scripting not yet implemented for ${ctx.type}`;
    } catch (e: any) {
      return `-- Failed to generate CREATE script: ${e?.message || String(e)}`;
    }
  };

  const renderTreeNode = (
    node:
      | DatabaseNode
      | SchemaNode
      | TableNode
      | ViewNode
      | ProcedureNode
      | FunctionNode
      | GroupNode,
    connectionId: string,
    level: number = 0
  ) => {
    const nodeKey = `${connectionId}:${node.type}:${node.name}`;
    const connectionState = connectionStates.get(connectionId);
    const isExpanded = connectionState?.expandedNodes.has(nodeKey) || false;
    const hasChildren =
      "children" in node && node.children && node.children.length > 0;

    const getIcon = () => {
      switch (node.type as any) {
        case "database":
          return "🗄️";
        case "schema":
          return "📁";
        case "table":
          return "📋";
        case "view":
          return "👁️";
        case "procedure":
          return "⚙️";
        case "function":
          return "🔧";
        case "group":
          return "📂";
        default:
          return "📄";
      }
    };

    const getDisplayText = () => {
      if (
        node.type === "table" &&
        "rowCount" in node &&
        node.rowCount !== undefined
      ) {
        return `${node.name} (${node.rowCount} rows)`;
      }
      return node.name;
    };

    const handleDoubleClick = () => {
      if (node.type === "table") {
        const connState = connectionStates.get(connectionId);
        const conn = connState?.connection;
        const detail = {
          connectionId,
          connectionType: conn?.type,
          connectionName: conn?.name,
          database: conn?.database,
          schema: (node as TableNode).schema,
          table: node.name,
        };
        document.dispatchEvent(new CustomEvent("open-sql-tab", { detail }));
      }
    };

    const handleContextMenu = (e: React.MouseEvent) => {
      if (node.type === "table") {
        e.preventDefault();
        const connState = connectionStates.get(connectionId);
        const conn = connState?.connection;
        setContextMenu({
          x: e.clientX,
          y: e.clientY,
          visible: true,
          mode: "table",
          connId: connectionId,
          schema: (node as TableNode).schema,
          table: node.name,
          type: conn?.type,
          connName: conn?.name,
          db: conn?.database,
        });
      } else if (node.type === "schema") {
        e.preventDefault();
        const connState = connectionStates.get(connectionId);
        const conn = connState?.connection;
        setContextMenu({
          x: e.clientX,
          y: e.clientY,
          visible: true,
          mode: "schema",
          connId: connectionId,
          schema: node.name,
          type: conn?.type,
          connName: conn?.name,
          db: conn?.database,
        });
      } else if (node.type === "procedure" || node.type === "function") {
        e.preventDefault();
        const connState = connectionStates.get(connectionId);
        const conn = connState?.connection;
        setContextMenu({
          x: e.clientX,
          y: e.clientY,
          visible: true,
          mode: "routine",
          connId: connectionId,
          schema: (node as ProcedureNode | FunctionNode).schema,
          routine: node.name,
          routineKind: node.type,
          type: conn?.type,
          connName: conn?.name,
          db: conn?.database,
        });
      }
    };

    return (
      <div key={nodeKey}>
        <div
          className={`flex items-center px-2 py-1 text-sm hover:bg-accent cursor-pointer text-foreground`}
          style={{ paddingLeft: `${(level + 1) * 16 + 8}px` }}
          onClick={() =>
            hasChildren && toggleNodeExpansion(connectionId, nodeKey)
          }
          onDoubleClick={handleDoubleClick}
          onContextMenu={handleContextMenu}
        >
          {hasChildren && (
            <span className="mr-1 text-xs">{isExpanded ? "▼" : "▶"}</span>
          )}
          {!hasChildren && <span className="mr-3" />}
          <span className="mr-2">{getIcon()}</span>
          <span className="flex-1 truncate" title={getDisplayText()}>
            {getDisplayText()}
          </span>
        </div>
        {hasChildren && isExpanded && "children" in node && node.children && (
          <div>
            {(() => {
              // Grouping for schema level
              if (node.type === "schema") {
                const children = node.children as (
                  | TableNode
                  | ViewNode
                  | ProcedureNode
                  | FunctionNode
                )[];
                const tables = children.filter(
                  c => (c as any).type === "table"
                );
                const views = children.filter(c => (c as any).type === "view");
                const procs = children.filter(
                  c => (c as any).type === "procedure"
                );
                const funcs = children.filter(
                  c => (c as any).type === "function"
                );
                if (procs.length || funcs.length) {
                  const programmability: GroupNode = {
                    type: "group",
                    name: "Programmability",
                    children: [],
                  };
                  // Sub-groups
                  if (procs.length)
                    programmability.children!.push({
                      type: "group",
                      name: "Stored Procedures",
                      children: procs,
                    } as any);
                  else
                    programmability.children!.push({
                      type: "group",
                      name: "Stored Procedures",
                      children: [],
                    } as any);
                  if (funcs.length)
                    programmability.children!.push({
                      type: "group",
                      name: "Functions",
                      children: funcs,
                    } as any);
                  else
                    programmability.children!.push({
                      type: "group",
                      name: "Functions",
                      children: [],
                    } as any);
                  // Placeholders for Types and Sequences
                  programmability.children!.push({
                    type: "group",
                    name: "Types",
                    children: [],
                  } as any);
                  programmability.children!.push({
                    type: "group",
                    name: "Sequences",
                    children: [],
                  } as any);
                  // Render: tables, views, then programmability
                  return [
                    ...tables.map(child =>
                      renderTreeNode(child, connectionId, level + 1)
                    ),
                    ...views.map(child =>
                      renderTreeNode(child, connectionId, level + 1)
                    ),
                    renderTreeNode(
                      programmability as any,
                      connectionId,
                      level + 1
                    ),
                  ];
                }
                return children.map(child =>
                  renderTreeNode(child as any, connectionId, level + 1)
                );
              }
              // Render generic children
              return node.children.map(child =>
                renderTreeNode(child as any, connectionId, level + 1)
              );
            })()}
          </div>
        )}
      </div>
    );
  };

  const renderConnection = (connection: Connection) => {
    const connectionState = connectionStates.get(connection.id);
    if (!connectionState) return null;
    const { isConnected, isConnecting, error, schemaData } = connectionState;

    return (
      <div
        key={connection.id}
        className="border-b border-border last:border-b-0"
      >
        <div className="flex items-center justify-between px-3 py-2 text-sm">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <div
                className={`w-2 h-2 rounded-full ${isConnected ? "bg-green-500" : isConnecting ? "bg-yellow-500" : "bg-gray-400"}`}
              />
              <div
                className="font-medium truncate cursor-pointer"
                onDoubleClick={() => {
                  if (!isConnected && !isConnecting)
                    handleConnect(connection.id);
                }}
              >
                {connection.name}
              </div>
            </div>
            <div className="text-xs text-muted-foreground truncate">
              {connection.type} • {connection.database}
              {error && <span className="text-red-500 ml-2">• {error}</span>}
            </div>
          </div>
          <div className="flex items-center gap-1">
            {isConnected ? (
              <button
                onClick={() => handleDisconnect(connection.id)}
                className="p-1.5 rounded hover:bg-accent text-red-600"
                title="Disconnect"
                aria-label="Disconnect"
              >
                <LogOut size={16} />
              </button>
            ) : (
              <button
                onClick={() => handleConnect(connection.id)}
                disabled={isConnecting}
                className="p-1.5 rounded hover:bg-accent text-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
                title="Connect"
                aria-label="Connect"
              >
                <Plug size={16} />
              </button>
            )}
            <button
              onClick={() => handleEditConnection(connection)}
              className="p-1.5 rounded hover:bg-accent text-blue-600"
              title="Edit connection"
              aria-label="Edit connection"
            >
              <Pencil size={16} />
            </button>
            <button
              onClick={() => handleDeleteConnection(connection.id)}
              className="p-1.5 rounded hover:bg-accent text-gray-600"
              title="Delete connection"
              aria-label="Delete connection"
            >
              <Trash2 size={16} />
            </button>
          </div>
        </div>

        {isConnected && schemaData && (
          <div className="bg-muted">
            {schemaData.databases.map(database =>
              renderTreeNode(database, connection.id)
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col bg-background text-foreground min-h-0">
      {/* Context Menu */}
      {contextMenu.visible && (
        <div
          className="fixed z-50 border border-border rounded shadow-md text-sm isolate mix-blend-normal overflow-hidden bg-[hsl(var(--modal))] text-[hsl(var(--modal-foreground))]"
          style={{ top: contextMenu.y, left: contextMenu.x }}
          onMouseLeave={() => setContextMenu(c => ({ ...c, visible: false }))}
        >
          {contextMenu.mode === "table" && (
            <>
              <button
                className="block w-full text-left px-3 py-1 hover:bg-accent"
                onClick={() => {
                  if (
                    !contextMenu.connId ||
                    !contextMenu.schema ||
                    !contextMenu.table
                  )
                    return;
                  const detail = {
                    connectionId: contextMenu.connId,
                    connectionType: contextMenu.type,
                    connectionName: contextMenu.connName,
                    database: contextMenu.db,
                    schema: contextMenu.schema,
                    table: contextMenu.table,
                  };
                  document.dispatchEvent(
                    new CustomEvent("open-sql-tab", { detail })
                  );
                  setContextMenu(c => ({ ...c, visible: false }));
                }}
              >
                Open first 100 rows
              </button>
              <button
                className="block w-full text-left px-3 py-1 hover:bg-accent"
                onClick={() => {
                  if (
                    !contextMenu.connId ||
                    !contextMenu.schema ||
                    !contextMenu.table
                  )
                    return;
                  const ident = (n: string) =>
                    contextMenu.type === "sqlserver" ? `[${n}]` : `"${n}"`;
                  const qualified = `${ident(contextMenu.schema)}.${ident(contextMenu.table)}`;
                  const sql =
                    contextMenu.type === "sqlserver"
                      ? `SELECT COUNT(1) AS cnt FROM ${qualified};`
                      : `SELECT COUNT(1) AS cnt FROM ${qualified};`;
                  const detail = {
                    connectionId: contextMenu.connId,
                    connectionType: contextMenu.type,
                    connectionName: contextMenu.connName,
                    database: contextMenu.db,
                    schema: contextMenu.schema,
                    table: contextMenu.table,
                    customSql: sql,
                  };
                  document.dispatchEvent(
                    new CustomEvent("open-sql-tab", { detail })
                  );
                  setContextMenu(c => ({ ...c, visible: false }));
                }}
              >
                Open COUNT(*)
              </button>
              <div className="h-px bg-border mx-1" />
              <button
                className="block w-full text-left px-3 py-1 hover:bg-accent"
                onClick={async () => {
                  if (
                    !contextMenu.connId ||
                    !contextMenu.schema ||
                    !contextMenu.table
                  )
                    return;
                  const title = `Script CREATE ${contextMenu.schema}.${contextMenu.table}`;
                  const sql = await generateCreateTableScript(contextMenu);
                  openScriptTab(contextMenu, title, sql);
                  setContextMenu(c => ({ ...c, visible: false }));
                }}
              >
                Script CREATE
              </button>
              <button
                className="block w-full text-left px-3 py-1 hover:bg-accent"
                onClick={() => {
                  if (
                    !contextMenu.connId ||
                    !contextMenu.schema ||
                    !contextMenu.table
                  )
                    return;
                  const ident = (n: string) =>
                    contextMenu.type === "sqlserver" ? `[${n}]` : `"${n}"`;
                  const qualified = `${ident(contextMenu.schema)}.${ident(contextMenu.table)}`;
                  const drop =
                    contextMenu.type === "sqlserver"
                      ? `DROP TABLE ${qualified};`
                      : `DROP TABLE ${qualified};`;
                  const title = `Script DROP ${contextMenu.schema}.${contextMenu.table}`;
                  openScriptTab(contextMenu, title, drop);
                  setContextMenu(c => ({ ...c, visible: false }));
                }}
              >
                Script DROP
              </button>
            </>
          )}
          {contextMenu.mode === "schema" && (
            <>
              <button
                className="block w-full text-left px-3 py-1 hover:bg-accent"
                onClick={() => {
                  if (!contextMenu.connId || !contextMenu.schema) return;
                  const detail = {
                    connectionId: contextMenu.connId,
                    connectionType: contextMenu.type,
                    connectionName: contextMenu.connName,
                    database: contextMenu.db,
                    schema: contextMenu.schema,
                  };
                  document.dispatchEvent(
                    new CustomEvent("open-empty-sql-tab", { detail })
                  );
                  setContextMenu(c => ({ ...c, visible: false }));
                }}
              >
                New Query
              </button>
            </>
          )}
          {contextMenu.mode === "routine" && (
            <>
              <button
                className="block w-full text-left px-3 py-1 hover:bg-accent"
                onClick={async () => {
                  if (
                    !contextMenu.connId ||
                    !contextMenu.schema ||
                    !contextMenu.routine
                  )
                    return;
                  const def = await fetchRoutineDefinition(contextMenu);
                  const title = `Edit ${contextMenu.schema}.${contextMenu.routine}`;
                  openScriptTab(contextMenu, title, def);
                  setContextMenu(c => ({ ...c, visible: false }));
                }}
              >
                Edit
              </button>
              <button
                className="block w-full text-left px-3 py-1 hover:bg-accent"
                onClick={async () => {
                  if (
                    !contextMenu.connId ||
                    !contextMenu.schema ||
                    !contextMenu.routine
                  )
                    return;
                  const def = await fetchRoutineDefinition(contextMenu);
                  const title = `Script CREATE ${contextMenu.schema}.${contextMenu.routine}`;
                  openScriptTab(contextMenu, title, def);
                  setContextMenu(c => ({ ...c, visible: false }));
                }}
              >
                Script as Create
              </button>
              <button
                className="block w-full text-left px-3 py-1 hover:bg-accent"
                onClick={() => {
                  if (
                    !contextMenu.connId ||
                    !contextMenu.schema ||
                    !contextMenu.routine
                  )
                    return;
                  const ident = (n: string) =>
                    contextMenu.type === "sqlserver" ? `[${n}]` : `"${n}"`;
                  const qualified = `${ident(contextMenu.schema)}.${ident(contextMenu.routine)}`;
                  const drop =
                    contextMenu.routineKind === "function"
                      ? `DROP FUNCTION ${qualified};`
                      : `DROP PROCEDURE ${qualified};`;
                  const title = `Script as Delete ${contextMenu.schema}.${contextMenu.routine}`;
                  openScriptTab(contextMenu, title, drop);
                  setContextMenu(c => ({ ...c, visible: false }));
                }}
              >
                Script as Delete
              </button>
            </>
          )}
          <button
            className="block w-full text-left px-3 py-1 hover:bg-accent"
            onClick={() => setContextMenu(c => ({ ...c, visible: false }))}
          >
            Cancel
          </button>
        </div>
      )}
      <div className="flex-1 p-3 overflow-y-auto">
        <div className="space-y-2">
          {!isElectronEnv ? (
            <div className="text-center py-8">
              <div className="text-sm text-muted-foreground mb-2">
                Browser Mode
              </div>
              <div className="text-xs text-muted-foreground">
                Open this app in Electron to access database connections
              </div>
            </div>
          ) : !apiReady ? (
            <div className="text-xs text-muted-foreground mb-2">
              Initializing connection API...
            </div>
          ) : isLoading ? (
            <div className="text-xs text-muted-foreground mb-2">
              Loading connections...
            </div>
          ) : connections.length === 0 ? (
            <div className="text-xs text-muted-foreground mb-2">
              No connections configured
            </div>
          ) : (
            <div className="border border-border rounded">
              {connections.map(renderConnection)}
            </div>
          )}
          {/* Add button moved to header */}

          {/* Debug button - remove in production */}
          {isElectronEnv && !apiReady && (
            <button
              onClick={() => {
                console.log("Force enabling API for debugging");
                setApiReady(true);
              }}
              className="w-full text-left px-3 py-2 text-xs text-red-600 dark:text-red-400 hover:bg-accent rounded"
            >
              🐛 Debug: Force Enable API
            </button>
          )}
        </div>
      </div>

      <ConnectionDialog
        isOpen={isDialogOpen}
        onClose={() => {
          setIsDialogOpen(false);
          setEditConnection(null);
        }}
        onSave={handleSaveConnection}
        editConnection={editConnection}
      />
    </div>
  );
}
