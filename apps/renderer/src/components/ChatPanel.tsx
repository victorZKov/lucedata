export default function ChatPanel() {
  return (
    <div className="h-full flex flex-col bg-background">
      <div className="p-3 border-b border-border">
        <h2 className="text-sm font-medium text-foreground">AI Assistant</h2>
      </div>

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto p-3">
        <div className="space-y-3">
          {/* <div className="text-xs text-muted-foreground text-center">
            Ask me anything about your data
          </div> */}
        </div>
      </div>

      {/* Input Area */}
      <div className="p-3 border-t border-border">
        <div className="mb-2">
          <textarea
            className="w-full px-3 py-2 text-sm border border-border rounded bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
            placeholder="Ask me anything about your data..."
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
