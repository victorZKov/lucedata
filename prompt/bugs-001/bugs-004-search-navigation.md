# Bug Fix Task: Search & Navigation Features

**Priority**: P2 (Medium)  
**Category**: UI/UX Enhancement  
**Estimated Time**: 6-8 hours  
**Complexity**: High (New Feature Implementation)

---

## Features to Implement

1. **Global Search Box** in top center header
   - Search tree elements (connections, databases, schemas, tables)
   - Search saved chat list by title
   - Filter results in real-time

2. **History Navigation** with left/right arrows
   - Track all elements user clicked in session
   - Navigate back and forth through history
   - Show current position in history

---

## Files to Create/Modify

### New Files:

- `apps/renderer/src/components/Header/GlobalSearch.tsx` - Search component
- `apps/renderer/src/components/Header/HistoryNavigation.tsx` - Navigation buttons
- `apps/renderer/src/stores/searchStore.ts` - Search state
- `apps/renderer/src/stores/navigationStore.ts` - History tracking
- `apps/renderer/src/hooks/useSearch.ts` - Search hook
- `apps/renderer/src/hooks/useNavigation.ts` - Navigation hook

### Modified Files:

- `apps/renderer/src/components/Header/Header.tsx` - Add new components
- `apps/renderer/src/components/ConnectionsTree/ConnectionsTree.tsx` - Add filtering
- `apps/renderer/src/components/Chat/ChatList.tsx` - Add filtering
- `apps/renderer/src/styles/header.css` - Update layout

---

## Part 1: Global Search Box

### Estimated Time: 4-5 hours

### Step 1: Design the Search Store (30 mins)

```typescript
// apps/renderer/src/stores/searchStore.ts

import { writable, derived } from "svelte/store";

interface SearchState {
  query: string;
  isActive: boolean;
  results: SearchResults;
}

interface SearchResults {
  connections: ConnectionResult[];
  databases: DatabaseResult[];
  schemas: SchemaResult[];
  tables: TableResult[];
  chats: ChatResult[];
}

interface SearchResult {
  id: string;
  type: "connection" | "database" | "schema" | "table" | "chat";
  label: string;
  path: string[]; // Breadcrumb path
  metadata?: any;
}

function createSearchStore() {
  const { subscribe, set, update } = writable<SearchState>({
    query: "",
    isActive: false,
    results: {
      connections: [],
      databases: [],
      schemas: [],
      tables: [],
      chats: [],
    },
  });

  return {
    subscribe,

    setQuery: (query: string) => {
      update(state => ({
        ...state,
        query,
        isActive: query.length > 0,
      }));
    },

    setResults: (results: SearchResults) => {
      update(state => ({ ...state, results }));
    },

    clear: () => {
      set({
        query: "",
        isActive: false,
        results: {
          connections: [],
          databases: [],
          schemas: [],
          tables: [],
          chats: [],
        },
      });
    },

    activate: () => {
      update(state => ({ ...state, isActive: true }));
    },

    deactivate: () => {
      update(state => ({ ...state, isActive: false }));
    },
  };
}

export const searchStore = createSearchStore();

// Derived store for hasResults
export const hasSearchResults = derived(searchStore, $search => {
  const { results } = $search;
  return (
    results.connections.length > 0 ||
    results.databases.length > 0 ||
    results.schemas.length > 0 ||
    results.tables.length > 0 ||
    results.chats.length > 0
  );
});
```

### Step 2: Create Search Hook (45 mins)

