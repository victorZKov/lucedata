# Bug Fix Master Plan - SQLHelper/LuceData

## Overview

This document outlines all bugs and issues found in the application, organized by priority and complexity. Each bug has been assigned a separate task file with detailed implementation steps.

## Priority Levels

- **P0 (Critical)**: Application crashes or major functionality broken
- **P1 (High)**: Important features not working as expected
- **P2 (Medium)**: UI/UX issues, missing functionality
- **P3 (Low)**: Minor improvements, polish

---

## Bug Categories & Task List

### Category 1: Application Menu Issues (P1)

**Files**: `bugs-001-menu.md`

Issues:

1. Remove File > New Query, File > New Connection
2. Fix File > Refresh Connections (not updating tree)
3. Fix File > Disconnect All (not working)
4. Fix File > Settings (not opening dialog)
5. Fix File > Migrate configuration (not opening dialog)

**Estimated Time**: 3-4 hours

---

### Category 2: Chat Section Issues (P0-P1)

**Files**: `bugs-002-chat.md`

Issues:

1. **P0**: Plus button freezes entire application
2. **P1**: Chat showing wrong query (inspection query instead of data query)
3. **P2**: Edit chat name does not allow blank spaces

**Estimated Time**: 4-5 hours

---

### Category 3: Connections Section Issues (P1)

**Files**: `bugs-003-connections.md`

Issues:

1. Plus button adds configuration but doesn't update tree until refresh
2. Refresh connections button not working
3. Database Node Plus button doing nothing (should be removed)
4. Schema buttons (new query, refresh) doing nothing

**Estimated Time**: 3-4 hours

---

### Category 4: Search & Navigation Features (P2)

**Files**: `bugs-004-search-navigation.md`

Issues:

1. Add search box in top center header
2. Search should filter tree elements and saved chat list
3. Add history navigation (left/right arrow buttons)
4. History should track all clicked elements in session

**Estimated Time**: 6-8 hours (new feature implementation)

---

### Category 5: Query Editor Enhancement (P1)

**Files**: `bugs-005-query-editor.md`

Issues:

1. Execute only selected text when user marks a section
2. Currently executes entire content regardless of selection

**Estimated Time**: 2-3 hours

---

### Category 6: Windows Installation Package (P0)

**Files**: `bugs-006-electron-updater.md`

Issues:

1. **P0**: electron-updater module not found error on Windows
2. Package bundling issue in electron-builder configuration

**Estimated Time**: 2-3 hours

---

## Implementation Order (Recommended)

### Phase 1: Critical Fixes (Week 1) ✅ COMPLETE

1. ✅ **COMPLETED** - `bugs-006-electron-updater.md` - Fix Windows installer crash
2. ✅ **COMPLETED** - `bugs-002-chat.md` - Fix chat freezing issue
   - ✅ Issue 1: Plus button freeze - FIXED (replaced window.prompt with dialog)
   - ✅ Issue 2: Wrong query shown - FIXED (filter schema inspection queries)
   - ✅ Issue 3: Chat name spaces - FIXED (dialog supports spaces explicitly)
3. ✅ **COMPLETED** - `bugs-005-query-editor.md` - Execute selected text
   - ✅ Selection-aware execution - FIXED (check Monaco selection before run)

**Total**: 8-11 hours  
**Progress**: 100% COMPLETE 🎉

### Phase 2: High Priority Fixes (Week 1-2)

4. `bugs-001-menu.md` - Fix all menu issues
5. `bugs-003-connections.md` - Fix connections section issues

**Total**: 6-8 hours

### Phase 3: Feature Enhancements (Week 2-3)

6. `bugs-004-search-navigation.md` - Implement search and navigation

**Total**: 6-8 hours

---

## Total Estimated Time

**22-30 hours** across all bug fixes and enhancements

---

## Project Structure Reference

### Key Directories:

- `/apps/desktop/` - Electron main process (TypeScript)
  - `src/main.ts` - Main entry point
  - `scripts/` - Desktop-specific build scripts
  - `electron-builder.json` - Build configuration
- `/apps/renderer/` - React frontend
- `/packages/` - Shared packages
- `/scripts/` - **Root-level build/dev scripts**
  - `dev.sh`, `dev.ps1` - Development scripts
  - `start.sh`, `start.ps1` - Start scripts
  - `update-version.mjs` - Version management
  - `deploy-update.sh` - Deployment
- `/release/` - Built installers output

### Important Notes:

- Desktop app uses **TypeScript** (main.ts, not main.js)
- Package.json has `"type": "module"` (ES modules)
- Build output: `dist/apps/desktop/src/main.js`
- Main scripts are in `/scripts/` folder (root level)

## Pre-Implementation Checklist

Before starting each bug fix:

- [ ] Read the specific bug task file
- [ ] Review related code files mentioned in the task
- [ ] Understand the project uses TypeScript for main process
- [ ] Know that scripts are in root `/scripts/` folder
- [ ] Create a feature branch for the fix
- [ ] Write tests if applicable
- [ ] Test on all target platforms (Windows, macOS, Linux)

---

## Testing Strategy

### For Each Bug Fix:

1. **Unit Tests**: Test individual functions/components
2. **Integration Tests**: Test feature in context
3. **Manual Testing**: Test in actual application
4. **Regression Testing**: Ensure no existing features break

### Platform Testing:

- Windows 10/11
- macOS (Intel & Apple Silicon)
- Linux (Ubuntu/Debian)

---

## Notes

- All bug fixes should follow the existing code style and patterns
- Update documentation when fixing bugs that affect user-facing features
- Consider adding telemetry/logging to help identify similar issues in the future
- Review error handling and add proper user feedback messages

---

## Next Steps

1. Review this master plan
2. Confirm priority order matches business needs
3. Start with Phase 1 (Critical Fixes)
4. Read specific bug task file before implementation
5. Follow the detailed steps in each task file
