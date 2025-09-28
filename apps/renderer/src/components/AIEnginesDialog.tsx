import { useState, useEffect } from "react";
import { Dialog } from "@headlessui/react";
import { XMarkIcon } from "@heroicons/react/24/outline";

import { useTheme } from "../contexts/ThemeContext";

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

interface AIEnginesDialogProps {
  isOpen: boolean;
  onClose: () => void;
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
  openai: ["gpt-4o", "4o-mini", "gpt-4-turbo", "gpt-3.5-turbo"],
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

export default function AIEnginesDialog({
  isOpen,
  onClose,
}: AIEnginesDialogProps) {
  const { theme } = useTheme();
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
  const [ollamaModels, setOllamaModels] = useState<string[]>([
    ...MODELS_BY_PROVIDER.ollama,
  ]);

  // Load engines on component mount
  useEffect(() => {
    if (isOpen) {
      loadEngines();
    }
  }, [isOpen]);

  const loadEngines = async () => {
    try {
      setLoading(true);
      const result = await window.electronAPI.aiEngines.list();
      setEngines(result);
    } catch (error) {
      console.error("Failed to load AI engines:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchOllamaModels = async (baseUrl?: string) => {
    try {
      console.log("🦙 Fetching Ollama models...");
      const models = await window.electronAPI.ollama.fetchModels(baseUrl);
      console.log("🦙 Received models:", models);
      setOllamaModels(models);
      return models;
    } catch (error) {
      console.error("Failed to fetch Ollama models:", error);
      // Fall back to default models if fetching fails
      setOllamaModels([...MODELS_BY_PROVIDER.ollama]);
      return [...MODELS_BY_PROVIDER.ollama];
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
    } catch (error) {
      console.error("Failed to save AI engine:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this AI engine?")) {
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

      const result = await window.electronAPI.aiEngines.test(engine.id);

      setTestResults(prev => ({
        ...prev,
        [engine.id]: {
          success: result.success,
          message:
            result.error ||
            `Test completed ${result.latency ? `(${result.latency}ms)` : ""}`,
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
  };

  const getProviderLabel = (provider: string) => {
    return PROVIDERS.find(p => p.value === provider)?.label || provider;
  };

  const selectedProvider = PROVIDERS.find(
    p => p.value === editingEngine?.provider
  );
  const availableModels = editingEngine?.provider
    ? editingEngine.provider === "ollama"
      ? ollamaModels
      : MODELS_BY_PROVIDER[
          editingEngine.provider as keyof typeof MODELS_BY_PROVIDER
        ] || []
    : [];

  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      className="relative z-[3000] opacity-100"
    >
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/60 z-[3000]" aria-hidden="true" />

      {/* Panel container */}
      <div className="fixed inset-0 z-[3010] flex items-center justify-center p-4 opacity-100">
        <Dialog.Panel
          className="relative w-full max-w-4xl max-h-[90vh] rounded-lg bg-modal text-modal-foreground shadow-2xl border border-border dark:border-white/10 opacity-100 isolate mix-blend-normal overflow-hidden"
          style={{ backgroundColor: theme === "dark" ? "#111318" : "#ffffff" }}
        >
          <div
            className="absolute inset-0"
            style={{
              backgroundColor: theme === "dark" ? "#111318" : "#ffffff",
            }}
          />
          <div className="relative">
            {/* Header */}
            <div className="border-b px-6 py-4">
              <div className="flex items-center justify-between">
                <Dialog.Title className="text-lg font-semibold">
                  AI Engines
                </Dialog.Title>
                <button
                  onClick={onClose}
                  className="text-muted-foreground hover:text-foreground"
                  aria-label="Close"
                >
                  <XMarkIcon className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="flex h-[600px]">
              {/* Engine List */}
              <div className="w-1/2 border-r">
                <div className="p-4 border-b">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium">Configured Engines</h3>
                    <button
                      onClick={() => startEdit()}
                      className="px-3 py-1 text-sm bg-primary text-primary-foreground rounded hover:bg-primary/90"
                      disabled={loading}
                    >
                      Add Engine
                    </button>
                  </div>
                </div>
                <div className="overflow-y-auto h-full p-4">
                  {loading && engines.length === 0 ? (
                    <div className="text-center text-muted-foreground py-8">
                      Loading engines...
                    </div>
                  ) : engines.length === 0 ? (
                    <div className="text-center text-muted-foreground py-8">
                      No AI engines configured.
                      <br />
                      <button
                        onClick={() => startEdit()}
                        className="text-primary hover:underline mt-2"
                      >
                        Add your first engine
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {engines.map(engine => (
                        <div
                          key={engine.id}
                          className="border rounded-lg p-3 hover:bg-accent/50 transition-colors"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <h4 className="font-medium">{engine.name}</h4>
                                {engine.isDefault && (
                                  <span className="px-2 py-0.5 text-xs bg-green-100 text-green-800 rounded">
                                    Default
                                  </span>
                                )}
                              </div>
                              <p className="text-sm text-muted-foreground">
                                {getProviderLabel(engine.provider)} •{" "}
                                {engine.defaultModel || "No model set"}
                              </p>
                              {testResults[engine.id] && (
                                <div
                                  className={`text-xs mt-1 ${
                                    testResults[engine.id].success
                                      ? "text-green-600"
                                      : "text-red-600"
                                  }`}
                                >
                                  {testResults[engine.id].message}
                                </div>
                              )}
                            </div>
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => handleTest(engine)}
                                className="p-1 hover:bg-accent rounded text-xs"
                                title="Test Connection"
                                disabled={loading}
                              >
                                🔧
                              </button>
                              <button
                                onClick={() => startEdit(engine)}
                                className="p-1 hover:bg-accent rounded text-xs"
                                title="Edit"
                                disabled={loading}
                              >
                                ✏️
                              </button>
                              <button
                                onClick={() => handleDelete(engine.id)}
                                className="p-1 hover:bg-accent rounded text-xs text-red-600"
                                title="Delete"
                                disabled={loading}
                              >
                                🗑️
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Edit Form */}
              <div className="w-1/2">
                {editingEngine ? (
                  <div className="p-4 h-full overflow-y-auto">
                    <h3 className="font-medium mb-4">
                      {isEditing ? "Edit Engine" : "Add Engine"}
                    </h3>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium mb-1">
                          Name
                        </label>
                        <input
                          type="text"
                          value={editingEngine.name || ""}
                          onChange={e =>
                            setEditingEngine(prev => ({
                              ...prev,
                              name: e.target.value,
                            }))
                          }
                          className="w-full px-3 py-2 border border-border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-card text-foreground placeholder:text-muted-foreground"
                          placeholder="My OpenAI Engine"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-1">
                          Provider
                        </label>
                        <select
                          value={editingEngine.provider || "openai"}
                          onChange={async e => {
                            const newProvider = e.target.value;
                            setEditingEngine(prev => ({
                              ...prev,
                              provider: newProvider,
                              defaultModel: "", // Reset model when provider changes
                            }));

                            // Fetch Ollama models when Ollama is selected
                            if (newProvider === "ollama") {
                              await fetchOllamaModels();
                            }
                          }}
                          className="w-full px-3 py-2 border border-border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-card text-foreground"
                        >
                          {PROVIDERS.map(provider => (
                            <option key={provider.value} value={provider.value}>
                              {provider.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-1">
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
                          className="w-full px-3 py-2 border border-border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-card text-foreground"
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
                          <label className="block text-sm font-medium mb-1">
                            API Key
                          </label>
                          <input
                            type="password"
                            value={apiKey}
                            onChange={e => setApiKey(e.target.value)}
                            className="w-full px-3 py-2 border border-border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-card text-foreground placeholder:text-muted-foreground"
                            placeholder="sk-... (will be stored securely)"
                          />
                          <p className="text-xs text-muted-foreground mt-1">
                            API keys are stored securely in your system keychain
                          </p>
                        </div>
                      )}

                      {(editingEngine.provider === "azure-openai" ||
                        editingEngine.provider === "ollama" ||
                        editingEngine.provider === "custom") && (
                        <div>
                          <label className="block text-sm font-medium mb-1">
                            {editingEngine.provider === "azure-openai"
                              ? "Azure Endpoint"
                              : editingEngine.provider === "ollama"
                                ? "Ollama Base URL"
                                : "API Endpoint"}
                          </label>
                          <div className="flex gap-2">
                            <input
                              type="url"
                              value={editingEngine.endpoint || ""}
                              onChange={e =>
                                setEditingEngine(prev => ({
                                  ...prev,
                                  endpoint: e.target.value,
                                }))
                              }
                              className="flex-1 px-3 py-2 border border-border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-card text-foreground placeholder:text-muted-foreground"
                              placeholder={
                                editingEngine.provider === "azure-openai"
                                  ? "https://your-resource.openai.azure.com"
                                  : editingEngine.provider === "ollama"
                                    ? "http://localhost:11434"
                                    : "https://api.example.com"
                              }
                            />
                            {editingEngine.provider === "ollama" && (
                              <button
                                type="button"
                                onClick={() =>
                                  fetchOllamaModels(
                                    editingEngine.endpoint || undefined
                                  )
                                }
                                className="px-3 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                title="Refresh Ollama models"
                              >
                                🔄
                              </button>
                            )}
                          </div>
                        </div>
                      )}

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium mb-1">
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
                            className="w-full px-3 py-2 border border-border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-card text-foreground"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-1">
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
                            className="w-full px-3 py-2 border border-border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-card text-foreground"
                          />
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
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
                          className="w-4 h-4"
                        />
                        <label htmlFor="isDefault" className="text-sm">
                          Set as default engine
                        </label>
                      </div>

                      <div className="flex gap-2 pt-4">
                        <button
                          onClick={handleSave}
                          disabled={
                            loading ||
                            !editingEngine.name ||
                            !editingEngine.provider
                          }
                          className="px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90 disabled:opacity-50"
                        >
                          {loading
                            ? "Saving..."
                            : isEditing
                              ? "Update"
                              : "Create"}
                        </button>
                        <button
                          onClick={() => {
                            setEditingEngine(null);
                            setIsEditing(false);
                          }}
                          className="px-4 py-2 border rounded hover:bg-accent"
                          disabled={loading}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-8 text-center text-muted-foreground">
                    <p>Select an engine to edit or add a new one</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
}
