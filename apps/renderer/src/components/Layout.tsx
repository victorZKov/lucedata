import { useState, useEffect } from "react";
import {
  Plus,
  Save,
  FolderOpen,
  ClipboardList,
  PanelLeft,
  MessageSquare,
  Sun,
  Moon,
  Settings,
  Scissors,
  Copy,
  ClipboardPaste,
  Play,
  HelpCircle,
  AlignLeft,
  Trash2,
  X,
  RefreshCw,
  ChevronUp,
  ChevronDown,
} from "lucide-react";

import { useTheme } from "../contexts/ThemeContext";

import Explorer from "./Explorer";
import WorkArea from "./WorkArea";
import ChatPanel from "./ChatPanel";
import Resizer from "./Resizer";
import { SaveChatDialog } from "./SaveChatDialog";
import { LoadChatDialog } from "./LoadChatDialog";
import TipsDialog from "./TipsDialog";
import { ChatHistoryTab } from "./ChatHistoryTab";
import VersionDialog from "./VersionDialog";

interface LayoutState {
  explorerWidth: number;
  chatWidth: number;
  showExplorer: boolean;
  showChat: boolean;
}

interface DialogState {
  saveChatDialog: boolean;
  loadChatDialog: boolean;
  chatHistoryTab: boolean;
  versionDialog: boolean;
  tipsDialog: boolean;
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
      } catch (_e) {
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

  const [dialogs, setDialogs] = useState<DialogState>({
    saveChatDialog: false,
    loadChatDialog: false,
    chatHistoryTab: false,
    versionDialog: false,
    tipsDialog: false,
  });

  // Mock data - in real app, these would come from your store
  const [connections] = useState([
    { id: "conn1", name: "Local SQL Server" },
    { id: "conn2", name: "Production DB" },
  ]);

  const [engines] = useState([
    { id: "openai", name: "OpenAI GPT-4" },
    { id: "ollama", name: "Ollama CodeLlama" },
  ]);

  // Track current tab state for toolbar buttons
  const [currentTabState, setCurrentTabState] = useState({
    hasContent: false,
    hasConnection: false,
    hasSelection: false,
    isRunning: false,
    isFormatting: false,
  });

  // Toolbar expand/collapse state
  const [toolbarExpanded, setToolbarExpanded] = useState(() => {
    const saved = localStorage.getItem("sqlhelper-toolbar-expanded");
    return saved ? JSON.parse(saved) : true;
  });

  // Save layout to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem("sqlhelper-layout", JSON.stringify(layout));
  }, [layout]);

  // Save toolbar expanded state
  useEffect(() => {
    localStorage.setItem(
      "sqlhelper-toolbar-expanded",
      JSON.stringify(toolbarExpanded)
    );
  }, [toolbarExpanded]);

  useEffect(() => {
    // Get platform info
    if (window.electronAPI) {
      window.electronAPI.getPlatform().then(setPlatform);

      // Listen for menu actions
      window.electronAPI.onMenuAction((action: string) => {
        switch (action) {
          case "manage-ai-engines":
            // Open Settings dialog on AI Engines tab
            document.dispatchEvent(new CustomEvent("open-settings"));
            setTimeout(() => {
              document.dispatchEvent(
                new CustomEvent("settings-tab-change", {
                  detail: { tab: "ai-engines" },
                })
              );
            }, 100);
            break;
          case "new-chat":
            handleNewChat();
            break;
          case "save-chat":
            setDialogs(prev => ({ ...prev, saveChatDialog: true }));
            break;
          case "load-chat":
            setDialogs(prev => ({ ...prev, loadChatDialog: true }));
            break;
          case "chat-history":
            setDialogs(prev => ({ ...prev, chatHistoryTab: true }));
            break;
          case "show-version":
            setDialogs(prev => ({ ...prev, versionDialog: true }));
            break;
        }
      });
    }

    // Listen for menu events
    const handleToggleExplorer = () => toggleExplorer();
    const handleToggleChat = () => toggleChat();
    const handleShowVersion = () => {
      setDialogs(prev => ({ ...prev, versionDialog: true }));
    };
    const handleShowLoadChatDialog = () => {
      setDialogs(prev => ({ ...prev, loadChatDialog: true }));
    };

    const handleShowTipsDialog = () => {
      setDialogs(prev => ({ ...prev, tipsDialog: true }));
    };

    document.addEventListener("toggle-explorer", handleToggleExplorer);
    document.addEventListener("toggle-chat", handleToggleChat);
    document.addEventListener("show-version", handleShowVersion);
    document.addEventListener(
      "show-load-chat-dialog",
      handleShowLoadChatDialog
    );
    document.addEventListener("show-tips-dialog", handleShowTipsDialog);

    return () => {
      document.removeEventListener("toggle-explorer", handleToggleExplorer);
      document.removeEventListener("toggle-chat", handleToggleChat);
      document.removeEventListener("show-version", handleShowVersion);
      document.removeEventListener(
        "show-load-chat-dialog",
        handleShowLoadChatDialog
      );
      document.removeEventListener("show-tips-dialog", handleShowTipsDialog);
    };
  }, []);

  const toggleExplorer = () => {
    setLayout(prev => ({ ...prev, showExplorer: !prev.showExplorer }));
  };

  const toggleChat = () => {
    setLayout(prev => ({ ...prev, showChat: !prev.showChat }));
  };

  const toggleToolbar = () => {
    setToolbarExpanded((prev: boolean) => !prev);
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

  const [currentChatMessages, setCurrentChatMessages] = useState<
    Array<{
      id: string;
      role: "user" | "assistant" | "system";
      content: string;
      timestamp: string;
      finalSQL?: string;
      renderMarkdown?: boolean;
    }>
  >([]);
  const [currentChatContext, setCurrentChatContext] = useState<{
    connectionId?: string;
    engineId?: string;
  }>({});

  // Listen for chat messages and context updates
  useEffect(() => {
    const handleChatMessages = (event: CustomEvent) => {
      setCurrentChatMessages(event.detail);
    };

    const handleChatContext = (event: CustomEvent) => {
      setCurrentChatContext(event.detail);
    };

    document.addEventListener(
      "chat-messages-updated",
      handleChatMessages as EventListener
    );
    document.addEventListener(
      "chat-context-updated",
      handleChatContext as EventListener
    );

    return () => {
      document.removeEventListener(
        "chat-messages-updated",
        handleChatMessages as EventListener
      );
      document.removeEventListener(
        "chat-context-updated",
        handleChatContext as EventListener
      );
    };
  }, []);

  // Listen for tab state changes
  useEffect(() => {
    const handleTabStateChange = (event: CustomEvent) => {
      setCurrentTabState(event.detail);
    };

    document.addEventListener(
      "tab-state-changed",
      handleTabStateChange as EventListener
    );
    return () => {
      document.removeEventListener(
        "tab-state-changed",
        handleTabStateChange as EventListener
      );
    };
  }, []);

  // Tips startup logic
  useEffect(() => {
    const checkAndShowTips = async () => {
      try {
        // Check if user wants to see tips at startup
        const showAtStartup = await window.electronAPI.database.getSetting(
          "showTipsAtStartup",
          true
        );

        if (showAtStartup) {
          // Small delay to let the app fully load
          setTimeout(() => {
            setDialogs(prev => ({ ...prev, tipsDialog: true }));
          }, 1000);
        }
      } catch (error) {
        console.error("Failed to check tips startup preference:", error);
      }
    };

    checkAndShowTips();
  }, []);

  // Chat dialog handlers
  const handleNewChat = () => {
    // Reset chat state - this would be implemented in ChatPanel
    document.dispatchEvent(new CustomEvent("new-chat"));
    // Clear workspace context for fresh chat
    document.dispatchEvent(new CustomEvent("clear-workspace-context"));
  };

  const handleSaveChat = async (title: string): Promise<void> => {
    try {
      const chatData = {
        title,
        messages: currentChatMessages,
        connectionId: currentChatContext.connectionId,
        engineId: currentChatContext.engineId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await window.electronAPI.chat.save(chatData);
      console.log("Chat saved successfully:", title);
      setDialogs(prev => ({ ...prev, saveChatDialog: false }));
    } catch (error) {
      console.error("Failed to save chat:", error);
    }
  };

  const handleLoadChat = async (chatId: string): Promise<void> => {
    try {
      console.log("Loading chat:", chatId);
      const chatData = await window.electronAPI.chat.load(chatId);

      if (!chatData) {
        console.error("No chat data received for chatId:", chatId);
        return;
      }

      console.log("Chat data loaded successfully:", {
        id: chatData.id,
        title: chatData.title,
        messageCount: chatData.messages?.length || 0,
      });

      document.dispatchEvent(
        new CustomEvent("load-chat", { detail: chatData })
      );
      setDialogs(prev => ({ ...prev, loadChatDialog: false }));
    } catch (error) {
      console.error("Failed to load chat:", error);
      // Keep the dialog open so user can see the error and try again
    }
  };

  // Calculate title bar height and padding based on platform
  const isMac = platform === "darwin";
  const titleBarHeight = isMac ? "h-11" : "h-12"; // Slightly higher macOS bar
  const titleBarPadding = isMac ? "pl-[96px] pr-4" : "px-4"; // slightly closer to traffic lights

  return (
    <div className="flex h-full bg-background text-foreground">
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
            className="inline-flex items-center justify-center h-7 w-7 text-base leading-none rounded-full border border-border bg-muted text-foreground hover:bg-accent translate-y-0.5 cursor-pointer"
            title={
              layout.showExplorer ? "Hide Connections" : "Show Connections"
            }
          >
            <PanelLeft size={16} />
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
            className="inline-flex items-center justify-center h-7 w-7 text-base leading-none rounded-full border border-border bg-muted text-foreground hover:bg-accent translate-y-0.5 cursor-pointer"
            title={layout.showChat ? "Hide Chat" : "Show Chat"}
          >
            <MessageSquare size={16} />
          </button>

          <button
            onClick={toggleTheme}
            title={
              theme === "light" ? "Switch to dark mode" : "Switch to light mode"
            }
            aria-label={
              theme === "light" ? "Switch to dark mode" : "Switch to light mode"
            }
            className="inline-flex items-center justify-center h-7 w-7 text-base leading-none rounded-full border border-border bg-muted text-foreground hover:bg-accent translate-y-0.5 cursor-pointer"
          >
            {theme === "light" ? <Moon size={16} /> : <Sun size={16} />}
          </button>

          <button
            onClick={() =>
              document.dispatchEvent(new CustomEvent("open-settings"))
            }
            title="Open Settings"
            aria-label="Open Settings"
            className="inline-flex items-center justify-center h-7 w-7 text-base leading-none rounded-full border border-border bg-muted text-foreground hover:bg-accent translate-y-0.5"
          >
            <Settings size={16} />
          </button>
        </div>
      </div>

      {/* Professional Application Toolbar */}
      <div
        className={`fixed left-0 right-0 z-40 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 ${
          isMac ? "top-11" : "top-12"
        }`}
        style={{ height: toolbarExpanded ? "60px" : "40px" }}
      >
        <div className="flex items-center justify-between h-full px-4">
          {/* Left Side - File Operations */}
          <div className="flex items-center">
            <div className="flex items-center border-r border-border pr-3 mr-3">
              <button
                onClick={() => {
                  document.dispatchEvent(
                    new CustomEvent("toolbar-action", {
                      detail: { action: "new-query" },
                    })
                  );
                }}
                className={`p-2 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground transition-colors cursor-pointer ${
                  toolbarExpanded
                    ? "flex flex-col items-center gap-1 min-w-[60px]"
                    : ""
                }`}
                title="New Query (Ctrl+T)"
              >
                <Plus className="text-blue-600" size={16} />
                {toolbarExpanded && <span className="text-xs">New</span>}
              </button>
              <button
                onClick={() => {
                  document.dispatchEvent(
                    new CustomEvent("toolbar-action", {
                      detail: { action: "open-query" },
                    })
                  );
                }}
                className={`p-2 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground transition-colors cursor-pointer ${
                  toolbarExpanded
                    ? "flex flex-col items-center gap-1 min-w-[60px]"
                    : ""
                }`}
                title="Open Query (Ctrl+O)"
              >
                <FolderOpen className="text-purple-600" size={16} />
                {toolbarExpanded && <span className="text-xs">Open</span>}
              </button>
              <button
                onClick={() => {
                  document.dispatchEvent(
                    new CustomEvent("toolbar-action", {
                      detail: { action: "save-query" },
                    })
                  );
                }}
                className={`p-2 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground transition-colors cursor-pointer ${
                  toolbarExpanded
                    ? "flex flex-col items-center gap-1 min-w-[60px]"
                    : ""
                }`}
                title="Save Query (Ctrl+S)"
              >
                <Save className="text-indigo-600" size={16} />
                {toolbarExpanded && <span className="text-xs">Save</span>}
              </button>
            </div>

            {/* Edit Operations */}
            <div
              className={`flex items-center border-r border-border gap-1 ${
                toolbarExpanded ? "pr-3 mr-3" : "pr-2 mr-2"
              }`}
            >
              <button
                onClick={() => {
                  document.dispatchEvent(
                    new CustomEvent("toolbar-action", {
                      detail: { action: "cut-text" },
                    })
                  );
                }}
                disabled={!currentTabState.hasSelection}
                className={`p-2 rounded-md transition-colors ${
                  toolbarExpanded
                    ? "flex flex-col items-center gap-1 min-w-[60px]"
                    : "flex items-center justify-center"
                } ${
                  currentTabState.hasSelection
                    ? "hover:bg-accent text-muted-foreground hover:text-foreground cursor-pointer"
                    : "opacity-40 cursor-not-allowed bg-muted/30 text-muted-foreground"
                }`}
                title="Cut (Ctrl+X)"
              >
                <Scissors className="text-red-600" size={16} />
                {toolbarExpanded && <span className="text-xs">Cut</span>}
              </button>
              <button
                onClick={() => {
                  document.dispatchEvent(
                    new CustomEvent("toolbar-action", {
                      detail: { action: "copy-text" },
                    })
                  );
                }}
                disabled={!currentTabState.hasSelection}
                className={`p-2 rounded-md transition-colors ${
                  toolbarExpanded
                    ? "flex flex-col items-center gap-1 min-w-[60px]"
                    : "flex items-center justify-center"
                } ${
                  currentTabState.hasSelection
                    ? "hover:bg-accent text-muted-foreground hover:text-foreground cursor-pointer"
                    : "opacity-40 cursor-not-allowed bg-muted/30 text-muted-foreground"
                }`}
                title="Copy (Ctrl+C)"
              >
                <Copy className="text-teal-600" size={16} />
                {toolbarExpanded && <span className="text-xs">Copy</span>}
              </button>
              <button
                onClick={() => {
                  document.dispatchEvent(
                    new CustomEvent("toolbar-action", {
                      detail: { action: "paste-text" },
                    })
                  );
                }}
                className={`p-2 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground transition-colors cursor-pointer ${
                  toolbarExpanded
                    ? "flex flex-col items-center gap-1 min-w-[60px]"
                    : "flex items-center justify-center"
                }`}
                title="Paste (Ctrl+V)"
              >
                <ClipboardPaste className="text-blue-600" size={16} />
                {toolbarExpanded && <span className="text-xs">Paste</span>}
              </button>
            </div>

            {/* Query Operations */}
            <div
              className={`flex items-center border-r border-border gap-1 ${
                toolbarExpanded ? "pr-3 mr-3" : "pr-2 mr-2"
              }`}
            >
              <button
                onClick={() => {
                  document.dispatchEvent(
                    new CustomEvent("toolbar-action", {
                      detail: { action: "run-query" },
                    })
                  );
                }}
                disabled={
                  !currentTabState.hasContent ||
                  !currentTabState.hasConnection ||
                  currentTabState.isRunning
                }
                className={`p-2 rounded-md transition-colors ${
                  toolbarExpanded
                    ? "flex flex-col items-center gap-1 min-w-[60px]"
                    : "flex items-center justify-center"
                } ${
                  currentTabState.hasContent &&
                  currentTabState.hasConnection &&
                  !currentTabState.isRunning
                    ? "hover:bg-accent text-muted-foreground hover:text-foreground cursor-pointer"
                    : "opacity-40 cursor-not-allowed bg-muted/30 text-muted-foreground"
                }`}
                title="Run Query (F5)"
              >
                <Play className="text-green-600" size={16} />
                {toolbarExpanded && <span className="text-xs">Run</span>}
              </button>
              <button
                onClick={() => {
                  document.dispatchEvent(
                    new CustomEvent("toolbar-action", {
                      detail: { action: "explain-query" },
                    })
                  );
                }}
                disabled={
                  !currentTabState.hasContent ||
                  !currentTabState.hasConnection ||
                  currentTabState.isRunning
                }
                className={`p-2 rounded-md transition-colors ${
                  toolbarExpanded
                    ? "flex flex-col items-center gap-1 min-w-[60px]"
                    : "flex items-center justify-center"
                } ${
                  currentTabState.hasContent &&
                  currentTabState.hasConnection &&
                  !currentTabState.isRunning
                    ? "hover:bg-accent text-muted-foreground hover:text-foreground cursor-pointer"
                    : "opacity-40 cursor-not-allowed bg-muted/30 text-muted-foreground"
                }`}
                title="Explain Query"
              >
                <HelpCircle className="text-orange-600" size={16} />
                {toolbarExpanded && <span className="text-xs">Explain</span>}
              </button>
              <button
                onClick={() => {
                  document.dispatchEvent(
                    new CustomEvent("toolbar-action", {
                      detail: { action: "format-query" },
                    })
                  );
                }}
                disabled={
                  !currentTabState.hasContent || currentTabState.isFormatting
                }
                className={`p-2 rounded-md transition-colors ${
                  toolbarExpanded
                    ? "flex flex-col items-center gap-1 min-w-[60px]"
                    : "flex items-center justify-center"
                } ${
                  currentTabState.hasContent && !currentTabState.isFormatting
                    ? "hover:bg-accent text-muted-foreground hover:text-foreground cursor-pointer"
                    : "opacity-40 cursor-not-allowed bg-muted/30 text-muted-foreground"
                }`}
                title="Format Query"
              >
                <AlignLeft className="text-pink-600" size={16} />
                {toolbarExpanded && <span className="text-xs">Format</span>}
              </button>
            </div>

            {/* Utility Operations */}
            <div
              className={`flex items-center gap-1 ${
                toolbarExpanded ? "" : "ml-2"
              }`}
            >
              <button
                onClick={() => {
                  document.dispatchEvent(
                    new CustomEvent("toolbar-action", {
                      detail: { action: "copy-query" },
                    })
                  );
                }}
                disabled={!currentTabState.hasContent}
                className={`p-2 rounded-md transition-colors ${
                  toolbarExpanded
                    ? "flex flex-col items-center gap-1 min-w-[60px]"
                    : "flex items-center justify-center"
                } ${
                  currentTabState.hasContent
                    ? "hover:bg-accent text-muted-foreground hover:text-foreground cursor-pointer"
                    : "opacity-40 cursor-not-allowed bg-muted/30 text-muted-foreground"
                }`}
                title="Copy Query"
              >
                <Copy className="text-teal-600" size={16} />
                {toolbarExpanded && <span className="text-xs">Copy All</span>}
              </button>
              <button
                onClick={() => {
                  document.dispatchEvent(
                    new CustomEvent("toolbar-action", {
                      detail: { action: "clear-query" },
                    })
                  );
                }}
                disabled={!currentTabState.hasContent}
                className={`p-2 rounded-md transition-colors ${
                  toolbarExpanded
                    ? "flex flex-col items-center gap-1 min-w-[60px]"
                    : "flex items-center justify-center"
                } ${
                  currentTabState.hasContent
                    ? "hover:bg-accent text-muted-foreground hover:text-foreground cursor-pointer"
                    : "opacity-40 cursor-not-allowed bg-muted/30 text-muted-foreground"
                }`}
                title="Clear Query"
              >
                <Trash2 className="text-red-600" size={16} />
                {toolbarExpanded && <span className="text-xs">Clear</span>}
              </button>
            </div>
          </div>

          {/* Right Side - Additional Controls */}
          <div className="flex items-center gap-1">
            <button
              onClick={toggleToolbar}
              className="p-2 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              title={toolbarExpanded ? "Collapse Toolbar" : "Expand Toolbar"}
            >
              {toolbarExpanded ? (
                <ChevronUp className="text-gray-600" size={16} />
              ) : (
                <ChevronDown className="text-gray-600" size={16} />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div
        className={`flex flex-1 ${isMac ? "pt-20" : "pt-21"} min-h-0 min-w-0 px-3`}
        style={{
          paddingTop: toolbarExpanded
            ? isMac
              ? "104px"
              : "108px" // Title bar + expanded toolbar (44 + 60)
            : isMac
              ? "84px"
              : "88px", // Title bar + collapsed toolbar (44 + 40)
        }}
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
                        // Open Settings dialog on Connections tab
                        document.dispatchEvent(
                          new CustomEvent("open-settings")
                        );
                        setTimeout(() => {
                          document.dispatchEvent(
                            new CustomEvent("settings-tab-change", {
                              detail: { tab: "connections" },
                            })
                          );
                        }, 100);
                      }}
                      className="inline-flex items-center justify-center h-6 w-6 rounded border border-border text-foreground hover:bg-accent cursor-pointer"
                      title="Add Connection"
                      aria-label="Add Connection"
                      style={
                        { WebkitAppRegion: "no-drag" } as React.CSSProperties
                      }
                    >
                      <Plus className="text-blue-500" size={16} />
                    </button>
                    <button
                      onClick={() => {
                        // Refresh connections
                        document.dispatchEvent(
                          new CustomEvent("refresh-connections")
                        );
                      }}
                      className="inline-flex items-center justify-center h-6 w-6 rounded border border-border text-foreground hover:bg-accent cursor-pointer"
                      title="Refresh Connections"
                      aria-label="Refresh Connections"
                      style={
                        { WebkitAppRegion: "no-drag" } as React.CSSProperties
                      }
                    >
                      <RefreshCw className="text-purple-500" size={16} />
                    </button>
                  </div>
                  <button
                    onClick={toggleExplorer}
                    className="text-xs p-1 rounded hover:bg-accent text-[hsl(var(--muted-foreground))]"
                    title="Hide Connections"
                  >
                    <X size={14} />
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
                      onClick={handleNewChat}
                      className="inline-flex items-center justify-center h-6 w-6 text-foreground hover:bg-accent"
                      title="New Chat"
                      aria-label="New Chat"
                      style={
                        { WebkitAppRegion: "no-drag" } as React.CSSProperties
                      }
                    >
                      <Plus size={16} />
                    </button>
                    <button
                      onClick={() =>
                        setDialogs(prev => ({ ...prev, saveChatDialog: true }))
                      }
                      className="inline-flex items-center justify-center h-6 w-6 text-foreground hover:bg-accent"
                      title="Save Chat"
                      aria-label="Save Chat"
                      style={
                        { WebkitAppRegion: "no-drag" } as React.CSSProperties
                      }
                    >
                      <Save size={16} />
                    </button>
                    <button
                      onClick={() =>
                        setDialogs(prev => ({ ...prev, loadChatDialog: true }))
                      }
                      className="inline-flex items-center justify-center h-6 w-6 text-foreground hover:bg-accent"
                      title="Load Chat"
                      aria-label="Load Chat"
                      style={
                        { WebkitAppRegion: "no-drag" } as React.CSSProperties
                      }
                    >
                      <FolderOpen size={16} />
                    </button>
                    <button
                      onClick={() =>
                        setDialogs(prev => ({ ...prev, chatHistoryTab: true }))
                      }
                      className="inline-flex items-center justify-center h-6 w-6 text-foreground hover:bg-accent"
                      title="Chat History"
                      aria-label="Chat History"
                      style={
                        { WebkitAppRegion: "no-drag" } as React.CSSProperties
                      }
                    >
                      <ClipboardList size={16} />
                    </button>
                  </div>
                  <button
                    onClick={toggleChat}
                    className="text-xs p-1 rounded hover:bg-accent text-[hsl(var(--muted-foreground))]"
                    title="Hide Chat"
                  >
                    <X size={14} />
                  </button>
                </div>
                {/* Chat Content */}
                <div className="flex-1 min-h-0">
                  <ChatPanel />
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Chat Dialogs */}
      <SaveChatDialog
        isOpen={dialogs.saveChatDialog}
        onClose={() => setDialogs(prev => ({ ...prev, saveChatDialog: false }))}
        onSave={handleSaveChat}
        messages={currentChatMessages}
      />

      <LoadChatDialog
        isOpen={dialogs.loadChatDialog}
        onClose={() => setDialogs(prev => ({ ...prev, loadChatDialog: false }))}
        onLoad={handleLoadChat}
        connections={connections}
        engines={engines}
      />

      <ChatHistoryTab
        isOpen={dialogs.chatHistoryTab}
        onClose={() => setDialogs(prev => ({ ...prev, chatHistoryTab: false }))}
        connections={connections}
        engines={engines}
      />

      <VersionDialog
        isOpen={dialogs.versionDialog}
        onClose={() => setDialogs(prev => ({ ...prev, versionDialog: false }))}
      />

      <TipsDialog
        isOpen={dialogs.tipsDialog}
        onClose={() => setDialogs(prev => ({ ...prev, tipsDialog: false }))}
      />
    </div>
  );
}
