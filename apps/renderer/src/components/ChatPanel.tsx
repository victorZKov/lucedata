import React, { useState, useEffect, useRef } from "react";

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
  isSuggestion?: boolean;
  suggestedSQL?: string;
}

interface SavedChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: string | Date;
  toolCalls?: ToolCall[];
  finalSQL?: string;
  isSuggestion?: boolean;
  suggestedSQL?: string;
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
  defaultModel?: string;
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
  const [currentConversationId, setCurrentConversationId] = useState<
    string | null
  >(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load connections and engines on mount
  useEffect(() => {
    loadConnections();
    loadEngines();

    // Listen for AI engines updates
    const handleEnginesUpdated = () => {
      console.log("🔄 AI Engines updated, refreshing chat panel engines...");
      loadEngines();
    };

    // Listen for database connections updates
    const handleConnectionsUpdated = () => {
      console.log(
        "🔄 Database connections updated, refreshing chat panel connections..."
      );
      loadConnections();
    };

    // Listen for window focus to refresh data (fallback)
    const handleWindowFocus = () => {
      console.log("🔄 Window focused, refreshing chat panel data...");
      loadConnections();
      loadEngines();
    };

    // Chat management event handlers
    const handleNewChat = () => {
      console.log("🔄 New chat requested, clearing messages...");
      setMessages([]);
      setInputText("");
      setCurrentConversationId(null); // Clear conversation ID for new chat
    };

    const handleLoadChat = (event: CustomEvent) => {
      console.log("🔄 Load chat requested:", event.detail);
      try {
        const chatData = event.detail;
        if (chatData && Array.isArray(chatData.messages)) {
          // Convert string timestamps back to Date objects and validate message structure
          const messagesWithDates: ChatMessage[] = chatData.messages
            .filter(
              (msg: SavedChatMessage) =>
                msg && msg.id && msg.role && msg.content
            ) // Filter out invalid messages
            .map((msg: SavedChatMessage) => ({
              ...msg,
              timestamp:
                typeof msg.timestamp === "string"
                  ? new Date(msg.timestamp)
                  : msg.timestamp,
            }));

          console.log(
            `🔄 Loading ${messagesWithDates.length} messages from chat: ${chatData.title || chatData.id}`
          );
          setMessages(messagesWithDates);
          setCurrentConversationId(chatData.id); // Set the conversation ID

          if (chatData.connectionId) {
            setSelectedConnection(chatData.connectionId);
          }
          if (chatData.engineId) {
            setSelectedEngine(chatData.engineId);
          }
        } else {
          console.warn("🔄 Invalid chat data received:", chatData);
        }
      } catch (error) {
        console.error("🔄 Error loading chat:", error);
      }
    };

    document.addEventListener("ai-engines-updated", handleEnginesUpdated);
    document.addEventListener(
      "database-connections-updated",
      handleConnectionsUpdated
    );
    document.addEventListener("new-chat", handleNewChat);
    document.addEventListener("load-chat", handleLoadChat as EventListener);
    window.addEventListener("focus", handleWindowFocus);

    return () => {
      document.removeEventListener("ai-engines-updated", handleEnginesUpdated);
      document.removeEventListener(
        "database-connections-updated",
        handleConnectionsUpdated
      );
      document.removeEventListener("new-chat", handleNewChat);
      document.removeEventListener(
        "load-chat",
        handleLoadChat as EventListener
      );
      window.removeEventListener("focus", handleWindowFocus);
    };
  }, []);

  // Auto-scroll to bottom when new messages are added
  useEffect(() => {
    // Use scrollTop instead of scrollIntoView to avoid scrolling the entire page
    if (messagesEndRef.current?.parentElement) {
      const container = messagesEndRef.current.parentElement;
      container.scrollTop = container.scrollHeight;
    }

    // Notify Layout about message updates
    document.dispatchEvent(
      new CustomEvent("chat-messages-updated", {
        detail: messages.map(msg => ({
          id: msg.id,
          role: msg.role,
          content: msg.content,
          timestamp: msg.timestamp.toISOString(),
          finalSQL: msg.finalSQL,
        })),
      })
    );
  }, [messages]);

  // Notify Layout about context changes
  useEffect(() => {
    document.dispatchEvent(
      new CustomEvent("chat-context-updated", {
        detail: {
          connectionId: selectedConnection,
          engineId: selectedEngine,
        },
      })
    );
  }, [selectedConnection, selectedEngine]);

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
      console.log("🤖 Loaded AI engines:", result);
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
        conversationId: currentConversationId || undefined, // Pass conversation ID for context
      });

      const assistantMessage: ChatMessage = {
        id: response.id,
        role: response.role,
        content: response.content,
        timestamp: new Date(response.timestamp),
        finalSQL: response.finalSQL,
      };

      // Update conversation ID if returned from the backend (for auto-created conversations)
      if (
        response.conversationId &&
        response.conversationId !== currentConversationId
      ) {
        console.log(
          "📝 Updating conversation ID from response:",
          response.conversationId
        );
        setCurrentConversationId(response.conversationId);
      }

      setMessages(prev => [...prev, assistantMessage]);

      // Add suggestion message if SQL was generated
      if (response.finalSQL && selectedConnection) {
        const suggestionMessage: ChatMessage = {
          id: crypto.randomUUID(),
          role: "assistant",
          content: "Would you like me to run this query for you?",
          timestamp: new Date(),
          isSuggestion: true,
          suggestedSQL: response.finalSQL,
        };

        setTimeout(() => {
          setMessages(prev => [...prev, suggestionMessage]);
        }, 500); // Small delay to make it feel more natural
      }
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
    <div className="h-full flex flex-col bg-background min-h-0">
      <div className="p-3 border-b border-border flex-shrink-0">
        <h2 className="text-sm font-medium text-foreground">AI Assistant</h2>
      </div>

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto p-3 min-h-0">
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
                      : message.isSuggestion
                        ? "bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 text-foreground"
                        : "bg-muted text-foreground"
                  }`}
                >
                  <div className="whitespace-pre-wrap">{message.content}</div>

                  {/* Suggestion Action Buttons */}
                  {message.isSuggestion && message.suggestedSQL && (
                    <div className="mt-3 flex gap-2">
                      <button
                        className="px-3 py-1 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded flex items-center gap-1 transition-colors"
                        onClick={async () => {
                          if (
                            window.electronAPI?.createSqlTab &&
                            selectedConnection
                          ) {
                            try {
                              const connection = connections.find(
                                conn => conn.id === selectedConnection
                              );
                              await window.electronAPI.createSqlTab({
                                sql: message.suggestedSQL!,
                                connectionId: connection?.id,
                                connectionName: connection?.name,
                                connectionType: connection?.type,
                                database: connection?.database,
                                autoExecute: true,
                              });
                              // Remove the suggestion message after action
                              setMessages(prev =>
                                prev.filter(m => m.id !== message.id)
                              );
                            } catch (error) {
                              console.error(
                                "Failed to run suggested query:",
                                error
                              );
                            }
                          }
                        }}
                      >
                        ▶ Yes, run it
                      </button>
                      <button
                        className="px-3 py-1 text-xs bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded transition-colors"
                        onClick={() => {
                          // Remove the suggestion message
                          setMessages(prev =>
                            prev.filter(m => m.id !== message.id)
                          );
                        }}
                      >
                        No, thanks
                      </button>
                    </div>
                  )}
                  {message.finalSQL && (
                    <div className="mt-2 p-2 bg-slate-800 rounded font-mono text-xs text-green-400">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-slate-400">SQL Query:</span>
                        <div className="flex gap-2">
                          {/* Run Query Button */}
                          <button
                            className="text-green-400 hover:text-green-300 text-xs px-2 py-1 rounded bg-slate-700 hover:bg-slate-600 flex items-center gap-1"
                            onClick={async () => {
                              console.log("🔥 RUN BUTTON CLICKED");
                              console.log("Debug info:", {
                                hasSQL: !!message.finalSQL,
                                hasElectronAPI: !!window.electronAPI,
                                hasCreateSqlTab:
                                  !!window.electronAPI?.createSqlTab,
                                hasSelectedConnection: !!selectedConnection,
                              });
                              console.log(
                                "🔥 Available electronAPI methods:",
                                Object.keys(window.electronAPI || {})
                              );
                              console.log(
                                "🔥 createSqlTab type:",
                                typeof window.electronAPI?.createSqlTab
                              );
                              // Debug: check all methods to see which ones are there
                              console.log(
                                "🔥 Full electronAPI object:",
                                window.electronAPI
                              );
                              if (
                                message.finalSQL &&
                                window.electronAPI?.createSqlTab &&
                                selectedConnection
                              ) {
                                try {
                                  const connection = connections.find(
                                    conn => conn.id === selectedConnection
                                  );
                                  console.log("🔥 CALLING createSqlTab with:", {
                                    sql: message.finalSQL,
                                    connectionId: connection?.id,
                                    connectionName: connection?.name,
                                    connectionType: connection?.type,
                                    database: connection?.database,
                                  });
                                  await window.electronAPI.createSqlTab({
                                    sql: message.finalSQL,
                                    connectionId: connection?.id,
                                    connectionName: connection?.name,
                                    connectionType: connection?.type,
                                    database: connection?.database,
                                    autoExecute: true,
                                  });
                                  console.log(
                                    "🔥 SQL inserted to new tab for execution"
                                  );
                                } catch (error) {
                                  console.error(
                                    "🔥 Failed to run SQL query:",
                                    error
                                  );
                                }
                              } else {
                                console.log(
                                  "🔥 RUN BUTTON: Missing requirements"
                                );
                              }
                            }}
                            title="Insert SQL to new tab and run"
                          >
                            ▶
                          </button>

                          {/* Copy SQL Button */}
                          <button
                            className="text-blue-400 hover:text-blue-300 text-xs px-2 py-1 rounded bg-slate-700 hover:bg-slate-600 flex items-center gap-1"
                            onClick={async () => {
                              if (message.finalSQL) {
                                try {
                                  await navigator.clipboard.writeText(
                                    message.finalSQL
                                  );
                                  console.log("SQL copied to clipboard");
                                } catch (error) {
                                  console.error("Failed to copy SQL:", error);
                                  // Fallback for older browsers
                                  const textArea =
                                    document.createElement("textarea");
                                  textArea.value = message.finalSQL;
                                  document.body.appendChild(textArea);
                                  textArea.select();
                                  document.execCommand("copy");
                                  document.body.removeChild(textArea);
                                }
                              }
                            }}
                            title="Copy SQL to clipboard"
                          >
                            📋
                          </button>

                          {/* Insert to New Tab Button */}
                          <button
                            className="text-yellow-400 hover:text-yellow-300 text-xs px-2 py-1 rounded bg-slate-700 hover:bg-slate-600"
                            onClick={async () => {
                              console.log("📄 INSERT BUTTON CLICKED");
                              console.log("Debug info:", {
                                hasSQL: !!message.finalSQL,
                                hasElectronAPI: !!window.electronAPI,
                                hasCreateSqlTab:
                                  !!window.electronAPI?.createSqlTab,
                                hasSelectedConnection: !!selectedConnection,
                              });
                              if (
                                message.finalSQL &&
                                window.electronAPI?.createSqlTab &&
                                selectedConnection
                              ) {
                                try {
                                  const connection = connections.find(
                                    conn => conn.id === selectedConnection
                                  );
                                  console.log("📄 CALLING createSqlTab with:", {
                                    sql: message.finalSQL,
                                    connectionId: connection?.id,
                                    connectionName: connection?.name,
                                    connectionType: connection?.type,
                                    database: connection?.database,
                                  });
                                  await window.electronAPI.createSqlTab({
                                    sql: message.finalSQL,
                                    connectionId: connection?.id,
                                    connectionName: connection?.name,
                                    connectionType: connection?.type,
                                    database: connection?.database,
                                    autoExecute: false,
                                  });
                                  console.log(
                                    "📄 SQL inserted to new tab successfully"
                                  );
                                } catch (error) {
                                  console.error(
                                    "📄 Failed to create SQL tab:",
                                    error
                                  );
                                }
                              } else {
                                console.log(
                                  "📄 INSERT BUTTON: Missing requirements"
                                );
                              }
                            }}
                            title="Insert SQL to new tab"
                          >
                            📄
                          </button>
                        </div>
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
        <div ref={messagesEndRef} />
      </div>

      {/* Chat Footer - Selectors and Input */}
      <div className="p-3 border-t border-border space-y-3 flex-shrink-0">
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
                  {engine.name} - {engine.defaultModel || "No model"} (
                  {engine.provider}){engine.isDefault && " ⭐"}
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
                  // Open Settings dialog on AI Engines tab
                  document.dispatchEvent(new CustomEvent("open-settings"));
                  setTimeout(() => {
                    document.dispatchEvent(
                      new CustomEvent("settings-tab-change", {
                        detail: { tab: "ai-engines" },
                      })
                    );
                  }, 100);
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
