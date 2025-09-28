import React, { useState, useEffect } from "react";
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  Cog6ToothIcon,
} from "@heroicons/react/24/outline";

interface AIEngine {
  id: string;
  name: string;
  provider: string;
  endpoint?: string | null;
  apiKeyRef?: string | null;
  defaultModel?: string | null;
  temperature?: number | null;
  maxTokens?: number | null;
  timeoutMs?: number | null;
  retryPolicy?: string | null;
  jsonMode?: boolean | null;
  rateLimit?: number | null;
  notes?: string | null;
  isDefault?: boolean | null;
  createdAt?: string | null;
  updatedAt?: string | null;
}

const PROVIDERS = [
  { value: "openai", label: "OpenAI", requiresApiKey: true },
  { value: "anthropic", label: "Anthropic", requiresApiKey: true },
  { value: "google", label: "Google AI", requiresApiKey: true },
  { value: "azure-openai", label: "Azure OpenAI", requiresApiKey: true },
  { value: "ollama", label: "Ollama", requiresApiKey: false },
  { value: "custom", label: "Custom", requiresApiKey: true },
] as const;

const MODELS_BY_PROVIDER = {
  openai: ["gpt-4o", "gpt-4o-mini", "gpt-4-turbo", "gpt-3.5-turbo"],
  anthropic: [
    "claude-3-5-sonnet-20241022",
    "claude-3-5-haiku-20241022",
    "claude-3-opus-20240229",
  ],
  google: ["gemini-1.5-pro", "gemini-1.5-flash", "gemini-pro"],
  "azure-openai": [
    "model-router",
    "gpt-5-mini",
    "gpt-4o",
    "4o-mini",
    "gpt-4",
    "gpt-35-turbo",
  ],
  ollama: ["mistral:7b", "codellama:13b-instruct", "phi3:14b", "qwen3:30b"],
  custom: [],
} as const;

