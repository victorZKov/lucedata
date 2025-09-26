import { useState, useEffect, useRef } from "react";
import {
  Plug,
  LogOut,
  Pencil,
  Trash2,
  RefreshCw,
  Plus,
  FileText,
  Database,
  FolderTree,
  Table,
  Eye,
  PlayCircle,
  Sigma,
  Folder,
} from "lucide-react";

import ConnectionDialog from "./ConnectionDialog";
import CreateDatabaseDialog from "./CreateDatabaseDialog";

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
  children?: (SchemaNode | GroupNode)[];
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
  children?: GroupNode[];
  metadataLoaded?: {
    columns?: boolean;
    keys?: boolean;
    constraints?: boolean;
    triggers?: boolean;
    indexes?: boolean;
  };
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
  children?: (
    | TableNode
    | ViewNode
    | ProcedureNode
    | FunctionNode
    | ColumnNode
    | KeyNode
    | ConstraintNode
    | TriggerNode
    | IndexNode
  )[];
}

interface ColumnNode {
  name: string;
  type: "column";
  dataType: string;
  nullable: boolean;
  isPrimaryKey: boolean;
  isForeignKey: boolean;
}

interface KeyNode {
  name: string;
  type: "key";
  keyType: "PRIMARY" | "FOREIGN" | "UNIQUE";
  columns: string[];
}

interface ConstraintNode {
  name: string;
  type: "constraint";
  constraintType: "CHECK" | "DEFAULT" | "UNIQUE" | "EXCLUDE" | "OTHER";
  definition?: string;
}

interface TriggerNode {
  name: string;
  type: "trigger";
  timing: "BEFORE" | "AFTER" | "INSTEAD OF" | "UNKNOWN";
  events: string[];
  enabled?: boolean;
}

