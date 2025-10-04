# Using the Work Area

The Work Area is where you write, execute, and manage your SQL queries. This guide covers everything from creating query tabs to executing complex SQL statements.

## Overview

The Work Area consists of:
- **Query Tabs**: Multiple SQL editors with syntax highlighting
- **SQL Editor**: Monaco-based editor with IntelliSense and autocomplete
- **Results Panel**: Grid display for query results
- **Messages Panel**: Execution feedback and error messages
- **Toolbar**: Quick actions for common operations

## Query Tabs

### Creating a New Tab

**Method 1: From Toolbar**
- Click the **"+ New Query"** button in the toolbar

**Method 2: From Connections Tree**
- **Right-click** a database → **"New Query"**
- The tab will be automatically associated with that database

**Method 3: Keyboard Shortcut**
- `Cmd+N` (macOS) or `Ctrl+N` (Windows)

### Tab Management

**Multiple Tabs:**
- Open as many tabs as you need
- Each tab can connect to a different database
- Tabs are independent—running a query in one doesn't affect others

**Tab Title:**
- Shows the query filename or "Untitled" for new queries
- Shows the active database in parentheses
- Shows a dot (•) if the tab has unsaved changes

**Example:**
```
UserReport.sql (ProductionDB) •
```

### Switching Between Tabs

**Click** the tab to activate it.

**Keyboard Shortcuts:**
- `Cmd+Shift+[` / `Cmd+Shift+]` (macOS): Previous/Next tab
- `Ctrl+Tab` / `Ctrl+Shift+Tab` (Windows): Cycle through tabs
- `Cmd+1` to `Cmd+9` (or `Ctrl+1` to `Ctrl+9`): Jump to tab 1-9

### Closing Tabs

**Method 1: Click the X**
- Click the **X** on the tab

**Method 2: Keyboard**
- `Cmd+W` (macOS) or `Ctrl+W` (Windows)

**Method 3: Context Menu**
- **Right-click** tab → **"Close"**

**Close Other Options:**
- **Close Other Tabs**: Close all except this one
- **Close Tabs to the Right**: Close all tabs after this one
- **Close All Tabs**: Close all tabs
- **Close Saved Tabs**: Close only tabs without unsaved changes

### Reordering Tabs

**Drag and drop** tabs to reorder them.

### Pinning Tabs

Keep important tabs from being accidentally closed:
1. **Right-click** the tab
2. Select **"Pin Tab"**
3. Pinned tabs appear first and show a 📌 icon

**To unpin:**
- **Right-click** → **"Unpin Tab"**

## SQL Editor

### Writing SQL

The editor provides:
- **Syntax Highlighting**: Keywords, strings, comments colored differently
- **Line Numbers**: Track your code easily
- **Code Folding**: Collapse/expand code blocks
- **Bracket Matching**: Highlights matching parentheses, brackets, braces

### IntelliSense and Autocomplete

The editor provides intelligent suggestions as you type:

**Database Objects:**
- Start typing a table name: `USE` → suggestions appear
- Press `Ctrl+Space` to manually trigger autocomplete
- Navigate suggestions with `↑` / `↓`
- Press `Enter` or `Tab` to accept

**SQL Keywords:**
- Type `SEL` → `SELECT` appears
- Keywords are shown with a 🔑 icon

**Column Names:**
- After `SELECT` and typing a table reference, columns are suggested
- Example: `SELECT * FROM Users. ` → column suggestions appear

**Snippets:**
- Type `ss` → `SELECT * FROM` snippet
- Type `ins` → `INSERT INTO` template
- Type `upd` → `UPDATE` template

**Function Signatures:**
- As you type a function, parameters are shown
- Example: `DATEADD(` → shows required parameters

### Formatting SQL

**Auto-Format:**
1. Select SQL code (or press `Cmd+A` / `Ctrl+A` for all)
2. Press `Shift+Alt+F` (macOS/Windows)
3. SQL is automatically formatted with proper indentation

**Manual Formatting:**
- **Right-click** in editor → **"Format Document"**

**Format Settings:**
Go to **Settings** → **Editor** → **SQL Formatting**:
- Keyword case (UPPERCASE, lowercase, PascalCase)
- Indentation (spaces or tabs, size)
- Line length
- Comma placement (before or after)

### Comments

