import { useEffect, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import Layout from "./components/Layout";
import StatusBar from "./components/StatusBar";
import AIEnginesDialog from "./components/AIEnginesDialog";
import SettingsDialog from "./components/SettingsDialog";
import FirstRunWizard from "./components/FirstRunWizard/FirstRunWizard";
import { UpdateNotification } from "./components/UpdateNotification";
import { ThemeProvider } from "./contexts/ThemeContext";

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      refetchOnWindowFocus: false,
    },
  },
});

function App() {
  const [showAIEnginesDialog, setShowAIEnginesDialog] = useState(false);
  const [showSettingsDialog, setShowSettingsDialog] = useState(false);
  const [showFirstRunWizard, setShowFirstRunWizard] = useState(false);
  const [firstRunMode, setFirstRunMode] = useState<"first-run" | "migrate">(
    "first-run"
  );

  useEffect(() => {
    // Check bootstrap / first-run status
    (async () => {
      try {
        if (window.electronAPI) {
          const done = await window.electronAPI.store.get("bootstrap.done");
          console.log("First-run bootstrap.done:", done);
          if (!done) setShowFirstRunWizard(true);
        }
      } catch (e) {
        console.warn("Could not read bootstrap status", e);
      }
    })();

    // Listen for AI engines dialog events
    const handleOpenAIEnginesSettings = () => {
      setShowAIEnginesDialog(true);
    };

    // Listen for Settings dialog events
    const handleOpenSettings = () => {
      setShowSettingsDialog(true);
    };

    document.addEventListener(
      "open-ai-engines-settings",
      handleOpenAIEnginesSettings
    );

    document.addEventListener("open-settings", handleOpenSettings);
    // Listen for requests from other renderer components to open the first-run wizard
    const handleOpenFirstRunWizard = (ev?: Event) => {
      const custom = ev as CustomEvent<{ mode?: string }> | undefined;
      const mode = custom?.detail?.mode === "migrate" ? "migrate" : "first-run";
      setFirstRunMode(mode);
      // close settings dialog if open so the wizard can be interactive
      setShowSettingsDialog(false);
      setShowFirstRunWizard(true);
    };
    document.addEventListener(
      "open-first-run-wizard",
      handleOpenFirstRunWizard as EventListener
    );

    // Set up menu action handlers
    const handleMenuAction = (action: string, ...args: unknown[]) => {
      console.log("Menu action:", action, args);

      switch (action) {
        case "new-connection":
          // Handle new connection
          console.log("Opening new connection dialog");
          break;
        case "migrate-configuration":
          // Open FirstRunWizard in migrate mode
          setFirstRunMode("migrate");
          setShowFirstRunWizard(true);
          break;
        case "manage-ai-engines":
          // Open Settings dialog with AI Engines tab
          setShowSettingsDialog(true);
          // Dispatch event to set AI Engines tab as active
          document.dispatchEvent(
            new CustomEvent("settings-tab-change", {
              detail: { tab: "ai-engines" },
            })
          );
          break;
        case "select-ai-provider":
          // Handle AI provider selection
          console.log("Opening AI provider selection");
          break;
        case "manage-api-keys":
          // Handle API key management
          console.log("Opening API key management");
          break;
        case "safety-settings":
          // Handle safety settings
          console.log("Opening safety settings");
          break;
        case "new-query":
          // Handle new query
          console.log("Creating new query");
          break;
        case "toggle-explorer":
          // This will be handled by the Layout component
          document.dispatchEvent(new CustomEvent("toggle-explorer"));
          break;
        case "toggle-chat":
          // This will be handled by the Layout component
          document.dispatchEvent(new CustomEvent("toggle-chat"));
          break;
        case "toggle-results":
          // This will be handled by the WorkArea component
          document.dispatchEvent(new CustomEvent("toggle-results"));
          break;
        case "set-theme-mode": {
          const mode = (args?.[0] as "system" | "light" | "dark") ?? "system";
          document.dispatchEvent(
            new CustomEvent("set-theme-mode", { detail: { mode } })
          );
          break;
        }
        case "preferences":
          // Handle preferences
          setShowSettingsDialog(true);
          break;
        case "find":
          // Handle find
          console.log("Opening find dialog");
          break;
        case "replace":
          // Handle find and replace
          console.log("Opening find and replace dialog");
          break;
        case "format-sql":
          // Handle SQL formatting
          console.log("Formatting SQL");
          break;
        case "toggle-comment":
          // Handle comment toggle
          console.log("Toggling comment");
          break;
        case "show-version":
          // Handle version dialog
          console.log("Opening version dialog");
          document.dispatchEvent(new CustomEvent("show-version"));
          break;
        default:
          console.log("Unhandled menu action:", action);
      }
    };

    // Set up the menu action listener
    if (window.electronAPI) {
      // typed callback for the preload API
      type MenuActionCallback = (action: string, ...args: unknown[]) => void;
      window.electronAPI.onMenuAction(handleMenuAction as MenuActionCallback);
    }

    // Cleanup
    return () => {
      document.removeEventListener(
        "open-ai-engines-settings",
        handleOpenAIEnginesSettings
      );
      document.removeEventListener("open-settings", handleOpenSettings);
      document.removeEventListener(
        "open-first-run-wizard",
        handleOpenFirstRunWizard as EventListener
      );
      if (window.electronAPI) {
        window.electronAPI.removeAllListeners("menu-action");
      }
    };
  }, []);

  // Debug: Log when component renders
  console.log("🔧 App component rendering...");

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <div
          className="h-screen overflow-hidden bg-[hsl(var(--background))] text-[hsl(var(--foreground))] transition-colors"
          style={{ paddingBottom: 102 }}
        >
          <div style={{ padding: "20px", color: "red", fontSize: "18px" }}>
            🔧 DEBUG: React App is rendering! ElectronAPI available:{" "}
            {window.electronAPI ? "YES" : "NO"}
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              height: "calc(100vh - 0px)",
            }}
          >
            <div style={{ flex: 1, overflow: "auto" }}>
              <Layout />
            </div>
            <StatusBar />
          </div>
          {showFirstRunWizard && (
            <FirstRunWizard
              mode={firstRunMode}
              onClose={() => setShowFirstRunWizard(false)}
            />
          )}
          <AIEnginesDialog
            isOpen={showAIEnginesDialog}
            onClose={() => {
              setShowAIEnginesDialog(false);
              // Dispatch event to refresh engines in other components
              document.dispatchEvent(new CustomEvent("ai-engines-updated"));
            }}
          />
          <SettingsDialog
            isOpen={showSettingsDialog}
            onClose={() => {
              setShowSettingsDialog(false);
            }}
          />
          <UpdateNotification />
        </div>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
