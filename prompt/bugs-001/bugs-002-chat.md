# Bug Fix Task: Chat Section Issues

**Priority**: P0-P1 (Critical to High)  
**Category**: Chat/AI Integration  
**Estimated Time**: 4-5 hours  
**Complexity**: High

---

## Issues to Fix

1. **P0 - CRITICAL**: Plus button freezes entire application
2. **P1 - HIGH**: Chat showing wrong query (inspection query instead of data query)
3. **P2 - MEDIUM**: Edit chat name does not allow blank spaces

---

## Files to Review/Modify

### Primary Files:

- `apps/renderer/src/components/Chat/` - Chat component and UI
- `apps/renderer/src/components/Chat/ChatList.tsx` or similar
- `apps/renderer/src/components/Chat/ChatHeader.tsx`
- `packages/ai-integration/` - AI query generation logic
- `apps/renderer/src/stores/chatStore.ts` - Chat state management

### Related Files:

- `apps/desktop/src/main.js` - Main process IPC handlers
- `packages/ai-core/` - AI response parsing
- `apps/renderer/src/lib/queryExecution.ts` - Query execution logic

---

## Issue 1: Plus Button Freezes Application (P0 - CRITICAL)

### Estimated Time: 2 hours

### Investigation Steps (30 mins)

```bash
# Find the plus button component
grep -r "plus.*button.*chat" apps/renderer/src/components/
grep -r "new.*chat.*button" apps/renderer/src/components/
grep -r "onClick.*chat.*create" apps/renderer/src/components/

# Check for infinite loops or blocking operations
grep -r "while.*true" apps/renderer/src/components/Chat/
grep -r "for.*;;)" apps/renderer/src/components/Chat/
```

**What to Look For:**

- Synchronous blocking operations
- Infinite loops
- Missing async/await
- Unhandled promise rejections
- State update causing re-render loops

### Common Causes & Solutions (1.5 hours)

#### Cause 1: Synchronous Database Operation

```javascript
// ❌ BAD - Blocks UI thread
plusButton.onClick = () => {
  const newChat = createNewChat(); // Synchronous
  chatStore.add(newChat);
};

// ✅ GOOD - Async operation
plusButton.onClick = async () => {
  try {
    const newChat = await createNewChat(); // Async
    chatStore.add(newChat);
  } catch (error) {
    console.error("Failed to create chat:", error);
    showErrorMessage("Could not create new chat");
  }
};
```

#### Cause 2: Infinite Re-render Loop

```javascript
// ❌ BAD - Causes infinite loop
function ChatList() {
  const [chats, setChats] = useState([]);

  // This runs on every render, causing infinite loop
  setChats([...chats, newChat]);

  return <div>{/* ... */}</div>;
}

// ✅ GOOD - Use effect with dependencies
function ChatList() {
  const [chats, setChats] = useState([]);

  const handleAddChat = useCallback(async () => {
    const newChat = await createNewChat();
    setChats(prev => [...prev, newChat]);
  }, []);

  return <div>{/* ... */}</div>;
}
```

#### Cause 3: Missing Error Handling

```javascript
// ❌ BAD - Unhandled rejection can freeze app
plusButton.onClick = () => {
  createNewChat().then(chat => {
    chatStore.add(chat);
  });
  // If promise rejects, app may freeze
};

// ✅ GOOD - Proper error handling
plusButton.onClick = async () => {
  try {
    const chat = await createNewChat();
    chatStore.add(chat);
  } catch (error) {
    console.error("Error creating chat:", error);
    // Show user-friendly error
    notificationStore.error("Failed to create new chat");
  }
};
```

#### Cause 4: State Management Issue

```javascript
// ❌ BAD - Mutating state directly
function addNewChat() {
  const chats = chatStore.getChats();
  chats.push(newChat); // Direct mutation
  chatStore.setChats(chats);
}

// ✅ GOOD - Immutable update
function addNewChat() {
  chatStore.update(state => ({
    ...state,
    chats: [...state.chats, newChat],
  }));
}
```

### Implementation Steps

1. **Add Debugging** (15 mins)

   ```javascript
   plusButton.onClick = async () => {
     console.log("[DEBUG] Plus button clicked");
     try {
       console.log("[DEBUG] Creating new chat...");
       const newChat = await createNewChat();
       console.log("[DEBUG] Chat created:", newChat);

       console.log("[DEBUG] Adding to store...");
       chatStore.add(newChat);
       console.log("[DEBUG] Chat added successfully");
     } catch (error) {
       console.error("[DEBUG] Error:", error);
     }
   };
   ```

