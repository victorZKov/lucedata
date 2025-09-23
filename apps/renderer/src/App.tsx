import { useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import Layout from "./components/Layout";
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
  useEffect(() => {
    // Set up menu action handlers
    const handleMenuAction = (action: string, ...args: any[]) => {
      console.log('Menu action:', action, args);
      
      switch (action) {
        case 'new-connection':
          // Handle new connection
          console.log('Opening new connection dialog');
          break;
        case 'select-ai-provider':
          // Handle AI provider selection
          console.log('Opening AI provider selection');
          break;
        case 'manage-api-keys':
          // Handle API key management
          console.log('Opening API key management');
          break;
        case 'safety-settings':
          // Handle safety settings
          console.log('Opening safety settings');
          break;
        case 'new-query':
          // Handle new query
          console.log('Creating new query');
          break;
        case 'toggle-explorer':
          // This will be handled by the Layout component
          document.dispatchEvent(new CustomEvent('toggle-explorer'));
          break;
        case 'toggle-chat':
          // This will be handled by the Layout component
          document.dispatchEvent(new CustomEvent('toggle-chat'));
          break;
        case 'toggle-results':
          // This will be handled by the WorkArea component
          document.dispatchEvent(new CustomEvent('toggle-results'));
          break;
        case 'preferences':
          // Handle preferences
          console.log('Opening preferences');
          break;
        case 'find':
          // Handle find
          console.log('Opening find dialog');
          break;
        case 'replace':
          // Handle find and replace
          console.log('Opening find and replace dialog');
          break;
        case 'format-sql':
          // Handle SQL formatting
          console.log('Formatting SQL');
          break;
        case 'toggle-comment':
          // Handle comment toggle
          console.log('Toggling comment');
          break;
        default:
          console.log('Unhandled menu action:', action);
      }
    };

    // Set up the menu action listener
    if (window.electronAPI) {
      window.electronAPI.onMenuAction(handleMenuAction);
    }

    // Cleanup
    return () => {
      if (window.electronAPI) {
        window.electronAPI.removeAllListeners('menu-action');
      }
    };
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <div className="h-screen overflow-hidden bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 transition-colors">
          <Layout />
        </div>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;