**Single-line Comment:**
```sql
-- This is a comment
SELECT * FROM Users; -- End-of-line comment
```

**Multi-line Comment:**
```sql
/*
  This is a multi-line comment
  It can span multiple lines
*/
SELECT * FROM Users;
```

**Keyboard Shortcuts:**
- `Cmd+/` (macOS) or `Ctrl+/` (Windows): Toggle line comment
- `Shift+Alt+A` (macOS/Windows): Toggle block comment

### Multiple Cursors

Edit multiple locations simultaneously:

**Add Cursor:**
- `Alt+Click` (macOS/Windows): Add cursor at click position
- `Cmd+Alt+↑/↓` (macOS) or `Ctrl+Alt+↑/↓` (Windows): Add cursor above/below

**Select All Occurrences:**
- `Cmd+Shift+L` (macOS) or `Ctrl+Shift+L` (Windows): Select all instances of selected text

**Example:**
```sql
SELECT Name FROM Users;
SELECT Email FROM Users;
SELECT Phone FROM Users;
```
Select "Users", press `Cmd+Shift+L`, type "Customers" to replace all at once.

### Find and Replace

**Find:**
- `Cmd+F` (macOS) or `Ctrl+F` (Windows)
- Enter search term
- Navigate results with `Enter` (next) or `Shift+Enter` (previous)

**Replace:**
- `Cmd+H` (macOS) or `Ctrl+H` (Windows)
- Enter find term and replacement
- **Replace** one at a time or **Replace All**

**Advanced:**
- **Match Case**: Case-sensitive search
- **Match Whole Word**: Exact word matches only
- **Use Regular Expression**: Pattern-based search

## Executing Queries

### Execute Entire Script

**Method 1: Toolbar Button**
- Click the **▶ Execute** button

**Method 2: Keyboard Shortcut**
- `Cmd+Enter` (macOS) or `F5` (Windows)

**Method 3: Context Menu**
- **Right-click** → **"Execute"**

### Execute Selected SQL

To run only part of your script:
1. **Select** the SQL you want to execute
2. Press `Cmd+Enter` (macOS) or `F5` (Windows)
3. Only the selected portion runs

**Example:**
```sql
-- Only run this part
SELECT * FROM Users WHERE Active = 1;

-- Not this part
-- SELECT * FROM Orders;
```

### Execute to Cursor

Run everything from the start up to the cursor position:
1. Place cursor where you want execution to stop
2. **Right-click** → **"Execute to Cursor"**
3. Or press `Cmd+Shift+Enter` (macOS) or `Shift+F5` (Windows)

### Stop Execution

To cancel a running query:
- Click the **⏹ Stop** button (appears when a query is running)
- Or press `Cmd+.` (macOS) or `Ctrl+C` (Windows)

### Execution Confirmations

For **write operations** (INSERT, UPDATE, DELETE) and **DDL operations** (CREATE, ALTER, DROP), LuceData shows a confirmation dialog:

**Confirmation Dialog Shows:**
- The SQL statement about to be executed
- Number of rows/objects affected (if known)
- Warning level (Info, Warning, Danger)

**Options:**
- **Execute**: Run the query
- **Cancel**: Don't run the query
- **Always Allow**: Don't ask again for this connection (can be changed in settings)

**Safety Settings:**
Go to **Settings** → **Query Execution**:
- **Confirm Write Operations**: Always ask before INSERT/UPDATE/DELETE
- **Confirm DDL Operations**: Always ask before CREATE/ALTER/DROP
- **Confirm DROP Operations**: Extra confirmation for DROP statements
- **Rollback on Error**: Wrap statements in transactions

## Results Panel

### Viewing Results

After executing a query, results appear in the **Results Panel** below the editor.

**Results Grid:**
- Column headers show column names and data types
- Rows are paginated (1000 rows per page by default)
- Sortable by clicking column headers
- Resizable columns

**Multiple Result Sets:**
If your query returns multiple result sets, tabs appear:
- **Results 1**, **Results 2**, etc.
- Click tabs to switch between result sets

### Navigating Results

**Pagination:**
- Use **◀ Previous** / **Next ▶** buttons
- Or jump to a specific page

**Sorting:**
- Click column header to sort ascending
- Click again to sort descending
- Hold `Shift` and click multiple headers for multi-column sort

