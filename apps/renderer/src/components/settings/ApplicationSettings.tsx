import React from "react";

import { useTheme } from "../../contexts/ThemeContext";

const ApplicationSettings: React.FC = () => {
  const { mode, setMode } = useTheme();

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
          Application Settings
        </h3>
      </div>

      {/* Theme Settings */}
      <div className="space-y-4">
        <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100">
          Appearance
        </h4>
        <div className="space-y-2">
          <label className="text-sm text-gray-700 dark:text-gray-300">
            Theme
          </label>
          <select
            value={mode}
            onChange={e =>
              setMode(e.target.value as "system" | "light" | "dark")
            }
            className="block w-full max-w-xs px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
          >
            <option value="system">Auto (System)</option>
            <option value="light">Light</option>
            <option value="dark">Dark</option>
          </select>
        </div>
      </div>

      {/* Auto-save Settings */}
      <div className="space-y-4">
        <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100">
          Auto-save
        </h4>
        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            id="autoSave"
            defaultChecked={true}
            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <label
            htmlFor="autoSave"
            className="text-sm text-gray-700 dark:text-gray-300"
          >
            Auto-save chat sessions
          </label>
        </div>
      </div>

      {/* Query Settings */}
      <div className="space-y-4">
        <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100">
          Query Execution
        </h4>
        <div className="space-y-3">
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="confirmDestructive"
              defaultChecked={true}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <label
              htmlFor="confirmDestructive"
              className="text-sm text-gray-700 dark:text-gray-300"
            >
              Confirm destructive operations (DELETE, DROP, etc.)
            </label>
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="limitResults"
              defaultChecked={true}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <label
              htmlFor="limitResults"
              className="text-sm text-gray-700 dark:text-gray-300"
            >
              Limit query results (default: 1000 rows)
            </label>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm text-gray-700 dark:text-gray-300">
            Query timeout (seconds)
          </label>
          <input
            type="number"
            defaultValue={30}
            min={5}
            max={300}
            className="block w-24 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
          />
        </div>
      </div>

      {/* Privacy & Security */}
      <div className="space-y-4">
        <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100">
          Privacy & Security
        </h4>
        <div className="space-y-3">
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="clearOnExit"
              defaultChecked={false}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <label
              htmlFor="clearOnExit"
              className="text-sm text-gray-700 dark:text-gray-300"
            >
              Clear sensitive data on exit
            </label>
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="enableAuditLog"
              defaultChecked={true}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <label
              htmlFor="enableAuditLog"
              className="text-sm text-gray-700 dark:text-gray-300"
            >
              Enable audit logging
            </label>
          </div>
        </div>
      </div>

      {/* About Section */}
      <div className="pt-6 border-t border-gray-200 dark:border-gray-700">
        <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-3">
          About SQL Helper
        </h4>
        <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
          <p>Version: 1.0.0</p>
          <p>Built with Electron & React</p>
          <p>© 2024 SQL Helper</p>
        </div>
      </div>

      {/* Migration action */}
      <div className="pt-6 border-t border-gray-200 dark:border-gray-700">
        <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-3">
          Migration
        </h4>
        <div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
            Move your existing configuration to a different storage backend
            (sqlite, postgresql, sqlserver).
          </p>
          <button
            className="inline-flex items-center px-3 py-2 rounded-md bg-blue-600 text-white text-sm font-medium hover:bg-blue-700"
            onClick={() => {
              // Signal the App to open the FirstRun wizard in migrate mode
              try {
                document.dispatchEvent(new CustomEvent("open-first-run-wizard", { detail: { mode: 'migrate' } }));
              } catch (e) {
                console.error("Failed to open first-run wizard", e);
              }
            }}
          >
            Migrate configuration...
          </button>
        </div>
      </div>
    </div>
  );
};

export default ApplicationSettings;
