import { useState, useEffect } from "react";
import { useTheme } from "../contexts/ThemeContext";
import Explorer from "./Explorer";
import WorkArea from "./WorkArea";
import ChatPanel from "./ChatPanel";
import Resizer from "./Resizer";

interface LayoutState {
  explorerWidth: number;
  chatWidth: number;
  showExplorer: boolean;
  showChat: boolean;
}

export default function Layout() {
  const { theme, toggleTheme } = useTheme();
  const [platform, setPlatform] = useState<string>("");
  const [layout, setLayout] = useState<LayoutState>(() => {
    // Load saved layout from localStorage
    const saved = localStorage.getItem('sqlhelper-layout');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.warn('Failed to parse saved layout, using defaults');
      }
    }
    return {
      explorerWidth: 300,
      chatWidth: 350,
      showExplorer: true,
      showChat: true,
    };
  });

  // Save layout to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('sqlhelper-layout', JSON.stringify(layout));
  }, [layout]);

  useEffect(() => {
    // Get platform info
    if (window.electronAPI) {
      window.electronAPI.getPlatform().then(setPlatform);
    }

    // Listen for menu events
    const handleToggleExplorer = () => toggleExplorer();
    const handleToggleChat = () => toggleChat();

    document.addEventListener('toggle-explorer', handleToggleExplorer);
    document.addEventListener('toggle-chat', handleToggleChat);

    return () => {
      document.removeEventListener('toggle-explorer', handleToggleExplorer);
      document.removeEventListener('toggle-chat', handleToggleChat);
    };
  }, []);

  const toggleExplorer = () => {
    setLayout(prev => ({ ...prev, showExplorer: !prev.showExplorer }));
  };

  const toggleChat = () => {
    setLayout(prev => ({ ...prev, showChat: !prev.showChat }));
  };

  const handleExplorerResize = (delta: number) => {
    setLayout(prev => ({
      ...prev,
      explorerWidth: Math.max(200, Math.min(600, prev.explorerWidth + delta))
    }));
  };

  const handleChatResize = (delta: number) => {
    setLayout(prev => ({
      ...prev,
      // For right-side panel: move left (negative delta) should NARROW chat
      chatWidth: Math.max(200, Math.min(800, prev.chatWidth - delta))
    }));
  };

  // Calculate title bar height and padding based on platform
  const isMac = platform === "darwin";
  const titleBarHeight = isMac ? "h-8" : "h-8"; // Standard height for hiddenInset
  const titleBarPadding = isMac ? "pl-32 pr-4" : "px-4"; // Even more left padding for traffic lights

  return (
    <div className="flex h-full">
      {/* Title Bar */}
      <div 
        className={`fixed top-0 left-0 right-0 ${titleBarHeight} bg-gray-100 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between ${titleBarPadding} z-50 select-none`}
        style={{ 
          // Make the entire title bar draggable on macOS
          WebkitAppRegion: isMac ? 'drag' : 'no-drag'
        } as React.CSSProperties}
      >
        <div 
          className="flex-1" 
          style={{ 
            // Make the left area draggable
            WebkitAppRegion: isMac ? 'drag' : 'no-drag'
          } as React.CSSProperties}
        >
          {/* Left side - draggable area */}
        </div>
        <div 
          className="flex items-center space-x-1"
          style={{ 
            // Make buttons non-draggable
            WebkitAppRegion: 'no-drag'
          } as React.CSSProperties}
        >
          <button
            onClick={() => {
              const bothHidden = !layout.showExplorer && !layout.showChat;
              if (bothHidden) {
                // If both are hidden, show both
                setLayout(prev => ({ ...prev, showExplorer: true, showChat: true }));
              } else {
                // If one or both are showing, hide both
                setLayout(prev => ({ ...prev, showExplorer: false, showChat: false }));
              }
            }}
            className="text-xs px-2 py-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700"
            style={{ 
              // Make button non-draggable
              WebkitAppRegion: 'no-drag'
            } as React.CSSProperties}
            title={(!layout.showExplorer && !layout.showChat) ? "Show Panels" : "Hide Panels"}
          >
            {(!layout.showExplorer && !layout.showChat) ? "◧" : "◨"}
          </button>
          <button
            onClick={toggleTheme}
            className="text-xs px-2 py-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700"
            style={{ 
              // Make button non-draggable
              WebkitAppRegion: 'no-drag'
            } as React.CSSProperties}
          >
            {theme === 'light' ? '🌙' : '☀️'}
          </button>
        </div>
      </div>

      {/* Main Content */}
  <div className={`flex flex-1 ${isMac ? 'pt-8' : 'pt-8'} min-h-0 min-w-0`}>
        {/* Explorer Panel */}
        {layout.showExplorer && (
          <>
            <div 
              className="bg-gray-50 dark:bg-gray-800 flex-shrink-0 flex flex-col min-h-0"
              style={{ width: layout.explorerWidth }}
            >
              {/* Explorer Header */}
              <div className="flex items-center justify-between p-2 border-b border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-700">
                <div className="flex items-center gap-2">
                  <h2 className="text-xs font-medium text-gray-600 dark:text-gray-300 uppercase tracking-wide">
                    Connections
                  </h2>
                  <button
                    onClick={() => {
                      document.dispatchEvent(new CustomEvent('open-add-connection'));
                    }}
                    className="text-xs px-2 py-1 rounded bg-blue-500 hover:bg-blue-600 text-white"
                    title="Add Connection"
                    style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
                  >
                    + Add
                  </button>
                </div>
                <button
                  onClick={toggleExplorer}
                  className="text-xs p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-500 dark:text-gray-400"
                  title="Hide Connections"
                >
                  ✕
                </button>
              </div>
              {/* Explorer Content */}
              <div className="flex-1 min-h-0 overflow-y-auto">
                <Explorer />
              </div>
            </div>
            {/* Explorer Resizer */}
            <Resizer 
              direction="horizontal" 
              onResize={handleExplorerResize}
              className="border-r border-gray-200 dark:border-gray-700"
            />
          </>
        )}

        {/* Work Area */}
        <div className="flex-1 flex min-w-0">
          <WorkArea />
        </div>

        {/* Chat Panel */}
        {layout.showChat && (
          <>
            {/* Chat Resizer */}
            <Resizer 
              direction="horizontal" 
              onResize={handleChatResize}
              className="border-l border-gray-200 dark:border-gray-700"
            />
            <div 
              className="bg-gray-50 dark:bg-gray-800 flex-shrink-0 flex flex-col min-h-0"
              style={{ width: layout.chatWidth }}
            >
              {/* Chat Header */}
              <div className="flex items-center justify-between p-2 border-b border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-700">
                <h2 className="text-xs font-medium text-gray-600 dark:text-gray-300 uppercase tracking-wide">
                  Chat
                </h2>
                <button
                  onClick={toggleChat}
                  className="text-xs p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-500 dark:text-gray-400"
                  title="Hide Chat"
                >
                  ✕
                </button>
              </div>
              {/* Chat Content */}
              <div className="flex-1">
                <ChatPanel />
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}