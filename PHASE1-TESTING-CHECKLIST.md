# Phase 1 Testing Checklist

**Date:** January 8, 2025  
**Application Status:** 🟢 Running in development mode  
**Test Environment:** macOS

---

## Pre-Test Verification

- [x] Application compiled successfully
- [x] No TypeScript errors
- [x] Development server running
- [ ] Application window opened
- [ ] No console errors on startup

---

## Test 1: bugs-006 - Windows Installer / electron-updater

**Status:** ⚠️ SKIP (Development mode test not applicable)

**Why Skip:**

- This fix is for production Windows installer
- Requires building Windows installer package
- Development mode uses different module loading
- Fix verified: Import pattern supports both ESM and CommonJS

**Production Test Required:**

- [ ] Build Windows installer: `pnpm build:win`
- [ ] Install on Windows machine
- [ ] Launch application
- [ ] Verify no electron-updater error
- [ ] Check auto-update functionality

**Current Status:** ✅ Code fix implemented, needs production testing

---

## Test 2: bugs-002 Issue 1 - Chat Plus Button Freeze

**Priority:** 🔴 HIGH - Test this first!

### Setup Steps:

1. Open the application
2. Navigate to the Chat section (right panel)
3. Locate the blue "+" (Plus) button in chat header

### Test Cases:

#### Test 2.1: Open New Chat Dialog

- [ ] Click the "+" button
- [ ] **Expected:** Dialog appears immediately (no freeze)
- [ ] **Expected:** Dialog title: "New Conversation"
- [ ] **Expected:** Input field with placeholder
- [ ] **Expected:** Suggested name like "Conversation 1/8/2025..."

**✅ PASS if:** Dialog opens without freezing  
**❌ FAIL if:** Application freezes or becomes unresponsive

---

#### Test 2.2: Create Chat with Spaces

- [ ] Click "+" button
- [ ] Type: "My New Chat Session"
- [ ] Click "Create" button
- [ ] **Expected:** Chat created with name "My New Chat Session"
- [ ] **Expected:** Spaces preserved in name

**✅ PASS if:** Chat name includes spaces  
**❌ FAIL if:** Spaces removed or error shown

---

#### Test 2.3: Cancel Dialog

- [ ] Click "+" button
- [ ] Type any name
- [ ] Click "Cancel" button
- [ ] **Expected:** Dialog closes
- [ ] **Expected:** No chat created

**✅ PASS if:** Dialog closes without creating chat  
**❌ FAIL if:** Chat created anyway

---

#### Test 2.4: Escape Key

- [ ] Click "+" button
- [ ] Press `Escape` key
- [ ] **Expected:** Dialog closes

**✅ PASS if:** Dialog closes on Escape  
**❌ FAIL if:** Dialog stays open

---

#### Test 2.5: Enter Key

- [ ] Click "+" button
- [ ] Type: "Test Chat"
- [ ] Press `Enter` key
- [ ] **Expected:** Chat created (same as clicking Create)

**✅ PASS if:** Enter key creates chat  
**❌ FAIL if:** Nothing happens

---

#### Test 2.6: Empty Name

- [ ] Click "+" button
- [ ] Delete suggested name (empty field)
- [ ] Click "Create"
- [ ] **Expected:** Uses suggested name from initial value

**✅ PASS if:** Chat created with suggested name  
**❌ FAIL if:** Error or no chat created

---

### Test 2 Results Summary:

```
Test 2.1: [ ] PASS / [ ] FAIL
Test 2.2: [ ] PASS / [ ] FAIL
Test 2.3: [ ] PASS / [ ] FAIL
Test 2.4: [ ] PASS / [ ] FAIL
Test 2.5: [ ] PASS / [ ] FAIL
Test 2.6: [ ] PASS / [ ] FAIL

Overall: [ ] ALL PASS / [ ] ISSUES FOUND
```

---

## Test 3: bugs-002 Issue 2 - Wrong Query Shown in Chat

**Priority:** 🟠 MEDIUM - Requires database connection

### Prerequisites:

- [ ] Have a database connection configured
- [ ] Database has at least one table with data

### Setup Steps:

1. Connect to a database
2. Open Chat panel
3. Ensure AI is configured and working

### Test Cases:

#### Test 3.1: Simple Data Request

