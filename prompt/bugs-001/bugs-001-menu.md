# Bug Fix Task: Application Menu Issues

**Priority**: P1 (High)  
**Category**: UI/Menu  
**Estimated Time**: 3-4 hours  
**Complexity**: Medium

---

## Issues to Fix

1. Remove unused menu items: File > New Query, File > New Connection
2. Fix File > Refresh Connections (not updating tree visually)
3. Fix File > Disconnect All (not working)
4. Fix File > Settings (not opening settings dialog)
5. Fix File > Migrate configuration (not opening migrate configuration dialog)

---

## Files to Review/Modify

### Primary Files:

- `apps/desktop/src/main.ts` - Menu definitions and handlers (TypeScript)
- Look for menu configuration around line 100-500 in main.ts
- `apps/renderer/src/components/Settings/` - Settings dialog (if exists)
- `apps/renderer/src/components/` - Various dialog components

### Related Files:

- `apps/renderer/src/stores/` - State management for connections
- `apps/renderer/src/lib/ipc.ts` - IPC communication between main and renderer
- `apps/desktop/src/` - Other TypeScript files for handlers

**Note:** Main process is TypeScript (.ts), not JavaScript (.js)

---

## Implementation Steps

### Step 1: Locate Menu Configuration (30 mins)

```bash
# Search for menu definitions in TypeScript files
grep -r "New Query" apps/desktop/src/
grep -r "New Connection" apps/desktop/src/
grep -r "Refresh Connections" apps/desktop/src/
grep -r "menuTemplate\|Menu.buildFromTemplate" apps/desktop/src/

# Check main.ts specifically (likely location)
grep -n "Menu\|menu" apps/desktop/src/main.ts | head -20
```

**Expected Findings:**

- Menu template definition (likely in main.js or separate menu file)
- IPC handlers for menu actions

**Action:**

- Document the file path and structure
- Identify the menu building function

---

### Step 2: Remove Unused Menu Items (30 mins)

**Target Items:**

- File > New Query
- File > New Connection

**Implementation:**

1. Locate the File menu submenu array
2. Remove or comment out the menu items
3. Remove associated IPC handlers if they exist

**Code Pattern to Look For in main.ts:**

```typescript
// TypeScript menu definition
const menuTemplate: MenuItemConstructorOptions[] = [
  {
    label: "File",
    submenu: [
      {
        label: "New Query",
        click: () => {
          /* handler */
        },
      },
      {
        label: "New Connection",
        click: () => {
          /* handler */
        },
      },
      // ... other items
    ],
  },
];

Menu.setApplicationMenu(Menu.buildFromTemplate(menuTemplate));
```

**Action:**

- Delete these menu item objects
- Clean up any separator items that become redundant
- Test the menu still renders correctly

---

### Step 3: Fix "Refresh Connections" (1 hour)

**Problem:** Button exists but tree doesn't update visually

**Investigation:**

1. Find the IPC handler for refresh connections
2. Check if it's calling the correct store/state update method
3. Verify the renderer is listening for the update event

**Likely Issues:**

- Handler not dispatching state update event
- Tree component not reactive to state changes
- Missing connection refresh logic

**Implementation:**

```typescript
// In main process (apps/desktop/src/main.ts)
ipcMain.handle(
  "refresh-connections",
  async (): Promise<{ success: boolean }> => {
    try {
      // 1. Reload connection configurations
      const connections = await loadConnections();

      // 2. Notify renderer of update
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send("connections-refreshed", connections);
      }

      return { success: true };
    } catch (error) {
      logError("Failed to refresh connections", error);
      return { success: false };
    }
  }
);

// In renderer process (TypeScript/React)
ipcRenderer.on("connections-refreshed", (_event, connections) => {
  // Update store/state
  connectionsStore.set(connections);
  // Force tree refresh
  treeComponent.refresh();
});
```

**Testing:**

1. Add a new connection configuration manually in the config file
2. Click File > Refresh Connections
3. Verify the tree shows the new connection immediately

---

### Step 4: Fix "Disconnect All" (1 hour)

**Problem:** Menu item exists but doesn't disconnect or update tree

**Investigation:**

1. Find the IPC handler for disconnect all
2. Check if it's iterating through all active connections
3. Verify disconnection logic and state updates

**Implementation:**