2. **Identify Freeze Point** (30 mins)
   - Run app and click plus button
   - Check console for last debug message
   - This shows where the freeze occurs

3. **Fix the Issue** (45 mins)
   - Based on freeze point, apply appropriate solution
   - Add proper async/await
   - Fix infinite loops
   - Add error handling

4. **Test Fix** (30 mins)
   - Click plus button multiple times rapidly
   - Verify no freeze
   - Check chat is created correctly
   - Verify app remains responsive

---

## Issue 2: Wrong Query Shown in Chat (P1 - HIGH)

### Estimated Time: 2 hours

### Problem Description

When user asks: "Dime los datos que hay en Exercises"

**Current Behavior:**

- Shows inspection query: `SELECT COLUMN_NAME, DATA_TYPE... FROM INFORMATION_SCHEMA.COLUMNS`
- This is the schema inspection query, not the data query

**Expected Behavior:**

- Should show data query: `SELECT TOP 100 * FROM dbo.FitChallenge_Exercises`

### Investigation (30 mins)

```bash
# Find AI query generation logic
grep -r "INFORMATION_SCHEMA" packages/ai-integration/
grep -r "executeQuery" packages/ai-integration/
grep -r "runnable.*query" apps/renderer/src/components/Chat/
```

**Key Questions:**

1. Where does the AI decide which query to show as "runnable"?
2. How are multiple queries in a response handled?
3. Is there logic to distinguish schema queries from data queries?

### Root Cause Analysis (30 mins)

Likely causes:

1. AI executes multiple queries but shows first one
2. Query extraction logic grabs wrong query from response
3. No filtering between "internal" and "user-facing" queries

### Implementation Steps (1 hour)

#### Step 1: Identify Query Types

Add query classification:

```typescript
// packages/ai-core/src/queryClassifier.ts

export enum QueryType {
  SCHEMA_INSPECTION = "schema_inspection",
  DATA_RETRIEVAL = "data_retrieval",
  DATA_MODIFICATION = "data_modification",
  METADATA = "metadata",
}

export function classifyQuery(sql: string): QueryType {
  const upperSQL = sql.trim().toUpperCase();

  // Schema inspection queries
  if (
    upperSQL.includes("INFORMATION_SCHEMA") ||
    upperSQL.includes("SYS.TABLES") ||
    upperSQL.includes("SYS.COLUMNS") ||
    upperSQL.match(/SELECT.*COLUMN_NAME.*FROM/)
  ) {
    return QueryType.SCHEMA_INSPECTION;
  }

  // Data modification
  if (
    upperSQL.startsWith("INSERT") ||
    upperSQL.startsWith("UPDATE") ||
    upperSQL.startsWith("DELETE") ||
    upperSQL.startsWith("CREATE") ||
    upperSQL.startsWith("DROP") ||
    upperSQL.startsWith("ALTER")
  ) {
    return QueryType.DATA_MODIFICATION;
  }

  // Data retrieval (default)
  return QueryType.DATA_RETRIEVAL;
}
```

#### Step 2: Filter Queries in AI Response

```typescript
// packages/ai-integration/src/responseParser.ts

export function extractRunnableQuery(
  aiResponse: string,
  executedQueries: string[]
): string | null {
  // Extract all SQL queries from response
  const queries = extractAllQueries(aiResponse);

  // Filter out schema inspection queries that were already executed
  const userFacingQueries = queries.filter(query => {
    const type = classifyQuery(query);

    // Skip internal/inspection queries
    if (type === QueryType.SCHEMA_INSPECTION) {
      return false;
    }

    // Skip if already executed
    if (executedQueries.includes(query)) {
      return false;
    }

    return true;
  });

  // Return the first user-facing query (usually the data query)
  return userFacingQueries[0] || null;
}
```

#### Step 3: Update Chat Component

```typescript
// apps/renderer/src/components/Chat/Message.tsx

function ChatMessage({ message, executedQueries }: Props) {
  // Extract the query to show to user
  const runnableQuery = extractRunnableQuery(
    message.content,
    executedQueries
  );

  return (
    <div className="chat-message">
      <div className="message-content">
        {message.content}
      </div>

      {runnableQuery && (
        <div className="runnable-query">
          <pre>{runnableQuery}</pre>
          <button onClick={() => executeQuery(runnableQuery)}>
            ▶ Yes, run it
          </button>
          <button>No, thanks</button>
        </div>
      )}
    </div>
  );
}
```

