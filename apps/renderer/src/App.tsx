import { useEffect, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import Layout from "./components/Layout";
import AIEnginesDialog from "./components/AIEnginesDialog";
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

  useEffect(() => {
    // Listen for AI engines dialog events
    const handleOpenAIEnginesSettings = () => {
      setShowAIEnginesDialog(true);
    };

    document.addEventListener(
      "open-ai-engines-settings",
      handleOpenAIEnginesSettings
    );

    // Set up menu action handlers
    const handleMenuAction = (action: string, ...args: unknown[]) => {
      console.log("Menu action:", action, args);

      switch (action) {
        case "new-connection":
          // Handle new connection
          console.log("Opening new connection dialog");
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
          console.log("Opening preferences");
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
      window.electronAPI.onMenuAction(handleMenuAction);
    }

    // Cleanup
    return () => {
      document.removeEventListener(
        "open-ai-engines-settings",
        handleOpenAIEnginesSettings
      );
      if (window.electronAPI) {
        window.electronAPI.removeAllListeners("menu-action");
      }
    };
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <div className="h-screen overflow-hidden bg-[hsl(var(--background))] text-[hsl(var(--foreground))] transition-colors">
          <Layout />
          <AIEnginesDialog
            isOpen={showAIEnginesDialog}
            onClose={() => {
              setShowAIEnginesDialog(false);
              // Dispatch event to refresh engines in other components
              document.dispatchEvent(new CustomEvent("ai-engines-updated"));
            }}
          />
        </div>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
