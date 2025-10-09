# Bug Fix Task: Connections Section Issues

**Priority**: P1 (High)  
**Category**: Connections/Tree UI  
**Estimated Time**: 3-4 hours  
**Complexity**: Medium

---

## Issues to Fix

1. Plus button adds configuration but tree doesn't update until app refresh
2. Refresh connections button not refreshing tree content
3. Database Node Plus button doing nothing (should be removed)
4. Schema buttons (new query, refresh) doing nothing

---

## Files to Review/Modify

### Primary Files:

- `apps/renderer/src/components/ConnectionsTree/` - Tree component
- `apps/renderer/src/components/ConnectionsTree/ConnectionNode.tsx`
- `apps/renderer/src/components/ConnectionsTree/DatabaseNode.tsx`
- `apps/renderer/src/components/ConnectionsTree/SchemaNode.tsx`
- `apps/renderer/src/stores/connectionsStore.ts` - Connection state
- `apps/renderer/src/stores/treeStore.ts` - Tree state

### Related Files:

- `apps/desktop/src/main.js` - IPC handlers
- `packages/database-core/src/connectionManager.ts` - Connection logic
- `apps/renderer/src/lib/ipc.ts` - IPC client

---

## Issue 1: Plus Button Doesn't Update Tree

### Estimated Time: 1.5 hours

### Problem Description

**Current Behavior:**

- User clicks plus button to add connection
- Configuration is saved
- Tree shows old connections
- Only after full app refresh does new connection appear

**Expected Behavior:**

- Click plus button
- Configuration saved
- Tree immediately shows new connection

### Investigation (20 mins)

```bash
# Find plus button handler
grep -r "add.*connection.*button" apps/renderer/src/components/ConnectionsTree/
grep -r "new.*connection.*button" apps/renderer/src/components/
grep -r "onClick.*add.*connection" apps/renderer/src/

# Find tree refresh logic
grep -r "refreshTree\|updateTree\|reloadTree" apps/renderer/src/components/ConnectionsTree/
```

### Root Cause Analysis (20 mins)

Likely issues:

1. Configuration saved but state not updated
2. Tree component not reactive to state changes
3. Missing IPC event to notify tree of new connection
4. Tree using cached data

### Implementation (50 mins)

#### Step 1: Ensure State Updates After Save

```typescript
// apps/renderer/src/components/ConnectionsTree/ConnectionsHeader.tsx

async function handleAddConnection(config: ConnectionConfig) {
  try {
    // 1. Show loading state
    setIsAdding(true);

    // 2. Save configuration
    const savedConfig = await ipcRenderer.invoke("save-connection", config);

    // 3. Update local state immediately
    connectionsStore.addConnection(savedConfig);

    // 4. Refresh tree to show new connection
    treeStore.refresh();

    // 5. Show success message
    notificationStore.success(`Connection "${config.name}" added successfully`);

    // 6. Close dialog
    setShowAddDialog(false);
  } catch (error) {
    console.error("Failed to add connection:", error);
    notificationStore.error("Failed to add connection");
  } finally {
    setIsAdding(false);
  }
}
```

#### Step 2: Make Tree Reactive to Store Changes

```typescript
// apps/renderer/src/components/ConnectionsTree/ConnectionsTree.tsx

import { useEffect } from 'react';
import { useStore } from '@sqlhelper/common';
import { connectionsStore } from '../../stores/connectionsStore';

export function ConnectionsTree() {
  // Subscribe to connections store
  const connections = useStore(connectionsStore);

  // Automatically update when connections change
  useEffect(() => {
    console.log('[ConnectionsTree] Connections updated:', connections.length);
    // Tree will re-render automatically due to React reactivity
  }, [connections]);

  return (
    <div className="connections-tree">
      {connections.map(conn => (
        <ConnectionNode key={conn.id} connection={conn} />
      ))}
    </div>
  );
}
```

#### Step 3: Add Store Method to Add Connection

```typescript
// apps/renderer/src/stores/connectionsStore.ts

import { writable } from "svelte/store";

interface ConnectionsState {
  connections: ConnectionConfig[];
  loading: boolean;
}

function createConnectionsStore() {
  const { subscribe, set, update } = writable<ConnectionsState>({
    connections: [],
    loading: false,
  });

  return {
    subscribe,

    // Add new connection
    addConnection: (config: ConnectionConfig) => {
      update(state => ({
        ...state,
        connections: [...state.connections, config],
      }));
    },

    // Remove connection
    removeConnection: (id: string) => {
      update(state => ({
        ...state,
        connections: state.connections.filter(c => c.id !== id),
      }));
    },

    // Update connection
    updateConnection: (id: string, updates: Partial<ConnectionConfig>) => {
      update(state => ({
        ...state,
        connections: state.connections.map(c =>
          c.id === id ? { ...c, ...updates } : c
        ),
      }));
    },

    // Load all connections
    loadConnections: async () => {
      update(state => ({ ...state, loading: true }));
      try {
        const connections = await ipcRenderer.invoke("get-connections");
        set({ connections, loading: false });
      } catch (error) {
        console.error("Failed to load connections:", error);
        update(state => ({ ...state, loading: false }));
      }
    },

    // Refresh connections
    refresh: async () => {
      await connectionsStore.loadConnections();
    },
  };
}

export const connectionsStore = createConnectionsStore();
```

