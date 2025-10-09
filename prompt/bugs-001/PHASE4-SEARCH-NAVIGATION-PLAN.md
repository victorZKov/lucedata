# Phase 4: Search & Navigation Feature - Implementation Plan

## Overview

**Goal**: Implement global search and history navigation in the application header  
**Priority**: P2 (Medium - Feature Enhancement)  
**Estimated Time**: 6-8 hours  
**Complexity**: High (New Feature Implementation)  
**Current Version**: 0.1.4  
**Target Version**: 0.2.0 (feature release)

---

## 🎯 Feature Requirements

### 1. Global Search Box

- **Location**: Center of title bar (between left and right controls)
- **Functionality**:
  - Search connections tree (connections, databases, schemas, tables)
  - Search saved chats by title
  - Real-time filtering as user types
  - Keyboard shortcut: `Cmd+K` / `Ctrl+K` to focus
  - `Escape` to clear search
- **UI**:
  - Search icon on left
  - Clear button (X) on right when text exists
  - Dropdown with categorized results
  - Breadcrumb paths for each result
  - Click result to navigate

### 2. History Navigation

- **Location**: To the left of search box in title bar
- **Functionality**:
  - Track all user clicks in Explorer tree
  - Navigate backwards with left arrow
  - Navigate forwards with right arrow
  - Keyboard shortcuts: `Cmd+[` / `Cmd+]`
  - Maintain history across session (max 50 items)
- **UI**:
  - Left arrow button (disabled when at start)
  - Right arrow button (disabled when at end)
  - Hover shows previous/next item name

---

## 📁 Architecture Design

### Current Layout Structure

```
Layout.tsx
├── Title Bar
│   ├── Left: Toggle Connections button
│   ├── Center: (empty - space for new features)
│   └── Right: Toggle Chat, Theme, Settings
├── Toolbar (collapsible)
└── Main Content (Explorer + WorkArea + Chat)
```

### Proposed Layout Structure

```
Layout.tsx
├── Title Bar
│   ├── Left: Toggle Connections button
│   ├── Center: [NEW] Search & Navigation Section
│   │   ├── HistoryNavigation component (← →)
│   │   └── GlobalSearch component (search box + dropdown)
│   └── Right: Toggle Chat, Theme, Settings
├── Toolbar (collapsible)
└── Main Content (Explorer + WorkArea + Chat)
```

---

## 🏗️ Implementation Strategy

### Approach: **Minimal Disruption with React Context**

Instead of introducing Svelte stores (as in the original spec), we'll use:

1. **React Context** for search and navigation state
2. **CustomEvents** for cross-component communication (already established pattern)
3. **localStorage** for persisting navigation history across sessions
4. **useReducer** for complex state management

This keeps the architecture consistent with the existing codebase.

---

## 📝 Implementation Plan

### Part 1: Global Search Feature (4-5 hours)

#### Step 1: Create Search Context (45 mins)

**New File**: `apps/renderer/src/contexts/SearchContext.tsx`

```typescript
interface SearchResult {
  id: string;
  type: "connection" | "database" | "schema" | "table" | "chat";
  label: string;
  path: string[]; // Breadcrumb
  metadata: any; // Additional info for navigation
}

interface SearchState {
  query: string;
  isActive: boolean;
  results: {
    connections: SearchResult[];
    databases: SearchResult[];
    schemas: SearchResult[];
    tables: SearchResult[];
    chats: SearchResult[];
  };
}

interface SearchContextValue {
  state: SearchState;
  search: (query: string) => void;
  clear: () => void;
  navigateToResult: (result: SearchResult) => void;
}
```

**Key Features**:

- Debounced search (300ms)
- Real-time filtering
- Event-driven navigation

#### Step 2: Create GlobalSearch Component (2 hours)

**New File**: `apps/renderer/src/components/GlobalSearch.tsx`

**Features**:

- Compact search input in title bar
- Expands on focus
- Shows dropdown with categorized results
- Highlights matching text
- Keyboard navigation (arrow keys, Enter to select)
- Click outside or Escape to close

**Styling**: Match existing title bar aesthetic (rounded, border, hover states)

#### Step 3: Integrate with Explorer Tree (1 hour)

**Modified**: `apps/renderer/src/components/Explorer.tsx`

- Listen for search events
- Filter visible nodes based on search query
- Expand parent nodes of matching items
- Highlight matching text in tree

#### Step 4: Integrate with Saved Chats (30 mins)

**Modified**: `apps/renderer/src/components/SavedChatsPanel.tsx`

- Filter chat list based on search query
- Highlight matching text in titles

#### Step 5: Add to Layout (30 mins)

**Modified**: `apps/renderer/src/components/Layout.tsx`

- Add SearchProvider wrapper
- Insert GlobalSearch component in title bar center
- Adjust spacing and layout

---

### Part 2: History Navigation (2-3 hours)

#### Step 1: Create Navigation Context (45 mins)

**New File**: `apps/renderer/src/contexts/NavigationContext.tsx`

```typescript
interface NavigationItem {
  id: string;
  type: "connection" | "database" | "schema" | "table" | "chat";
  label: string;
  path: string[];
  timestamp: number;
  metadata: any;
}

interface NavigationState {
  history: NavigationItem[];
  currentIndex: number;
}

interface NavigationContextValue {
  state: NavigationState;
  goBack: () => void;
  goForward: () => void;
  pushHistory: (item: Omit<NavigationItem, "timestamp">) => void;
  canGoBack: boolean;
  canGoForward: boolean;
  getCurrentItem: () => NavigationItem | null;
}
```

**Key Features**:

- Max 50 items in history
- Persist to localStorage
- Load on app start

#### Step 2: Track User Actions (1 hour)

**Modified Files**:

