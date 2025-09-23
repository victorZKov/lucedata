export default function ChatPanel() {
  return (
    <div className="h-full flex flex-col bg-gray-50 dark:bg-gray-800">
      <div className="p-3 border-b border-gray-200 dark:border-gray-700">
        <h2 className="text-sm font-medium text-gray-900 dark:text-gray-100">
          AI Assistant
        </h2>
      </div>
      
      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto p-3">
        <div className="space-y-3">
          <div className="text-xs text-gray-500 dark:text-gray-400 text-center">
            Ask me anything about SQL or your database
          </div>
        </div>
      </div>

      {/* Input Area */}
      <div className="p-3 border-t border-gray-200 dark:border-gray-700">
        <div className="mb-2">
          <textarea
            className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
            placeholder="Ask me to generate SQL..."
            rows={3}
          />
        </div>
        <div className="flex justify-end">
          <button className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 focus:outline-none focus:ring-1 focus:ring-blue-500">
            Send
          </button>
        </div>
      </div>
    </div>
  );
}