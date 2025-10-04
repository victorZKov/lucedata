# Using the Connections Tree

The Connections Tree is your visual gateway to exploring and managing your database objects. This guide will help you navigate servers, databases, schemas, tables, and more.

## Overview

The Connections Tree is located on the **left side** of LuceData and displays:
- 🗄️ **Database connections** (servers)
- 💾 **Databases** within each server
- 📁 **Schemas** (namespaces for database objects)
- 📊 **Tables, views, functions, procedures**
- 🔑 **Indexes, keys, constraints, triggers**

## Tree Structure

### SQL Server Hierarchy
```
📡 Connection Name (SQL Server)
  └─ 💾 Database1
      ├─ 📁 Tables
      │   ├─ 📊 dbo.Users
      │   │   ├─ 📋 Columns
      │   │   │   ├─ 🔑 UserId (PK)
      │   │   │   ├─ 📝 Username
      │   │   │   └─ 📝 Email
      │   │   ├─ 🗝️ Keys
      │   │   │   ├─ PK_Users (Primary Key)
      │   │   │   └─ FK_Orders (Foreign Key)
      │   │   ├─ 📑 Indexes
      │   │   │   └─ IX_Username
      │   │   ├─ ⚡ Triggers
      │   │   │   └─ trg_Users_Update
      │   │   └─ 🔒 Constraints
      │   │       └─ CK_Email_Format
      │   └─ 📊 dbo.Orders
      ├─ 👁️ Views
      │   └─ 👁️ dbo.vw_ActiveUsers
      ├─ ⚙️ Stored Procedures
      │   └─ ⚙️ dbo.sp_GetUsers
      ├─ 🔧 Functions
      │   ├─ 🔧 dbo.fn_GetUserCount (Scalar)
      │   └─ 🔧 dbo.fn_GetUserList (Table)
      └─ 📁 Schemas
          ├─ dbo
          ├─ sales
          └─ hr
  └─ 💾 Database2
```

### PostgreSQL Hierarchy
```
📡 Connection Name (PostgreSQL)
  └─ 💾 Database1
      ├─ 📁 Schemas
      │   ├─ public
      │   │   ├─ 📊 Tables
      │   │   │   └─ 📊 users
      │   │   ├─ 👁️ Views
      │   │   ├─ 🔧 Functions
      │   │   └─ 📊 Sequences
      │   └─ custom
      └─ 🔧 Extensions
          ├─ pg_stat_statements
          └─ uuid-ossp
```

### SQLite Hierarchy
```
📡 Connection Name (SQLite)
  └─ 💾 main
      ├─ 📊 Tables
      │   ├─ 📊 users
      │   └─ 📊 orders
      ├─ 👁️ Views
      ├─ 🗝️ Indexes
      └─ ⚡ Triggers
```

## Basic Navigation

### Expanding and Collapsing

**Expand:**
- Click the **▶ arrow** next to an item
- Or **double-click** the item

**Collapse:**
- Click the **▼ arrow** next to an expanded item
- Or **double-click** the expanded item

**Keyboard Shortcuts:**
- `→` (Right Arrow): Expand selected item
- `←` (Left Arrow): Collapse selected item
- `↑` / `↓`: Navigate up/down
- `Enter`: Expand/collapse or perform default action

### Refreshing the Tree

To refresh the database structure:
1. **Right-click** on any level (connection, database, or schema)
2. Select **"Refresh"**
3. The tree will reload and show the latest structure

**Keyboard Shortcut:** `Cmd+R` (macOS) or `Ctrl+R` (Windows)

> 💡 **Tip**: Refresh after making schema changes in another tool to see updates.

## Working with Connections

### Connect/Disconnect

**Connect:**
- Click the **plug icon** next to the connection name
- Or **right-click** → **"Connect"**

**Disconnect:**
- Click the **connected plug icon**
- Or **right-click** → **"Disconnect"**

> 💡 **Auto-connect**: Connections marked as "favorite" will connect automatically on startup.

### Favorite Connections

Mark frequently-used connections as favorites:
1. **Right-click** the connection
2. Select **"Add to Favorites"**
3. A ⭐ star appears next to the name

**Benefits:**
- Auto-connect on startup (optional)
- Appears at the top of the list
- Quick access via `Cmd+1`, `Cmd+2`, etc.

### Connection Status Indicators

| Icon | Status | Meaning |
|------|--------|---------|
| 🟢 | Connected | Active connection |
| ⚪ | Disconnected | Not connected |
| 🟡 | Connecting | Connection in progress |
| 🔴 | Error | Connection failed |

