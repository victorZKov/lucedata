# Bug Fix Task: Query Editor Enhancement

**Priority**: P1 (High)  
**Category**: Query Editor  
**Estimated Time**: 2-3 hours  
**Complexity**: Medium

---

## Issue to Fix

**Current Behavior:**

- User selects/highlights a portion of SQL query
- Clicks execute button
- Entire query content is executed, not just the selection

**Expected Behavior:**

- User selects/highlights a portion of SQL query
- Clicks execute button
- ONLY the selected portion is executed

---

## Files to Review/Modify

### Primary Files:

- `apps/renderer/src/components/QueryEditor/QueryEditor.tsx` - Main editor component
- `apps/renderer/src/components/QueryEditor/ExecuteButton.tsx` - Execute button
- `apps/renderer/src/lib/queryExecution.ts` - Query execution logic
- `apps/renderer/src/stores/queryEditorStore.ts` - Editor state

### Related Files:

- Code editor package (likely Monaco Editor or CodeMirror)
- Query parser/validator

---

## Investigation Phase

### Estimated Time: 30 mins

### Step 1: Identify the Editor Library

```bash
# Check what editor library is being used
grep -r "monaco\|codemirror\|ace-editor" package.json
grep -r "@monaco-editor\|react-monaco\|@uiw/react-codemirror" package.json

# Find the QueryEditor component
find apps/renderer -name "*QueryEditor*"
```

**Expected Findings:**

- Monaco Editor (most likely for SQL editing)
- Or CodeMirror
- Or a custom textarea implementation

### Step 2: Find Current Execute Logic

```bash
# Find execute query function
grep -r "executeQuery\|runQuery\|execute.*sql" apps/renderer/src/

# Find button click handler
grep -r "onExecute\|handleExecute" apps/renderer/src/components/QueryEditor/
```

### Step 3: Check for Selection Handling

```bash
# Check if selection is already being detected
grep -r "getSelection\|selectedText\|selectionRange" apps/renderer/src/components/QueryEditor/
```

---

## Implementation Phase

### Estimated Time: 1.5-2 hours

### Option 1: Using Monaco Editor

If using Monaco Editor:

```typescript
// apps/renderer/src/components/QueryEditor/QueryEditor.tsx

import React, { useRef, useState } from 'react';
import Editor, { OnMount } from '@monaco-editor/react';
import type { editor } from 'monaco-editor';

export function QueryEditor() {
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const [selectedText, setSelectedText] = useState<string>('');

  // Store editor instance when mounted
  const handleEditorDidMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;

    // Listen for selection changes
    editor.onDidChangeCursorSelection((e) => {
      const selection = editor.getSelection();
      if (selection && !selection.isEmpty()) {
        const selected = editor.getModel()?.getValueInRange(selection);
        setSelectedText(selected || '');
      } else {
        setSelectedText('');
      }
    });
  };

  // Get text to execute (selection or full content)
  const getQueryToExecute = (): string => {
    if (!editorRef.current) return '';

    const selection = editorRef.current.getSelection();

    // If there's a selection, return selected text
    if (selection && !selection.isEmpty()) {
      const selectedText = editorRef.current.getModel()?.getValueInRange(selection);
      return selectedText || '';
    }

    // Otherwise, return full content
    return editorRef.current.getValue();
  };

  // Execute query
  const handleExecute = async () => {
    const queryText = getQueryToExecute();

    if (!queryText.trim()) {
      notificationStore.warning('No query to execute');
      return;
    }

    try {
      // Visual feedback for what's being executed
      if (selectedText) {
        console.log('[Query Editor] Executing selected text:', selectedText);
      } else {
        console.log('[Query Editor] Executing full query');
      }

      // Execute the query
      await executeQuery(queryText);
    } catch (error) {
      console.error('Query execution failed:', error);
      notificationStore.error('Query execution failed');
    }
  };

  return (
    <div className="query-editor">
      <div className="editor-toolbar">
        <button
          onClick={handleExecute}
          className="execute-button"
          title={selectedText ? 'Execute selection' : 'Execute query'}
        >
          ▶ {selectedText ? 'Execute Selection' : 'Execute'}
        </button>
        {selectedText && (
          <span className="selection-indicator">
            {selectedText.split('\n').length} line(s) selected
          </span>
        )}
      </div>

      <Editor
        height="100%"
        defaultLanguage="sql"
        theme="vs-dark"
        onMount={handleEditorDidMount}
        options={{
          minimap: { enabled: false },
          fontSize: 14,
          lineNumbers: 'on',
          roundedSelection: true,
          scrollBeyondLastLine: false,
          readOnly: false,
          automaticLayout: true,
        }}
      />
    </div>
  );
}
```

### Option 2: Using CodeMirror

If using CodeMirror:

```typescript
// apps/renderer/src/components/QueryEditor/QueryEditor.tsx

import React, { useRef, useState } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { sql } from '@codemirror/lang-sql';
import { EditorView } from '@codemirror/view';

export function QueryEditor() {
  const editorViewRef = useRef<EditorView | null>(null);
  const [selectedText, setSelectedText] = useState<string>('');

  // Handle selection changes
  const handleEditorChange = (value: string, viewUpdate: any) => {
    const view = viewUpdate.view;
    editorViewRef.current = view;

    // Get selection
    const selection = view.state.selection.main;
    if (!selection.empty) {
      const text = view.state.doc.sliceString(selection.from, selection.to);
      setSelectedText(text);
    } else {
      setSelectedText('');
    }
  };

  // Get query to execute
  const getQueryToExecute = (): string => {
    if (!editorViewRef.current) return '';

    const view = editorViewRef.current;
    const selection = view.state.selection.main;

    // If there's a selection, return it
    if (!selection.empty) {
      return view.state.doc.sliceString(selection.from, selection.to);
    }

    // Otherwise, return full document
    return view.state.doc.toString();
  };

  // Execute query
  const handleExecute = async () => {
    const queryText = getQueryToExecute();

    if (!queryText.trim()) {
      notificationStore.warning('No query to execute');
      return;
    }

    try {
      await executeQuery(queryText);
    } catch (error) {
      console.error('Query execution failed:', error);
      notificationStore.error('Query execution failed');
    }
  };

  return (
    <div className="query-editor">
      <div className="editor-toolbar">
        <button
          onClick={handleExecute}
          className="execute-button"
        >
          ▶ {selectedText ? 'Execute Selection' : 'Execute'}
        </button>
      </div>

      <CodeMirror
        height="100%"
        extensions={[sql()]}
        onChange={handleEditorChange}
        theme="dark"
      />
    </div>
  );
}
```

### Option 3: Using Plain Textarea

If using a plain textarea (less likely):

```typescript
// apps/renderer/src/components/QueryEditor/QueryEditor.tsx

export function QueryEditor() {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [selectedText, setSelectedText] = useState<string>('');

  // Handle selection changes
  const handleSelectionChange = () => {
    if (!textareaRef.current) return;

    const textarea = textareaRef.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;

    if (start !== end) {
      const selected = textarea.value.substring(start, end);
      setSelectedText(selected);
    } else {
      setSelectedText('');
    }
  };

  // Get query to execute
  const getQueryToExecute = (): string => {
    if (!textareaRef.current) return '';

    const textarea = textareaRef.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;

    // If there's a selection, return it
    if (start !== end) {
      return textarea.value.substring(start, end);
    }

    // Otherwise, return full content
    return textarea.value;
  };

  // Execute query
  const handleExecute = async () => {
    const queryText = getQueryToExecute();

    if (!queryText.trim()) {
      notificationStore.warning('No query to execute');
      return;
    }

    try {
      await executeQuery(queryText);
    } catch (error) {
      console.error('Query execution failed:', error);
      notificationStore.error('Query execution failed');
    }
  };

  return (
    <div className="query-editor">
      <div className="editor-toolbar">
        <button
          onClick={handleExecute}
          className="execute-button"
        >
          ▶ {selectedText ? 'Execute Selection' : 'Execute'}
        </button>
      </div>

      <textarea
        ref={textareaRef}
        onMouseUp={handleSelectionChange}
        onKeyUp={handleSelectionChange}
        className="sql-textarea"
      />
    </div>
  );
}
```

---

## Enhancement: Visual Feedback

### Estimated Time: 30 mins

Add visual indicators to show what will be executed:

```typescript
// Highlight the selection or entire content before execution
const highlightExecutionRange = () => {
  if (!editorRef.current) return;

  const selection = editorRef.current.getSelection();

  if (selection && !selection.isEmpty()) {
    // Highlight selected range
    editorRef.current.deltaDecorations(
      [],
      [
        {
          range: selection,
          options: {
            className: "execution-highlight",
            isWholeLine: false,
          },
        },
      ]
    );
  } else {
    // Highlight entire content
    const model = editorRef.current.getModel();
    if (model) {
      const fullRange = model.getFullModelRange();
      editorRef.current.deltaDecorations(
        [],
        [
          {
            range: fullRange,
            options: {
              className: "execution-highlight",
              isWholeLine: true,
            },
          },
        ]
      );
    }
  }

  // Remove highlight after 500ms
  setTimeout(() => {
    editorRef.current?.deltaDecorations([], []);
  }, 500);
};

// Call before executing
const handleExecute = async () => {
  highlightExecutionRange();
  await new Promise(resolve => setTimeout(resolve, 100)); // Brief pause

  const queryText = getQueryToExecute();
  await executeQuery(queryText);
};
```

Add CSS:

