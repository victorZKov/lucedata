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
    const saved = localStorage.getItem("sqlhelper-layout");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.warn("Failed to parse saved layout, using defaults");
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
    localStorage.setItem("sqlhelper-layout", JSON.stringify(layout));
  }, [layout]);

  useEffect(() => {
    // Get platform info
    if (window.electronAPI) {
      window.electronAPI.getPlatform().then(setPlatform);

      // Listen for menu actions
      window.electronAPI.onMenuAction((action: string) => {
        switch (action) {
          case "manage-ai-engines":
            document.dispatchEvent(new CustomEvent("open-ai-engines-settings"));
            break;
        }
      });
    }

    // Listen for menu events
    const handleToggleExplorer = () => toggleExplorer();
    const handleToggleChat = () => toggleChat();

    document.addEventListener("toggle-explorer", handleToggleExplorer);
    document.addEventListener("toggle-chat", handleToggleChat);

    return () => {
      document.removeEventListener("toggle-explorer", handleToggleExplorer);
      document.removeEventListener("toggle-chat", handleToggleChat);
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
      explorerWidth: Math.max(200, Math.min(600, prev.explorerWidth + delta)),
    }));
  };

  const handleChatResize = (delta: number) => {
    setLayout(prev => ({
      ...prev,
      // For right-side panel: move left (negative delta) should NARROW chat
      chatWidth: Math.max(200, Math.min(800, prev.chatWidth - delta)),
    }));
  };

  // Calculate title bar height and padding based on platform
  const isMac = platform === "darwin";
  const titleBarHeight = isMac ? "h-11" : "h-12"; // Slightly higher macOS bar
  const titleBarPadding = isMac ? "pl-[96px] pr-4" : "px-4"; // slightly closer to traffic lights

  return (
    <div className="flex h-full">
      {/* Title Bar */}
      <div
        className={`fixed top-0 left-0 right-0 ${titleBarHeight} flex items-center justify-between ${titleBarPadding} z-50 select-none rounded-t-xl`}
        style={
          {
            // Make the entire title bar draggable on macOS
            WebkitAppRegion: isMac ? "drag" : "no-drag",
            backgroundColor: "hsl(var(--background))",
            color: "hsl(var(--foreground))",
          } as React.CSSProperties
        }
      >
        {/* Left controls next to traffic lights */}
        <div
          className="flex items-center gap-1 ml-0"
          style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}
        >
          <button
            onClick={toggleExplorer}
            className="inline-flex items-center justify-center h-7 w-7 text-base leading-none rounded-full border border-border bg-muted text-foreground hover:bg-accent translate-y-0.5"
            title={
              layout.showExplorer ? "Hide Connections" : "Show Connections"
            }
          >
            ◧
          </button>
        </div>

        {/* Center draggable area */}
        <div
          className="flex-1"
          style={
            {
              WebkitAppRegion: isMac ? "drag" : "no-drag",
            } as React.CSSProperties
          }
        />

        {/* Right controls */}
        <div
          className="flex items-center space-x-2"
          style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}
        >
          <button
            onClick={toggleChat}
            className="inline-flex items-center justify-center h-7 w-7 text-base leading-none rounded-full border border-border bg-muted text-foreground hover:bg-accent translate-y-0.5"
            title={layout.showChat ? "Hide Chat" : "Show Chat"}
          >
            ◨
          </button>
          <button
            onClick={toggleTheme}
            title={
              theme === "light" ? "Switch to dark mode" : "Switch to light mode"
            }
            aria-label={
              theme === "light" ? "Switch to dark mode" : "Switch to light mode"
            }
            className="inline-flex items-center justify-center h-7 w-7 text-base leading-none rounded-full border border-border bg-muted text-foreground hover:bg-accent translate-y-0.5"
          >
            {theme === "light" ? "🌙" : "☀️"}
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div
        className={`flex flex-1 ${isMac ? "pt-11" : "pt-12"} min-h-0 min-w-0 px-3`}
      >
        {/* Rounded inner surface under the title bar */}
        <div
          className="flex flex-1 rounded-t-2xl border-0 overflow-hidden"
          style={{
            backgroundColor: "hsl(var(--background))",
            color: "hsl(var(--foreground))",
          }}
        >
          {/* Explorer Panel */}
          {layout.showExplorer && (
            <>
              <div
                className="flex-shrink-0 flex flex-col min-h-0 rounded-tl-xl border"
                style={{
                  width: layout.explorerWidth,
                  backgroundColor: "hsl(var(--background))",
                  color: "hsl(var(--foreground))",
                }}
              >
                {/* Explorer Header */}
                <div
                  className="flex items-center justify-between p-2 border-b"
                  style={{
                    backgroundColor: "hsl(var(--secondary))",
                    color: "hsl(var(--secondary-foreground))",
                  }}
                >
                  <div className="flex items-center gap-2">
                    <h2 className="text-xs font-medium uppercase tracking-wide text-[hsl(var(--muted-foreground))]">
                      Connections
                    </h2>
                    <button
                      onClick={() => {
                        document.dispatchEvent(
                          new CustomEvent("open-add-connection")
                        );
                      }}
                      className="inline-flex items-center justify-center h-6 w-6 rounded border border-border text-foreground hover:bg-accent"
                      title="Add Connection"
                      aria-label="Add Connection"
                      style={
                        { WebkitAppRegion: "no-drag" } as React.CSSProperties
                      }
                    >
                      +
                    </button>
                  </div>
                  <button
                    onClick={toggleExplorer}
                    className="text-xs p-1 rounded hover:bg-accent text-[hsl(var(--muted-foreground))]"
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
                className="border-r border-transparent"
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
                className="border-l border-transparent"
              />
              <div
                className="flex-shrink-0 flex flex-col min-h-0 rounded-tr-xl border"
                style={{
                  width: layout.chatWidth,
                  backgroundColor: "hsl(var(--background))",
                  color: "hsl(var(--foreground))",
                }}
              >
                {/* Chat Header */}
                <div
                  className="flex items-center justify-between p-2 border-b"
                  style={{
                    backgroundColor: "hsl(var(--secondary))",
                    color: "hsl(var(--secondary-foreground))",
                  }}
                >
                  <div className="flex items-center gap-2">
                    <h2 className="text-xs font-medium uppercase tracking-wide text-[hsl(var(--muted-foreground))]">
                      Chat
                    </h2>
                    <button
                      onClick={() => {
                        /* TODO: reset chat */
                      }}
                      className="inline-flex items-center justify-center h-6 w-6 rounded border border-border text-foreground hover:bg-accent"
                      title="New Chat"
                      aria-label="New Chat"
                      style={
                        { WebkitAppRegion: "no-drag" } as React.CSSProperties
                      }
                    >
                      +
                    </button>
                    <button
                      onClick={() => {
                        /* TODO: open history */
                      }}
                      className="inline-flex items-center justify-center h-6 w-6 rounded border border-border text-foreground hover:bg-accent"
                      title="History"
                      aria-label="History"
                      style={
                        { WebkitAppRegion: "no-drag" } as React.CSSProperties
                      }
                    >
                      ⌘
                    </button>
                  </div>
                  <button
                    onClick={toggleChat}
                    className="text-xs p-1 rounded hover:bg-accent text-[hsl(var(--muted-foreground))]"
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
    </div>
  );
}