- [ ] In chat, type: "Show me all records from [TableName]"
- [ ] Press Enter, wait for AI response
- [ ] **Check response:** Should show data query
- [ ] **Expected:** `SELECT * FROM [TableName]` or similar
- [ ] **NOT Expected:** `SELECT ... FROM INFORMATION_SCHEMA.COLUMNS`

**✅ PASS if:** Data query shown (SELECT from actual table)  
**❌ FAIL if:** Schema inspection query shown (INFORMATION_SCHEMA)

---

#### Test 3.2: Complex Query Request

- [ ] Type: "Get users and their orders with JOIN"
- [ ] Wait for response
- [ ] **Expected:** Shows JOIN query between tables
- [ ] **NOT Expected:** Schema inspection query

**✅ PASS if:** Business logic query shown  
**❌ FAIL if:** Schema query shown

---

#### Test 3.3: Console Verification

- [ ] Open Browser DevTools (Cmd+Option+I on Mac)
- [ ] Go to Console tab
- [ ] Send any query to AI
- [ ] **Check console:** Should NOT show INFORMATION_SCHEMA queries in final response

**✅ PASS if:** Only data queries logged as "finalSQL"  
**❌ FAIL if:** INFORMATION_SCHEMA queries logged as "finalSQL"

---

### Test 3 Results Summary:

```
Test 3.1: [ ] PASS / [ ] FAIL / [ ] SKIP (no DB)
Test 3.2: [ ] PASS / [ ] FAIL / [ ] SKIP (no DB)
Test 3.3: [ ] PASS / [ ] FAIL / [ ] SKIP (no DB)

Overall: [ ] ALL PASS / [ ] ISSUES FOUND / [ ] SKIPPED
```

**Note:** If you don't have a database connected, you can skip Test 3 for now.

---

## Test 4: bugs-005 - Execute Selected Text in Query Editor

**Priority:** 🔴 HIGH - Test this!

### Prerequisites:

- [ ] Have a database connection configured
- [ ] Open a SQL query tab

### Setup Steps:

1. Create or open a SQL query tab
2. Connection should be active

### Test Cases:

#### Test 4.1: Execute Full Query (No Selection)

- [ ] Write in editor:
  ```sql
  SELECT * FROM users;
  ```
- [ ] Don't select any text (just click somewhere)
- [ ] Click "▶ Run Query" button
- [ ] **Expected:** Full query executes
- [ ] **Check console:** "[Query Editor] Executing full query"

**✅ PASS if:** Query executes completely  
**❌ FAIL if:** Nothing happens or error

---

#### Test 4.2: Execute Selected Statement

- [ ] Write multiple queries:
  ```sql
  SELECT * FROM users;
  SELECT * FROM orders;
  SELECT * FROM products;
  ```
- [ ] Select ONLY the second line: `SELECT * FROM orders;`
- [ ] Click "▶ Run Query" button
- [ ] **Expected:** Only orders query executes
- [ ] **Check console:** "[Query Editor] Executing selected text: SELECT \* FROM orders;"
- [ ] **Check results:** Should show orders table, not users

**✅ PASS if:** Only selected query executes  
**❌ FAIL if:** All queries execute or wrong query runs

---

#### Test 4.3: Execute Partial Selection

- [ ] Write: `SELECT id, name, email, status FROM users WHERE active = 1;`
- [ ] Select only: `SELECT id, name FROM users`
- [ ] Click "▶ Run Query"
- [ ] **Expected:** Only partial query executes (might error if incomplete)
- [ ] **OR Expected:** Shows only id, name columns (if server accepts it)

**✅ PASS if:** Selected text is sent to server  
**❌ FAIL if:** Full query executes

---

#### Test 4.4: Keyboard Shortcut - Cmd+Enter (Mac) / Ctrl+Enter (Windows)

- [ ] Write multiple queries:
  ```sql
  SELECT COUNT(*) FROM users;
  SELECT * FROM users LIMIT 10;
  ```
- [ ] Select first line
- [ ] Press `Cmd+Enter` (Mac) or `Ctrl+Enter` (Windows)
- [ ] **Expected:** Only selected query executes
- [ ] **Check console:** Shows "Executing selected text"

**✅ PASS if:** Keyboard shortcut works with selection  
**❌ FAIL if:** Doesn't execute or executes all

---

#### Test 4.5: Keyboard Shortcut - F5

- [ ] Write queries
- [ ] Select one query
- [ ] Press `F5` key
- [ ] **Expected:** Selected query executes