**Filtering:**
- Click the **filter icon** in column header
- Enter filter criteria (text, numbers, dates)
- Supports operators: `=`, `!=`, `>`, `<`, `>=`, `<=`, `LIKE`

**Example Filters:**
- `> 100`: Values greater than 100
- `LIKE John%`: Values starting with "John"
- `!= NULL`: Non-null values

### Copying Results

**Copy Cell:**
- Click a cell and press `Cmd+C` (macOS) or `Ctrl+C` (Windows)

**Copy Row:**
- **Right-click** row → **"Copy Row"**

**Copy Column:**
- **Right-click** column header → **"Copy Column"**

**Copy All Results:**
- **Right-click** in results → **"Copy All"**
- Results are copied as tab-delimited text

**Copy as SQL:**
- **Right-click** row → **"Copy as INSERT"**
- Generates an INSERT statement for the row

### Exporting Results

**Export to CSV:**
1. **Right-click** in results
2. Select **"Export to CSV"**
3. Choose location and filename
4. Click **"Save"**

**Export Options:**
- **Include Headers**: First row contains column names
- **Delimiter**: Comma, tab, semicolon, or pipe
- **Text Qualifier**: Quote text fields
- **Date Format**: Customize date/time format
- **Null Value**: How to represent NULL (empty, "NULL", "N/A", etc.)

**More Export Formats (Coming Soon):**
- Excel (.xlsx)
- JSON
- XML
- Parquet

### Editing Results (Coming Soon)

Direct result editing is planned:
- Edit cells directly in the results grid
- Changes are sent as UPDATE statements
- Requires write permissions

## Messages Panel

The **Messages Panel** shows:
- ✅ **Success messages**: Rows affected, execution time
- ⚠️ **Warnings**: Non-critical issues
- ❌ **Errors**: Syntax errors, permission errors, runtime errors
- ℹ️ **Informational messages**: Query plan info, statistics

**Example:**
```
✅ Query executed successfully.
(1,247 rows affected)
Execution time: 0.342 seconds
```

**Error Messages:**
```
❌ Error: Invalid column name 'UserName'.
Line 3, Column 8
```

**Clicking an error:**
- Jumps to the error location in the editor
- Highlights the problematic code

### Clearing Messages

- Click the **Clear** button (🗑️) to clear all messages

## Splitting the Editor

Work with multiple queries side-by-side:

**Split Vertically:**
- **Right-click** tab → **"Split Right"**
- Or drag tab to the right edge

**Split Horizontally:**
- **Right-click** tab → **"Split Down"**
- Or drag tab to the bottom edge

**Unsplit:**
- Drag the tab back to the main tab area
- Or close the split pane

## Query History

LuceData tracks your query history:

**View History:**
1. Click the **History** icon (🕐) in the toolbar
2. Browse previously executed queries
3. Click a query to load it into a new tab

**History Features:**
- Organized by date
- Shows execution time and status
- Search/filter history
- Re-run queries with one click

**Clear History:**
- **Right-click** in history → **"Clear History"**
- Or go to **Settings** → **Privacy** → **"Clear Query History"**

## Saving and Opening Queries

### Saving Queries

**Save:**
- `Cmd+S` (macOS) or `Ctrl+S` (Windows)
- Choose location and filename
- Files are saved with `.sql` extension

**Save As:**
- `Cmd+Shift+S` (macOS) or `Ctrl+Shift+S` (Windows)
- Save a copy with a new name

**Auto-Save:**
Go to **Settings** → **Editor**:
- Enable **Auto-Save**
- Set delay (e.g., 5 seconds after last change)

### Opening Queries

**Open File:**
- `Cmd+O` (macOS) or `Ctrl+O` (Windows)
- Select a `.sql` file
- Opens in a new tab

**Recent Files:**
- **File** → **Recent Files**
- Or `Cmd+E` (macOS) / `Ctrl+E` (Windows)

**Drag and Drop:**
- Drag a `.sql` file from Finder/Explorer into LuceData
- Opens in a new tab

## Snippets and Templates

### Using Snippets

Snippets are reusable code templates:

