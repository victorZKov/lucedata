import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Dialog } from "@headlessui/react";
import { XMarkIcon } from "@heroicons/react/24/outline";

import { useTheme } from "../contexts/ThemeContext";

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

interface ConnectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (connection: ConnectionFormData) => Promise<void>;
  editConnection?: ConnectionFormData | null; // For editing existing connections
}

const ConnectionDialog: React.FC<ConnectionDialogProps> = ({
  isOpen,
  onClose,
  onSave,
  editConnection,
}) => {
  const { theme } = useTheme();
  const [formData, setFormData] = useState<ConnectionFormData>({
    name: "",
    type: "postgresql",
    host: "localhost",
    port: "5432",
    database: "",
    username: "",
    password: "",
    ssl: false,
    connectionString: "",
    useConnectionString: false,
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Effect to populate form when editing
  useEffect(() => {
    if (editConnection) {
      setFormData({
        ...editConnection,
        password: "", // Don't pre-populate password for security
      });
    } else {
      // Reset form for new connection
      setFormData({
        name: "",
        type: "postgresql",
        host: "localhost",
        port: "5432",
        database: "",
        username: "",
        password: "",
        ssl: false,
        connectionString: "",
        useConnectionString: false,
      });
    }
  }, [editConnection, isOpen]);

  const handleTypeChange = (type: ConnectionFormData["type"]) => {
    const defaultPorts = {
      postgresql: "5432",
      sqlserver: "1433",
      mysql: "3306",
      sqlite: "",
    };

    setFormData(prev => ({
      ...prev,
      type,
      port: defaultPorts[type],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      await onSave(formData);
      setFormData({
        name: "",
        type: "postgresql",
        host: "localhost",
        port: "5432",
        database: "",
        username: "",
        password: "",
        ssl: false,
        connectionString: "",
        useConnectionString: false,
      });
      onClose();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to save connection"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      name: "",
      type: "postgresql",
      host: "localhost",
      port: "5432",
      database: "",
      username: "",
      password: "",
      ssl: false,
      connectionString: "",
      useConnectionString: false,
    });
    setError(null);
    onClose();
  };

  const content = (
    <Dialog
      open={isOpen}
      onClose={handleCancel}
      className="relative z-[3000] opacity-100"
    >
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/60 z-[3000]" aria-hidden="true" />

      {/* Panel container */}
      <div className="fixed inset-0 z-[3010] flex items-center justify-center p-4 opacity-100">
        <Dialog.Panel
          className="relative w-full max-w-md rounded-lg bg-modal text-modal-foreground p-6 shadow-2xl border border-border dark:border-white/10 opacity-100 isolate mix-blend-normal overflow-hidden"
          style={{ backgroundColor: theme === "dark" ? "#111318" : "#ffffff" }}
        >
          <div
            className="absolute inset-0"
            style={{
              backgroundColor: theme === "dark" ? "#111318" : "#ffffff",
            }}
            aria-hidden="true"
          />
          <div className="relative">
            <div className="flex items-center justify-between mb-4">
              <Dialog.Title
                as="h3"
                className="text-lg font-semibold text-foreground"
              >
                {editConnection
                  ? "Edit Database Connection"
                  : "Add Database Connection"}
              </Dialog.Title>
              <button
                onClick={handleCancel}
                className="text-muted-foreground hover:text-foreground"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-100 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
                <p className="text-sm text-red-600 dark:text-red-400">
                  {error}
                </p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Connection Name */}
              <div>
                <label className="block text-sm font-medium text-foreground/80 mb-1">
                  Connection Name
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={e =>
                    setFormData(prev => ({ ...prev, name: e.target.value }))
                  }
                  className="w-full px-3 py-2 border border-border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-card text-foreground placeholder:text-muted-foreground"
                  placeholder="My Database"
                  required
                />
              </div>

              {/* Database Type */}
              <div>
                <label className="block text-sm font-medium text-foreground/80 mb-1">
                  Database Type
                </label>
                <select
                  value={formData.type}
                  onChange={e =>
                    handleTypeChange(
                      e.target.value as ConnectionFormData["type"]
                    )
                  }
                  className="w-full px-3 py-2 border border-border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-card text-foreground"
                >
                  <option value="postgresql">PostgreSQL</option>
                  <option value="sqlserver">SQL Server</option>
                  <option value="mysql">MySQL</option>
                  <option value="sqlite">SQLite</option>
                </select>
              </div>

              {/* Connection String Option (for supported databases) */}
              {(formData.type === "sqlserver" ||
                formData.type === "postgresql") && (
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="useConnectionString"
                    checked={formData.useConnectionString}
                    onChange={e =>
                      setFormData(prev => ({
                        ...prev,
                        useConnectionString: e.target.checked,
                      }))
                    }
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-border rounded"
                  />
                  <label
                    htmlFor="useConnectionString"
                    className="ml-2 block text-sm text-foreground/80"
                  >
                    Use connection string
                  </label>
                </div>
              )}

              {/* Connection String Field */}
              {formData.useConnectionString &&
                (formData.type === "sqlserver" ||
                  formData.type === "postgresql") && (
                  <div>
                    <label className="block text-sm font-medium text-foreground/80 mb-1">
                      Connection String
                    </label>
                    <textarea
                      value={formData.connectionString}
                      onChange={e =>
                        setFormData(prev => ({
                          ...prev,
                          connectionString: e.target.value,
                        }))
                      }
                      className="w-full px-3 py-2 border border-border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-card text-foreground placeholder:text-muted-foreground"
                      placeholder="Server=myserver.database.windows.net;Database=mydatabase;User Id=myusername;Password=mypassword;Encrypt=true;"
                      rows={3}
                      required
                    />
                    <p className="mt-1 text-xs text-muted-foreground">
                      Enter your complete connection string. This will override
                      individual connection parameters.
                    </p>
                  </div>
                )}

              {/* Host and Port (not for SQLite and when using connection string) */}
              {formData.type !== "sqlite" && !formData.useConnectionString && (
                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-foreground/80 mb-1">
                      Host
                    </label>
                    <input
                      type="text"
                      value={formData.host}
                      onChange={e =>
                        setFormData(prev => ({ ...prev, host: e.target.value }))
                      }
                      className="w-full px-3 py-2 border border-border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-card text-foreground placeholder:text-muted-foreground"
                      placeholder="localhost"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground/80 mb-1">
                      Port
                    </label>
                    <input
                      type="text"
                      value={formData.port}
                      onChange={e =>
                        setFormData(prev => ({ ...prev, port: e.target.value }))
                      }
                      className="w-full px-3 py-2 border border-border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-card text-foreground placeholder:text-muted-foreground"
                      required
                    />
                  </div>
                </div>
              )}

              {/* Database */}
              {!formData.useConnectionString && (
                <div>
                  <label className="block text-sm font-medium text-foreground/80 mb-1">
                    {formData.type === "sqlite"
                      ? "Database File Path"
                      : "Database Name"}
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={formData.database}
                      onChange={e =>
                        setFormData(prev => ({
                          ...prev,
                          database: e.target.value,
                        }))
                      }
                      className="flex-1 px-3 py-2 border border-border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-card text-foreground placeholder:text-muted-foreground"
                      placeholder={
                        formData.type === "sqlite"
                          ? "/path/to/database.db"
                          : "database_name"
                      }
                      required
                    />
                    {formData.type === "sqlite" && (
                      <button
                        type="button"
                        onClick={() => {
                          setFormData(prev => ({
                            ...prev,
                            database: "{{APP_DATA}}/sqlhelper.db",
                            name: prev.name || "SQLHelper Project Database",
                          }));
                        }}
                        className="px-3 py-2 text-xs font-medium text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-md hover:bg-blue-100 dark:hover:bg-blue-900/30 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        title="Use project's internal SQLite database"
                      >
                        Project DB
                      </button>
                    )}
                  </div>
                  {formData.type === "sqlite" &&
                    formData.database === "{{APP_DATA}}/sqlhelper.db" && (
                      <p className="mt-1 text-xs text-green-600 dark:text-green-400">
                        ✓ This will connect to the SQLHelper project's internal
                        database
                      </p>
                    )}
                </div>
              )}

              {/* Username and Password (not for SQLite and when using connection string) */}
              {formData.type !== "sqlite" && !formData.useConnectionString && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-foreground/80 mb-1">
                      Username
                    </label>
                    <input
                      type="text"
                      value={formData.username}
                      onChange={e =>
                        setFormData(prev => ({
                          ...prev,
                          username: e.target.value,
                        }))
                      }
                      className="w-full px-3 py-2 border border-border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-card text-foreground placeholder:text-muted-foreground"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground/80 mb-1">
                      Password
                    </label>
                    <input
                      type="password"
                      value={formData.password}
                      onChange={e =>
                        setFormData(prev => ({
                          ...prev,
                          password: e.target.value,
                        }))
                      }
                      className="w-full px-3 py-2 border border-border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-card text-foreground placeholder:text-muted-foreground"
                    />
                  </div>

                  {/* SSL Option */}
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="ssl"
                      checked={formData.ssl}
                      onChange={e =>
                        setFormData(prev => ({
                          ...prev,
                          ssl: e.target.checked,
                        }))
                      }
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-border rounded"
                    />
                    <label
                      htmlFor="ssl"
                      className="ml-2 block text-sm text-foreground/80"
                    >
                      Use SSL
                    </label>
                  </div>
                </>
              )}

              {/* Form Actions */}
              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={handleCancel}
                  className="px-4 py-2 text-sm font-medium text-foreground bg-muted border border-border rounded-md shadow-sm hover:bg-accent focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={isSubmitting}
                >
                  {isSubmitting
                    ? "Saving..."
                    : editConnection
                      ? "Update Connection"
                      : "Save Connection"}
                </button>
              </div>
            </form>
          </div>
        </Dialog.Panel>
      </div>
    </Dialog>
  );

  if (typeof document === "undefined") return content;
  return createPortal(content, document.body);
};

export default ConnectionDialog;