## Working with Databases

### Select a Database

Click on a database name to make it the **active database**. The active database is highlighted and used for:
- New query tabs
- AI Assistant context
- Schema-aware autocomplete

### Database Actions

**Right-click** a database to access:
- **New Query**: Open a new query tab for this database
- **Refresh**: Reload database objects
- **Properties**: View database details (size, collation, etc.)
- **Backup** (SQL Server): Initiate a backup
- **Set as Default**: Make this the default for the connection

### Database Properties

**Right-click** → **"Properties"** to view:
- Database name and collation
- Total size and available space
- Creation date
- Owner/users
- Recovery model (SQL Server)

## Working with Tables

### View Table Structure

**Expand** a table to see:
- **Columns**: Column names, data types, nullable status
- **Keys**: Primary keys, foreign keys, unique keys
- **Indexes**: Performance indexes
- **Triggers**: Event-driven logic
- **Constraints**: Check constraints, defaults

### Table Actions

**Right-click** a table for:
- **Select Top 1000**: Quick data preview
- **Edit Top 200**: View and edit data inline
- **Script Table**:
  - **CREATE**: Generate table creation script
  - **SELECT**: Generate SELECT statement
  - **INSERT**: Generate INSERT template
  - **UPDATE**: Generate UPDATE template
  - **DELETE**: Generate DELETE template
- **Design Table**: Visual table designer (coming soon)
- **View Dependencies**: See what depends on this table
- **Properties**: View table metadata

### Quick Actions

**Double-click** a table to:
- Open "SELECT TOP 1000" query automatically

**Drag and drop** a table into the query editor to:
- Insert the table name at cursor position
- Or generate a SELECT statement (hold `Shift` while dropping)

## Working with Columns

### Column Information

Hover over a column to see a tooltip with:
- Data type
- Nullability
- Default value
- Description (if available)

### Column Actions

**Right-click** a column for:
- **Copy Name**: Copy column name to clipboard
- **Copy Definition**: Copy full definition (name + type)
- **Insert Name**: Insert column name in active query
- **Find References**: Search for column usage in procedures/views

### Drag and Drop

**Drag** a column into the query editor to insert its name.

**Drag multiple columns**:
1. Hold `Cmd` (macOS) or `Ctrl` (Windows)
2. Click multiple columns
3. Drag them into the editor
4. They'll be inserted as a comma-separated list

## Working with Keys and Indexes

### Primary Keys 🔑

- Identify unique row identifiers
- Usually the first key listed
- Marked with **PK** prefix

### Foreign Keys 🔗

- Show relationships between tables
- **Hover** to see referenced table and column
- **Click** to navigate to referenced table

### Indexes 📑

**Right-click** an index for:
- **View Definition**: See index columns and settings
- **Script Index**: Generate CREATE INDEX statement
- **Rebuild** (SQL Server): Rebuild fragmented index
- **Disable/Enable**: Toggle index usage

## Working with Views

### View Actions

**Right-click** a view for:
- **Select Top 1000**: Query the view
- **Script View**:
  - **CREATE**: Generate view creation script
  - **SELECT**: Generate SELECT statement
- **View Definition**: See the underlying SQL query
- **Modify**: Edit the view (opens in editor)
- **Dependencies**: See what the view depends on

### Visual Indicators

- 👁️ **Eye icon**: Regular view
- 🔒 **Lock + eye**: Indexed/materialized view (if supported)

## Working with Stored Procedures and Functions

### Procedure/Function Actions

**Right-click** a procedure or function for:
- **Execute**: Run the procedure (prompts for parameters)
- **Modify**: Edit the procedure/function
- **Script**:
  - **CREATE**: Generate creation script
  - **ALTER**: Generate alter script
  - **EXECUTE**: Generate EXECUTE statement with parameter placeholders
- **View Definition**: See the code
- **Drop**: Delete the procedure/function (with confirmation)

### Parameter Information

Expand a procedure/function to see:
- **Parameters**: Name, data type, direction (IN/OUT)
- **Return Type** (functions only)

## Searching and Filtering

### Quick Search

1. Click in the Connections Tree panel
2. Type to search (search box appears at top)
3. Results are filtered in real-time
4. Use `↑` / `↓` to navigate results
5. Press `Esc` to clear search

**Search Features:**
- Case-insensitive
- Matches table names, column names, procedures, etc.
- Fuzzy matching (e.g., "usrtbl" matches "users_table")

