import React, { useState, useEffect } from "react";

interface SaveChatDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (title: string) => void;
  messages: Array<{
    id: string;
    role: "user" | "assistant" | "system";
    content: string;
    timestamp: string;
    finalSQL?: string;
    renderMarkdown?: boolean;
  }>;
  suggestedTitle?: string;
}

export function SaveChatDialog({
  isOpen,
  onClose,
  onSave,
  messages,
  suggestedTitle,
}: SaveChatDialogProps) {
  const [title, setTitle] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // Generate a suggested title based on the first user message
  useEffect(() => {
    if (isOpen && messages.length > 0) {
      if (suggestedTitle) {
        setTitle(suggestedTitle);
      } else {
        const firstUserMessage = messages.find(m => m.role === "user");
        if (firstUserMessage) {
          // Take first 50 characters and clean up
          const suggested = firstUserMessage.content
            .trim()
            .substring(0, 50)
            .replace(/\s+/g, " ");
          setTitle(
            suggested + (firstUserMessage.content.length > 50 ? "..." : "")
          );
        } else {
          setTitle(`Chat from ${new Date().toLocaleDateString()}`);
        }
      }
    }
  }, [isOpen, messages, suggestedTitle]);

  const handleSave = async () => {
    if (!title.trim()) return;

    setIsSaving(true);
    try {
      await onSave(title.trim());
      onClose();
    } catch (error) {
      console.error("Failed to save chat:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSave();
    } else if (e.key === "Escape") {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md mx-4">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
              Save Chat Session
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

          <div className="mb-4">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
              Save this chat session with {messages.length} messages
            </p>
            <label
              htmlFor="chat-title"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
            >
              Chat Title
            </label>
            <input
              id="chat-title"
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Enter a title for this chat..."
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md 
                       bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100
                       focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                       placeholder-gray-500 dark:placeholder-gray-400"
              disabled={isSaving}
              autoFocus
            />
          </div>

          <div className="flex justify-end space-x-3">
            <button
              onClick={onClose}
              disabled={isSaving}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 
                       bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 
                       rounded-md transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving || !title.trim()}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 
                       hover:bg-blue-700 rounded-md transition-colors
                       disabled:opacity-50 disabled:cursor-not-allowed
                       flex items-center space-x-2"
            >
              {isSaving && (
                <svg
                  className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
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
              )}
              <span>{isSaving ? "Saving..." : "Save Chat"}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