```javascript
// In main process
ipcMain.handle("disconnect-all", async () => {
  // 1. Get all active connections
  const activeConnections = connectionManager.getAllActive();

  // 2. Disconnect each one
  for (const conn of activeConnections) {
    await connectionManager.disconnect(conn.id);
  }

  // 3. Clear connection state
  connectionManager.clearAll();

  // 4. Notify renderer
  mainWindow.webContents.send("all-disconnected");

  return { success: true, disconnected: activeConnections.length };
});

// In renderer
ipcRenderer.on("all-disconnected", () => {
  // Update UI state
  connectionsStore.disconnectAll();
  // Update tree to show all connections as disconnected
  treeComponent.updateConnectionStates();
});
```

**Testing:**

1. Connect to multiple databases
2. Click File > Disconnect All
3. Verify all connections show as disconnected in tree
4. Verify no active connections remain

---

### Step 5: Fix "Settings" Dialog (45 mins)

**Problem:** Menu item doesn't open settings dialog

**Investigation:**

1. Check if Settings component exists
2. Verify IPC handler is wired correctly
3. Check if modal/dialog system is working

**Implementation:**

```javascript
// In main process
ipcMain.handle("open-settings", async () => {
  mainWindow.webContents.send("show-settings-dialog");
  return { success: true };
});

// In renderer (App component or main layout)
ipcRenderer.on("show-settings-dialog", () => {
  // Show settings modal
  modalStore.open("settings");
  // OR if using a dedicated component
  settingsDialog.show();
});
```

**If Settings Component Doesn't Exist:**

1. Create basic Settings component
2. Add common settings (theme, language, query timeout, etc.)
3. Wire up persistence to local storage

**Testing:**

1. Click File > Settings
2. Verify settings dialog opens
3. Verify settings can be changed and saved
4. Verify settings persist after app restart

---

### Step 6: Fix "Migrate Configuration" Dialog (45 mins)

**Problem:** Menu item doesn't open migrate configuration dialog

**Similar to Settings fix:**

1. Check if component exists
2. Wire up IPC handler
3. Show dialog

**Implementation:**

```javascript
// In main process
ipcMain.handle("open-migrate-config", async () => {
  mainWindow.webContents.send("show-migrate-dialog");
  return { success: true };
});

// In renderer
ipcRenderer.on("show-migrate-dialog", () => {
  modalStore.open("migrate-configuration");
});
```

**If Component Doesn't Exist:**

- Consider if this feature is needed
- If yes, create basic migration dialog
- If no, remove from menu instead

**Testing:**

1. Click File > Migrate configuration
2. Verify dialog opens
3. Test migration functionality if implemented

---

## Testing Checklist

### Manual Testing:

- [ ] File menu renders without New Query and New Connection
- [ ] No console errors when opening File menu
- [ ] Refresh Connections updates tree immediately
- [ ] Disconnect All disconnects all connections and updates tree
- [ ] Settings dialog opens and is functional
- [ ] Migrate configuration dialog opens (or is removed)

### Integration Testing:

- [ ] Menu shortcuts still work (Cmd+R, Cmd+D, etc.)
- [ ] Menu items enable/disable correctly based on state
- [ ] No memory leaks when opening/closing dialogs

### Platform Testing:

- [ ] Test on Windows
- [ ] Test on macOS
- [ ] Test on Linux

---

## Rollback Plan

If issues arise:

1. Revert menu changes in git
2. Restore original IPC handlers
3. Check console for specific errors
4. Review IPC communication flow

---

## Success Criteria

✅ Unused menu items removed  
✅ Refresh Connections updates tree visually  
✅ Disconnect All works and shows feedback  
✅ Settings dialog opens and functions  
✅ Migrate configuration works or is removed  
✅ No new bugs introduced  
✅ All platforms tested

---

## Notes for Implementation

- Use consistent IPC naming conventions (kebab-case)
- Add error handling to all IPC handlers
- Provide user feedback (success/error messages)
- Consider adding loading states for async operations
- Update menu item enabled state based on context
- Document any new IPC channels in code comments

---

## Related Documentation

- Electron Menu Documentation: https://www.electronjs.org/docs/latest/api/menu
- Electron IPC Documentation: https://www.electronjs.org/docs/latest/api/ipc-main
- Project IPC patterns: Check existing working menu items for reference
