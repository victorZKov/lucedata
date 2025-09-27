import React, { useState, useEffect } from "react";
import { PlusIcon, PencilIcon, TrashIcon } from "@heroicons/react/24/outline";

import ConnectionDialog from "../ConnectionDialog";

interface ConnectionFormData {
  name: string;
  type: "postgresql" | "sqlserver" | "mysql" | "sqlite";
  host: string;
  port: string;
  database: string;
  username: string;
  password: string;
  ssl: boolean;
  connectionString?: string;
  useConnectionString?: boolean;
}

interface Connection extends ConnectionFormData {
  id: string;
  createdAt: string;
  lastUsed?: string;
}

const ConnectionsSettings: React.FC = () => {
  const [connections, setConnections] = useState<Connection[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editConnection, setEditConnection] = useState<Connection | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load connections on mount
  useEffect(() => {
    loadConnections();
  }, []);

  const loadConnections = async () => {
    try {
      setIsLoading(true);
      const loadedConnections = await window.electronAPI?.connections?.list();
      setConnections(loadedConnections || []);
    } catch (error) {
      console.error("Failed to load connections:", error);
      setConnections([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveConnection = async (connectionData: ConnectionFormData) => {
    try {
      if (editConnection) {
        // Update existing connection
        await window.electronAPI?.connections?.save({
          ...connectionData,
          id: editConnection.id,
        });
      } else {
        // Create new connection
        await window.electronAPI?.connections?.save(connectionData);
      }

      // Reload connections
      await loadConnections();

      // Close dialog and reset edit state
      setIsDialogOpen(false);
      setEditConnection(null);
    } catch (_error) {
      throw new Error("Failed to save connection");
    }
  };

  const handleEditConnection = (connection: Connection) => {
    // Ensure useConnectionString is set properly based on whether connectionString exists
    const editData = {
      ...connection,
      useConnectionString:
        !!connection.connectionString &&
        connection.connectionString.trim().length > 0,
    };
    setEditConnection(editData);
    setIsDialogOpen(true);
  };

  const handleDeleteConnection = async (connection: Connection) => {
    if (
      window.confirm(
        `Are you sure you want to delete the connection "${connection.name}"?`
      )
    ) {
      try {
        await window.electronAPI?.connections?.delete(connection.id);
        await loadConnections();
      } catch (error) {
        console.error("Failed to delete connection:", error);
      }
    }
  };

  const handleTestConnection = async (connection: Connection) => {
    try {
      const result = await window.electronAPI?.connections?.test(connection);
      if (result?.success) {
        alert("Connection successful!");
      } else {
        alert(`Connection failed: ${result?.message || "Unknown error"}`);
      }
    } catch (error) {
      alert(`Connection failed: ${error}`);
    }
  };

  const formatLastUsed = (lastUsed?: string) => {
    if (!lastUsed) return "Never";
    const date = new Date(lastUsed);
    return date.toLocaleDateString() + " " + date.toLocaleTimeString();
  };

  const getTypeIcon = (type: string) => {
    const iconClass = "w-8 h-8 rounded";
    switch (type) {
      case "postgresql":
        return (
          <img
            src="https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/postgresql/postgresql-original.svg"
            alt="PostgreSQL"
            className={iconClass}
          />
        );
      case "sqlserver":
        return (
          <img
            src="https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/microsoftsqlserver/microsoftsqlserver-plain.svg"
            alt="SQL Server"
            className={iconClass}
          />
        );
      case "mysql":
        return (
          <img
            src="https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/mysql/mysql-original.svg"
            alt="MySQL"
            className={iconClass}
          />
        );
      case "sqlite":
        return (
          <img
            src="https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/sqlite/sqlite-original.svg"
            alt="SQLite"
            className={iconClass}
          />
        );
      default:
        return (
          <div className="w-8 h-8 rounded bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
            <span className="text-xs text-gray-500">DB</span>
          </div>
        );
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
          Database Connections
        </h3>
        <button
          onClick={() => {
            setEditConnection(null);
            setIsDialogOpen(true);
          }}
          className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <PlusIcon className="h-4 w-4 mr-2" />
          Add Connection
        </button>
      </div>

      {isLoading ? (
        <div className="text-center py-8">
          <div className="text-gray-500 dark:text-gray-400">
            Loading connections...
          </div>
        </div>
      ) : connections.length === 0 ? (
        <div className="text-center py-8">
          <div className="text-gray-500 dark:text-gray-400 mb-4">
            No database connections configured
          </div>
          <button
            onClick={() => {
              setEditConnection(null);
              setIsDialogOpen(true);
            }}
            className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <PlusIcon className="h-4 w-4 mr-2" />
            Add Your First Connection
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {connections.map(connection => (
            <div
              key={connection.id}
              className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  {getTypeIcon(connection.type)}
                  <div>
                    <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {connection.name}
                    </h4>
                    <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
                      <div>
                        <span className="capitalize">{connection.type}</span>
                        {connection.type !== "sqlite" &&
                          !connection.useConnectionString && (
                            <>
                              {" • "}
                              {connection.host}:{connection.port}
                            </>
                          )}
                      </div>
                      <div>Database: {connection.database}</div>
                      <div>
                        Last used: {formatLastUsed(connection.lastUsed)}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handleTestConnection(connection)}
                    className="px-3 py-1 text-xs font-medium text-green-700 dark:text-green-300 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-md hover:bg-green-100 dark:hover:bg-green-900/30 focus:outline-none focus:ring-2 focus:ring-green-500"
                  >
                    Test
                  </button>

                  <button
                    onClick={() => handleEditConnection(connection)}
                    className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                    title="Edit connection"
                  >
                    <PencilIcon className="h-4 w-4" />
                  </button>

                  <button
                    onClick={() => handleDeleteConnection(connection)}
                    className="p-2 text-red-400 hover:text-red-600 dark:hover:text-red-300"
                    title="Delete connection"
                  >
                    <TrashIcon className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Connection Dialog */}
      <ConnectionDialog
        isOpen={isDialogOpen}
        onClose={() => {
          setIsDialogOpen(false);
          setEditConnection(null);
        }}
        onSave={handleSaveConnection}
        editConnection={editConnection}
      />

      {/* Connection Settings */}
      <div className="pt-6 border-t border-gray-200 dark:border-gray-700">
        <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-4">
          Connection Settings
        </h4>

        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="autoConnect"
              defaultChecked={false}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <label
              htmlFor="autoConnect"
              className="text-sm text-gray-700 dark:text-gray-300"
            >
              Auto-connect to last used connection on startup
            </label>
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="rememberPassword"
              defaultChecked={true}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <label
              htmlFor="rememberPassword"
              className="text-sm text-gray-700 dark:text-gray-300"
            >
              Remember passwords (stored encrypted)
            </label>
          </div>

          <div className="space-y-2">
            <label className="text-sm text-gray-700 dark:text-gray-300">
              Connection timeout (seconds)
            </label>
            <input
              type="number"
              defaultValue={30}
              min={5}
              max={120}
              className="block w-24 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConnectionsSettings;
