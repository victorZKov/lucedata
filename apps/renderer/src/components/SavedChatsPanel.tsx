import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type KeyboardEvent,
  type MouseEvent,
  useRef,
} from "react";
import {
  RefreshCw,
  Search,
  Trash2,
  X,
  Pin,
  PinOff,
  Pencil,
  Check,
} from "lucide-react";

interface SavedChatsPanelProps {
  isVisible: boolean;
  refreshToken: number;
  onClose: () => void;
  onLoad: (chatId: string) => Promise<void> | void;
  connections: Array<{
    id: string;
    name: string;
    database?: string | null;
  }>;
}

interface SavedChatSummary {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  connectionId?: string;
  engineId?: string;
  database?: string | null;
  messageCount: number;
  pinned: boolean;
}

interface RawChatSummary {
  id?: string;
  title?: string;
  createdAt?: string;
  updatedAt?: string;
  connectionId?: string;
  engineId?: string;
  database?: string | null;
  messageCount?: number;
  pinned?: boolean;
}

export function SavedChatsPanel({
  isVisible,
  refreshToken,
  onClose,
  onLoad,
  connections,
}: SavedChatsPanelProps) {
  const [savedChats, setSavedChats] = useState<SavedChatSummary[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<string>("");
  const [editingChatId, setEditingChatId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState<string>("");

  const editInputRef = useRef<HTMLInputElement | null>(null);

  const sortChats = useCallback((chats: SavedChatSummary[]) => {
    return [...chats].sort((a, b) => {
      if (a.pinned !== b.pinned) {
        return a.pinned ? -1 : 1;
      }

      const dateA = new Date(a.updatedAt || a.createdAt).getTime();
      const dateB = new Date(b.updatedAt || b.createdAt).getTime();
      return dateB - dateA;
    });
  }, []);

  const loadSavedChats = useCallback(async () => {
    setIsLoading(true);
    try {
      const chats = await window.electronAPI.chat.loadList();

      const summaries = (Array.isArray(chats) ? chats : [])
        .filter((chat: RawChatSummary) =>
          Boolean(chat && chat.id && chat.title && chat.createdAt)
        )
        .map(
          (chat: RawChatSummary): SavedChatSummary => ({
            id: chat.id!,
            title: chat.title!,
            createdAt: chat.createdAt!,
            updatedAt: chat.updatedAt || chat.createdAt!,
            connectionId: chat.connectionId,
            engineId: chat.engineId,
            database: chat.database ?? null,
            messageCount: chat.messageCount ?? 0,
            pinned: Boolean(chat.pinned),
          })
        );

      setSavedChats(sortChats(summaries));
      setEditingChatId(null);
      setEditingTitle("");
      setLastRefreshedAt(new Date().toISOString());

      if (summaries.length === 0) {
        setSelectedChatId(null);
      } else if (
        selectedChatId &&
        !summaries.some(chat => chat.id === selectedChatId)
      ) {
        setSelectedChatId(null);
      }
    } catch (error) {
      console.error("Failed to load saved chat summaries:", error);
      setSavedChats([]);
      setLastRefreshedAt("");
    } finally {
      setIsLoading(false);
    }
  }, [selectedChatId, sortChats]);

  useEffect(() => {
    if (isVisible) {
      void loadSavedChats();
    }
  }, [isVisible, refreshToken, loadSavedChats]);

  useEffect(() => {
    if (!isVisible) {
      setSearchQuery("");
      setSelectedChatId(null);
    }
  }, [isVisible]);

  const handleLoadChat = async (chatId: string) => {
    setSelectedChatId(chatId);
    try {
      await onLoad(chatId);
    } catch (error) {
      console.error("Failed to load chat session:", error);
    }
  };

  const handleDeleteChat = async (
    chatId: string,
    event: MouseEvent<HTMLButtonElement>
  ) => {
    event.stopPropagation();
    event.preventDefault();

    if (!confirm("Delete this saved chat? This action cannot be undone.")) {
      return;
    }

    try {
      if (typeof window.electronAPI.chat.delete !== "function") {
        throw new Error("Chat delete API is unavailable.");
      }
      await window.electronAPI.chat.delete(chatId);
      setSavedChats(prev => prev.filter(chat => chat.id !== chatId));
      if (selectedChatId === chatId) {
        setSelectedChatId(null);
      }
      setLastRefreshedAt(new Date().toISOString());
      await loadSavedChats();
    } catch (error) {
      console.error("Failed to delete chat session:", error);
    }
  };

  const handleTogglePin = async (
    chatId: string,
    pinned: boolean,
    event: MouseEvent<HTMLButtonElement>
  ) => {
    event.stopPropagation();
    event.preventDefault();

    try {
      if (typeof window.electronAPI.chat.togglePin !== "function") {
        throw new Error("Chat togglePin API is unavailable.");
      }
      await window.electronAPI.chat.togglePin(chatId, pinned);
      setSavedChats(prev =>
        sortChats(
          prev.map(chat => (chat.id === chatId ? { ...chat, pinned } : chat))
        )
      );
      setLastRefreshedAt(new Date().toISOString());
      await loadSavedChats();
    } catch (error) {
      console.error("Failed to update chat pin state:", error);
    }
  };

  const beginRenameChat = (
    chatId: string,
    currentTitle: string,
    event: MouseEvent<HTMLButtonElement>
  ) => {
    event.stopPropagation();
    event.preventDefault();
    setEditingChatId(chatId);
    setEditingTitle(currentTitle);
  };

  const cancelRenameChat = (event?: MouseEvent<HTMLButtonElement>) => {
    event?.stopPropagation();
    event?.preventDefault();
    setEditingChatId(null);
    setEditingTitle("");
  };

  const handleRenameChatSubmit = async (chatId: string) => {
    const newTitle = editingTitle.trim();
    if (!newTitle) {
      return;
    }

    try {
      if (typeof window.electronAPI.chat.updateTitle !== "function") {
        throw new Error("Chat updateTitle API is unavailable.");
      }
      await window.electronAPI.chat.updateTitle(chatId, newTitle);
      setSavedChats(prev =>
        sortChats(
          prev.map(chat =>
            chat.id === chatId
              ? {
                  ...chat,
                  title: newTitle,
                  updatedAt: new Date().toISOString(),
                }
              : chat
          )
        )
      );
      setLastRefreshedAt(new Date().toISOString());
      await loadSavedChats();
    } catch (error) {
      console.error("Failed to rename chat session:", error);
    } finally {
      setEditingChatId(null);
      setEditingTitle("");
    }
  };

  const handleSavedChatKeyDown = (
    event: KeyboardEvent<HTMLDivElement>,
    chatId: string
  ) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      void handleLoadChat(chatId);
    }
  };

  const formatDate = (
    dateString: string,
    options?: { includeTime?: boolean }
  ) => {
    const includeTime = options?.includeTime ?? true;
    return new Date(dateString).toLocaleString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      ...(includeTime ? { hour: "2-digit", minute: "2-digit" } : undefined),
    });
  };

  const filteredChats = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    const chatsToFilter = query
      ? savedChats.filter(chat =>
          [chat.title, formatDate(chat.createdAt, { includeTime: true })]
            .join(" ")
            .toLowerCase()
            .includes(query)
        )
      : savedChats;

    return sortChats(chatsToFilter);
  }, [savedChats, searchQuery, sortChats]);

  const getConnectionName = (connectionId?: string) => {
    const connection = connections.find(c => c.id === connectionId);
    return connection?.name || "Unknown Connection";
  };

  const formatDatabaseLabel = useCallback(
    (chat: SavedChatSummary) => {
      const connection = connections.find(c => c.id === chat.connectionId);

      const rawDatabase = chat.database ?? connection?.database ?? null;
      let label = rawDatabase?.trim() ?? "";

      if (label) {
        const normalized = label.replace(/\\/g, "/");
        if (normalized.includes("/")) {
          const segments = normalized.split("/").filter(Boolean);
          if (segments.length > 0) {
            label = segments[segments.length - 1];
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
    },
    [connections]
  );

  useEffect(() => {
    if (editingChatId && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [editingChatId]);

  if (!isVisible) {
    return null;
  }

  return (
    <aside
      className="flex w-80 flex-shrink-0 flex-col border-r border-border bg-background text-sm text-muted-foreground backdrop-blur"
      role="complementary"
      aria-label="Saved chats"
    >
      <div className="flex items-center justify-between gap-2 border-b border-border px-3 py-2 text-foreground">
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Saved Chats
          </h3>
          <div className="text-[10px] text-muted-foreground opacity-80">
            {savedChats.length === 0
              ? "No saved chats"
              : `${savedChats.length} saved`}
            {lastRefreshedAt && (
              <span className="ml-1">
                • Updated {formatDate(lastRefreshedAt)}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={loadSavedChats}
            className="inline-flex h-6 w-6 items-center justify-center rounded hover:bg-muted"
            title="Refresh saved chats"
            aria-label="Refresh saved chats"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={onClose}
            className="inline-flex h-6 w-6 items-center justify-center rounded hover:bg-muted"
            title="Hide saved chats"
            aria-label="Hide saved chats"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <div className="border-b border-border px-3 py-2">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2 top-1.5 h-4 w-4 text-muted-foreground/70" />
          <input
            type="search"
            value={searchQuery}
            onChange={event => setSearchQuery(event.target.value)}
            placeholder="Search saved chats"
            className="h-8 w-full rounded border border-border bg-background pl-8 pr-2 text-xs text-foreground placeholder-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        {isLoading ? (
          <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
            Loading saved chats…
          </div>
        ) : filteredChats.length === 0 ? (
          <div className="flex h-full items-center justify-center px-4 text-center text-xs text-muted-foreground">
            {savedChats.length === 0
              ? "You haven't saved any chats yet."
              : "No saved chats match your search."}
          </div>
        ) : (
          <ul className="space-y-1">
            {filteredChats.map(chat => {
              const databaseLabel = formatDatabaseLabel(chat);

              return (
                <li key={chat.id}>
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => handleLoadChat(chat.id)}
                    onKeyDown={event => handleSavedChatKeyDown(event, chat.id)}
                    className={`group flex w-full cursor-pointer flex-col gap-1 rounded border border-transparent px-3 py-2 text-left transition hover:border-primary/40 hover:bg-accent/60 ${
                      selectedChatId === chat.id
                        ? "border-primary bg-accent"
                        : ""
                    }`}
                  >
                    {editingChatId === chat.id ? (
                      <div
                        className="flex w-full items-start gap-3"
                        onClick={event => event.stopPropagation()}
                      >
                        <div className="flex min-w-0 flex-1 items-center gap-2 text-foreground">
                          {chat.pinned && (
                            <Pin className="h-3.5 w-3.5 -rotate-45 text-blue-500" />
                          )}
                          <input
                            ref={editInputRef}
                            value={editingTitle}
                            onChange={event =>
                              setEditingTitle(event.target.value)
                            }
                            onKeyDown={event => {
                              if (event.key === "Enter") {
                                event.preventDefault();
                                void handleRenameChatSubmit(chat.id);
                              } else if (event.key === "Escape") {
                                cancelRenameChat();
                              }
                            }}
                            className="flex-1 rounded border border-border bg-background px-2 py-1 text-xs text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                            placeholder="Chat title"
                          />
                        </div>
                        <div className="flex flex-none items-center gap-1">
                          <button
                            type="button"
                            onClick={event => {
                              event.stopPropagation();
                              event.preventDefault();
                              void handleRenameChatSubmit(chat.id);
                            }}
                            className="inline-flex h-6 w-6 items-center justify-center rounded bg-blue-600 text-white hover:bg-blue-500"
                            title="Save title"
                            aria-label="Save title"
                          >
                            <Check className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={cancelRenameChat}
                            className="inline-flex h-6 w-6 items-center justify-center rounded hover:bg-muted"
                            title="Cancel rename"
                            aria-label="Cancel rename"
                          >
                            <X className="h-3.5 w-3.5 text-muted-foreground" />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex w-full items-start gap-3">
                        <div className="flex min-w-0 flex-1 flex-col gap-1">
                          <div className="flex items-center gap-2 text-foreground">
                            {chat.pinned && (
                              <Pin className="h-3.5 w-3.5 -rotate-45 text-blue-500" />
                            )}
                            <span
                              className="truncate font-medium"
                              title={chat.title}
                            >
                              {chat.title}
                            </span>
                          </div>
                          <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                            Updated{" "}
                            {formatDate(chat.updatedAt || chat.createdAt)}
                          </span>
                        </div>
                        <div className="flex flex-none items-center gap-1 opacity-0 transition group-focus-within:opacity-100 group-hover:opacity-100">
                          <button
                            type="button"
                            onClick={event =>
                              handleTogglePin(chat.id, !chat.pinned, event)
                            }
                            className="inline-flex h-6 w-6 items-center justify-center rounded hover:bg-muted"
                            title={chat.pinned ? "Unpin chat" : "Pin chat"}
                            aria-label={chat.pinned ? "Unpin chat" : "Pin chat"}
                          >
                            {chat.pinned ? (
                              <PinOff className="h-3.5 w-3.5 text-muted-foreground" />
                            ) : (
                              <Pin className="h-3.5 w-3.5 text-muted-foreground" />
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={event =>
                              beginRenameChat(chat.id, chat.title, event)
                            }
                            className="inline-flex h-6 w-6 items-center justify-center rounded hover:bg-muted"
                            title="Rename chat"
                            aria-label="Rename chat"
                          >
                            <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                          </button>
                          <button
                            type="button"
                            onClick={event => handleDeleteChat(chat.id, event)}
                            className="inline-flex h-6 w-6 items-center justify-center rounded hover:bg-muted"
                            title="Delete saved chat"
                            aria-label="Delete saved chat"
                          >
                            <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                          </button>
                        </div>
                      </div>
                    )}
                    <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] text-muted-foreground">
                      <span>{chat.messageCount} messages</span>
                      <span>•</span>
                      <span>🔗 {getConnectionName(chat.connectionId)}</span>
                      {databaseLabel ? (
                        <>
                          <span>•</span>
                          <span className="inline-flex items-center gap-1 rounded-full border border-blue-200/80 bg-blue-100/70 px-2 py-0.5 text-[10px] font-medium text-blue-700 transition-colors dark:border-blue-400/40 dark:bg-blue-500/15 dark:text-blue-100">
                            {databaseLabel}
                          </span>
                        </>
                      ) : null}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </aside>
  );
}