interface IndexNode {
  name: string;
  type: "index";
  unique: boolean;
  isPrimary?: boolean;
  columns: string[];
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
  const [isCreateDbDialogOpen, setIsCreateDbDialogOpen] = useState(false);
  const [createDbConnection, setCreateDbConnection] = useState<{
    id: string;
    type: string;
    name: string;
  } | null>(null);
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    visible: boolean;
    mode?:
      | "table"
      | "schema"
      | "routine"
      | "connection"
      | "group"
      | "column"
      | "key"
      | "constraint"
      | "trigger"
      | "index";
    connId?: string;
    schema?: string;
    table?: string;
    routine?: string;
    routineKind?: "view" | "procedure" | "function";
    type?: string;
    connName?: string;
    db?: string;
    groupType?: string;
    itemName?: string;
    itemData?: Record<string, unknown>;
    nodeKey?: string;
  }>({ x: 0, y: 0, visible: false });

  const [submenu, setSubmenu] = useState<{
    visible: boolean;
    type?: string;
    x?: number;
    y?: number;
  }>({ visible: false });

  // State to track the active (clicked) node
  const [activeNodeKey, setActiveNodeKey] = useState<string | null>(null);

  const submenuTimeoutRef = useRef<NodeJS.Timeout | null>(null); // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (submenuTimeoutRef.current) {
        clearTimeout(submenuTimeoutRef.current);
      }
    };
  }, []);

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

  // Helper function to group built-in schemas for SQL Server
  const processSchemaDataForSqlServer = (
    schemaData: DatabaseSchema,
    connectionType: string
  ): DatabaseSchema => {
    if (connectionType !== "sqlserver") return schemaData;

    // dbo is kept separate as it's the most important, other schemas are grouped
    const builtInSchemas = [
      "guest",
      "INFORMATION_SCHEMA",
      "sys",
      "db_owner",
      "db_accessadmin",
      "db_securityadmin",
      "db_ddladmin",
      "db_backupoperator",
      "db_datareader",
      "db_datawriter",
      "db_denydatareader",
      "db_denydatawriter",
    ];

    return {
      ...schemaData,
      databases: schemaData.databases.map(database => {
        if (!database.children) return database;

        let dboSchema: SchemaNode | null = null;
        const userSchemas: (SchemaNode | GroupNode)[] = [];
        const builtInSchemaNodes: SchemaNode[] = [];

        database.children.forEach(child => {
          if (child.type === "schema") {
            if (child.name === "dbo") {
              dboSchema = child;
            } else if (builtInSchemas.includes(child.name)) {
              builtInSchemaNodes.push(child);
            } else {
              userSchemas.push(child);
            }
          } else {
            userSchemas.push(child);
          }
        });

        // Order: dbo first, then user schemas, then built-in schemas group
        const newChildren: (SchemaNode | GroupNode)[] = [];

        if (dboSchema) {
          newChildren.push(dboSchema);
        }

        newChildren.push(...userSchemas);

        if (builtInSchemaNodes.length > 0) {
          newChildren.push({
            name: "Built-in schemas",
            type: "group",
            children: builtInSchemaNodes as any,
          });
        }

        return {
          ...database,
          children: newChildren,
        };
      }),
    };
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
      const rawSchemaData =
        await window.electronAPI.database.getSchema(connectionId);
      const schemaData = processSchemaDataForSqlServer(
        rawSchemaData,
        connectionState.connection.type
      );

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
      } catch {
        // Ignore localStorage errors
      }

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

  const toggleNodeExpansion = async (
    connectionId: string,
    nodeKey: string,
    node: any
  ) => {
    const connectionState = connectionStates.get(connectionId);
    if (!connectionState) return;

    const isExpanded = connectionState.expandedNodes.has(nodeKey);

    // If we're expanding a table node and it doesn't have metadata branches yet, create them
    if (
      !isExpanded &&
      node.type === "table" &&
      (!node.children || node.children.length === 0)
    ) {
      const metadataBranches = createTableMetadataBranches(node, connectionId);
      node.children = metadataBranches;
    }

    // If we're expanding a metadata group node and it's empty, load the data
    if (
      !isExpanded &&
      node.type === "group" &&
      node.children &&
      node.children.length === 0
    ) {
      // The group node should be a child of a table, we need to find its parent table
      const groupName = node.name;
      console.log(`Expanding group ${groupName} for nodeKey ${nodeKey}`);

      // Find the parent table node by searching the schema data
      const tableNode = findParentTableForGroup(
        connectionState.schemaData,
        groupName,
        nodeKey
      );
      console.log(`Found parent table:`, tableNode);

      if (tableNode) {
        console.log(
          `Loading metadata for ${groupName} on table ${tableNode.name}`
        );
        await loadTableMetadata(tableNode, groupName, connectionId);
      } else {
        console.log(`No parent table found for group ${groupName}`);
      }
    }

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

  // Helper function to find parent table for a metadata group
  const findParentTableForGroup = (
    schemaData: any,
    _groupName: string,
    nodeKey: string
  ): TableNode | null => {
    if (!schemaData?.databases) return null;

    // Extract table information from nodeKey
    // Format: ${connectionId}:table:${schema}:${tableName}:group:${groupName}
    const parts = nodeKey.split(":");
    if (parts.length >= 5 && parts[1] === "table" && parts[4] === "group") {
      const targetSchema = parts[2];
      const targetTable = parts[3];

      console.log(`Looking for table ${targetTable} in schema ${targetSchema}`);

      // Search for the specific table by schema and name
      for (const database of schemaData.databases) {
        if (database.children) {
          for (const schemaOrGroup of database.children) {
            // Handle both direct schemas and "Built-in schemas" groups
            const schemasToSearch = [];

            if (schemaOrGroup.type === "schema") {
              schemasToSearch.push(schemaOrGroup);
            } else if (
              schemaOrGroup.type === "group" &&
              schemaOrGroup.name === "Built-in schemas" &&
              schemaOrGroup.children
            ) {
              // Search inside the built-in schemas group
              schemasToSearch.push(
                ...schemaOrGroup.children.filter(
                  (child: any) => child.type === "schema"
                )
              );
            }

            for (const schema of schemasToSearch) {
              if (schema.name === targetSchema && schema.children) {
                for (const item of schema.children) {
                  if (item.type === "table" && item.name === targetTable) {
                    console.log(
                      `Found target table: ${targetTable} in schema ${targetSchema}`
                    );
                    return item as TableNode;
                  }
                }
              }
            }
          }
        }
      }
    }

    console.warn(`Could not find table from nodeKey: ${nodeKey}`);
    return null;
  };

  // Helper function to update table metadata in schema data
  const updateTableMetadataInSchemaData = (
    schemaData: any,
    tableName: string,
    schemaName: string,
    branchType: string,
    childNodes: any[]
  ) => {
    if (!schemaData?.databases) return schemaData;

    const updatedData = JSON.parse(JSON.stringify(schemaData)); // Deep clone

    for (const database of updatedData.databases) {
      if (database.children) {
        for (const schemaOrGroup of database.children) {
          // Handle both direct schemas and "Built-in schemas" groups
          const schemasToUpdate = [];

          if (schemaOrGroup.type === "schema") {
            schemasToUpdate.push(schemaOrGroup);
          } else if (
            schemaOrGroup.type === "group" &&
            schemaOrGroup.name === "Built-in schemas" &&
            schemaOrGroup.children
          ) {
            // Search inside the built-in schemas group
            schemasToUpdate.push(
              ...schemaOrGroup.children.filter(
                (child: any) => child.type === "schema"
              )
            );
          }

          for (const schema of schemasToUpdate) {
            if (schema.children && schema.name === schemaName) {
              for (const item of schema.children) {
                if (item.type === "table" && item.name === tableName) {
                  // Find the metadata branch in the table's children
                  if (item.children) {
                    for (const branch of item.children) {
                      if (
                        branch.type === "group" &&
                        branch.name === branchType
                      ) {
                        branch.children = childNodes;
                        return updatedData;
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
    return updatedData;
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

  const handleCreateDatabase = async (databaseData: {
    name: string;
    collation?: string;
    owner?: string;
    template?: string;
    encoding?: string;
  }) => {
    if (!createDbConnection) return;

    try {
      if (!window.electronAPI || !window.electronAPI.database) {
        throw new Error("ElectronAPI database methods not available");
      }

      await window.electronAPI.database.createDatabase(
        createDbConnection.id,
        databaseData
      );

      // Refresh the schema to show the new database
      const rawSchemaData = await window.electronAPI.database.getSchema(
        createDbConnection.id
      );
      const connectionState = connectionStates.get(createDbConnection.id);
      if (connectionState) {
        const schemaData = processSchemaDataForSqlServer(
          rawSchemaData,
          connectionState.connection.type
        );

        setConnectionStates(prev => {
          const newStates = new Map(prev);
          const state = newStates.get(createDbConnection.id);
          if (state) {
            newStates.set(createDbConnection.id, {
              ...state,
              schemaData,
            });
          }
          return newStates;
        });
      }

      console.log(`Database '${databaseData.name}' created successfully`);
    } catch (error) {
      console.error("Failed to create database:", error);
      throw error; // Let the dialog handle the error display
    }
  };

  // Refresh function for different node types
  const refreshNode = async (
    connectionId: string,
    nodeType: string,
    nodeKey: string,
    nodeData?: any
  ) => {
    const connectionState = connectionStates.get(connectionId);
    if (!connectionState || !connectionState.isConnected) {
      console.error("Connection not available for refresh");
      return;
    }

    try {
      console.log(`Refreshing ${nodeType} node: ${nodeKey}`);

      switch (nodeType) {
        case "connection": {
          // Refresh the entire schema for the connection
          const rawSchemaData =
            await window.electronAPI.database.getSchema(connectionId);
          const schemaData = processSchemaDataForSqlServer(
            rawSchemaData,
            connectionState.connection.type
          );

          setConnectionStates(prev => {
            const newStates = new Map(prev);
            const state = newStates.get(connectionId);
            if (state) {
              newStates.set(connectionId, {
                ...state,
                schemaData,
                // Keep existing expanded nodes to maintain user's view state
                expandedNodes: state.expandedNodes,
              });
            }
            return newStates;
          });
          break;
        }

        case "database":
        case "schema": {
          // For database and schema nodes, refresh the entire schema
          // The schema loading will include all databases and their contents
          const rawSchemaData =
            await window.electronAPI.database.getSchema(connectionId);
          const schemaData = processSchemaDataForSqlServer(
            rawSchemaData,
            connectionState.connection.type
          );

          setConnectionStates(prev => {
            const newStates = new Map(prev);
            const state = newStates.get(connectionId);
            if (state) {
              newStates.set(connectionId, {
                ...state,
                schemaData,
                expandedNodes: state.expandedNodes,
              });
            }
            return newStates;
          });
          break;
        }

        case "table": {
          // For table nodes, refresh metadata for all loaded groups
          if (nodeData && nodeData.children) {
            for (const group of nodeData.children) {
              if (
                group.type === "group" &&
                group.children &&
                group.children.length > 0
              ) {
                // If the group has been loaded, reload its metadata
                await loadTableMetadata(nodeData, group.name, connectionId);
              }
            }
          }
          break;
        }

        case "group": {
          // For group nodes, reload the specific metadata
          const parts = nodeKey.split(":");
          if (
            parts.length >= 5 &&
            parts[1] === "table" &&
            parts[4] === "group"
          ) {
            const schema = parts[2];
            const tableName = parts[3];
            const groupName = parts[5];

            // Create a minimal table node for the metadata loading
            const tableNode: TableNode = {
              name: tableName,
              type: "table",
              schema: schema,
            };

            await loadTableMetadata(tableNode, groupName, connectionId);
          }
          break;
        }

        default:
          console.log(`Refresh not implemented for node type: ${nodeType}`);
      }

      console.log(`Successfully refreshed ${nodeType} node`);
    } catch (error) {
      console.error(`Failed to refresh ${nodeType} node:`, error);
    }
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
    routineType?: "view" | "procedure" | "function" | "trigger";
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
        let def = res?.rows?.[0]?.definition as string | undefined;

        if (def && def.trim()) {
          // Convert CREATE to ALTER for editing
          if (ctx.routineType === "procedure") {
            // More robust regex to handle various whitespace and newlines
            def = def.replace(
              /^(\s*)CREATE(\s+)PROCEDURE/im,
              "$1ALTER$2PROCEDURE"
            );
          } else if (ctx.routineType === "function") {
            def = def.replace(
              /^(\s*)CREATE(\s+)FUNCTION/im,
              "$1ALTER$2FUNCTION"
            );
          } else if (ctx.routineType === "trigger") {
            // For triggers, we might want to show a DROP and CREATE pattern
            // since ALTER TRIGGER has limited functionality
            def = `-- To modify this trigger, drop and recreate it\n${def.replace(/^(\s*)CREATE(\s+)TRIGGER/im, `$1DROP TRIGGER ${qualified};\nGO\n\n$1CREATE$2TRIGGER`)}`;
          } else if (ctx.routineType === "view") {
            // Convert CREATE to ALTER for views
            def = def.replace(
              /^(\s*)CREATE(\s+)VIEW/im,
              "$1ALTER$2VIEW"
            );
          }
          return def;
        }
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

  // Helper function to create metadata branches for tables
  const createTableMetadataBranches = (
    _table: TableNode,
    _connectionId: string
  ): GroupNode[] => {
    return [
      {
        name: "Columns",
        type: "group",
        children: [],
      },
      {
        name: "Keys",
        type: "group",
        children: [],
      },
      {
        name: "Constraints",
        type: "group",
        children: [],
      },
      {
        name: "Triggers",
        type: "group",
        children: [],
      },
      {
        name: "Indexes",
        type: "group",
        children: [],
      },
    ];
  }; // Helper function to load metadata for a table branch
  const loadTableMetadata = async (
    table: TableNode,
    branchType: string,
    connectionId: string
  ) => {
    const connState = connectionStates.get(connectionId);
    if (!connState || !connState.isConnected) return;

    try {
      if (!window.electronAPI?.database) {
        console.error("ElectronAPI or database methods not available");
        return;
      }

      // Check if the specific method exists
      const methodMap = {
        Columns: "getColumns",
        Keys: "getKeys",
        Constraints: "getConstraints",
        Triggers: "getTriggers",
        Indexes: "getIndexes",
      };

      const methodName = methodMap[branchType as keyof typeof methodMap];
      if (!methodName || !(window.electronAPI.database as any)[methodName]) {
        console.error(`Method ${methodName} not available for ${branchType}`);
        console.log(
          "Available database methods:",
          Object.keys(window.electronAPI.database)
        );
        return;
      }

      let metadataItems: any[] = [];

      switch (branchType) {
        case "Columns":
          metadataItems =
            (await window.electronAPI.database.getColumns?.(
              connectionId,
              table.name,
              table.schema
            )) || [];
          break;
        case "Keys":
          metadataItems =
            (await window.electronAPI.database.getKeys?.(
              connectionId,
              table.name,
              table.schema
            )) || [];
          break;
        case "Constraints":
          metadataItems =
            (await window.electronAPI.database.getConstraints?.(
              connectionId,
              table.name,
              table.schema
            )) || [];
          break;
        case "Triggers":
          metadataItems =
            (await window.electronAPI.database.getTriggers?.(
              connectionId,
              table.name,
              table.schema
            )) || [];
          break;
        case "Indexes":
          metadataItems =
            (await window.electronAPI.database.getIndexes?.(
              connectionId,
              table.name,
              table.schema
            )) || [];
          break;
      }

      // Convert metadata items to appropriate node types
      const childNodes = metadataItems
        .map(item => {
          switch (branchType) {
            case "Columns":
              return {
                name: item.name,
                type: "column" as const,
                dataType: item.dataType,
                nullable: item.nullable,
                isPrimaryKey: item.isPrimaryKey,
                isForeignKey: item.isForeignKey,
              };
            case "Keys":
              return {
                name: item.name,
                type: "key" as const,
                keyType: item.type,
                columns: item.columns,
              };
            case "Constraints":
              return {
                name: item.name,
                type: "constraint" as const,
                constraintType: item.type,
                definition: item.definition,
              };
            case "Triggers":
              return {
                name: item.name,
                type: "trigger" as const,
                timing: item.timing,
                events: item.events,
                enabled: item.enabled,
              };
            case "Indexes":
              return {
                name: item.name,
                type: "index" as const,
                unique: item.unique,
                isPrimary: item.isPrimary,
                columns: item.columns,
              };
            default:
              return null;
          }
        })
        .filter(Boolean);

      // Update the connection state to include the loaded metadata
      setConnectionStates(prev => {
        const newStates = new Map(prev);
        const state = newStates.get(connectionId);
        if (state?.schemaData) {
          // Find and update the table node in the schema data
          const updatedSchemaData = updateTableMetadataInSchemaData(
            state.schemaData,
            table.name,
            table.schema,
            branchType,
            childNodes
          );
          newStates.set(connectionId, {
            ...state,
            schemaData: updatedSchemaData,
          });
          console.log(
            `Loaded ${metadataItems.length} ${branchType} for ${table.schema}.${table.name}`
          );
        }
        return newStates;
      });
    } catch (error) {
      console.error(
        `Failed to load ${branchType} for ${table.schema}.${table.name}:`,
        error
      );
    }
  };

  // Handle "New" action for nodes
  const handleNewAction = (
    node: any,
    connectionId: string,
    nodeKey: string
  ) => {
    const conn = connections.find(c => c.id === connectionId);

    if (node.type === "database") {
      // Handle "New Query" for database nodes
      const detail = {
        mode: "query" as const,
        connId: connectionId,
        type: conn?.type,
        connName: conn?.name,
        db: conn?.database,
      };

      // Dispatch the same event as the context menu "New Query" option
      window.dispatchEvent(new CustomEvent("open-empty-sql-tab", { detail }));
    } else if (node.type === "schema") {
      // Handle schema nodes - default to "New Table" (since + button should be for primary action)
      const sql = generateTableDDL(
        conn?.type || "sqlserver",
        "create",
        node.name || "dbo"
      );

      const title = `${getDatabaseName(conn?.database, nodeKey)}.new_table`;

      openDDLTab(
        sql,
        title,
        connectionId,
        conn?.type || "",
        conn?.name || "",
        conn?.database || ""
      );
    } else if (node.type === "group") {
      // Handle "New {GroupType}" for group nodes
      const parentTable = findParentTable(nodeKey);
      const parentSchema = findParentSchema(nodeKey);
      const groupType = node.name;

      // Schema-level groups (under Programmability)
      const schemaLevelGroups = ["Stored Procedures", "Functions", "Types", "Sequences"];
      const isSchemaLevel = schemaLevelGroups.includes(groupType);

      if (isSchemaLevel && parentSchema) {
        // Handle schema-level groups
        let sql = "";
        let title = "";

        switch (groupType) {
          case "Stored Procedures":
            sql = generateStoredProcedureDDL(
              conn?.type || "sqlserver",
              "create",
              parentSchema
            );
            title = `${getDatabaseName(conn?.database, nodeKey)}.new_stored_procedure`;
            break;
          case "Functions":
            sql = generateFunctionDDL(
              conn?.type || "sqlserver",
              "create",
              parentSchema
            );
            title = `${getDatabaseName(conn?.database, nodeKey)}.new_function`;
            break;
          case "Types":
            sql = generateTypeDDL(
              conn?.type || "sqlserver",
              "create",
              parentSchema
            );
            title = `${getDatabaseName(conn?.database, nodeKey)}.new_type`;
            break;
          case "Sequences":
            sql = generateSequenceDDL(
              conn?.type || "sqlserver",
              "create",
              parentSchema
            );
            title = `${getDatabaseName(conn?.database, nodeKey)}.new_sequence`;
            break;
        }

        if (sql) {
          openDDLTab(
            sql,
            title,
            connectionId,
            conn?.type || "",
            conn?.name || "",
            conn?.database || ""
          );
        }
      } else if (parentTable && parentSchema) {
        // Handle table-level groups
        let sql = "";
        let title = "";

        switch (groupType) {
          case "Columns":
            sql = generateColumnDDL(
              conn?.type || "sqlserver",
              "create",
              parentTable,
              parentSchema
            );
            title = `${getDatabaseName(conn?.database, nodeKey)}.new_column`;
            break;
          case "Keys":
            sql = generateKeyDDL(
              conn?.type || "sqlserver",
              "create",
              parentTable,
              parentSchema
            );
            title = `${getDatabaseName(conn?.database, nodeKey)}.new_key`;
            break;
          case "Constraints":
            sql = generateConstraintDDL(
              conn?.type || "sqlserver",
              "create",
              parentTable,
              parentSchema
            );
            title = `${getDatabaseName(conn?.database, nodeKey)}.new_constraint`;
            break;
          case "Triggers":
            sql = generateTriggerDDL(
              conn?.type || "sqlserver",
              "create",
              parentTable,
              parentSchema
            );
            title = `${getDatabaseName(conn?.database, nodeKey)}.new_trigger`;
            break;
          case "Indexes":
            sql = generateIndexDDL(
              conn?.type || "sqlserver",
              "create",
              parentTable,
              parentSchema
            );
            title = `${getDatabaseName(conn?.database, nodeKey)}.new_index`;
            break;
        }

        if (sql) {
          openDDLTab(
            sql,
            title,
            connectionId,
            conn?.type || "",
            conn?.name || "",
            conn?.database || ""
          );
        }
      }
    }
  };

  // Helper function to determine if a node can be refreshed
  const canNodeBeRefreshed = (node: any): boolean => {
    // Connection nodes always have refresh
    if (node.type === "database") return true;

    // Schema nodes have refresh
    if (node.type === "schema") return true;

    // Table nodes have refresh
    if (node.type === "table") return true;

    // Group nodes (columns, keys, etc.) have refresh
    if (node.type === "group") return true;

    return false;
  };

  // Helper function to determine if a node has "New" options
  const canNodeHaveNewOptions = (node: any): boolean => {
    // Database nodes have "New Query" option
    if (node.type === "database") return true;

    // Schema nodes (especially dbo) have "New Table", "New View" and "New Query" options
    if (node.type === "schema") return true;

    // Group nodes have "New {GroupType}" options, but exclude "Programmability" node
    if (node.type === "group") {
      // Exclude the Programmability parent node
      if (node.name === "Programmability") return false;
      
      // Allow specific sub-groups under programmability and table groups
      const allowedGroups = [
        "Columns", "Keys", "Constraints", "Triggers", "Indexes", // Table groups
        "Stored Procedures", "Functions", "Types", "Sequences"    // Schema groups
      ];
      return allowedGroups.includes(node.name);
    }

    return false;
  };

  // Helper function to determine if a node needs a "New Query" button
  const canNodeHaveNewQueryOptions = (node: any): boolean => {
    // Database nodes and Schema nodes have "New Query" option
    if (node.type === "database" || node.type === "schema") return true;

    return false;
  };

  // Helper function to determine if a node can be edited
  const canNodeBeEdited = (node: any): boolean => {
    // Tables have "Edit data" functionality
    if (node.type === "table") return true;

    // Individual schema objects have "Modify" functionality
    if (node.type === "column" || 
        node.type === "key" || 
        node.type === "constraint" || 
        node.type === "trigger" || 
        node.type === "index") {
      return true;
    }

    // Views, procedures, and functions have "Edit" functionality
    if (node.type === "view" || 
        node.type === "procedure" || 
        node.type === "function") {
      return true;
    }

    return false;
  };

  // Handle edit action for editable nodes
  const handleEditAction = (node: any, connectionId: string, nodeKey: string) => {
    const conn = connections.find(c => c.id === connectionId);
    if (!conn) return;

    // For tables, open edit data tab
    if (node.type === "table") {
      const detail = {
        connectionId: connectionId,
        connectionType: conn.type,
        connectionName: conn.name,
        database: getDatabaseNameForConnection(connectionId),
        schema: (node as TableNode).schema,
        table: node.name,
      };
      document.dispatchEvent(
        new CustomEvent("open-edit-data-tab", { detail })
      );
      return;
    }

    // For schema objects (columns, keys, constraints, triggers, indexes), open modify DDL
    if (node.type === "column" || 
        node.type === "key" || 
        node.type === "constraint" || 
        node.type === "trigger" || 
        node.type === "index") {
      
      // Extract parent table and schema information 
      // First try the nodeKey format, then search through schema data
      let parentTable = findParentTable(nodeKey);
      let parentSchema = findParentSchema(nodeKey);
      const database = getDatabaseNameForConnection(connectionId);
      
      // If nodeKey doesn't have the full hierarchy, search through expanded schema data
      if (!parentTable || !parentSchema) {
        const result = findParentTableFromSchemaData(connectionId, node.name, node.type);
        if (result) {
          parentTable = result.table;
          parentSchema = result.schema;
        }
      }
      
      if (!parentTable || !parentSchema) {
        console.error("Could not find parent table or schema for node:", nodeKey);
        return;
      }
      
      let sql = "";
      let title = "";
      
      switch (node.type) {
        case "column":
          sql = generateColumnDDL(
            conn.type || "sqlserver",
            "update",
            parentTable,
            parentSchema,
            node
          );
          title = `${database}.modify_column`;
          break;
        case "key":
          sql = generateKeyDDL(
            conn.type || "sqlserver", 
            "update",
            parentTable,
            parentSchema,
            node
          );
          title = `${database}.modify_key`;
          break;
        case "constraint":
          sql = generateConstraintDDL(
            conn.type || "sqlserver",
            "update", 
            parentTable,
            parentSchema,
            node
          );
          title = `${database}.modify_constraint`;
          break;
        case "trigger":
          sql = generateTriggerDDL(
            conn.type || "sqlserver",
            "update",
            parentTable,
            parentSchema,
            node
          );
          title = `${database}.modify_trigger`;
          break;
        case "index":
          sql = generateIndexDDL(
            conn.type || "sqlserver",
            "update",
            parentTable,
            parentSchema, 
            node
          );
          title = `${database}.modify_index`;
          break;
      }

      if (sql) {
        openDDLTab(
          sql,
          title,
          connectionId,
          conn.type || "",
          conn.name || "",
          database
        );
      }
      return;
    }

    // For views, procedures, and functions, fetch definition and open script tab
    if (node.type === "view" || node.type === "procedure" || node.type === "function") {
      const routineNode = node as ViewNode | ProcedureNode | FunctionNode;
      const database = getDatabaseNameForConnection(connectionId);
      
      const contextData = {
        connId: connectionId,
        schema: routineNode.schema,
        routine: routineNode.name,
        routineType: node.type === "view" ? "view" : node.type,
        type: conn.type,
        connName: conn.name,
        db: database,
      };

      fetchRoutineDefinition(contextData).then(definition => {
        if (definition) {
          const title = `Edit ${node.type}: ${routineNode.schema}.${routineNode.name}`;
          openScriptTab(contextData, title, definition);
        }
      }).catch(error => {
        console.error("Failed to fetch routine definition:", error);
      });
    }
  };

  // Handle "New Query" action for nodes
  const handleNewQueryAction = (node: any, connectionId: string) => {
    const conn = connections.find(c => c.id === connectionId);

    const detail: any = {
      mode: "query" as const,
      connId: connectionId,
      type: conn?.type,
      connName: conn?.name,
      db: conn?.database,
    };

    if (node.type === "schema") {
      // For schema nodes, include schema information
      detail.schema = node.name;
    }

    window.dispatchEvent(new CustomEvent("open-empty-sql-tab", { detail }));
  };

  const renderTreeNode = (
    node:
      | DatabaseNode
      | SchemaNode
      | TableNode
      | ViewNode
      | ProcedureNode
      | FunctionNode
      | GroupNode
      | ColumnNode
      | KeyNode
      | ConstraintNode
      | TriggerNode
      | IndexNode,
    connectionId: string,
    level: number = 0,
    parentContext?: string
  ) => {
    // For group nodes that are table metadata branches, include parent table context
    const nodeKey =
      node.type === "group" && parentContext
        ? `${connectionId}:${parentContext}:${node.type}:${node.name}`
        : `${connectionId}:${node.type}:${node.name}`;
    const connectionState = connectionStates.get(connectionId);
    const isExpanded = connectionState?.expandedNodes.has(nodeKey) || false;
    // Check if node has children or if it's a table that can have metadata branches
    const hasChildren =
      ("children" in node && node.children && node.children.length > 0) ||
      (node.type === "table" &&
        (!node.children || node.children.length === 0)) ||
      (node.type === "group" &&
        (node.name === "Columns" ||
          node.name === "Keys" ||
          node.name === "Constraints" ||
          node.name === "Triggers" ||
          node.name === "Indexes"));



    const getIcon = () => {
      // Following style3.txt: Icons carry the semantic meaning and color
      const isDarkMode =
        document.documentElement.classList.contains("dark") ||
        window.matchMedia("(prefers-color-scheme: dark)").matches;
      
      const isSelected = activeNodeKey === nodeKey;
      
      // Get semantic colors for different node types
      const getIconColor = () => {
        const baseColors = {
          database: isDarkMode ? "#60A5FA" : "#1D4ED8", // Blue - stronger contrast when selected
          schema: isDarkMode ? "#9CA3AF" : "#374151", // Gray
          table: isDarkMode ? "#F59E0B" : "#B45309", // Orange/Amber - darker in light mode
          view: isDarkMode ? "#10B981" : "#047857", // Green - darker in light mode  
          procedure: isDarkMode ? "#8B5CF6" : "#6D28D9", // Purple - darker in light mode
          function: isDarkMode ? "#F97316" : "#C2410C", // Orange - darker in light mode
          group: isDarkMode ? "#06B6D4" : "#0E7490", // Cyan - darker in light mode
          column: isDarkMode ? "#84CC16" : "#65A30D", // Lime - darker in light mode
        };
        
        const color = baseColors[node.type as keyof typeof baseColors] || (isDarkMode ? "#9CA3AF" : "#6B7280");
        
        // For selected nodes, make icons more prominent
        if (isSelected) {
          return isDarkMode ? "#FFFFFF" : "#000000"; // High contrast for selected
        }
        
        return color;
      };

      const iconColor = getIconColor();
      const iconProps = { size: 16, color: iconColor };

      switch (node.type as any) {
        case "database":
          return <Database {...iconProps} />;
        case "schema":
          return <FolderTree {...iconProps} />;
        case "table":
          return <Table {...iconProps} />;
        case "view":
          return <Eye {...iconProps} />;
        case "procedure":
          return <PlayCircle {...iconProps} />;
        case "function":
          return <Sigma {...iconProps} />;
        case "group":
          return <Folder {...iconProps} />;
        default:
          return <FileText {...iconProps} />;
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

      // Enhanced column display with PK/FK, type, and nullable info
      if (node.type === "column" && "dataType" in node) {
        const columnNode = node as ColumnNode;
        const keyInfo = [];

        if (columnNode.isPrimaryKey) {
          keyInfo.push("PK");
        }
        if (columnNode.isForeignKey) {
          keyInfo.push("FK");
        }

        const keyText = keyInfo.length > 0 ? keyInfo.join(", ") + ", " : "";
        const nullableText = columnNode.nullable ? "null" : "not null";

        return `${columnNode.name} (${keyText}${columnNode.dataType}, ${nullableText})`;
      }

      return node.name;
    };

    const handleDoubleClick = async () => {
      const connState = connectionStates.get(connectionId);
      const conn = connState?.connection;

      if (node.type === "table") {
        const detail = {
          connectionId,
          connectionType: conn?.type,
          connectionName: conn?.name,
          database: conn?.database,
          schema: (node as TableNode).schema,
          table: node.name,
        };
        document.dispatchEvent(new CustomEvent("open-sql-tab", { detail }));
      } else if (node.type === "procedure" || node.type === "function") {
        // Handle stored procedures and functions
        const routineNode = node as ProcedureNode | FunctionNode;
        const ctx = {
          connId: connectionId,
          schema: routineNode.schema,
          routine: routineNode.name,
          type: conn?.type,
          routineType: node.type as "procedure" | "function",
        };

        try {
          const definition = await fetchRoutineDefinition(ctx);
          const detail = {
            connectionId,
            connectionType: conn?.type,
            connectionName: conn?.name,
            database: conn?.database,
            schema: routineNode.schema,
            routine: routineNode.name,
            routineType: node.type,
            definition,
          };
          document.dispatchEvent(
            new CustomEvent("open-routine-tab", { detail })
          );
        } catch (error) {
          console.error("Failed to fetch routine definition:", error);
        }
      } else if (node.type === "trigger") {
        // Handle triggers - similar to procedures but with different handling
        const triggerNode = node as TriggerNode;
        // For triggers, we need to get the parent table context from the nodeKey
        const parts = nodeKey.split(":");
        if (parts.length >= 5 && parts[1] === "table") {
          const parentSchema = parts[2];
          const parentTable = parts[3];

          // For triggers, we might need a different query than OBJECT_DEFINITION
          // Let's use a basic approach for now
          const ctx = {
            connId: connectionId,
            schema: parentSchema,
            routine: triggerNode.name,
            type: conn?.type,
            routineType: "trigger" as const,
          };

          try {
            const definition = await fetchRoutineDefinition(ctx);
            const detail = {
              connectionId,
              connectionType: conn?.type,
              connectionName: conn?.name,
              database: conn?.database,
              schema: parentSchema,
              table: parentTable,
              routine: triggerNode.name,
              routineType: "trigger",
              definition,
            };
            document.dispatchEvent(
              new CustomEvent("open-routine-tab", { detail })
            );
          } catch (error) {
            console.error("Failed to fetch trigger definition:", error);
          }
        }
      }
    };

    const handleContextMenu = (e: React.MouseEvent) => {
      e.preventDefault();
      const connState = connectionStates.get(connectionId);
      const conn = connState?.connection;

      if (node.type === "table") {
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
          db: getDatabaseNameForConnection(connectionId),
          nodeKey,
        });
      } else if (node.type === "schema") {
        setContextMenu({
          x: e.clientX,
          y: e.clientY,
          visible: true,
          mode: "schema",
          connId: connectionId,
          schema: node.name,
          type: conn?.type,
          connName: conn?.name,
          db: getDatabaseNameForConnection(connectionId),
          nodeKey,
        });
      } else if (node.type === "view" || node.type === "procedure" || node.type === "function") {
        setContextMenu({
          x: e.clientX,
          y: e.clientY,
          visible: true,
          mode: "routine",
          connId: connectionId,
          schema: (node as ViewNode | ProcedureNode | FunctionNode).schema,
          routine: node.name,
          routineKind: node.type,
          type: conn?.type,
          connName: conn?.name,
          db: conn?.database,
          nodeKey,
        });
      } else if (node.type === "trigger") {
        // Handle trigger nodes directly
        const triggerNode = node as TriggerNode;
        const parentTable = findParentTable(nodeKey);
        const parentSchema = findParentSchema(nodeKey);

        if (parentTable && parentSchema) {
          setContextMenu({
            x: e.clientX,
            y: e.clientY,
            visible: true,
            mode: "trigger",
            connId: connectionId,
            schema: parentSchema,
            table: parentTable,
            itemName: triggerNode.name,
            itemData: triggerNode as unknown as Record<string, unknown>,
            type: conn?.type,
            connName: conn?.name,
            db: conn?.database,
            nodeKey,
          });
        }
      } else if (node.type === "group") {
        // Handle group nodes
        const groupNode = node as GroupNode;
        const parentTable = findParentTable(nodeKey);
        const parentSchema = findParentSchema(nodeKey);

        // Schema-level groups (under Programmability)
        const schemaLevelGroups = ["Stored Procedures", "Functions", "Types", "Sequences"];
        const isSchemaLevel = schemaLevelGroups.includes(groupNode.name);

        if (isSchemaLevel && parentSchema) {
          // Schema-level groups don't need a parent table
          setContextMenu({
            x: e.clientX,
            y: e.clientY,
            visible: true,
            mode: "group",
            connId: connectionId,
            schema: parentSchema,
            // table: undefined for schema-level groups
            groupType: groupNode.name,
            type: conn?.type,
            connName: conn?.name,
            db: conn?.database,
            nodeKey,
          });
        } else if (parentTable && parentSchema) {
          // Table-level groups need both parent table and schema
          setContextMenu({
            x: e.clientX,
            y: e.clientY,
            visible: true,
            mode: "group",
            connId: connectionId,
            schema: parentSchema,
            table: parentTable,
            groupType: groupNode.name,
            type: conn?.type,
            connName: conn?.name,
            db: conn?.database,
            nodeKey,
          });
        }
      } else if (node.name && typeof node.name === "string") {
        // Handle individual items (columns, keys, constraints, triggers, indexes)
        const parentTable = findParentTable(nodeKey);
        const parentSchema = findParentSchema(nodeKey);
        const groupType = findParentGroupType(nodeKey);

        if (parentTable && parentSchema && groupType) {
          let mode: "column" | "key" | "constraint" | "trigger" | "index";

          if (groupType === "Columns") mode = "column";
          else if (groupType === "Keys") mode = "key";
          else if (groupType === "Constraints") mode = "constraint";
          else if (groupType === "Triggers") mode = "trigger";
          else if (groupType === "Indexes") mode = "index";
          else return; // Unknown group type

          setContextMenu({
            x: e.clientX,
            y: e.clientY,
            visible: true,
            mode,
            connId: connectionId,
            schema: parentSchema,
            table: parentTable,
            itemName: node.name,
            itemData: node as unknown as Record<string, unknown>,
            type: conn?.type,
            connName: conn?.name,
            db: conn?.database,
            nodeKey,
          });
        }
      }
    };

    return (
      <div key={nodeKey}>
        <div
          className={`flex items-center px-2 py-1 text-sm cursor-pointer group transition-colors duration-150 ${
            activeNodeKey === nodeKey
              ? "bg-blue-600 dark:bg-blue-600" // Selected state with strong blue background
              : "hover:bg-gray-50/70 dark:hover:bg-gray-800/30" // Normal and hover states
          }`}
          style={{
            paddingLeft: `${(level + 1) * 16 + 8}px`,
          }}
          onClick={e => {
            // Handle refresh icon click
            if ((e.target as HTMLElement).closest(".refresh-icon")) {
              e.stopPropagation();
              refreshNode(connectionId, node.type, nodeKey, node);
              return;
            }

            // Handle edit icon click
            if ((e.target as HTMLElement).closest(".edit-icon")) {
              e.stopPropagation();
              handleEditAction(node, connectionId, nodeKey);
              return;
            }

            // Set active node for background
            setActiveNodeKey(nodeKey);

            // Handle expand/collapse
            if (hasChildren) {
              toggleNodeExpansion(connectionId, nodeKey, node);
            }
          }}
          onDoubleClick={handleDoubleClick}
          onContextMenu={handleContextMenu}
        >
          {hasChildren && (
            <span className="mr-1 text-xs">{isExpanded ? "▼" : "▶"}</span>
          )}
          {!hasChildren && <span className="mr-3" />}
          <span className="mr-2">{getIcon()}</span>
          <span 
            className="flex-1 truncate"
            style={{ 
              color: activeNodeKey === nodeKey 
                ? "#ffffff" // White text for selected state (works on blue background)
                : (document.documentElement.classList.contains("dark") ? "#ffffff" : "#000000") // Theme-based text for normal state
            }}
            title={getDisplayText()}
          >
            {getDisplayText()}
          </span>

          {/* Plus icon for nodes that have "New" options */}
          {canNodeHaveNewOptions(node) && (
            <button
              className={`new-icon p-1 rounded hover:bg-gray-200/80 dark:hover:bg-indigo-800/60 ml-2 transition-opacity duration-150 ${
                activeNodeKey === nodeKey
                  ? "opacity-100"
                  : "opacity-0 group-hover:opacity-100"
              }`}
              onClick={e => {
                e.stopPropagation();
                handleNewAction(node, connectionId, nodeKey);
              }}
              title={
                node.type === "database"
                  ? "New Query"
                  : node.type === "schema"
                    ? "New Table"
                    : `New ${node.name?.slice(0, -1) || "Item"}`
              }
            >
              <Plus
                className={`w-3 h-3 ${
                  activeNodeKey === nodeKey
                    ? "text-gray-800 dark:text-gray-300"
                    : "text-gray-600 dark:text-gray-400 hover:text-white"
                }`}
              />
            </button>
          )}

          {/* New Query icon for schema nodes */}
          {canNodeHaveNewQueryOptions(node) && node.type === "schema" && (
            <button
              className={`new-query-icon p-1 rounded hover:bg-gray-200/80 dark:hover:bg-indigo-800/60 ml-1 transition-opacity duration-150 ${
                activeNodeKey === nodeKey
                  ? "opacity-100"
                  : "opacity-0 group-hover:opacity-100"
              }`}
              onClick={e => {
                e.stopPropagation();
                handleNewQueryAction(node, connectionId);
              }}
              title="New Query"
            >
              <FileText
                className={`w-3 h-3 ${
                  activeNodeKey === nodeKey
                    ? "text-gray-800 dark:text-gray-300"
                    : "text-gray-600 dark:text-gray-400 hover:text-white"
                }`}
              />
            </button>
          )}

          {/* Edit icon for nodes that can be edited */}
          {canNodeBeEdited(node) && (
            <button
              className={`edit-icon p-1 rounded hover:bg-gray-200/80 dark:hover:bg-indigo-800/60 ml-1 transition-opacity duration-150 ${
                activeNodeKey === nodeKey
                  ? "opacity-100"
                  : "opacity-0 group-hover:opacity-100"
              }`}
              onClick={e => {
                e.stopPropagation();
                handleEditAction(node, connectionId, nodeKey);
              }}
              title={node.type === "table" ? "Edit data" : `Modify ${node.type}`}
            >
              <Pencil
                className={`w-3 h-3 ${
                  activeNodeKey === nodeKey
                    ? "text-gray-800 dark:text-gray-300"
                    : "text-gray-600 dark:text-gray-400 hover:text-white"
                }`}
              />
            </button>
          )}

          {/* Refresh icon for nodes that can be refreshed - always last */}
          {canNodeBeRefreshed(node) && (
            <button
              className={`refresh-icon p-1 rounded hover:bg-gray-200/80 dark:hover:bg-indigo-800/60 ml-1 transition-opacity duration-150 ${
                activeNodeKey === nodeKey
                  ? "opacity-100"
                  : "opacity-0 group-hover:opacity-100"
              }`}
              onClick={e => {
                e.stopPropagation();
                refreshNode(connectionId, node.type, nodeKey, node);
              }}
              title="Refresh"
            >
              <RefreshCw
                className={`w-3 h-3 ${
                  activeNodeKey === nodeKey
                    ? "text-gray-800 dark:text-gray-300"
                    : "text-gray-600 dark:text-gray-400 hover:text-white"
                }`}
              />
            </button>
          )}
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
              return node.children.map(child => {
                // If parent is a table and child is a group (metadata branch), pass table context
                const parentContext =
                  node.type === "table" && child.type === "group"
                    ? `table:${(node as TableNode).schema}:${node.name}`
                    : undefined;
                return renderTreeNode(
                  child as any,
                  connectionId,
                  level + 1,
                  parentContext
                );
              });
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
        <div
          className="flex items-center justify-between px-3 py-2 text-sm"
          onContextMenu={e => {
            if (isConnected) {
              e.preventDefault();
              setContextMenu({
                x: e.clientX,
                y: e.clientY,
                visible: true,
                mode: "connection",
                connId: connection.id,
                type: connection.type,
                connName: connection.name,
                db: connection.database,
              });
            }
          }}
        >
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <div
                className={`w-2 h-2 rounded-full ${isConnected ? "bg-green-500" : isConnecting ? "bg-yellow-500" : "bg-gray-400"}`}
              />
              <div
                className="font-medium truncate cursor-pointer"
                onClick={() => {
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

  // Helper functions to find parent elements from nodeKey
  const findParentTable = (nodeKey: string): string | null => {
    const parts = nodeKey.split(":");
    // nodeKey format: connectionId:database:schema:table:group:item
    return parts.length >= 4 ? parts[3] : null;
  };

  const findParentSchema = (nodeKey: string): string | null => {
    const parts = nodeKey.split(":");
    // nodeKey format: connectionId:database:schema:table:group:item
    return parts.length >= 3 ? parts[2] : null;
  };

  // Helper to get database name for a specific connection
  const getDatabaseNameForConnection = (connectionId: string): string => {
    const connState = connectionStates.get(connectionId);
    const conn = connState?.connection;

    if (conn?.database) {
      return conn.database;
    }

    if (conn?.connectionString) {
      const match = conn.connectionString.match(/Initial Catalog=([^;]+)/i);
      if (match) {
        return match[1];
      }

      const dbMatch = conn.connectionString.match(/Database=([^;]+)/i);
      if (dbMatch) {
        return dbMatch[1];
      }
    }

    return "database";
  };

  const getDatabaseName = (db?: string, nodeKey?: string): string => {
    console.log("getDatabaseName called with:", {
      db,
      nodeKey,
      contextConnId: contextMenu.connId,
    });

    // Try to get database name from various sources
    if (db) {
      console.log("Using explicit db:", db);
      return db;
    }

    // Try to get from connection state first (nodeKey doesn't contain database name)
    const contextConnId = contextMenu.connId;
    if (contextConnId) {
      const connState = connectionStates.get(contextConnId);
      const conn = connState?.connection;
      console.log("Connection state:", {
        contextConnId,
        conn: conn
          ? {
              id: conn.id,
              name: conn.name,
              database: conn.database,
              connectionString: conn.connectionString?.substring(0, 50) + "...",
            }
          : null,
      });

      // If connection has explicit database, use it
      if (conn?.database) {
        console.log("Using conn.database:", conn.database);
        return conn.database;
      }

      // Try to extract from connection string
      if (conn?.connectionString) {
        const match = conn.connectionString.match(/Initial Catalog=([^;]+)/i);
        if (match) {
          console.log("Extracted from Initial Catalog:", match[1]);
          return match[1];
        }

        const dbMatch = conn.connectionString.match(/Database=([^;]+)/i);
        if (dbMatch) {
          console.log("Extracted from Database=:", dbMatch[1]);
          return dbMatch[1];
        }
      }
    }

    console.log('Falling back to "database"');
    return "database";
  };

  const findParentGroupType = (nodeKey: string): string | null => {
    const parts = nodeKey.split(":");
    // nodeKey format: connectionId:database:schema:table:group:item
    return parts.length >= 5 ? parts[4] : null;
  };

  // Search through schema data to find parent table and schema for a metadata item
  const findParentTableFromSchemaData = (
    connectionId: string, 
    itemName: string, 
    itemType: string
  ): { table: string; schema: string } | null => {
    const connState = connectionStates.get(connectionId);
    if (!connState?.schemaData) return null;

    // Search through all databases, schemas and tables to find the item
    for (const database of connState.schemaData.databases) {
      for (const schemaOrGroup of database.children || []) {
        if (schemaOrGroup.type === "schema") {
          // Search within schema
          for (const table of schemaOrGroup.children || []) {
            if (table.type === "table") {
              // Check if this table has the item in its metadata groups
              for (const group of table.children || []) {
                if (group.type === "group" && group.children) {
                  for (const item of group.children) {
                    if (item.name === itemName && item.type === itemType) {
                      return {
                        table: table.name,
                        schema: (table as TableNode).schema
                      };
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
    return null;
  };

  // DDL Generation Functions
  const generateColumnDDL = (
    connectionType: string,
    action: "create" | "drop" | "update",
    tableName: string,
    schemaName: string,
    columnData?: Record<string, unknown>
  ): string => {
    const ident = (n: string) =>
      connectionType === "sqlserver" ? `[${n}]` : `"${n}"`;
    const qualified = `${ident(schemaName)}.${ident(tableName)}`;

    switch (action) {
      case "create":
        return `-- Add new column to ${qualified}
ALTER TABLE ${qualified}
ADD [NewColumnName] NVARCHAR(255) NULL;`;

      case "drop":
        if (!columnData?.name) return "-- Column name required";
        return `-- Drop column ${columnData.name} from ${qualified}
ALTER TABLE ${qualified}
DROP COLUMN ${ident(columnData.name as string)};`;

      case "update":
        if (!columnData?.name) return "-- Column name required";
        return `-- Modify column ${columnData.name} in ${qualified}
ALTER TABLE ${qualified}
ALTER COLUMN ${ident(columnData.name as string)} NVARCHAR(255) NULL;`;

      default:
        return "-- Invalid action";
    }
  };

  const generateKeyDDL = (
    connectionType: string,
    action: "create" | "drop" | "update",
    tableName: string,
    schemaName: string,
    keyData?: Record<string, unknown>
  ): string => {
    const ident = (n: string) =>
      connectionType === "sqlserver" ? `[${n}]` : `"${n}"`;
    const qualified = `${ident(schemaName)}.${ident(tableName)}`;

    switch (action) {
      case "create":
        return `-- Add new primary key to ${qualified}
ALTER TABLE ${qualified}
ADD CONSTRAINT [PK_${tableName}_NewKey] PRIMARY KEY ([ColumnName]);`;

      case "drop":
        if (!keyData?.name) return "-- Key name required";
        return `-- Drop constraint ${keyData.name} from ${qualified}
ALTER TABLE ${qualified}
DROP CONSTRAINT ${ident(keyData.name as string)};`;

      case "update":
        if (!keyData?.name) return "-- Key name required";
        return `-- Update constraint ${keyData.name} in ${qualified}
-- First drop the existing constraint
ALTER TABLE ${qualified}
DROP CONSTRAINT ${ident(keyData.name as string)};

-- Then recreate with new definition
ALTER TABLE ${qualified}
ADD CONSTRAINT ${ident(keyData.name as string)} PRIMARY KEY ([ColumnName]);`;

      default:
        return "-- Invalid action";
    }
  };

  const generateConstraintDDL = (
    connectionType: string,
    action: "create" | "drop" | "update",
    tableName: string,
    schemaName: string,
    constraintData?: Record<string, unknown>
  ): string => {
    const ident = (n: string) =>
      connectionType === "sqlserver" ? `[${n}]` : `"${n}"`;
    const qualified = `${ident(schemaName)}.${ident(tableName)}`;

    switch (action) {
      case "create":
        return `-- Add new check constraint to ${qualified}
ALTER TABLE ${qualified}
ADD CONSTRAINT [CK_${tableName}_NewConstraint] CHECK ([ColumnName] IS NOT NULL);`;

      case "drop":
        if (!constraintData?.name) return "-- Constraint name required";
        return `-- Drop constraint ${constraintData.name} from ${qualified}
ALTER TABLE ${qualified}
DROP CONSTRAINT ${ident(constraintData.name as string)};`;

      case "update":
        if (!constraintData?.name) return "-- Constraint name required";
        return `-- Update constraint ${constraintData.name} in ${qualified}
-- First drop the existing constraint
ALTER TABLE ${qualified}
DROP CONSTRAINT ${ident(constraintData.name as string)};

-- Then recreate with new definition
ALTER TABLE ${qualified}
ADD CONSTRAINT ${ident(constraintData.name as string)} CHECK ([ColumnName] IS NOT NULL);`;

      default:
        return "-- Invalid action";
    }
  };

  const generateTriggerDDL = (
    connectionType: string,
    action: "create" | "drop" | "update",
    tableName: string,
    schemaName: string,
    triggerData?: Record<string, unknown>
  ): string => {
    const ident = (n: string) =>
      connectionType === "sqlserver" ? `[${n}]` : `"${n}"`;
    const qualified = `${ident(schemaName)}.${ident(tableName)}`;

    switch (action) {
      case "create":
        return `-- Create new trigger on ${qualified}
CREATE TRIGGER ${ident(`${schemaName}.TR_${tableName}_NewTrigger`)}
ON ${qualified}
AFTER INSERT, UPDATE, DELETE
AS
BEGIN
    SET NOCOUNT ON;
    -- Add trigger logic here
    PRINT 'Trigger executed';
END;`;

      case "drop":
        if (!triggerData?.name) return "-- Trigger name required";
        return `-- Drop trigger ${triggerData.name}
DROP TRIGGER ${ident(`${schemaName}.${triggerData.name as string}`)};`;

      case "update":
        if (!triggerData?.name) return "-- Trigger name required";
        return `-- Update trigger ${triggerData.name}
-- First drop the existing trigger
DROP TRIGGER ${ident(`${schemaName}.${triggerData.name as string}`)};

-- Then recreate with new definition
CREATE TRIGGER ${ident(`${schemaName}.${triggerData.name as string}`)}
ON ${qualified}
AFTER INSERT, UPDATE, DELETE
AS
BEGIN
    SET NOCOUNT ON;
    -- Add updated trigger logic here
    PRINT 'Updated trigger executed';
END;`;

      default:
        return "-- Invalid action";
    }
  };

  const generateIndexDDL = (
    connectionType: string,
    action: "create" | "drop" | "update",
    tableName: string,
    schemaName: string,
    indexData?: Record<string, unknown>
  ): string => {
    const ident = (n: string) =>
      connectionType === "sqlserver" ? `[${n}]` : `"${n}"`;
    const qualified = `${ident(schemaName)}.${ident(tableName)}`;

    switch (action) {
      case "create":
        return `-- Create new index on ${qualified}
CREATE NONCLUSTERED INDEX [IX_${tableName}_NewIndex]
ON ${qualified} ([ColumnName] ASC);`;

      case "drop":
        if (!indexData?.name) return "-- Index name required";
        return `-- Drop index ${indexData.name} from ${qualified}
DROP INDEX ${ident(indexData.name as string)} ON ${qualified};`;

      case "update":
        if (!indexData?.name) return "-- Index name required";
        return `-- Update index ${indexData.name} on ${qualified}
-- First drop the existing index
DROP INDEX ${ident(indexData.name as string)} ON ${qualified};

-- Then recreate with new definition
CREATE NONCLUSTERED INDEX ${ident(indexData.name as string)}
ON ${qualified} ([ColumnName] ASC);`;

      default:
        return "-- Invalid action";
    }
  };

  const generateTableDDL = (
    connectionType: string,
    action: "create" | "drop" | "update",
    schemaName: string,
    tableName?: string
  ): string => {
    const ident = (n: string) =>
      connectionType === "sqlserver" ? `[${n}]` : `"${n}"`;

    switch (action) {
      case "create": {
        const newTableName = tableName || "NewTable";
        const qualified = `${ident(schemaName)}.${ident(newTableName)}`;
        return `-- Create new table ${qualified}
CREATE TABLE ${qualified} (
    [Id] INT IDENTITY(1,1) NOT NULL,
    [Name] NVARCHAR(255) NOT NULL,
    [CreatedDate] DATETIME2 NOT NULL DEFAULT GETDATE(),
    
    CONSTRAINT [PK_${newTableName}] PRIMARY KEY CLUSTERED ([Id])
);

-- Add sample data (optional)
-- INSERT INTO ${qualified} ([Name]) VALUES ('Sample Record');`;
      }

      case "drop": {
        if (!tableName) return "-- Table name required";
        const qualifiedDrop = `${ident(schemaName)}.${ident(tableName)}`;
        return `-- Drop table ${qualifiedDrop}
DROP TABLE ${qualifiedDrop};`;
      }

      default:
        return `-- Unsupported action: ${action}`;
    }
  };

  const generateStoredProcedureDDL = (
    connectionType: string,
    _action: "create",
    schemaName: string,
    procedureName?: string
  ): string => {
    const ident = (n: string) =>
      connectionType === "sqlserver" ? `[${n}]` : `"${n}"`;

    const newProcName = procedureName || "NewStoredProcedure";
    const qualified = `${ident(schemaName)}.${ident(newProcName)}`;
    
    return `-- Create new stored procedure ${qualified}
CREATE PROCEDURE ${qualified}
    @Parameter1 NVARCHAR(255) = NULL,
    @Parameter2 INT = NULL
AS
BEGIN
    SET NOCOUNT ON;
    
    -- TODO: Add your stored procedure logic here
    SELECT 
        @Parameter1 AS Parameter1Value,
        @Parameter2 AS Parameter2Value,
        GETDATE() AS CurrentDateTime;
        
END;

-- Example execution:
-- EXEC ${qualified} @Parameter1 = 'Sample Value', @Parameter2 = 123;`;
  };

  const generateFunctionDDL = (
    connectionType: string,
    _action: "create",
    schemaName: string,
    functionName?: string
  ): string => {
    const ident = (n: string) =>
      connectionType === "sqlserver" ? `[${n}]` : `"${n}"`;

    const newFuncName = functionName || "NewFunction";
    const qualified = `${ident(schemaName)}.${ident(newFuncName)}`;
    
    return `-- Create new scalar function ${qualified}
CREATE FUNCTION ${qualified}
(
    @Parameter1 NVARCHAR(255),
    @Parameter2 INT
)
RETURNS NVARCHAR(255)
AS
BEGIN
    DECLARE @Result NVARCHAR(255);
    
    -- TODO: Add your function logic here
    SET @Result = CONCAT(@Parameter1, ' - ', CAST(@Parameter2 AS NVARCHAR(10)));
    
    RETURN @Result;
END;

-- Example usage:
-- SELECT ${qualified}('Sample Text', 123) AS FunctionResult;`;
  };

  const generateViewDDL = (
    connectionType: string,
    _action: "create",
    schemaName: string,
    viewName?: string
  ): string => {
    const ident = (n: string) =>
      connectionType === "sqlserver" ? `[${n}]` : `"${n}"`;

    const newViewName = viewName || "NewView";
    const qualified = `${ident(schemaName)}.${ident(newViewName)}`;
    
    return `-- Create new view ${qualified}
CREATE VIEW ${qualified}
AS
SELECT 
    -- TODO: Define your view columns here
    1 as Id,
    'Sample Data' as Name,
    GETDATE() as CreatedDate
    
    -- FROM YourSourceTable
    -- WHERE YourConditions = 1;

-- Example query:
-- SELECT * FROM ${qualified};`;
  };

  const generateTypeDDL = (
    connectionType: string,
    _action: "create",
    schemaName: string,
    typeName?: string
  ): string => {
    const ident = (n: string) =>
      connectionType === "sqlserver" ? `[${n}]` : `"${n}"`;

    const newTypeName = typeName || "NewUserDefinedType";
    const qualified = `${ident(schemaName)}.${ident(newTypeName)}`;
    
    return `-- Create new user-defined table type ${qualified}
CREATE TYPE ${qualified} AS TABLE
(
    Id INT NOT NULL,
    Name NVARCHAR(255) NOT NULL,
    Value DECIMAL(18,2) NULL,
    
    PRIMARY KEY (Id)
);

-- Example usage in stored procedure:
-- CREATE PROCEDURE ExampleProc
--     @TableParam ${qualified} READONLY
-- AS
-- BEGIN
--     SELECT * FROM @TableParam;
-- END;`;
  };

  const generateSequenceDDL = (
    connectionType: string,
    _action: "create",
    schemaName: string,
    sequenceName?: string
  ): string => {
    const ident = (n: string) =>
      connectionType === "sqlserver" ? `[${n}]` : `"${n}"`;

    const newSeqName = sequenceName || "NewSequence";
    const qualified = `${ident(schemaName)}.${ident(newSeqName)}`;
    
    return `-- Create new sequence ${qualified}
CREATE SEQUENCE ${qualified}
    AS BIGINT
    START WITH 1
    INCREMENT BY 1
    MINVALUE 1
    MAXVALUE 9223372036854775807
    NO CYCLE
    CACHE 10;

-- Example usage:
-- SELECT NEXT VALUE FOR ${qualified} AS NextSequenceValue;
-- 
-- -- In table creation:
-- -- CREATE TABLE ExampleTable (
-- --     Id BIGINT DEFAULT (NEXT VALUE FOR ${qualified}) NOT NULL,
-- --     Name NVARCHAR(255)
-- -- );`;
  };

  const openDDLTab = (
    sql: string,
    title: string,
    connectionId: string,
    connectionType: string,
    connectionName: string,
    database: string
  ) => {
    console.log("openDDLTab called with:", {
      title,
      database,
      connectionId,
      connectionName,
    });
    // Make the title unique by adding timestamp
    const uniqueTitle = `${title}_${Date.now()}`;
    console.log("Final uniqueTitle:", uniqueTitle);
    const detail = {
      connectionId,
      connectionType,
      connectionName,
      database,
      sql: sql,
      title: uniqueTitle,
    };
    console.log("Event detail:", detail);
    document.dispatchEvent(new CustomEvent("open-sql-script", { detail }));
  };

  return (
    <div className="h-full flex flex-col bg-background text-foreground min-h-0">
      {/* Context Menu */}
      {contextMenu.visible && (
        <div
          className="fixed z-50 border border-border rounded-lg shadow-lg text-sm isolate mix-blend-normal overflow-hidden bg-[hsl(var(--modal))] text-[hsl(var(--modal-foreground))]"
          style={{ top: contextMenu.y, left: contextMenu.x }}
          onMouseLeave={() => {
            // Add a small delay to allow moving to submenu
            submenuTimeoutRef.current = setTimeout(() => {
              setContextMenu(c => ({ ...c, visible: false }));
              setSubmenu({ visible: false });
            }, 150);
          }}
          onMouseEnter={() => {
            // Cancel timeout when mouse re-enters main menu
            if (submenuTimeoutRef.current) {
              clearTimeout(submenuTimeoutRef.current);
              submenuTimeoutRef.current = null;
            }
          }}
        >
          {contextMenu.mode === "table" && (
            <>
              <button
                className="block w-full text-left px-3 py-1 hover:bg-blue-50 hover:text-blue-700 dark:hover:bg-blue-900/20 dark:hover:text-blue-300 transition-colors duration-150"
                onClick={async () => {
                  if (!contextMenu.connId) return;
                  // Pass the node data for table refresh
                  await refreshNode(
                    contextMenu.connId,
                    "table",
                    contextMenu.nodeKey || "",
                    contextMenu
                  );
                  setContextMenu(c => ({ ...c, visible: false }));
                }}
              >
                Refresh
              </button>
              <button
                className="block w-full text-left px-3 py-1 hover:bg-blue-50 hover:text-blue-700 dark:hover:bg-blue-900/20 dark:hover:text-blue-300 transition-colors duration-150"
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
                className="block w-full text-left px-3 py-1 hover:bg-blue-50 hover:text-blue-700 dark:hover:bg-blue-900/20 dark:hover:text-blue-300 transition-colors duration-150"
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
              <button
                className="block w-full text-left px-3 py-1 hover:bg-blue-50 hover:text-blue-700 dark:hover:bg-blue-900/20 dark:hover:text-blue-300 transition-colors duration-150"
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
                    new CustomEvent("open-edit-data-tab", { detail })
                  );
                  setContextMenu(c => ({ ...c, visible: false }));
                }}
              >
                Edit data
              </button>
              <div className="h-px bg-border mx-1" />

              {/* New submenu for DDL Generation Options */}
              <div className="relative">
                <button
                  className="flex items-center justify-between w-full text-left px-3 py-1 hover:bg-blue-50 hover:text-blue-700 dark:hover:bg-blue-900/20 dark:hover:text-blue-300 transition-colors duration-150"
                  onMouseEnter={e => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    setSubmenu({
                      visible: true,
                      type: "new",
                      x: rect.right - 1, // Overlap by 1px to avoid gap
                      y: rect.top,
                    });
                  }}
                  onClick={e => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    setSubmenu({
                      visible: true,
                      type: "new",
                      x: rect.right - 1, // Overlap by 1px to avoid gap
                      y: rect.top,
                    });
                  }}
                >
                  <span>New</span>
                  <span className="text-xs">▶</span>
                </button>
              </div>

              <div className="h-px bg-border mx-1" />
              <button
                className="block w-full text-left px-3 py-1 hover:bg-blue-50 hover:text-blue-700 dark:hover:bg-blue-900/20 dark:hover:text-blue-300 transition-colors duration-150"
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
                className="block w-full text-left px-3 py-1 hover:bg-blue-50 hover:text-blue-700 dark:hover:bg-blue-900/20 dark:hover:text-blue-300 transition-colors duration-150"
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
                className="block w-full text-left px-3 py-1 hover:bg-blue-50 hover:text-blue-700 dark:hover:bg-blue-900/20 dark:hover:text-blue-300 transition-colors duration-150"
                onClick={async () => {
                  if (!contextMenu.connId) return;
                  await refreshNode(
                    contextMenu.connId,
                    "schema",
                    contextMenu.nodeKey || ""
                  );
                  setContextMenu(c => ({ ...c, visible: false }));
                }}
              >
                Refresh
              </button>
              <button
                className="block w-full text-left px-3 py-1 hover:bg-blue-50 hover:text-blue-700 dark:hover:bg-blue-900/20 dark:hover:text-blue-300 transition-colors duration-150"
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
              <button
                className="block w-full text-left px-3 py-1 hover:bg-blue-50 hover:text-blue-700 dark:hover:bg-blue-900/20 dark:hover:text-blue-300 transition-colors duration-150"
                onClick={() => {
                  if (!contextMenu.connId || !contextMenu.schema) return;

                  // Generate table DDL template
                  const sql = generateTableDDL(
                    contextMenu.type || "sqlserver",
                    "create",
                    contextMenu.schema
                  );

                  const title = `${getDatabaseName(contextMenu.db, contextMenu.nodeKey)}.new_table`;

                  openDDLTab(
                    sql,
                    title,
                    contextMenu.connId,
                    contextMenu.type || "",
                    contextMenu.connName || "",
                    contextMenu.db || ""
                  );

                  setContextMenu(c => ({ ...c, visible: false }));
                }}
              >
                New Table
              </button>
              <button
                className="block w-full text-left px-3 py-1 hover:bg-blue-50 hover:text-blue-700 dark:hover:bg-blue-900/20 dark:hover:text-blue-300 transition-colors duration-150"
                onClick={() => {
                  if (!contextMenu.connId || !contextMenu.schema) return;

                  // Generate view DDL template
                  const sql = generateViewDDL(
                    contextMenu.type || "sqlserver",
                    "create",
                    contextMenu.schema
                  );

                  const title = `${getDatabaseName(contextMenu.db, contextMenu.nodeKey)}.new_view`;

                  openDDLTab(
                    sql,
                    title,
                    contextMenu.connId,
                    contextMenu.type || "",
                    contextMenu.connName || "",
                    contextMenu.db || ""
                  );

                  setContextMenu(c => ({ ...c, visible: false }));
                }}
              >
                New View
              </button>
            </>
          )}
          {contextMenu.mode === "routine" && (
            <>
              <button
                className="block w-full text-left px-3 py-1 hover:bg-blue-50 hover:text-blue-700 dark:hover:bg-blue-900/20 dark:hover:text-blue-300 transition-colors duration-150"
                onClick={async () => {
                  if (
                    !contextMenu.connId ||
                    !contextMenu.schema ||
                    !contextMenu.routine
                  )
                    return;
                  const def = await fetchRoutineDefinition({
                    ...contextMenu,
                    routineType: contextMenu.routineKind,
                  });
                  const title = `Edit ${contextMenu.schema}.${contextMenu.routine}`;
                  openScriptTab(contextMenu, title, def);
                  setContextMenu(c => ({ ...c, visible: false }));
                }}
              >
                Edit
              </button>
              <button
                className="block w-full text-left px-3 py-1 hover:bg-blue-50 hover:text-blue-700 dark:hover:bg-blue-900/20 dark:hover:text-blue-300 transition-colors duration-150"
                onClick={async () => {
                  if (
                    !contextMenu.connId ||
                    !contextMenu.schema ||
                    !contextMenu.routine
                  )
                    return;
                  const def = await fetchRoutineDefinition({
                    ...contextMenu,
                    routineType: contextMenu.routineKind,
                  });
                  const title = `Script CREATE ${contextMenu.schema}.${contextMenu.routine}`;
                  openScriptTab(contextMenu, title, def);
                  setContextMenu(c => ({ ...c, visible: false }));
                }}
              >
                Script as Create
              </button>
              <button
                className="block w-full text-left px-3 py-1 hover:bg-blue-50 hover:text-blue-700 dark:hover:bg-blue-900/20 dark:hover:text-blue-300 transition-colors duration-150"
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
          {contextMenu.mode === "connection" && (
            <>
              <button
                className="block w-full text-left px-3 py-1 hover:bg-blue-50 hover:text-blue-700 dark:hover:bg-blue-900/20 dark:hover:text-blue-300 transition-colors duration-150"
                onClick={async () => {
                  if (!contextMenu.connId) return;
                  await refreshNode(
                    contextMenu.connId,
                    "connection",
                    contextMenu.nodeKey || ""
                  );
                  setContextMenu(c => ({ ...c, visible: false }));
                }}
              >
                Refresh
              </button>
              <button
                className="block w-full text-left px-3 py-1 hover:bg-blue-50 hover:text-blue-700 dark:hover:bg-blue-900/20 dark:hover:text-blue-300 transition-colors duration-150"
                onClick={() => {
                  if (
                    !contextMenu.connId ||
                    !contextMenu.type ||
                    !contextMenu.connName
                  )
                    return;

                  // Only allow database creation for supported database types
                  if (
                    !["postgresql", "sqlserver", "mysql"].includes(
                      contextMenu.type
                    )
                  ) {
                    alert(
                      `Database creation is not supported for ${contextMenu.type}`
                    );
                    return;
                  }

                  setCreateDbConnection({
                    id: contextMenu.connId,
                    type: contextMenu.type,
                    name: contextMenu.connName,
                  });
                  setIsCreateDbDialogOpen(true);
                  setContextMenu(c => ({ ...c, visible: false }));
                }}
              >
                Create Database
              </button>
            </>
          )}

          {/* New DDL Generation Context Menus */}
          {contextMenu.mode === "group" && (
            <>
              <button
                className="block w-full text-left px-3 py-1 hover:bg-blue-50 hover:text-blue-700 dark:hover:bg-blue-900/20 dark:hover:text-blue-300 transition-colors duration-150"
                onClick={async () => {
                  if (!contextMenu.connId) return;
                  await refreshNode(
                    contextMenu.connId,
                    "group",
                    contextMenu.nodeKey || ""
                  );
                  setContextMenu(c => ({ ...c, visible: false }));
                }}
              >
                Refresh
              </button>
              <button
                className="block w-full text-left px-3 py-1 hover:bg-blue-50 hover:text-blue-700 dark:hover:bg-blue-900/20 dark:hover:text-blue-300 transition-colors duration-150"
                onClick={() => {
                  if (!contextMenu.connId || !contextMenu.schema || !contextMenu.groupType)
                    return;

                  // Schema-level groups (Stored Procedures, Functions, etc.) don't need table
                  const schemaLevelGroups = ["Stored Procedures", "Functions", "Types", "Sequences"];
                  const isSchemaLevel = schemaLevelGroups.includes(contextMenu.groupType);
                  
                  // Table-level groups need table parameter
                  if (!isSchemaLevel && !contextMenu.table) return;

                  let sql = "";
                  let title = "";

                  switch (contextMenu.groupType) {
                    // Table-level groups
                    case "Columns":
                      sql = generateColumnDDL(
                        contextMenu.type || "sqlserver",
                        "create",
                        contextMenu.table!,
                        contextMenu.schema
                      );
                      title = `${getDatabaseName(contextMenu.db, contextMenu.nodeKey)}.new_column`;
                      break;
                    case "Keys":
                      sql = generateKeyDDL(
                        contextMenu.type || "sqlserver",
                        "create",
                        contextMenu.table!,
                        contextMenu.schema
                      );
                      title = `${getDatabaseName(contextMenu.db, contextMenu.nodeKey)}.new_key`;
                      break;
                    case "Constraints":
                      sql = generateConstraintDDL(
                        contextMenu.type || "sqlserver",
                        "create",
                        contextMenu.table!,
                        contextMenu.schema
                      );
                      title = `${getDatabaseName(contextMenu.db, contextMenu.nodeKey)}.new_constraint`;
                      break;
                    case "Triggers":
                      sql = generateTriggerDDL(
                        contextMenu.type || "sqlserver",
                        "create",
                        contextMenu.table!,
                        contextMenu.schema
                      );
                      title = `${getDatabaseName(contextMenu.db, contextMenu.nodeKey)}.new_trigger`;
                      break;
                    case "Indexes":
                      sql = generateIndexDDL(
                        contextMenu.type || "sqlserver",
                        "create",
                        contextMenu.table!,
                        contextMenu.schema
                      );
                      title = `${getDatabaseName(contextMenu.db, contextMenu.nodeKey)}.new_index`;
                      break;
                    
                    // Schema-level groups  
                    case "Stored Procedures":
                      sql = generateStoredProcedureDDL(
                        contextMenu.type || "sqlserver",
                        "create",
                        contextMenu.schema
                      );
                      title = `${getDatabaseName(contextMenu.db, contextMenu.nodeKey)}.new_stored_procedure`;
                      break;
                    case "Functions":
                      sql = generateFunctionDDL(
                        contextMenu.type || "sqlserver",
                        "create",
                        contextMenu.schema
                      );
                      title = `${getDatabaseName(contextMenu.db, contextMenu.nodeKey)}.new_function`;
                      break;
                    case "Types":
                      sql = generateTypeDDL(
                        contextMenu.type || "sqlserver",
                        "create",
                        contextMenu.schema
                      );
                      title = `${getDatabaseName(contextMenu.db, contextMenu.nodeKey)}.new_type`;
                      break;
                    case "Sequences":
                      sql = generateSequenceDDL(
                        contextMenu.type || "sqlserver",
                        "create",
                        contextMenu.schema
                      );
                      title = `${getDatabaseName(contextMenu.db, contextMenu.nodeKey)}.new_sequence`;
                      break;
                  }

                  if (sql) {
                    openDDLTab(
                      sql,
                      title,
                      contextMenu.connId,
                      contextMenu.type || "",
                      contextMenu.connName || "",
                      contextMenu.db || ""
                    );
                  }
                  setContextMenu(c => ({ ...c, visible: false }));
                }}
              >
                New {(() => {
                  switch (contextMenu.groupType) {
                    case "Stored Procedures": return "Stored Procedure";
                    case "Functions": return "Function";
                    case "Types": return "Type";
                    case "Sequences": return "Sequence";
                    default: return contextMenu.groupType?.slice(0, -1); // Remove 's' for others
                  }
                })()}
              </button>
            </>
          )}

          {(contextMenu.mode === "column" ||
            contextMenu.mode === "key" ||
            contextMenu.mode === "constraint" ||
            contextMenu.mode === "trigger" ||
            contextMenu.mode === "index") && (
            <>
              <button
                className="block w-full text-left px-3 py-1 hover:bg-blue-50 hover:text-blue-700 dark:hover:bg-blue-900/20 dark:hover:text-blue-300 transition-colors duration-150"
                onClick={() => {
                  if (
                    !contextMenu.connId ||
                    !contextMenu.schema ||
                    !contextMenu.table ||
                    !contextMenu.itemName
                  )
                    return;

                  let sql = "";
                  let title = "";

                  switch (contextMenu.mode) {
                    case "column":
                      sql = generateColumnDDL(
                        contextMenu.type || "sqlserver",
                        "drop",
                        contextMenu.table,
                        contextMenu.schema,
                        contextMenu.itemData
                      );
                      title = `${getDatabaseName(contextMenu.db, contextMenu.nodeKey)}.drop_column`;
                      break;
                    case "key":
                      sql = generateKeyDDL(
                        contextMenu.type || "sqlserver",
                        "drop",
                        contextMenu.table,
                        contextMenu.schema,
                        contextMenu.itemData
                      );
                      title = `${getDatabaseName(contextMenu.db, contextMenu.nodeKey)}.drop_key`;
                      break;
                    case "constraint":
                      sql = generateConstraintDDL(
                        contextMenu.type || "sqlserver",
                        "drop",
                        contextMenu.table,
                        contextMenu.schema,
                        contextMenu.itemData
                      );
                      title = `${getDatabaseName(contextMenu.db, contextMenu.nodeKey)}.drop_constraint`;
                      break;
                    case "trigger":
                      sql = generateTriggerDDL(
                        contextMenu.type || "sqlserver",
                        "drop",
                        contextMenu.table,
                        contextMenu.schema,
                        contextMenu.itemData
                      );
                      title = `${getDatabaseName(contextMenu.db, contextMenu.nodeKey)}.drop_trigger`;
                      break;
                    case "index":
                      sql = generateIndexDDL(
                        contextMenu.type || "sqlserver",
                        "drop",
                        contextMenu.table,
                        contextMenu.schema,
                        contextMenu.itemData
                      );
                      title = `${getDatabaseName(contextMenu.db, contextMenu.nodeKey)}.drop_index`;
                      break;
                  }

                  if (sql) {
                    openDDLTab(
                      sql,
                      title,
                      contextMenu.connId,
                      contextMenu.type || "",
                      contextMenu.connName || "",
                      contextMenu.db || ""
                    );
                  }
                  setContextMenu(c => ({ ...c, visible: false }));
                }}
              >
                Drop {contextMenu.mode}
              </button>
              <button
                className="block w-full text-left px-3 py-1 hover:bg-blue-50 hover:text-blue-700 dark:hover:bg-blue-900/20 dark:hover:text-blue-300 transition-colors duration-150"
                onClick={() => {
                  if (
                    !contextMenu.connId ||
                    !contextMenu.schema ||
                    !contextMenu.table ||
                    !contextMenu.itemName
                  )
                    return;

                  let sql = "";
                  let title = "";

                  switch (contextMenu.mode) {
                    case "column":
                      sql = generateColumnDDL(
                        contextMenu.type || "sqlserver",
                        "update",
                        contextMenu.table,
                        contextMenu.schema,
                        contextMenu.itemData
                      );
                      title = `${getDatabaseName(contextMenu.db, contextMenu.nodeKey)}.modify_column`;
                      break;
                    case "key":
                      sql = generateKeyDDL(
                        contextMenu.type || "sqlserver",
                        "update",
                        contextMenu.table,
                        contextMenu.schema,
                        contextMenu.itemData
                      );
                      title = `${getDatabaseName(contextMenu.db, contextMenu.nodeKey)}.modify_key`;
                      break;
                    case "constraint":
                      sql = generateConstraintDDL(
                        contextMenu.type || "sqlserver",
                        "update",
                        contextMenu.table,
                        contextMenu.schema,
                        contextMenu.itemData
                      );
                      title = `${getDatabaseName(contextMenu.db, contextMenu.nodeKey)}.modify_constraint`;
                      break;
                    case "trigger":
                      sql = generateTriggerDDL(
                        contextMenu.type || "sqlserver",
                        "update",
                        contextMenu.table,
                        contextMenu.schema,
                        contextMenu.itemData
                      );
                      title = `${getDatabaseName(contextMenu.db, contextMenu.nodeKey)}.modify_trigger`;
                      break;
                    case "index":
                      sql = generateIndexDDL(
                        contextMenu.type || "sqlserver",
                        "update",
                        contextMenu.table,
                        contextMenu.schema,
                        contextMenu.itemData
                      );
                      title = `${getDatabaseName(contextMenu.db, contextMenu.nodeKey)}.modify_index`;
                      break;
                  }

                  if (sql) {
                    openDDLTab(
                      sql,
                      title,
                      contextMenu.connId,
                      contextMenu.type || "",
                      contextMenu.connName || "",
                      contextMenu.db || ""
                    );
                  }
                  setContextMenu(c => ({ ...c, visible: false }));
                }}
              >
                Modify {contextMenu.mode}
              </button>
            </>
          )}

          <button
            className="block w-full text-left px-3 py-1 hover:bg-blue-50 hover:text-blue-700 dark:hover:bg-blue-900/20 dark:hover:text-blue-300 transition-colors duration-150"
            onClick={() => setContextMenu(c => ({ ...c, visible: false }))}
          >
            Cancel
          </button>
        </div>
      )}

      {/* Submenu */}
      {submenu.visible && submenu.type === "new" && (
        <div
          className="fixed z-[60] border border-border rounded-lg shadow-lg text-sm bg-[hsl(var(--modal))] text-[hsl(var(--modal-foreground))] min-w-[120px]"
          style={{ top: submenu.y, left: submenu.x }}
          onMouseEnter={() => {
            // Cancel timeout when mouse enters submenu
            if (submenuTimeoutRef.current) {
              clearTimeout(submenuTimeoutRef.current);
              submenuTimeoutRef.current = null;
            }
          }}
          onMouseLeave={() => {
            setContextMenu(c => ({ ...c, visible: false }));
            setSubmenu({ visible: false });
          }}
        >
          <button
            className="block w-full text-left px-3 py-1 hover:bg-blue-50 hover:text-blue-700 dark:hover:bg-blue-900/20 dark:hover:text-blue-300 transition-colors duration-150"
            onClick={() => {
              if (
                !contextMenu.connId ||
                !contextMenu.schema ||
                !contextMenu.table
              )
                return;
              console.log("Submenu Column clicked - contextMenu state:", {
                db: contextMenu.db,
                nodeKey: contextMenu.nodeKey,
                connId: contextMenu.connId,
                schema: contextMenu.schema,
                table: contextMenu.table,
              });

              const sql = generateColumnDDL(
                contextMenu.type || "sqlserver",
                "create",
                contextMenu.table,
                contextMenu.schema
              );
              const dbName = getDatabaseName(
                contextMenu.db,
                contextMenu.nodeKey
              );
              console.log("Database name resolved to:", dbName);
              const title = `${dbName}.new_column`;
              console.log("Title constructed as:", title);

              openDDLTab(
                sql,
                title,
                contextMenu.connId,
                contextMenu.type || "",
                contextMenu.connName || "",
                dbName
              );
              setContextMenu(c => ({ ...c, visible: false }));
              setSubmenu({ visible: false });
            }}
          >
            Column
          </button>
          <button
            className="block w-full text-left px-3 py-1 hover:bg-blue-50 hover:text-blue-700 dark:hover:bg-blue-900/20 dark:hover:text-blue-300 transition-colors duration-150"
            onClick={() => {
              if (
                !contextMenu.connId ||
                !contextMenu.schema ||
                !contextMenu.table
              )
                return;
              const sql = generateKeyDDL(
                contextMenu.type || "sqlserver",
                "create",
                contextMenu.table,
                contextMenu.schema
              );
              const title = `${getDatabaseName(contextMenu.db, contextMenu.nodeKey)}.new_key`;
              openDDLTab(
                sql,
                title,
                contextMenu.connId,
                contextMenu.type || "",
                contextMenu.connName || "",
                getDatabaseName(contextMenu.db, contextMenu.nodeKey)
              );
              setContextMenu(c => ({ ...c, visible: false }));
              setSubmenu({ visible: false });
            }}
          >
            Key
          </button>
          <button
            className="block w-full text-left px-3 py-1 hover:bg-blue-50 hover:text-blue-700 dark:hover:bg-blue-900/20 dark:hover:text-blue-300 transition-colors duration-150"
            onClick={() => {
              if (
                !contextMenu.connId ||
                !contextMenu.schema ||
                !contextMenu.table
              )
                return;
              const sql = generateConstraintDDL(
                contextMenu.type || "sqlserver",
                "create",
                contextMenu.table,
                contextMenu.schema
              );
              const title = `${getDatabaseName(contextMenu.db, contextMenu.nodeKey)}.new_constraint`;
              openDDLTab(
                sql,
                title,
                contextMenu.connId,
                contextMenu.type || "",
                contextMenu.connName || "",
                getDatabaseName(contextMenu.db, contextMenu.nodeKey)
              );
              setContextMenu(c => ({ ...c, visible: false }));
              setSubmenu({ visible: false });
            }}
          >
            Constraint
          </button>
          <button
            className="block w-full text-left px-3 py-1 hover:bg-blue-50 hover:text-blue-700 dark:hover:bg-blue-900/20 dark:hover:text-blue-300 transition-colors duration-150"
            onClick={() => {
              if (
                !contextMenu.connId ||
                !contextMenu.schema ||
                !contextMenu.table
              )
                return;
              const sql = generateTriggerDDL(
                contextMenu.type || "sqlserver",
                "create",
                contextMenu.table,
                contextMenu.schema
              );
              const title = `${getDatabaseName(contextMenu.db, contextMenu.nodeKey)}.new_trigger`;
              openDDLTab(
                sql,
                title,
                contextMenu.connId,
                contextMenu.type || "",
                contextMenu.connName || "",
                getDatabaseName(contextMenu.db, contextMenu.nodeKey)
              );
              setContextMenu(c => ({ ...c, visible: false }));
              setSubmenu({ visible: false });
            }}
          >
            Trigger
          </button>
          <button
            className="block w-full text-left px-3 py-1 hover:bg-blue-50 hover:text-blue-700 dark:hover:bg-blue-900/20 dark:hover:text-blue-300 transition-colors duration-150"
            onClick={() => {
              if (
                !contextMenu.connId ||
                !contextMenu.schema ||
                !contextMenu.table
              )
                return;
              const sql = generateIndexDDL(
                contextMenu.type || "sqlserver",
                "create",
                contextMenu.table,
                contextMenu.schema
              );
              const title = `${getDatabaseName(contextMenu.db, contextMenu.nodeKey)}.new_index`;
              openDDLTab(
                sql,
                title,
                contextMenu.connId,
                contextMenu.type || "",
                contextMenu.connName || "",
                getDatabaseName(contextMenu.db, contextMenu.nodeKey)
              );
              setContextMenu(c => ({ ...c, visible: false }));
              setSubmenu({ visible: false });
            }}
          >
            Index
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
              className="w-full text-left px-3 py-2 text-xs text-red-600 dark:text-red-400 hover:bg-blue-50 hover:text-blue-700 dark:hover:bg-blue-900/20 dark:hover:text-blue-300 transition-colors duration-150 rounded"
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

      <CreateDatabaseDialog
        isOpen={isCreateDbDialogOpen}
        onClose={() => {
          setIsCreateDbDialogOpen(false);
          setCreateDbConnection(null);
        }}
        onSave={handleCreateDatabase}
        connectionId={createDbConnection?.id || ""}
        connectionType={createDbConnection?.type || ""}
        connectionName={createDbConnection?.name || ""}
      />
    </div>
  );
}