```typescript
// apps/renderer/src/hooks/useSearch.ts

import { useEffect, useCallback } from "react";
import { searchStore } from "../stores/searchStore";
import { connectionsStore } from "../stores/connectionsStore";
import { chatsStore } from "../stores/chatsStore";
import { debounce } from "../lib/utils";

interface SearchableItem {
  id: string;
  name: string;
  type: string;
  parent?: string;
  metadata?: any;
}

export function useSearch() {
  const [searchState, setSearchState] = useState({
    query: "",
    results: [],
  });

  // Search function
  const performSearch = useCallback(
    debounce(async (query: string) => {
      if (query.length < 2) {
        searchStore.clear();
        return;
      }

      const lowerQuery = query.toLowerCase();

      // Search connections tree
      const connections = connectionsStore.getAll();
      const treeResults = searchInTree(connections, lowerQuery);

      // Search chats
      const chats = chatsStore.getAll();
      const chatResults = chats.filter(chat =>
        chat.title.toLowerCase().includes(lowerQuery)
      );

      // Update search results
      searchStore.setResults({
        connections: treeResults.connections,
        databases: treeResults.databases,
        schemas: treeResults.schemas,
        tables: treeResults.tables,
        chats: chatResults,
      });
    }, 300), // Debounce 300ms
    []
  );

  // Handle search query change
  const handleSearchChange = useCallback(
    (query: string) => {
      searchStore.setQuery(query);
      performSearch(query);
    },
    [performSearch]
  );

  // Clear search
  const clearSearch = useCallback(() => {
    searchStore.clear();
  }, []);

  return {
    search: handleSearchChange,
    clear: clearSearch,
  };
}

// Helper function to search in tree structure
function searchInTree(connections: Connection[], query: string) {
  const results = {
    connections: [],
    databases: [],
    schemas: [],
    tables: [],
  };

  connections.forEach(conn => {
    // Search connection name
    if (conn.name.toLowerCase().includes(query)) {
      results.connections.push({
        id: conn.id,
        label: conn.name,
        path: [conn.name],
        type: "connection",
        metadata: conn,
      });
    }

    // Search databases
    conn.databases?.forEach(db => {
      if (db.name.toLowerCase().includes(query)) {
        results.databases.push({
          id: `${conn.id}-${db.name}`,
          label: db.name,
          path: [conn.name, db.name],
          type: "database",
          metadata: { connection: conn, database: db },
        });
      }

      // Search schemas
      db.schemas?.forEach(schema => {
        if (schema.name.toLowerCase().includes(query)) {
          results.schemas.push({
            id: `${conn.id}-${db.name}-${schema.name}`,
            label: schema.name,
            path: [conn.name, db.name, schema.name],
            type: "schema",
            metadata: { connection: conn, database: db, schema },
          });
        }

        // Search tables
        schema.tables?.forEach(table => {
          if (table.name.toLowerCase().includes(query)) {
            results.tables.push({
              id: `${conn.id}-${db.name}-${schema.name}-${table.name}`,
              label: table.name,
              path: [conn.name, db.name, schema.name, table.name],
              type: "table",
              metadata: { connection: conn, database: db, schema, table },
            });
          }
        });
      });
    });
  });

  return results;
}
```

### Step 3: Create Search Component (1.5 hours)

```typescript
// apps/renderer/src/components/Header/GlobalSearch.tsx

import React, { useState, useRef, useEffect } from 'react';
import { SearchIcon, XIcon } from 'lucide-react';
import { useSearch } from '../../hooks/useSearch';
import { searchStore, hasSearchResults } from '../../stores/searchStore';
import './GlobalSearch.css';

export function GlobalSearch() {
  const [query, setQuery] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);
  const [results, setResults] = useState(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { search, clear } = useSearch();

  // Subscribe to search results
  useEffect(() => {
    const unsubscribe = searchStore.subscribe(state => {
      setResults(state.results);
    });
    return unsubscribe;
  }, []);

  // Handle input change
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    search(value);
  };

  // Handle clear
  const handleClear = () => {
    setQuery('');
    clear();
    setIsExpanded(false);
  };

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd+K or Ctrl+K to focus search
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
        setIsExpanded(true);
      }

      // Escape to close
      if (e.key === 'Escape' && isExpanded) {
        handleClear();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isExpanded]);

  // Handle result click
  const handleResultClick = (result: any) => {
    // Navigate to the result
    navigationStore.navigateTo(result);
    handleClear();
  };

  return (
    <div className={`global-search ${isExpanded ? 'expanded' : ''}`}>
      <div className="search-input-wrapper">
        <SearchIcon className="search-icon" size={18} />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleChange}
          onFocus={() => setIsExpanded(true)}
          placeholder="Search connections, tables, chats... (⌘K)"
          className="search-input"
        />
        {query && (
          <button
            onClick={handleClear}
            className="clear-button"
            title="Clear search"
          >
            <XIcon size={16} />
          </button>
        )}
      </div>

      {isExpanded && query && results && (
        <SearchResults
          results={results}
          onResultClick={handleResultClick}
          onClose={handleClear}
        />
      )}
    </div>
  );
}

// Search results dropdown
interface SearchResultsProps {
  results: any;
  onResultClick: (result: any) => void;
  onClose: () => void;
}

function SearchResults({ results, onResultClick, onClose }: SearchResultsProps) {
  const hasResults =
    results.connections.length > 0 ||
    results.databases.length > 0 ||
    results.schemas.length > 0 ||
    results.tables.length > 0 ||
    results.chats.length > 0;

  if (!hasResults) {
    return (
      <div className="search-results">
        <div className="no-results">No results found</div>
      </div>
    );
  }

  return (
    <div className="search-results">
      {results.connections.length > 0 && (
        <ResultSection
          title="Connections"
          items={results.connections}
          onClick={onResultClick}
        />
      )}

      {results.databases.length > 0 && (
        <ResultSection
          title="Databases"
          items={results.databases}
          onClick={onResultClick}
        />
      )}

      {results.tables.length > 0 && (
        <ResultSection
          title="Tables"
          items={results.tables}
          onClick={onResultClick}
        />
      )}

      {results.chats.length > 0 && (
        <ResultSection
          title="Chats"
          items={results.chats}
          onClick={onResultClick}
        />
      )}
    </div>
  );
}

function ResultSection({ title, items, onClick }) {
  return (
    <div className="result-section">
      <div className="section-title">{title}</div>
      {items.map(item => (
        <div
          key={item.id}
          className="result-item"
          onClick={() => onClick(item)}
        >
          <div className="result-label">{item.label}</div>
          <div className="result-path">
            {item.path.join(' > ')}
          </div>
        </div>
      ))}
    </div>
  );
}
```