#### Step 4: Track Executed Queries

```typescript
// apps/renderer/src/stores/chatStore.ts

interface ChatMessage {
  id: string;
  content: string;
  executedQueries: string[]; // Track what was executed
  timestamp: number;
}

function addMessage(content: string, executedQuery?: string) {
  const message: ChatMessage = {
    id: generateId(),
    content,
    executedQueries: executedQuery ? [executedQuery] : [],
    timestamp: Date.now(),
  };

  chatStore.update(state => ({
    ...state,
    messages: [...state.messages, message],
  }));
}
```

### Testing (30 mins)

Test cases:

1. Ask: "Show me data from table X"
   - ✅ Should show SELECT query, not INFORMATION_SCHEMA
2. Ask: "What columns are in table X?"
   - ✅ Should show inspection query (this is user intent)
3. Ask: "Show me all employees"
   - ✅ Should show data query
   - ✅ Should not show any schema inspection queries

---

## Issue 3: Chat Name Doesn't Allow Spaces (P2 - MEDIUM)

### Estimated Time: 30-45 mins

### Investigation (10 mins)

```bash
# Find chat rename logic
grep -r "rename.*chat" apps/renderer/src/components/
grep -r "chat.*name.*input" apps/renderer/src/components/
grep -r "\\s+" apps/renderer/src/components/Chat/ # Regex removing spaces
```

### Root Cause

Likely causes:

1. Input validation removing spaces
2. Regex replacing spaces with empty string
3. File system sanitization being too aggressive

### Implementation (20-30 mins)

```typescript
// Before (BAD)
function sanitizeChatName(name: string): string {
  return name.replace(/\s+/g, ""); // Removes all spaces
}

// After (GOOD)
function sanitizeChatName(name: string): string {
  return name
    .trim() // Remove leading/trailing spaces
    .replace(/\s+/g, " ") // Collapse multiple spaces to single space
    .replace(/[<>:"/\\|?*]/g, "") // Remove invalid file system chars only
    .substring(0, 100); // Limit length
}
```

If stored as files:

```typescript
function chatNameToFilename(name: string): string {
  // Keep spaces in name, only sanitize for file system
  return sanitizeChatName(name) + ".json";
}

function filenameToDisplayName(filename: string): string {
  return filename.replace(".json", ""); // Preserve spaces
}
```

### Testing (5 mins)

Test cases:

- ✅ "My Query" - Should work
- ✅ "Sales Report 2024" - Multiple spaces should collapse to single
- ✅ " Daily Stats " - Leading/trailing spaces trimmed
- ✅ "Q1/Q2 Analysis" - Invalid chars removed but spaces preserved
- ❌ "" - Empty name should show error

---

## Testing Checklist

### Issue 1: Plus Button

- [ ] Click plus button once - no freeze
- [ ] Click plus button rapidly 5 times - no freeze
- [ ] New chat created successfully
- [ ] App remains responsive
- [ ] No console errors

### Issue 2: Wrong Query

- [ ] Schema inspection queries not shown as runnable
- [ ] Data queries shown correctly
- [ ] Multiple queries in response handled correctly
- [ ] Already-executed queries not shown again
- [ ] Complex AI responses work

### Issue 3: Chat Name Spaces

- [ ] Can type spaces in chat name
- [ ] Spaces preserved when saved
- [ ] Spaces show correctly in list
- [ ] Multiple consecutive spaces collapse to one
- [ ] Invalid characters still removed

---

## Rollback Plan

1. Git branch for each fix
2. Test each fix independently
3. If issue persists, revert and add more logging
4. Check for race conditions or timing issues

---

## Success Criteria

✅ Plus button never freezes app  
✅ Proper query shown in chat (data query, not schema query)  
✅ Chat names can contain spaces  
✅ All changes tested on Windows, macOS, Linux  
✅ No regression in existing functionality

---

## Notes

- Add telemetry to track freeze occurrences
- Consider rate limiting plus button clicks
- Add loading indicator for chat creation
- Consider caching schema queries to avoid repeated execution
- Document query classification logic for future reference