### Advanced Filter

**Right-click** in the tree → **"Filter Objects"** to:
- Filter by object type (tables, views, procedures)
- Filter by schema
- Filter by name pattern (wildcards supported)
- Hide system objects

**Example Filters:**
- `dbo.*`: Show only dbo schema objects
- `*user*`: Show objects with "user" in the name
- `tbl*`: Show objects starting with "tbl"

## Context Menus

### Connection Context Menu

**Right-click** connection:
- Connect/Disconnect
- New Query
- Refresh
- Edit Connection
- Duplicate Connection
- Add to Favorites
- Delete Connection
- Properties

### Database Context Menu

**Right-click** database:
- New Query
- Refresh
- Set as Default
- Backup (SQL Server)
- Properties
- Close Database (disconnect without closing connection)

### Table Context Menu

**Right-click** table:
- Select Top 1000
- Edit Top 200
- Script Table (CREATE, SELECT, INSERT, UPDATE, DELETE)
- Design Table
- View Dependencies
- Rename
- Delete Table
- Properties

### Column Context Menu

**Right-click** column:
- Copy Name
- Copy Definition
- Insert Name in Query
- Find References
- Modify Column

## Keyboard Shortcuts

| Action | macOS | Windows |
|--------|-------|---------|
| **Expand** | `→` | `→` |
| **Collapse** | `←` | `←` |
| **Navigate Up/Down** | `↑` / `↓` | `↑` / `↓` |
| **Refresh** | `Cmd+R` | `Ctrl+R` |
| **Search** | Start typing | Start typing |
| **New Query** | `Cmd+N` | `Ctrl+N` |
| **Toggle Panel** | `Cmd+B` | `Ctrl+B` |
| **Focus Tree** | `Cmd+0` | `Ctrl+0` |

## Customization

### Panel Width

- **Drag** the right edge of the Connections panel to resize
- **Double-click** the edge to auto-size

### Sort Order

**Right-click** in tree → **"Sort By"**:
- Name (A-Z)
- Name (Z-A)
- Type
- Date Modified (if available)

### Display Options

Go to **Settings** → **Connections Tree**:
- **Show System Objects**: Include system tables/views
- **Show Column Types**: Display data types next to columns
- **Group by Schema**: Group objects by schema (SQL Server/PostgreSQL)
- **Icon Style**: Choose between detailed or simple icons
- **Tree Indentation**: Adjust spacing

## Tips and Tricks

### 💡 Quick Table Preview
Double-click any table to instantly see the first 1000 rows.

### 💡 Multi-Select
Hold `Cmd` (macOS) or `Ctrl` (Windows) to select multiple objects, then right-click for bulk actions.

### 💡 Copy Full Path
`Cmd+Shift+C` (or `Ctrl+Shift+C`) copies the full object path (e.g., `DatabaseName.dbo.TableName`).

### 💡 Navigate to Definition
Hold `Cmd` (macOS) or `Ctrl` (Windows) and click a foreign key to jump to the referenced table.

### 💡 Recent Objects
Access recently-used objects via **View** → **Recent Objects** or `Cmd+E` (macOS) / `Ctrl+E` (Windows).

### 💡 Pin Frequently-Used Objects
**Right-click** → **"Pin"** to keep objects at the top of the tree.

## Troubleshooting

### Tree Won't Expand
- **Refresh** the connection (`Cmd+R` or `Ctrl+R`)
- Check the connection is active (green indicator)
- Verify you have permissions to view schema

### Objects Not Appearing
- **Refresh** the tree
- Check **Sort/Filter** settings aren't hiding objects
- Enable **"Show System Objects"** if looking for system tables
- Verify the objects exist (check in another tool)

### Slow Tree Loading
- Reduce the number of open connections
- Filter objects to show only what you need
- Close unused databases
- Check network latency for remote databases

### Can't Find an Object
- Use **Quick Search** (just start typing)
- Check **Filter** settings
- Verify you're looking in the correct database/schema
- **Refresh** the tree

## Next Steps

Now that you know how to navigate the Connections Tree:
1. ✅ [**Using the Work Area**](./work-area.md) - Write and execute queries
2. ✅ [**Using the AI Assistant**](./ai-assistant.md) - Generate SQL with natural language
3. ✅ [**Keyboard Shortcuts**](./shortcuts.md) - Speed up your workflow

---

Need help? Contact us at support@lucedata.com