### Step 4: Add CSS Styling (30 mins)

```css
/* apps/renderer/src/components/Header/GlobalSearch.css */

.global-search {
  position: relative;
  max-width: 400px;
  width: 100%;
  transition: max-width 0.2s ease;
}

.global-search.expanded {
  max-width: 600px;
  z-index: 1000;
}

.search-input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
  background: var(--input-background);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 8px 12px;
  transition: all 0.2s ease;
}

.search-input-wrapper:focus-within {
  border-color: var(--primary-color);
  box-shadow: 0 0 0 3px rgba(var(--primary-rgb), 0.1);
}

.search-icon {
  color: var(--text-secondary);
  margin-right: 8px;
}

.search-input {
  flex: 1;
  border: none;
  background: transparent;
  outline: none;
  font-size: 14px;
  color: var(--text-primary);
}

.search-input::placeholder {
  color: var(--text-tertiary);
}

.clear-button {
  background: none;
  border: none;
  cursor: pointer;
  color: var(--text-secondary);
  padding: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  transition: all 0.15s ease;
}

.clear-button:hover {
  background: var(--hover-background);
  color: var(--text-primary);
}

.search-results {
  position: absolute;
  top: calc(100% + 8px);
  left: 0;
  right: 0;
  background: var(--dropdown-background);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  max-height: 400px;
  overflow-y: auto;
  z-index: 1000;
}

.no-results {
  padding: 24px;
  text-align: center;
  color: var(--text-secondary);
}

.result-section {
  padding: 8px 0;
  border-bottom: 1px solid var(--border-color);
}

.result-section:last-child {
  border-bottom: none;
}

.section-title {
  padding: 8px 16px;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  color: var(--text-tertiary);
  letter-spacing: 0.5px;
}

.result-item {
  padding: 10px 16px;
  cursor: pointer;
  transition: background 0.15s ease;
}

.result-item:hover {
  background: var(--hover-background);
}

.result-label {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary);
  margin-bottom: 4px;
}

.result-path {
  font-size: 12px;
  color: var(--text-secondary);
}
```

### Step 5: Integrate with Header (30 mins)

```typescript
// apps/renderer/src/components/Header/Header.tsx

import { GlobalSearch } from './GlobalSearch';
import { HistoryNavigation } from './HistoryNavigation';

export function Header() {
  return (
    <header className="app-header">
      <div className="header-left">
        <Logo />
      </div>

      <div className="header-center">
        <HistoryNavigation />
        <GlobalSearch />
      </div>

      <div className="header-right">
        <ToggleConnectionsButton />
        <ToggleChatButton />
        <UserMenu />
      </div>
    </header>
  );
}
```

Update header CSS:

```css
/* apps/renderer/src/styles/header.css */

.app-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: var(--header-background);
  border-bottom: 1px solid var(--border-color);
}

.header-left,
.header-right {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 12px;
}

.header-center {
  flex: 2;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  max-width: 700px;
}
```

### Step 6: Filter Tree and Chat List (1 hour)

