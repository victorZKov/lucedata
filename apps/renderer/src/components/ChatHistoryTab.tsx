import { useState, useEffect } from "react";

interface ChatHistoryTabProps {
  isOpen: boolean;
  onClose: () => void;
  connections: Array<{ id: string; name: string }>;
  engines: Array<{ id: string; name: string }>;
}

interface HistoryMessage {
  id: string;
  chatId: string;
  chatTitle: string;
  content: string;
  role: "user" | "assistant" | "system";
  timestamp: string;
  connectionId?: string;
  engineId?: string;
  renderMarkdown?: boolean;
}

interface SearchFilters {
  query: string;
  connectionId?: string;
  engineId?: string;
  role?: "user" | "assistant" | "system" | "";
  dateFrom?: string;
  dateTo?: string;
}

export function ChatHistoryTab({
  isOpen,
  onClose,
  connections,
  engines,
}: ChatHistoryTabProps) {
  const [messages, setMessages] = useState<HistoryMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [filters, setFilters] = useState<SearchFilters>({
    query: "",
    connectionId: "",
    engineId: "",
    role: "",
    dateFrom: "",
    dateTo: "",
  });

  useEffect(() => {
    if (isOpen) {
      searchHistory();
    }
  }, [isOpen]);

  const searchHistory = async () => {
    setIsLoading(true);
    try {
      const searchParams = {
        query: filters.query || undefined,
        connectionId: filters.connectionId || undefined,
        engineId: filters.engineId || undefined,
        role: filters.role || undefined,
        dateFrom: filters.dateFrom || undefined,
        dateTo: filters.dateTo || undefined,
      };

      const results = await window.electronAPI.chat.searchHistory(searchParams);
      setMessages(results || []);
    } catch (error) {
      console.error("Failed to search chat history:", error);
      setMessages([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFilterChange = (key: keyof SearchFilters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleSearch = () => {
    searchHistory();
  };

  const handleClearFilters = () => {
    setFilters({
      query: "",
      connectionId: "",
      engineId: "",
      role: "",
      dateFrom: "",
      dateTo: "",
    });
  };

  const getConnectionName = (connectionId?: string) => {
    const connection = connections.find(c => c.id === connectionId);
    return connection?.name || "Unknown Connection";
  };

  const getEngineName = (engineId?: string) => {
    const engine = engines.find(e => e.id === engineId);
    return engine?.name || "Unknown Engine";
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

  const truncateContent = (content: string, maxLength: number = 200) => {
    if (content.length <= maxLength) return content;
    return content.substring(0, maxLength) + "...";
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-6xl mx-4 max-h-[90vh] flex flex-col">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
              Chat History
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

          {/* Search Filters */}
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Search Text
                </label>
                <input
                  type="text"
                  value={filters.query}
                  onChange={e => handleFilterChange("query", e.target.value)}
                  placeholder="Search messages..."
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md 
                           bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100
                           focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                           placeholder-gray-500 dark:placeholder-gray-400"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Connection
                </label>
                <select
                  value={filters.connectionId}
                  onChange={e =>
                    handleFilterChange("connectionId", e.target.value)
                  }
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md 
                           bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100
                           focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">All Connections</option>
                  {connections.map(connection => (
                    <option key={connection.id} value={connection.id}>
                      {connection.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  AI Engine
                </label>
                <select
                  value={filters.engineId}
                  onChange={e => handleFilterChange("engineId", e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md 
                           bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100
                           focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">All Engines</option>
                  {engines.map(engine => (
                    <option key={engine.id} value={engine.id}>
                      {engine.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Message Type
                </label>
                <select
                  value={filters.role}
                  onChange={e => handleFilterChange("role", e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md 
                           bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100
                           focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">All Messages</option>
                  <option value="user">User Messages</option>
                  <option value="assistant">AI Responses</option>
                  <option value="system">System Messages</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Date From
                </label>
                <input
                  type="date"
                  value={filters.dateFrom}
                  onChange={e => handleFilterChange("dateFrom", e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md 
                           bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100
                           focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Date To
                </label>
                <input
                  type="date"
                  value={filters.dateTo}
                  onChange={e => handleFilterChange("dateTo", e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md 
                           bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100
                           focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3">
              <button
                onClick={handleClearFilters}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 
                         bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 
                         rounded-md transition-colors"
              >
                Clear Filters
              </button>
              <button
                onClick={handleSearch}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 
                         hover:bg-blue-700 rounded-md transition-colors"
              >
                Search
              </button>
            </div>
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
                <span>Searching chat history...</span>
              </div>
            </div>
          ) : messages.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No messages found matching your search criteria
            </div>
          ) : (
            <div className="space-y-4">
              <div className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                Found {messages.length} messages
              </div>

              {messages.map(message => (
                <div
                  key={message.id}
                  className="border border-gray-200 dark:border-gray-600 rounded-lg p-4
                           hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center space-x-3">
                      <span
                        className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          message.role === "user"
                            ? "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                            : "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                        }`}
                      >
                        {message.role === "user" ? "👤 User" : "🤖 AI"}
                      </span>
                      <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {message.chatTitle}
                      </span>
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {formatDate(message.timestamp)}
                    </div>
                  </div>

                  <div className="text-sm text-gray-700 dark:text-gray-300 mb-3 whitespace-pre-wrap">
                    {truncateContent(message.content)}
                  </div>

                  <div className="flex items-center space-x-4 text-xs text-gray-500 dark:text-gray-400">
                    <span>🔗 {getConnectionName(message.connectionId)}</span>
                    <span>•</span>
                    <span>🤖 {getEngineName(message.engineId)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="p-6 border-t border-gray-200 dark:border-gray-700">
          <div className="flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 
                       bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 
                       rounded-md transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