#### Step 4: Add IPC Event for Real-time Updates

```javascript
// apps/desktop/src/main.js

ipcMain.handle("save-connection", async (event, config) => {
  try {
    // Save to file/database
    const savedConfig = await connectionManager.save(config);

    // Notify all windows of the change
    BrowserWindow.getAllWindows().forEach(window => {
      window.webContents.send("connection-added", savedConfig);
    });

    return savedConfig;
  } catch (error) {
    console.error("Failed to save connection:", error);
    throw error;
  }
});

// In renderer
ipcRenderer.on("connection-added", (event, config) => {
  // Another window added a connection, update our state
  connectionsStore.addConnection(config);
});
```

### Testing (20 mins)

Test cases:

- [ ] Click plus button, add connection
- [ ] Verify new connection appears in tree immediately
- [ ] No app refresh needed
- [ ] Test with multiple connections
- [ ] Test with connection that has special characters in name

---

## Issue 2: Refresh Connections Button Not Working

### Estimated Time: 45 mins

### Problem Description

**Current Behavior:**

- Click refresh button
- Nothing visible happens
- Tree stays the same

**Expected Behavior:**

- Click refresh button
- Tree updates with latest connections from storage
- Any external changes reflected

### Implementation (30 mins)

```typescript
// apps/renderer/src/components/ConnectionsTree/ConnectionsHeader.tsx

async function handleRefreshConnections() {
  try {
    // 1. Show loading indicator
    setIsRefreshing(true);

    // 2. Reload connections from storage
    await connectionsStore.refresh();

    // 3. Show success feedback (optional)
    console.log('[Connections] Refreshed successfully');

    // 4. Could show brief success indicator
    showTemporaryCheckmark();
  } catch (error) {
    console.error('Failed to refresh connections:', error);
    notificationStore.error('Failed to refresh connections');
  } finally {
    setIsRefreshing(false);
  }
}

return (
  <div className="connections-header">
    <h2>Connections</h2>
    <div className="actions">
      <button
        onClick={handleAddConnection}
        title="Add Connection"
      >
        <PlusIcon />
      </button>
      <button
        onClick={handleRefreshConnections}
        disabled={isRefreshing}
        title="Refresh Connections"
      >
        <RefreshIcon className={isRefreshing ? 'spinning' : ''} />
      </button>
    </div>
  </div>
);
```

Add CSS for spinning animation:

```css
.spinning {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}
```

### Testing (15 mins)

Test cases:

- [ ] Click refresh button
- [ ] Verify loading indicator shows
- [ ] Verify tree updates if connections changed externally
- [ ] Button disabled during refresh
- [ ] No errors in console

---

## Issue 3: Database Node Plus Button Doing Nothing

### Estimated Time: 30 mins

### Problem Description

**Current Behavior:**

- Database nodes have a plus button
- Clicking it does nothing
- Button serves no purpose

**Expected Behavior:**

- Button should be removed
- Keep plus button only at connection level

### Implementation (20 mins)

```typescript
// apps/renderer/src/components/ConnectionsTree/DatabaseNode.tsx

// BEFORE
export function DatabaseNode({ database }: Props) {
  return (
    <div className="database-node">
      <div className="node-header">
        <DatabaseIcon />
        <span>{database.name}</span>
        <button className="plus-btn" onClick={handleAdd}>
          <PlusIcon />
        </button>  {/* REMOVE THIS */}
      </div>
      {/* ... rest of component */}
    </div>
  );
}

// AFTER
export function DatabaseNode({ database }: Props) {
  return (
    <div className="database-node">
      <div className="node-header">
        <DatabaseIcon />
        <span>{database.name}</span>
        {/* Plus button removed - only at connection level */}
      </div>
      {/* ... rest of component */}
    </div>
  );
}
```

If the plus button is defined in a shared component:

```typescript
// apps/renderer/src/components/ConnectionsTree/TreeNode.tsx

interface TreeNodeProps {
  label: string;
  icon: React.ReactNode;
  actions?: React.ReactNode; // Optional actions
  children?: React.ReactNode;
}

export function TreeNode({ label, icon, actions, children }: TreeNodeProps) {
  return (
    <div className="tree-node">
      <div className="node-header">
        {icon}
        <span>{label}</span>
        {actions && <div className="node-actions">{actions}</div>}
      </div>
      {children}
    </div>
  );
}

// Usage in DatabaseNode - don't pass actions prop
<TreeNode
  label={database.name}
  icon={<DatabaseIcon />}
  // No actions prop = no plus button
>
  {/* children */}
</TreeNode>
```

### Testing (10 mins)

- [ ] Database nodes don't show plus button
- [ ] Connection nodes still show plus button
- [ ] Tree layout looks good without the button
- [ ] No console errors

---

## Issue 4: Schema Buttons Doing Nothing

### Estimated Time: 1 hour

### Problem Description

**Current Behavior:**

- Schema nodes have "New Query" and "Refresh" buttons
- Clicking them does nothing
- No feedback to user

**Expected Behavior:**
Option A: Remove buttons if not needed
Option B: Implement functionality

### Investigation (15 mins)

Determine what these buttons should do:

1. **New Query** - Open query editor with schema context?
2. **Refresh** - Reload tables/views in schema?

### Option A: Remove Buttons (20 mins)

If functionality not needed:

```typescript
// apps/renderer/src/components/ConnectionsTree/SchemaNode.tsx

// Remove the buttons from the component
export function SchemaNode({ schema }: Props) {
  return (
    <div className="schema-node">
      <div className="node-header">
        <SchemaIcon />
        <span>{schema.name}</span>
        {/* Remove new query and refresh buttons */}
      </div>
      <div className="schema-children">
        {schema.tables.map(table => (
          <TableNode key={table.name} table={table} />
        ))}
      </div>
    </div>
  );
}
```

### Option B: Implement Functionality (45 mins)

#### New Query Button

```typescript
function handleNewQuery() {
  // Open query editor with schema context
  const queryContext = {
    connectionId: connection.id,
    database: database.name,
    schema: schema.name
  };

  queryEditorStore.openNew(queryContext);
}

<button
  onClick={handleNewQuery}
  title="New Query"
>
  <PlusIcon />
</button>
```

#### Refresh Button

```typescript
async function handleRefreshSchema() {
  try {
    setIsRefreshing(true);

    // Reload schema structure from database
    const updatedSchema = await ipcRenderer.invoke('refresh-schema', {
      connectionId: connection.id,
      database: database.name,
      schema: schema.name
    });

    // Update tree
    treeStore.updateSchema(updatedSchema);
  } catch (error) {
    console.error('Failed to refresh schema:', error);
    notificationStore.error('Failed to refresh schema');
  } finally {
    setIsRefreshing(false);
  }
}

<button
  onClick={handleRefreshSchema}
  disabled={isRefreshing}
  title="Refresh Schema"
>
  <RefreshIcon className={isRefreshing ? 'spinning' : ''} />
</button>
```

### Decision Point

Before implementing, decide:

1. Are these buttons part of planned functionality?
2. Do users need these features?
3. Is it worth the implementation time?

**Recommendation**: Start with Option A (remove). Can add back later if needed.

### Testing (5 mins)

- [ ] Schema nodes don't show unused buttons
- [ ] Tree still functional
- [ ] No layout issues

---

## Integration Testing

Test the full flow:

1. **Add Connection**
   - [ ] Click plus at connections level
   - [ ] Add new connection
   - [ ] Verify appears immediately in tree

2. **Refresh Connections**
   - [ ] Manually edit connection config file
   - [ ] Click refresh button
   - [ ] Verify tree updates

3. **Tree Navigation**
   - [ ] Expand connection
   - [ ] Expand database
   - [ ] Expand schema
   - [ ] Verify no unwanted buttons

4. **Visual Check**
   - [ ] Tree looks clean
   - [ ] Only relevant buttons shown
   - [ ] No broken layouts

---

## Rollback Plan

1. Each fix in separate commit
2. Can revert individual fixes if needed
3. Test each change independently

---

## Success Criteria

✅ Plus button at connection level updates tree immediately  
✅ Refresh connections button works and shows feedback  
✅ Database node plus button removed  
✅ Schema buttons removed or working  
✅ Tree remains performant with changes  
✅ No console errors  
✅ Tested on all platforms

---

## Notes

- Consider debouncing rapid button clicks
- Add keyboard shortcuts for common actions
- Consider adding tooltips to explain button actions
- Future: Add drag-and-drop to reorder connections
- Future: Add context menu for more actions
- Document tree state management for future developers