```typescript
// apps/renderer/src/components/ConnectionsTree/ConnectionsTree.tsx

import { useEffect, useState } from 'react';
import { searchStore } from '../../stores/searchStore';

export function ConnectionsTree() {
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredConnections, setFilteredConnections] = useState([]);

  // Subscribe to search
  useEffect(() => {
    const unsubscribe = searchStore.subscribe(state => {
      setSearchQuery(state.query);
    });
    return unsubscribe;
  }, []);

  // Filter connections based on search
  useEffect(() => {
    if (!searchQuery) {
      setFilteredConnections(connections);
      return;
    }

    const filtered = filterTreeByQuery(connections, searchQuery);
    setFilteredConnections(filtered);
  }, [connections, searchQuery]);

  return (
    <div className="connections-tree">
      {filteredConnections.map(conn => (
        <ConnectionNode key={conn.id} connection={conn} />
      ))}
    </div>
  );
}
```

---

## Part 2: History Navigation

### Estimated Time: 2-3 hours

### Step 1: Create Navigation Store (45 mins)

```typescript
// apps/renderer/src/stores/navigationStore.ts

import { writable } from "svelte/store";

interface NavigationItem {
  id: string;
  type: "connection" | "database" | "schema" | "table" | "chat" | "query";
  label: string;
  path: string[];
  timestamp: number;
  metadata?: any;
}

interface NavigationState {
  history: NavigationItem[];
  currentIndex: number;
}

function createNavigationStore() {
  const { subscribe, set, update } = writable<NavigationState>({
    history: [],
    currentIndex: -1,
  });

  return {
    subscribe,

    // Add item to history
    push: (item: Omit<NavigationItem, "timestamp">) => {
      update(state => {
        const newItem = { ...item, timestamp: Date.now() };

        // Remove any history after current index (if we went back)
        const newHistory = state.history.slice(0, state.currentIndex + 1);

        // Add new item
        newHistory.push(newItem);

        // Limit history to 50 items
        if (newHistory.length > 50) {
          newHistory.shift();
        }

        return {
          history: newHistory,
          currentIndex: newHistory.length - 1,
        };
      });
    },

    // Go back in history
    back: () => {
      update(state => {
        if (state.currentIndex > 0) {
          return {
            ...state,
            currentIndex: state.currentIndex - 1,
          };
        }
        return state;
      });
    },

    // Go forward in history
    forward: () => {
      update(state => {
        if (state.currentIndex < state.history.length - 1) {
          return {
            ...state,
            currentIndex: state.currentIndex + 1,
          };
        }
        return state;
      });
    },

    // Can go back?
    canGoBack: () => {
      let canBack = false;
      subscribe(state => {
        canBack = state.currentIndex > 0;
      })();
      return canBack;
    },

    // Can go forward?
    canGoForward: () => {
      let canForward = false;
      subscribe(state => {
        canForward = state.currentIndex < state.history.length - 1;
      })();
      return canForward;
    },

    // Get current item
    getCurrentItem: () => {
      let current = null;
      subscribe(state => {
        if (
          state.currentIndex >= 0 &&
          state.currentIndex < state.history.length
        ) {
          current = state.history[state.currentIndex];
        }
      })();
      return current;
    },

    // Clear history
    clear: () => {
      set({ history: [], currentIndex: -1 });
    },
  };
}

export const navigationStore = createNavigationStore();
```

### Step 2: Create History Navigation Component (1 hour)

