import { useState } from "react";
import { createPortal } from "react-dom";
import { Dialog } from "@headlessui/react";
import { XMarkIcon } from "@heroicons/react/24/outline";

import { useTheme } from "../contexts/ThemeContext";

interface CreateDatabaseFormData {
  name: string;
  collation?: string;
  owner?: string;
  template?: string;
  encoding?: string;
}

interface CreateDatabaseDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: CreateDatabaseFormData) => Promise<void>;
  connectionId: string;
  connectionType: string;
  connectionName: string;
}

const CreateDatabaseDialog: React.FC<CreateDatabaseDialogProps> = ({
  isOpen,
  onClose,
  onSave,
  connectionId: _connectionId,
  connectionType,
  connectionName,
}) => {
  const { theme } = useTheme();
  const [formData, setFormData] = useState<CreateDatabaseFormData>({
    name: "",
    collation: "",
    owner: "",
    template: "",
    encoding: "",
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      setError("Database name is required");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await onSave(formData);
      // Reset form
      setFormData({
        name: "",
        collation: "",
        owner: "",
        template: "",
        encoding: "",
      });
      onClose();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to create database"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      name: "",
      collation: "",
      owner: "",
      template: "",
      encoding: "",
    });
    setError(null);
    onClose();
  };

  const isPostgreSQL = connectionType === "postgresql";
  const isSqlServer = connectionType === "sqlserver";
  const isMySQL = connectionType === "mysql";

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
                Create Database
              </Dialog.Title>
              <button
                onClick={handleCancel}
                className="text-muted-foreground hover:text-foreground"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>

            <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-md">
              <p className="text-sm text-blue-700 dark:text-blue-300">
                <strong>Connection:</strong> {connectionName} ({connectionType})
              </p>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-100 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
                <p className="text-sm text-red-600 dark:text-red-400">
                  {error}
                </p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Database Name */}
              <div>
                <label className="block text-sm font-medium text-foreground/80 mb-1">
                  Database Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={e =>
                    setFormData(prev => ({ ...prev, name: e.target.value }))
                  }
                  className="w-full px-3 py-2 border border-border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-card text-foreground placeholder:text-muted-foreground"
                  placeholder="my_new_database"
                  required
                />
              </div>

              {/* PostgreSQL specific fields */}
              {isPostgreSQL && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-foreground/80 mb-1">
                      Owner
                    </label>
                    <input
                      type="text"
                      value={formData.owner}
                      onChange={e =>
                        setFormData(prev => ({
                          ...prev,
                          owner: e.target.value,
                        }))
                      }
                      className="w-full px-3 py-2 border border-border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-card text-foreground placeholder:text-muted-foreground"
                      placeholder="postgres"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground/80 mb-1">
                      Template
                    </label>
                    <select
                      value={formData.template}
                      onChange={e =>
                        setFormData(prev => ({
                          ...prev,
                          template: e.target.value,
                        }))
                      }
                      className="w-full px-3 py-2 border border-border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-card text-foreground"
                    >
                      <option value="">template1 (default)</option>
                      <option value="template0">template0</option>
                      <option value="template1">template1</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground/80 mb-1">
                      Encoding
                    </label>
                    <select
                      value={formData.encoding}
                      onChange={e =>
                        setFormData(prev => ({
                          ...prev,
                          encoding: e.target.value,
                        }))
                      }
                      className="w-full px-3 py-2 border border-border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-card text-foreground"
                    >
                      <option value="">UTF8 (default)</option>
                      <option value="UTF8">UTF8</option>
                      <option value="LATIN1">LATIN1</option>
                      <option value="SQL_ASCII">SQL_ASCII</option>
                    </select>
                  </div>
                </>
              )}

              {/* SQL Server specific fields */}
              {isSqlServer && (
                <div>
                  <label className="block text-sm font-medium text-foreground/80 mb-1">
                    Collation
                  </label>
                  <select
                    value={formData.collation}
                    onChange={e =>
                      setFormData(prev => ({
                        ...prev,
                        collation: e.target.value,
                      }))
                    }
                    className="w-full px-3 py-2 border border-border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-card text-foreground"
                  >
                    <option value="">
                      SQL_Latin1_General_CP1_CI_AS (default)
                    </option>
                    <option value="SQL_Latin1_General_CP1_CI_AS">
                      SQL_Latin1_General_CP1_CI_AS
                    </option>
                    <option value="SQL_Latin1_General_CP1_CS_AS">
                      SQL_Latin1_General_CP1_CS_AS
                    </option>
                    <option value="Latin1_General_CI_AS">
                      Latin1_General_CI_AS
                    </option>
                    <option value="Latin1_General_CS_AS">
                      Latin1_General_CS_AS
                    </option>
                  </select>
                </div>
              )}

              {/* MySQL specific fields */}
              {isMySQL && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-foreground/80 mb-1">
                      Character Set
                    </label>
                    <select
                      value={formData.encoding}
                      onChange={e =>
                        setFormData(prev => ({
                          ...prev,
                          encoding: e.target.value,
                        }))
                      }
                      className="w-full px-3 py-2 border border-border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-card text-foreground"
                    >
                      <option value="">utf8mb4 (default)</option>
                      <option value="utf8mb4">utf8mb4</option>
                      <option value="utf8">utf8</option>
                      <option value="latin1">latin1</option>
                      <option value="ascii">ascii</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground/80 mb-1">
                      Collation
                    </label>
                    <select
                      value={formData.collation}
                      onChange={e =>
                        setFormData(prev => ({
                          ...prev,
                          collation: e.target.value,
                        }))
                      }
                      className="w-full px-3 py-2 border border-border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-card text-foreground"
                    >
                      <option value="">utf8mb4_unicode_ci (default)</option>
                      <option value="utf8mb4_unicode_ci">
                        utf8mb4_unicode_ci
                      </option>
                      <option value="utf8mb4_general_ci">
                        utf8mb4_general_ci
                      </option>
                      <option value="utf8_unicode_ci">utf8_unicode_ci</option>
                      <option value="utf8_general_ci">utf8_general_ci</option>
                    </select>
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
                  {isSubmitting ? "Creating..." : "Create Database"}
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

export default CreateDatabaseDialog;
