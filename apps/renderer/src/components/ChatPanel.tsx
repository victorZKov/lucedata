import React, { useState, useEffect } from "react";

interface ToolCall {
  id: string;
  function: {
    name: string;
    arguments: string;
  };
}

interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: Date;
  toolCalls?: ToolCall[];
  finalSQL?: string;
}

interface Connection {
  id: string;
  name: string;
  type: string;
  database?: string;
}

interface AIEngine {
  id: string;
  name: string;
  provider: string;
  isDefault: boolean;
}

export default function ChatPanel() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [selectedConnection, setSelectedConnection] = useState<string | null>(
    null
  );
  const [selectedEngine, setSelectedEngine] = useState<string | null>(null);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [engines, setEngines] = useState<AIEngine[]>([]);
  const [loading, setLoading] = useState(false);
  const [showNewEngineDialog, setShowNewEngineDialog] = useState(false);

  // Load connections and engines on mount
  useEffect(() => {
    loadConnections();
    loadEngines();
  }, []);

  const loadConnections = async () => {
    try {
      const result = await window.electronAPI.connections.list();
      setConnections(result || []);

      // Auto-select first connection if available
      if (result && result.length > 0 && !selectedConnection) {
        setSelectedConnection(result[0].id);
      }
    } catch (error) {
      console.error("Failed to load connections:", error);
    }
  };

  const loadEngines = async () => {
    try {
      const result = await window.electronAPI.aiEngines.list();
      setEngines(result || []);

      // Auto-select default engine or first available
      if (result && result.length > 0 && !selectedEngine) {
        const defaultEngine = result.find(e => e.isDefault) || result[0];
        setSelectedEngine(defaultEngine.id);
      }
    } catch (error) {
      console.error("Failed to load AI engines:", error);
    }
  };

  const handleSend = async () => {
    if (!inputText.trim()) return;

    // Check if no engines exist - show new engine dialog
    if (engines.length === 0) {
      setShowNewEngineDialog(true);
      return;
    }

    if (!selectedConnection || !selectedEngine) {
      // Show error toast or notification
      console.warn("Please select both a database connection and AI engine");
      return;
    }

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: inputText,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText("");
    setLoading(true);

    try {
      // Send the message to the AI agent
      const response = await window.electronAPI.chat.sendMessage({
        message: inputText,
        connectionId: selectedConnection,
        engineId: selectedEngine,
        // TODO: Add conversation ID when implementing conversation history
      });

      const assistantMessage: ChatMessage = {
        id: response.id,
        role: response.role,
        content: response.content,
        timestamp: new Date(response.timestamp),
        finalSQL: response.finalSQL,
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error("Chat error:", error);
      const errorMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: "Sorry, I encountered an error processing your request.",
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="h-full flex flex-col bg-background">
      <div className="p-3 border-b border-border">
        <h2 className="text-sm font-medium text-foreground">AI Assistant</h2>
      </div>

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto p-3">
        <div className="space-y-3">
          {messages.length === 0 ? (
            <div className="text-xs text-muted-foreground text-center py-8">
              Ask me anything about your data...
            </div>
          ) : (
            messages.map(message => (
              <div
                key={message.id}
                className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[80%] px-3 py-2 rounded-lg text-sm ${
                    message.role === "user"
                      ? "bg-blue-600 text-white"
                      : "bg-muted text-foreground"
                  }`}
                >
                  <div className="whitespace-pre-wrap">{message.content}</div>
                  {message.finalSQL && (
                    <div className="mt-2 p-2 bg-slate-800 rounded font-mono text-xs text-green-400">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-slate-400">SQL Query:</span>
                        <button
                          className="text-blue-400 hover:text-blue-300 text-xs"
                          onClick={() => {
                            // TODO: Insert SQL to new tab
                            console.log(
                              "Insert SQL to new tab:",
                              message.finalSQL
                            );
                          }}
                        >
                          Insert SQL to New Tab
                        </button>
                      </div>
                      <pre className="whitespace-pre-wrap">
                        {message.finalSQL}
                      </pre>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
          {loading && (
            <div className="flex justify-start">
              <div className="bg-muted text-foreground px-3 py-2 rounded-lg text-sm">
                <div className="flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600"></div>
                  <span>Thinking...</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Chat Footer - Selectors and Input */}
      <div className="p-3 border-t border-border space-y-3">
        {/* Database and Engine Selectors */}
        <div className="flex space-x-2">
          <div className="flex-1">
            <label className="block text-xs text-muted-foreground mb-1">
              Database
            </label>
            <select
              value={selectedConnection || ""}
              onChange={e => setSelectedConnection(e.target.value || null)}
              className="w-full px-2 py-1 text-xs border border-border rounded bg-card text-foreground focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="">Select Database...</option>
              {connections.map(conn => (
                <option key={conn.id} value={conn.id}>
                  {conn.name} ({conn.type})
                </option>
              ))}
            </select>
          </div>

          <div className="flex-1">
            <label className="block text-xs text-muted-foreground mb-1">
              AI Engine
            </label>
            <select
              value={selectedEngine || ""}
              onChange={e => setSelectedEngine(e.target.value || null)}
              className="w-full px-2 py-1 text-xs border border-border rounded bg-card text-foreground focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="">Select Engine...</option>
              {engines.map(engine => (
                <option key={engine.id} value={engine.id}>
                  {engine.name} ({engine.provider}){engine.isDefault && " ⭐"}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Input Area */}
        <div>
          <textarea
            value={inputText}
            onChange={e => setInputText(e.target.value)}
            onKeyPress={handleKeyPress}
            className="w-full px-3 py-2 text-sm border border-border rounded bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
            placeholder="Ask me anything about your data..."
            rows={3}
            disabled={loading}
          />
          <div className="flex justify-end mt-2">
            <button
              onClick={handleSend}
              disabled={loading || !inputText.trim()}
              className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Sending..." : "Send"}
            </button>
          </div>
        </div>
      </div>

      {/* New Engine Dialog - placeholder for when no engines exist */}
      {showNewEngineDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-card p-6 rounded-lg border border-border max-w-md w-full mx-4">
            <h3 className="text-lg font-medium text-foreground mb-4">
              No AI Engines Configured
            </h3>
            <p className="text-sm text-muted-foreground mb-6">
              You need to configure at least one AI engine before you can start
              chatting. Would you like to add one now?
            </p>
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => setShowNewEngineDialog(false)}
                className="px-3 py-2 text-sm border border-border rounded hover:bg-muted"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowNewEngineDialog(false);
                  // TODO: Open AI Engines settings dialog
                  console.log("Open AI Engines settings");
                }}
                className="px-3 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Add AI Engine
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