```css
/* apps/renderer/src/components/QueryEditor/QueryEditor.css */

.execution-highlight {
  background-color: rgba(0, 120, 255, 0.2);
  animation: fadeOut 0.5s ease-out;
}

@keyframes fadeOut {
  from {
    background-color: rgba(0, 120, 255, 0.3);
  }
  to {
    background-color: rgba(0, 120, 255, 0.1);
  }
}

.selection-indicator {
  margin-left: 12px;
  font-size: 12px;
  color: var(--text-secondary);
  display: flex;
  align-items: center;
  gap: 4px;
}

.execute-button {
  background: var(--primary-color);
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 6px;
  transition: all 0.15s ease;
}

.execute-button:hover {
  background: var(--primary-hover);
  transform: translateY(-1px);
}

.execute-button:active {
  transform: translateY(0);
}

.execute-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
```

---

## Keyboard Shortcut Support

### Estimated Time: 15 mins

Add keyboard shortcut to execute query:

```typescript
// Add keyboard shortcut handler
useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    // Cmd+Enter or Ctrl+Enter to execute
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      handleExecute();
    }
  };

  document.addEventListener('keydown', handleKeyDown);
  return () => document.removeEventListener('keydown', handleKeyDown);
}, []);

// Update button tooltip
<button
  onClick={handleExecute}
  title={`${selectedText ? 'Execute selection' : 'Execute query'} (⌘↵)`}
  className="execute-button"
>
  ▶ {selectedText ? 'Execute Selection' : 'Execute'}
</button>
```

---

## Edge Cases to Handle

### 1. Empty Selection

```typescript
if (!queryText.trim()) {
  notificationStore.warning("No query to execute");
  return;
}
```

### 2. Incomplete SQL Statement

```typescript
// Optional: Validate SQL before execution
const isValidSQL = (sql: string): boolean => {
  const trimmed = sql.trim();
  // Basic validation
  return trimmed.length > 0 && !trimmed.endsWith(",");
};

if (!isValidSQL(queryText)) {
  notificationStore.warning("Query appears incomplete");
  // Still allow execution if user confirms
}
```

### 3. Multiple Statements in Selection

```typescript
// Option to split and execute multiple statements
const statements = queryText.split(";").filter(s => s.trim());

if (statements.length > 1) {
  // Ask user if they want to execute all
  const confirmed = await confirmDialog(
    `Execute ${statements.length} statements?`
  );

  if (confirmed) {
    for (const stmt of statements) {
      await executeQuery(stmt);
    }
  }
} else {
  await executeQuery(queryText);
}
```

---

## Testing Phase

### Estimated Time: 30 mins

### Test Cases:

#### 1. Execute Full Query

- [ ] Open query editor
- [ ] Write a SQL query (no selection)
- [ ] Click execute
- [ ] Verify entire query is executed

#### 2. Execute Selected Text

- [ ] Write multiple SQL statements
- [ ] Select only one statement
- [ ] Click execute
- [ ] Verify only selected statement is executed

#### 3. Execute Partial Selection

- [ ] Write: `SELECT * FROM users WHERE id = 1`
- [ ] Select only: `SELECT * FROM users`
- [ ] Click execute
- [ ] Verify only selected part is executed

#### 4. Empty Selection

- [ ] Open editor with query
- [ ] Place cursor (no selection)
- [ ] Click execute
- [ ] Verify full query is executed

#### 5. Keyboard Shortcut

- [ ] Select part of query
- [ ] Press Cmd+Enter (or Ctrl+Enter)
- [ ] Verify selected part is executed

#### 6. Visual Feedback

- [ ] Execute with selection
- [ ] Verify selection is highlighted briefly
- [ ] Execute without selection
- [ ] Verify entire editor is highlighted briefly

#### 7. Button Label Changes

- [ ] No selection: Button says "Execute"
- [ ] With selection: Button says "Execute Selection"
- [ ] Selection indicator shows line count

---

## Success Criteria

✅ Selected text is executed when present  
✅ Full query executed when no selection  
✅ Button label changes based on selection  
✅ Keyboard shortcut (Cmd+Enter) works  
✅ Visual feedback shows what will be executed  
✅ Empty queries show warning  
✅ No console errors  
✅ Tested on Windows, macOS, Linux

---

## Rollback Plan

1. Keep old execute function as backup
2. Add feature flag to toggle new behavior
3. Can revert git commit if issues arise

```typescript
// Feature flag approach
const USE_SELECTION_EXECUTION = true;

const getQueryToExecute = (): string => {
  if (USE_SELECTION_EXECUTION) {
    // New behavior: check for selection
    return getSelectedOrFullQuery();
  } else {
    // Old behavior: always execute full query
    return editorRef.current?.getValue() || "";
  }
};
```

---

## Future Enhancements

1. **Execute Current Statement**: If no selection, execute only the statement where cursor is located
2. **Execute Multiple**: Allow executing multiple selected statements one by one
3. **Execution History**: Keep track of what was executed
4. **Query Templates**: Save commonly used query patterns
5. **Auto-formatting**: Format selection before execution

---

## Notes

- Consider adding a "Stop Execution" button for long-running queries
- Add execution time indicator
- Show row count after execution
- Consider adding query validation before execution
- Document the Cmd+Enter shortcut for users
- Add tooltip explaining selection execution behavior
