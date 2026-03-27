import React, { useState, useEffect } from "react";

interface LoadChatDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onLoad: (chatId: string) => void;
  connections: Array<{ id: string; name: string; database?: string | null }>;
  engines: Array<{ id: string; name: string }>;
}

interface SavedChat {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  connectionId?: string;
  engineId?: string;
  database?: string | null;
  messageCount: number;
}

interface RawChatData {
  id?: string;
  title?: string;
  createdAt?: string;
  updatedAt?: string;
  connectionId?: string;
  engineId?: string;
  database?: string | null;
  messages?: unknown[];
}

export function LoadChatDialog({
  isOpen,
  onClose,
  onLoad,
  connections,
  engines,
}: LoadChatDialogProps) {
  const [savedChats, setSavedChats] = useState<SavedChat[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (isOpen) {
      loadSavedChats();
    }
  }, [isOpen]);

  const loadSavedChats = async () => {
    setIsLoading(true);
    try {
      const chats = await window.electronAPI.chat.loadList();

      // Validate and filter chat data
      const validChats = (chats || [])
        .filter((chat: RawChatData) => {
          return (
            chat &&
            chat.id &&
            chat.title &&
            Array.isArray(chat.messages) &&
            typeof chat.createdAt === "string"
          );
        })
        .map(
          (chat: RawChatData): SavedChat => ({
            id: chat.id!, // Safe because we validated these exist in the filter
            title: chat.title!,
            createdAt: chat.createdAt!,
            updatedAt: chat.updatedAt || chat.createdAt!,
            connectionId: chat.connectionId,
            engineId: chat.engineId,
            database: chat.database ?? null,
            messageCount: chat.messages ? chat.messages.length : 0,
          })
        );

      console.log(
        `Loaded ${validChats.length} valid chat sessions out of ${chats?.length || 0} total`
      );
      setSavedChats(validChats);
    } catch (error) {
      console.error("Failed to load saved chats:", error);
      setSavedChats([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoad = async () => {
    if (!selectedChatId) return;

    try {
      await onLoad(selectedChatId);
      onClose();
    } catch (error) {
      console.error("Failed to load chat:", error);
    }
  };

  const handleDelete = async (chatId: string, e: React.MouseEvent) => {
    e.stopPropagation();

    if (!confirm("Are you sure you want to delete this chat session?")) {
      return;
    }

    try {
      await window.electronAPI.chat.delete(chatId);
      setSavedChats(prev => prev.filter(chat => chat.id !== chatId));
      if (selectedChatId === chatId) {
        setSelectedChatId(null);
      }
    } catch (error) {
      console.error("Failed to delete chat:", error);
    }
  };

  const filteredChats = savedChats.filter(chat =>
    chat.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getConnectionName = (connectionId?: string) => {
    const connection = connections.find(c => c.id === connectionId);
    return connection?.name || "Unknown Connection";
  };

  const getEngineName = (engineId?: string) => {
    const engine = engines.find(e => e.id === engineId);
    return engine?.name || "Unknown Engine";
  };

  const formatDatabaseLabel = (
    database?: string | null,
    connectionId?: string
  ) => {
    const connection = connections.find(c => c.id === connectionId);
    const rawDatabase = database ?? connection?.database ?? null;

    let label = rawDatabase?.trim() ?? "";

    if (label) {
      const normalized = label.replace(/\\/g, "/");
      if (normalized.includes("/")) {
        const segments = normalized.split("/").filter(Boolean);
        if (segments.length > 0) {
          label = segments[segments.length - 1];
        } else {
          label = normalized;
        }
      } else {
        label = normalized;
      }
    }

    if (!label) {
      label = connection?.name ?? "";
    }

    const cleaned = label.trim();
    return cleaned.length > 0 ? cleaned : null;
  };

  const renderDatabasePill = (databaseLabel?: string | null) => {
    if (!databaseLabel) {
      return null;
    }

    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-blue-200/80 bg-blue-100/70 px-2 py-0.5 text-xs font-medium text-blue-700 transition-colors dark:border-blue-400/40 dark:bg-blue-500/15 dark:text-blue-100">
        {databaseLabel}
      </span>
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-4xl mx-4 max-h-[80vh] flex flex-col">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
              Load Chat Session
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search chat sessions..."
              className="w-full px-4 py-2 pl-10 border border-gray-300 dark:border-gray-600 rounded-md 
                       bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100
                       focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                       placeholder-gray-500 dark:placeholder-gray-400"
            />
            <svg
              className="absolute left-3 top-2.5 h-5 w-5 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <div className="flex items-center space-x-2 text-gray-500">
                <svg
                  className="animate-spin h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                    className="opacity-25"
                  ></circle>
                  <path
                    fill="currentColor"
                    className="opacity-75"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                <span>Loading saved chats...</span>
              </div>
            </div>
          ) : filteredChats.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              {savedChats.length === 0
                ? "No saved chat sessions found"
                : "No chats match your search"}
            </div>
          ) : (
            <div className="space-y-2">
              {filteredChats.map(chat => {
                const databaseLabel = formatDatabaseLabel(
                  chat.database,
                  chat.connectionId
                );

                return (
                  <div
                    key={chat.id}
                    onClick={() => setSelectedChatId(chat.id)}
                    className={`p-4 rounded-lg border cursor-pointer transition-colors hover:bg-gray-50 dark:hover:bg-gray-700 ${
                      selectedChatId === chat.id
                        ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                        : "border-gray-200 dark:border-gray-600"
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-gray-900 dark:text-gray-100 truncate">
                          {chat.title}
                        </h3>
                        <div className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                          <div className="flex items-center space-x-4">
                            <span>{chat.messageCount} messages</span>
                            <span>•</span>
                            <span>
                              Updated{" "}
                              {formatDate(chat.updatedAt || chat.createdAt)}
                            </span>
                          </div>
                          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
                            <span>
                              🔗 {getConnectionName(chat.connectionId)}
                            </span>
                            {databaseLabel ? (
                              <>
                                <span className="text-gray-400 dark:text-gray-500">
                                  •
                                </span>
                                {renderDatabasePill(databaseLabel)}
                              </>
                            ) : null}
                            <span className="text-gray-400 dark:text-gray-500">
                              •
                            </span>
                            <span>🤖 {getEngineName(chat.engineId)}</span>
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={e => handleDelete(chat.id, e)}
                        className="ml-2 p-1 text-gray-400 hover:text-red-600 dark:hover:text-red-400"
                        title="Delete chat session"
                      >
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                          />
                        </svg>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="p-6 border-t border-gray-200 dark:border-gray-700">
          <div className="flex justify-end space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 
                       bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 
                       rounded-md transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleLoad}
              disabled={!selectedChatId}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 
                       hover:bg-blue-700 rounded-md transition-colors
                       disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Load Chat
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