**Common Snippets:**
- `ss` → `SELECT * FROM TableName`
- `sst` → `SELECT TOP 100 * FROM TableName`
- `ins` → `INSERT INTO TableName (Columns) VALUES (Values)`
- `upd` → `UPDATE TableName SET Column = Value WHERE Condition`
- `del` → `DELETE FROM TableName WHERE Condition`
- `ct` → `CREATE TABLE TableName (Columns)`
- `cte` → Common Table Expression template
- `proc` → Stored procedure template
- `func` → Function template

**Using a Snippet:**
1. Type the snippet shortcut
2. Press `Tab`
3. Fill in the placeholders (press `Tab` to jump between them)

### Creating Custom Snippets

1. Go to **Settings** → **Snippets**
2. Click **"+ New Snippet"**
3. Enter:
   - **Name**: Descriptive name
   - **Prefix**: Shortcut to trigger (e.g., `myquery`)
   - **Body**: The SQL template
   - **Description**: What the snippet does
4. Use `${1:placeholder}`, `${2:placeholder}` for tab stops
5. Click **"Save"**

**Example Custom Snippet:**
```json
{
  "name": "Select User by ID",
  "prefix": "seluser",
  "body": [
    "SELECT",
    "    UserId,",
    "    Username,",
    "    Email,",
    "    CreatedDate",
    "FROM Users",
    "WHERE UserId = ${1:UserId};"
  ],
  "description": "Select a user by ID"
}
```

## Keyboard Shortcuts

| Action | macOS | Windows |
|--------|-------|---------|
| **New Query** | `Cmd+N` | `Ctrl+N` |
| **Open Query** | `Cmd+O` | `Ctrl+O` |
| **Save Query** | `Cmd+S` | `Ctrl+S` |
| **Execute Query** | `Cmd+Enter` | `F5` |
| **Execute Selection** | `Cmd+Enter` | `F5` |
| **Stop Execution** | `Cmd+.` | `Ctrl+C` |
| **Comment Line** | `Cmd+/` | `Ctrl+/` |
| **Format SQL** | `Shift+Alt+F` | `Shift+Alt+F` |
| **Find** | `Cmd+F` | `Ctrl+F` |
| **Replace** | `Cmd+H` | `Ctrl+H` |
| **Close Tab** | `Cmd+W` | `Ctrl+W` |
| **Next Tab** | `Cmd+Shift+]` | `Ctrl+Tab` |
| **Previous Tab** | `Cmd+Shift+[` | `Ctrl+Shift+Tab` |
| **Toggle Fullscreen** | `Cmd+Ctrl+F` | `F11` |

## Tips and Tricks

### 💡 Quick Execute
Select a single line and press `Cmd+Enter` (or `F5`) to execute just that line—no need to select text explicitly.

### 💡 Duplicate Line
`Shift+Alt+↓` duplicates the current line below. Great for creating similar queries quickly.

### 💡 Move Line Up/Down
`Alt+↑` / `Alt+↓` moves the current line up or down.

### 💡 Multi-Line Editing
Hold `Alt` and drag vertically to select a column of text. Type to edit all lines at once.

### 💡 Block Selection
Hold `Shift+Alt` and drag to select a rectangular block of text.

### 💡 Incremental Search
Press `Cmd+F` (or `Ctrl+F`) and start typing to search without opening the search box.

### 💡 Zen Mode
Press `Cmd+K Z` (macOS) or `Ctrl+K Z` (Windows) for distraction-free editing (hides all panels).

## Troubleshooting

### Query Won't Execute
- Check the connection is active (green indicator in Connections Tree)
- Verify you have permissions for the operation
- Check for SQL syntax errors (red squiggly underlines)

### Results Not Showing
- Check the **Messages Panel** for errors
- Verify the query returns results (try `SELECT 1`)
- Increase result size limit in **Settings** → **Query Execution**

### Editor is Slow
- Close unused tabs
- Disable autocomplete for very large databases (**Settings** → **Editor**)
- Reduce result set size

### Can't Save Query
- Check you have write permissions to the destination folder
- Verify disk space is available
- Try "Save As" to a different location

## Next Steps

Now that you know how to use the Work Area:
1. ✅ [**Using the AI Assistant**](./ai-assistant.md) - Generate SQL with natural language
2. ✅ [**Keyboard Shortcuts**](./shortcuts.md) - Master productivity shortcuts
3. ✅ [**Query Optimization**](./optimization.md) - Write faster queries

---

Need help? Contact us at support@lucedata.com