```typescript
// apps/renderer/src/components/Header/HistoryNavigation.tsx

import React, { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { navigationStore } from '../../stores/navigationStore';
import './HistoryNavigation.css';

export function HistoryNavigation() {
  const [canGoBack, setCanGoBack] = useState(false);
  const [canGoForward, setCanGoForward] = useState(false);

  // Subscribe to navigation state
  useEffect(() => {
    const unsubscribe = navigationStore.subscribe(state => {
      setCanGoBack(state.currentIndex > 0);
      setCanGoForward(state.currentIndex < state.history.length - 1);
    });
    return unsubscribe;
  }, []);

  const handleBack = () => {
    navigationStore.back();
    const currentItem = navigationStore.getCurrentItem();
    if (currentItem) {
      navigateToItem(currentItem);
    }
  };

  const handleForward = () => {
    navigationStore.forward();
    const currentItem = navigationStore.getCurrentItem();
    if (currentItem) {
      navigateToItem(currentItem);
    }
  };

  // Navigate to a history item
  const navigateToItem = (item: NavigationItem) => {
    switch (item.type) {
      case 'connection':
        // Expand connection in tree
        treeStore.expandConnection(item.id);
        break;
      case 'database':
        // Expand database
        treeStore.expandDatabase(item.metadata.connectionId, item.id);
        break;
      case 'table':
        // Select table
        treeStore.selectTable(item.id);
        break;
      case 'chat':
        // Open chat
        chatsStore.openChat(item.id);
        break;
      case 'query':
        // Open query editor
        queryEditorStore.openQuery(item.id);
        break;
    }
  };

  return (
    <div className="history-navigation">
      <button
        onClick={handleBack}
        disabled={!canGoBack}
        title="Go back (⌘[)"
        className="nav-button"
      >
        <ChevronLeft size={18} />
      </button>

      <button
        onClick={handleForward}
        disabled={!canGoForward}
        title="Go forward (⌘])"
        className="nav-button"
      >
        <ChevronRight size={18} />
      </button>
    </div>
  );
}
```

### Step 3: Track User Actions (1 hour)

```typescript
// apps/renderer/src/hooks/useNavigationTracking.ts

import { useEffect } from "react";
import { navigationStore } from "../stores/navigationStore";

export function useNavigationTracking() {
  // Track connection clicks
  const trackConnectionClick = (connection: Connection) => {
    navigationStore.push({
      id: connection.id,
      type: "connection",
      label: connection.name,
      path: [connection.name],
      metadata: connection,
    });
  };

  // Track table clicks
  const trackTableClick = (
    table: Table,
    connection: Connection,
    database: Database,
    schema: Schema
  ) => {
    navigationStore.push({
      id: table.id,
      type: "table",
      label: table.name,
      path: [connection.name, database.name, schema.name, table.name],
      metadata: { table, connection, database, schema },
    });
  };

  // Track chat clicks
  const trackChatClick = (chat: Chat) => {
    navigationStore.push({
      id: chat.id,
      type: "chat",
      label: chat.title,
      path: ["Chats", chat.title],
      metadata: chat,
    });
  };

  return {
    trackConnectionClick,
    trackTableClick,
    trackChatClick,
  };
}
```

Use in components:

```typescript
// In ConnectionNode.tsx
const { trackConnectionClick } = useNavigationTracking();

const handleClick = () => {
  trackConnectionClick(connection);
  // ... rest of click handler
};
```

### Step 4: Add Keyboard Shortcuts (30 mins)

```typescript
// apps/renderer/src/hooks/useKeyboardShortcuts.ts

import { useEffect } from "react";
import { navigationStore } from "../stores/navigationStore";

export function useKeyboardShortcuts() {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd+[ or Ctrl+[ to go back
      if ((e.metaKey || e.ctrlKey) && e.key === "[") {
        e.preventDefault();
        navigationStore.back();
      }

      // Cmd+] or Ctrl+] to go forward
      if ((e.metaKey || e.ctrlKey) && e.key === "]") {
        e.preventDefault();
        navigationStore.forward();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);
}
```

---

## Testing Checklist

### Global Search:

- [ ] Search box appears in header center
- [ ] Typing shows results in real-time
- [ ] Results are categorized (connections, tables, chats)
- [ ] Clicking result navigates correctly
- [ ] Cmd+K focuses search box
- [ ] ESC clears search
- [ ] Search filters tree and chat list
- [ ] Debouncing works (no excessive searches)

### History Navigation:

- [ ] Arrows appear beside search box
- [ ] Back button disabled when at start
- [ ] Forward button disabled when at end
- [ ] Clicking element adds to history
- [ ] Back button navigates to previous item
- [ ] Forward button navigates to next item
- [ ] Cmd+[ goes back
- [ ] Cmd+] goes forward
- [ ] History limited to 50 items
- [ ] History persists during session

---

## Success Criteria

✅ Global search implemented and functional  
✅ Search filters tree and chat list  
✅ History navigation tracks all clicks  
✅ Back/forward buttons work correctly  
✅ Keyboard shortcuts work  
✅ UI is responsive and performant  
✅ No console errors  
✅ Tested on all platforms

---

## Notes

- Consider adding search result highlighting
- Future: Add search syntax (type:table, connection:name, etc.)
- Future: Save search history
- Future: Add recent searches dropdown
- Consider adding visual indicator for current history position
- Document keyboard shortcuts for users