const AIEnginesSettings: React.FC = () => {
  const [engines, setEngines] = useState<AIEngine[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingEngine, setEditingEngine] = useState<Partial<AIEngine> | null>(
    null
  );
  const [isEditing, setIsEditing] = useState(false);
  const [testResults, setTestResults] = useState<
    Record<string, { success: boolean; message: string }>
  >({});
  const [apiKey, setApiKey] = useState("");
  const [showEditForm, setShowEditForm] = useState(false);

  // Load engines on component mount
  useEffect(() => {
    loadEngines();
  }, []);

  const loadEngines = async () => {
    try {
      setLoading(true);
      const result = await window.electronAPI.aiEngines.list();
      setEngines(result || []);
    } catch (error) {
      console.error("Failed to load AI engines:", error);
      setEngines([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!editingEngine?.name || !editingEngine?.provider) {
      return;
    }

    try {
      setLoading(true);
      const engineData = {
        ...editingEngine,
        temperature: editingEngine.temperature ?? 0.7,
        maxTokens: editingEngine.maxTokens ?? 2048,
        timeoutMs: editingEngine.timeoutMs ?? 30000,
        retryPolicy: editingEngine.retryPolicy ?? "exponential",
        jsonMode: editingEngine.jsonMode ?? false,
        rateLimit: editingEngine.rateLimit ?? 60,
        isDefault: editingEngine.isDefault ?? false,
        // Include API key if provided
        ...(apiKey.trim() ? { apiKey } : {}),
      };

      if (isEditing && editingEngine.id) {
        await window.electronAPI.aiEngines.update(editingEngine.id, engineData);
      } else {
        await window.electronAPI.aiEngines.create(engineData);
      }

      await loadEngines();
      setEditingEngine(null);
      setIsEditing(false);
      setApiKey("");
      setShowEditForm(false);
    } catch (error) {
      console.error("Failed to save AI engine:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this AI engine?")) {
      return;
    }

    try {
      setLoading(true);
      await window.electronAPI.aiEngines.delete(id);
      await loadEngines();
    } catch (error) {
      console.error("Failed to delete AI engine:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleTest = async (engine: AIEngine) => {
    try {
      setTestResults(prev => ({
        ...prev,
        [engine.id]: { success: false, message: "Testing..." },
      }));

      const result = await window.electronAPI.aiEngines.test(engine);

      setTestResults(prev => ({
        ...prev,
        [engine.id]: {
          success: result.success,
          message: `Test completed ${result.latency ? `(${result.latency}ms)` : ""}`,
        },
      }));
    } catch (error) {
      setTestResults(prev => ({
        ...prev,
        [engine.id]: {
          success: false,
          message: error instanceof Error ? error.message : "Test failed",
        },
      }));
    }
  };

  const startEdit = (engine?: AIEngine) => {
    if (engine) {
      setEditingEngine({ ...engine });
      setIsEditing(true);
    } else {
      setEditingEngine({
        name: "",
        provider: "openai",
        defaultModel: "",
        endpoint: "",
        temperature: 0.7,
        maxTokens: 2048,
        timeoutMs: 30000,
        retryPolicy: "exponential",
        jsonMode: false,
        rateLimit: 60,
        isDefault: false,
      });
      setIsEditing(false);
    }
    setApiKey("");
    setShowEditForm(true);
  };

  const getProviderLabel = (provider: string) => {
    return PROVIDERS.find(p => p.value === provider)?.label || provider;
  };

  const getProviderIcon = (provider: string) => {
    const iconClass = "w-8 h-8 rounded";
    switch (provider) {
      case "openai":
        return (
          <div className="w-8 h-8 rounded bg-black flex items-center justify-center">
            <svg viewBox="0 0 24 24" className="w-5 h-5 fill-white">
              <path d="M22.2819 9.8211a5.9847 5.9847 0 0 0-.5157-4.9108 6.0462 6.0462 0 0 0-6.5098-2.9A6.0651 6.0651 0 0 0 4.9807 4.1818a5.9847 5.9847 0 0 0-3.9977 2.9 6.0462 6.0462 0 0 0 .7427 7.0966 5.98 5.98 0 0 0 .511 4.9107 6.051 6.051 0 0 0 6.5146 2.9001A5.9847 5.9847 0 0 0 13.2599 24a6.0557 6.0557 0 0 0 5.7718-4.2058 5.9894 5.9894 0 0 0 3.9977-2.9001 6.0557 6.0557 0 0 0-.7475-7.0729zm-9.022 12.6081a4.4755 4.4755 0 0 1-2.8764-1.0408l.1419-.0804 4.7783-2.7582a.7948.7948 0 0 0 .3927-.6813v-6.7369l2.02 1.1686a.071.071 0 0 1 .038.052v5.5826a4.504 4.504 0 0 1-4.4945 4.4944zm-9.6607-4.1254a4.4708 4.4708 0 0 1-.5346-3.0137l.142.0852 4.783 2.7582a.7712.7712 0 0 0 .7806 0l5.8428-3.3685v2.3324a.0804.0804 0 0 1-.0332.0615L9.74 19.9502a4.4992 4.4992 0 0 1-6.1408-1.6464zM2.3408 7.8956a4.485 4.485 0 0 1 2.3655-1.9728V11.6a.7664.7664 0 0 0 .3879.6765l5.8144 3.3543-2.0201 1.1685a.0757.0757 0 0 1-.071 0l-4.8303-2.7865A4.504 4.504 0 0 1 2.3408 7.872zm16.5963 3.8558L13.1038 8.364 15.1192 7.2a.0757.0757 0 0 1 .071 0l4.8303 2.7913a4.4944 4.4944 0 0 1-.6765 8.1042v-5.6772a.79.79 0 0 0-.407-.667zm2.0107-3.0231l-.142-.0852-4.7735-2.7818a.7759.7759 0 0 0-.7854 0L9.409 9.2297V6.8974a.0662.0662 0 0 1 .0284-.0615l4.8303-2.7866a4.4992 4.4992 0 0 1 6.6802 4.66zM8.3065 12.863l-2.02-1.1638a.0804.0804 0 0 1-.038-.0567V6.0742a4.4992 4.4992 0 0 1 7.3757-3.4537l-.142.0805L8.704 5.459a.7948.7948 0 0 0-.3927.6813zm1.0976-2.3654l2.602-1.4998 2.6069 1.4998v2.9994l-2.5974 1.4997-2.6067-1.4997Z" />
            </svg>
          </div>
        );
      case "anthropic":
        return (
          <div className="w-8 h-8 rounded bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center">
            <span className="text-white font-bold text-sm">A</span>
          </div>
        );
      case "google":
        return (
          <img
            src="https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/google/google-original.svg"
            alt="Google AI"
            className={iconClass}
          />
        );
      case "azure-openai":
        return (
          <img
            src="https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/azure/azure-original.svg"
            alt="Azure OpenAI"
            className={iconClass}
          />
        );
      case "ollama":
        return (
          <div className="w-8 h-8 rounded bg-gradient-to-br from-gray-700 to-black flex items-center justify-center">
            <span className="text-white font-bold text-xs">🦙</span>
          </div>
        );
      case "custom":
        return (
          <div className="w-8 h-8 rounded border-2 border-dashed border-gray-300 dark:border-gray-600 flex items-center justify-center">
            <svg
              className="w-4 h-4 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
          </div>
        );
      default:
        return (
          <div className="w-8 h-8 rounded bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
            <span className="text-xs text-gray-500">AI</span>
          </div>
        );
    }
  };

  const selectedProvider = PROVIDERS.find(
    p => p.value === editingEngine?.provider
  );
  const availableModels = editingEngine?.provider
    ? MODELS_BY_PROVIDER[
        editingEngine.provider as keyof typeof MODELS_BY_PROVIDER
      ] || []
    : [];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
          AI Engines
        </h3>
        <button
          onClick={() => startEdit()}
          className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <PlusIcon className="h-4 w-4 mr-2" />
          Add Engine
        </button>
      </div>

      {loading && engines.length === 0 ? (
        <div className="text-center py-8">
          <div className="text-gray-500 dark:text-gray-400">
            Loading AI engines...
          </div>
        </div>
      ) : engines.length === 0 ? (
        <div className="text-center py-8">
          <div className="text-gray-500 dark:text-gray-400 mb-4">
            No AI engines configured
          </div>
          <button
            onClick={() => startEdit()}
            className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <PlusIcon className="h-4 w-4 mr-2" />
            Add Your First AI Engine
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {engines.map(engine => (
            <div
              key={engine.id}
              className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  {getProviderIcon(engine.provider)}
                  <div>
                    <div className="flex items-center space-x-2">
                      <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {engine.name}
                      </h4>
                      {engine.isDefault && (
                        <span className="px-2 py-0.5 text-xs bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-300 rounded">
                          Default
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
                      <div>
                        {getProviderLabel(engine.provider)} •{" "}
                        {engine.defaultModel || "No model set"}
                      </div>
                      <div>
                        Temperature: {engine.temperature || 0.7} • Max Tokens:{" "}
                        {engine.maxTokens || 2048}
                      </div>
                      {testResults[engine.id] && (
                        <div
                          className={`${testResults[engine.id].success ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}
                        >
                          {testResults[engine.id].message}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handleTest(engine)}
                    className="px-3 py-1 text-xs font-medium text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-md hover:bg-blue-100 dark:hover:bg-blue-900/30 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={loading}
                  >
                    Test
                  </button>

                  <button
                    onClick={() => startEdit(engine)}
                    className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                    title="Edit engine"
                  >
                    <PencilIcon className="h-4 w-4" />
                  </button>

                  <button
                    onClick={() => handleDelete(engine.id)}
                    className="p-2 text-red-400 hover:text-red-600 dark:hover:text-red-300"
                    title="Delete engine"
                  >
                    <TrashIcon className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit Form */}
      {showEditForm && editingEngine && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-lg font-medium text-gray-900 dark:text-gray-100">
              {isEditing ? "Edit Engine" : "Add Engine"}
            </h4>
            <button
              onClick={() => {
                setShowEditForm(false);
                setEditingEngine(null);
                setIsEditing(false);
              }}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              ✕
            </button>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Name
              </label>
              <input
                type="text"
                value={editingEngine.name || ""}
                onChange={e =>
                  setEditingEngine(prev => ({ ...prev, name: e.target.value }))
                }
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                placeholder="My OpenAI Engine"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Provider
              </label>
              <select
                value={editingEngine.provider || "openai"}
                onChange={e =>
                  setEditingEngine(prev => ({
                    ...prev,
                    provider: e.target.value,
                    defaultModel: "",
                  }))
                }
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              >
                {PROVIDERS.map(provider => (
                  <option key={provider.value} value={provider.value}>
                    {provider.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Default Model
              </label>
              <select
                value={editingEngine.defaultModel || ""}
                onChange={e =>
                  setEditingEngine(prev => ({
                    ...prev,
                    defaultModel: e.target.value,
                  }))
                }
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              >
                <option value="">Select a model</option>
                {availableModels.map(model => (
                  <option key={model} value={model}>
                    {model}
                  </option>
                ))}
              </select>
            </div>

            {selectedProvider?.requiresApiKey && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  API Key
                </label>
                <input
                  type="password"
                  value={apiKey}
                  onChange={e => setApiKey(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  placeholder="sk-... (stored securely)"
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Temperature
              </label>
              <input
                type="number"
                min="0"
                max="2"
                step="0.1"
                value={editingEngine.temperature || 0.7}
                onChange={e =>
                  setEditingEngine(prev => ({
                    ...prev,
                    temperature: parseFloat(e.target.value),
                  }))
                }
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Max Tokens
              </label>
              <input
                type="number"
                min="1"
                value={editingEngine.maxTokens || 2048}
                onChange={e =>
                  setEditingEngine(prev => ({
                    ...prev,
                    maxTokens: parseInt(e.target.value),
                  }))
                }
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              />
            </div>
          </div>

          {(editingEngine.provider === "azure-openai" ||
            editingEngine.provider === "ollama" ||
            editingEngine.provider === "custom") && (
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {editingEngine.provider === "azure-openai"
                  ? "Azure Endpoint"
                  : editingEngine.provider === "ollama"
                    ? "Ollama Base URL"
                    : "API Endpoint"}
              </label>
              <input
                type="url"
                value={editingEngine.endpoint || ""}
                onChange={e =>
                  setEditingEngine(prev => ({
                    ...prev,
                    endpoint: e.target.value,
                  }))
                }
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                placeholder={
                  editingEngine.provider === "azure-openai"
                    ? "https://your-resource.openai.azure.com"
                    : editingEngine.provider === "ollama"
                      ? "http://localhost:11434"
                      : "https://api.example.com"
                }
              />
            </div>
          )}

          <div className="mt-4 flex items-center">
            <input
              type="checkbox"
              id="isDefault"
              checked={editingEngine.isDefault ?? false}
              onChange={e =>
                setEditingEngine(prev => ({
                  ...prev,
                  isDefault: e.target.checked,
                }))
              }
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <label
              htmlFor="isDefault"
              className="ml-2 text-sm text-gray-700 dark:text-gray-300"
            >
              Set as default engine
            </label>
          </div>

          <div className="mt-6 flex justify-end space-x-3">
            <button
              onClick={() => {
                setShowEditForm(false);
                setEditingEngine(null);
                setIsEditing(false);
              }}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={
                loading || !editingEngine.name || !editingEngine.provider
              }
              className="px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Saving..." : isEditing ? "Update" : "Create"}
            </button>
          </div>
        </div>
      )}

      {/* Global AI Settings */}
      <div className="pt-6 border-t border-gray-200 dark:border-gray-700">
        <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-4 flex items-center">
          <Cog6ToothIcon className="h-4 w-4 mr-2" />
          Global AI Settings
        </h4>

        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="enableAIAssist"
              defaultChecked={true}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <label
              htmlFor="enableAIAssist"
              className="text-sm text-gray-700 dark:text-gray-300"
            >
              Enable AI assistance for SQL queries
            </label>
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="autoOptimize"
              defaultChecked={false}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <label
              htmlFor="autoOptimize"
              className="text-sm text-gray-700 dark:text-gray-300"
            >
              Auto-suggest query optimizations
            </label>
          </div>

          <div className="space-y-2">
            <label className="text-sm text-gray-700 dark:text-gray-300">
              Response timeout (seconds)
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

export default AIEnginesSettings;