- `apps/renderer/src/components/Explorer.tsx` - Track tree node clicks
- `apps/renderer/src/components/SavedChatsPanel.tsx` - Track chat clicks
- `apps/renderer/src/components/WorkArea.tsx` - Track tab switches

**Pattern**: Add history tracking to onClick handlers:

```typescript
const handleNodeClick = node => {
  // Existing logic
  // ...

  // Add to history
  navigationContext.pushHistory({
    id: node.id,
    type: node.type,
    label: node.name,
    path: buildPath(node),
    metadata: node,
  });
};
```

#### Step 3: Create HistoryNavigation Component (45 mins)

**New File**: `apps/renderer/src/components/HistoryNavigation.tsx`

**Features**:

- Two icon buttons (ChevronLeft, ChevronRight)
- Disabled states when can't navigate
- Tooltip showing previous/next item
- Click to navigate
- Keyboard shortcuts (Cmd+[, Cmd+])

#### Step 4: Implement Navigation Actions (45 mins)

When user clicks back/forward:

1. Get the target history item
2. Dispatch navigation event based on item type:
   - Connection: Expand in tree
   - Database: Expand in tree
   - Schema: Expand in tree
   - Table: Select and show in WorkArea
   - Chat: Open chat panel and load chat

#### Step 5: Add to Layout (15 mins)

**Modified**: `apps/renderer/src/components/Layout.tsx`

- Add NavigationProvider wrapper
- Insert HistoryNavigation component in title bar (left of search)
- Add keyboard shortcut handlers

---

## 🎨 UI/UX Design

### Title Bar Layout (macOS)

```
┌─────────────────────────────────────────────────────────────────┐
│ ● ● ●  [Connections]  [← →] [🔍 Search...]   [Chat][🌙][⚙️]   │
└─────────────────────────────────────────────────────────────────┘
   ↑          ↑           ↑         ↑              ↑
  Traffic   Toggle    History   Search       Right controls
  Lights    Conn.    Navigate   Global
```

### Search Dropdown

```
┌─────────────────────────────────────────┐
│ 🔍 Search...                    [×]     │
└─────────────────────────────────────────┘
┌─────────────────────────────────────────┐
│ CONNECTIONS                             │
│  └─ 🔗 Local SQL Server                 │
│      path: Local SQL Server             │
├─────────────────────────────────────────┤
│ DATABASES                               │
│  └─ 💾 AdventureWorks                   │
│      path: Local > AdventureWorks       │
├─────────────────────────────────────────┤
│ TABLES                                  │
│  └─ 📋 Users                            │
│      path: Local > DB > dbo > Users     │
└─────────────────────────────────────────┘
```

---

## 🧪 Testing Strategy

### Unit Tests

- Search context state management
- Navigation context history management
- Search filtering logic
- Navigation action dispatching

### Integration Tests

- Search → filter tree
- Search → filter chats
- Click result → navigate correctly
- History back/forward → UI updates
- Keyboard shortcuts work

### Manual Testing

1. Type in search → see results
2. Click result → correct item selected
3. Click connections → added to history
4. Click back arrow → previous item shown
5. Click forward arrow → next item shown
6. Cmd+K → focus search
7. Cmd+[ → go back
8. Cmd+] → go forward
9. Escape → clear search

---

## 📊 Success Criteria

✅ Search box appears in title bar  
✅ Search returns results from tree and chats  
✅ Results categorized and easy to read  
✅ Click result navigates correctly  
✅ History arrows appear in title bar  
✅ Arrows disabled at start/end of history  
✅ Back/forward navigation works  
✅ All keyboard shortcuts work  
✅ No console errors  
✅ Performance is smooth (no lag)  
✅ Works on macOS and Windows

---

## 🚀 Implementation Order

### Session 1: Search Foundation (2 hours)

1. Create SearchContext
2. Create basic GlobalSearch component
3. Add to Layout (test keyboard shortcut)

### Session 2: Search Integration (2 hours)

4. Implement search logic (filter tree & chats)
5. Create search dropdown with results
6. Add navigation on result click

### Session 3: History Foundation (1.5 hours)

7. Create NavigationContext
8. Create HistoryNavigation component
9. Add to Layout

### Session 4: History Integration (1.5 hours)

10. Track clicks in Explorer
11. Track clicks in SavedChatsPanel
12. Implement back/forward navigation

### Session 5: Polish & Test (1 hour)

13. Add keyboard shortcuts
14. Style and polish UI
15. Test all scenarios
16. Fix bugs

---

## 🔧 Technical Considerations

### Performance

- **Debounce search**: 300ms delay
- **Limit results**: Max 10 per category
- **Lazy loading**: Only search visible data
- **Memoization**: Use useMemo for filtered results

### Accessibility

- ARIA labels on buttons
- Keyboard navigation support
- Screen reader friendly
- Focus management

### Edge Cases

- Empty search results
- Very long item names
- Duplicate names in different locations
- History when items deleted
- Search special characters

---

## 📦 Dependencies

**No new npm packages required!**

Using existing:

- React hooks (useState, useContext, useReducer, useMemo)
- lucide-react icons (Search, ChevronLeft, ChevronRight, X)
- Existing CustomEvent system
- localStorage (built-in)

---

## 🎯 Next Steps

1. Review and approve this plan
2. Start implementation with Session 1
3. Test after each session
4. Commit progress incrementally
5. Release as version 0.2.0 when complete

---

## 📝 Notes

- This is a **feature addition**, not a bug fix, so it warrants a minor version bump (0.1.4 → 0.2.0)
- Implementation can be done incrementally - search first, then navigation
- We can test search independently before adding navigation
- Consider creating a feature branch for this work
- Original spec suggested Svelte stores, but we're using React patterns for consistency

---

**Ready to start implementation?** 🚀