**✅ PASS if:** F5 works with selection  
**❌ FAIL if:** Doesn't execute

---

#### Test 4.6: No Selection with Cmd+Enter

- [ ] Write: `SELECT * FROM users;`
- [ ] Don't select anything
- [ ] Press `Cmd+Enter`
- [ ] **Expected:** Full query executes

**✅ PASS if:** Full query runs without selection  
**❌ FAIL if:** Nothing happens

---

#### Test 4.7: Multi-line Selection

- [ ] Write:
  ```sql
  SELECT u.id, u.name,
         o.order_id, o.total
  FROM users u
  JOIN orders o ON u.id = o.user_id
  WHERE u.active = 1;
  ```
- [ ] Select all 5 lines
- [ ] Click "▶ Run Query"
- [ ] **Expected:** Complete multi-line query executes

**✅ PASS if:** Multi-line selection works  
**❌ FAIL if:** Only partial query runs

---

#### Test 4.8: Empty/Whitespace Selection

- [ ] Write query
- [ ] Select only blank lines or spaces
- [ ] Click "▶ Run Query"
- [ ] **Expected:** Falls back to executing full query

**✅ PASS if:** Full query executes (fallback)  
**❌ FAIL if:** Error or nothing happens

---

### Test 4 Results Summary:

```
Test 4.1: [ ] PASS / [ ] FAIL
Test 4.2: [ ] PASS / [ ] FAIL
Test 4.3: [ ] PASS / [ ] FAIL
Test 4.4: [ ] PASS / [ ] FAIL
Test 4.5: [ ] PASS / [ ] FAIL
Test 4.6: [ ] PASS / [ ] FAIL
Test 4.7: [ ] PASS / [ ] FAIL
Test 4.8: [ ] PASS / [ ] FAIL

Overall: [ ] ALL PASS / [ ] ISSUES FOUND
```

---

## General Application Health Checks

### Console Errors

- [ ] Open DevTools Console (Cmd+Option+I)
- [ ] Check for red errors
- [ ] **Expected:** No critical errors
- [ ] Minor warnings OK (pre-existing)

### Memory Usage

- [ ] Check Activity Monitor / Task Manager
- [ ] **Expected:** Reasonable memory usage (<500MB)
- [ ] No memory leaks after repeated operations

### UI Responsiveness

- [ ] Click around interface rapidly
- [ ] Switch between tabs quickly
- [ ] **Expected:** No freezing or lag

---

## Test Results Summary

### Overall Results:

```
Test 2 (Chat Dialog):     [ ] PASS / [ ] FAIL
Test 3 (Query Display):   [ ] PASS / [ ] FAIL / [ ] SKIP
Test 4 (Query Selection): [ ] PASS / [ ] FAIL

Overall Phase 1 Status:   [ ] ALL PASS / [ ] ISSUES FOUND
```

### Issues Found:

```
1. _______________________________________________
2. _______________________________________________
3. _______________________________________________
```

### Screenshots Taken:

- [ ] New Chat Dialog
- [ ] Query displayed in chat
- [ ] Query editor with selection
- [ ] Console logs
- [ ] Any errors

---

## Next Steps After Testing

### If All Tests Pass ✅

1. Document successful tests
2. Move to Phase 2 (bugs-001, bugs-003)
3. Or prepare for production deployment

### If Issues Found ❌

1. Document each issue with:
   - What you did
   - What you expected
   - What actually happened
   - Screenshot if possible
2. Prioritize fixes
3. Retest after fixes

---

## Quick Reference: Where to Find Features

### New Chat Dialog (Test 2)

- Location: **Chat panel** (right side)
- Button: **Blue "+" icon** in chat header
- Also available in toolbar

### Query Display (Test 3)

- Location: **Chat panel**
- Trigger: Ask AI a question about data
- Look for: SQL code blocks in AI response

### Query Selection (Test 4)

- Location: **Center panel** (SQL editor)
- Create: File > New Query Tab
- Select text: Click and drag in editor
- Execute: Click "▶" button or Cmd+Enter

---

## Tips for Effective Testing

1. **Start Fresh:** Restart app between major test sections
2. **Check Console:** Always have DevTools open
3. **Take Notes:** Document unexpected behavior
4. **Test Edge Cases:** Try to break it!
5. **Compare Before/After:** Remember old behavior

---

**Happy Testing!** 🧪

Report any issues you find and we'll fix them immediately.
