# Add a New Connection

This guide will walk you through adding database connections to LuceData. You can connect to SQL Server, PostgreSQL, and SQLite databases.

## Supported Databases

| Database | Status | Notes |
|----------|--------|-------|
| **SQL Server** | ✅ Available | All versions supported (2012+) |
| **PostgreSQL** | ✅ Available | Versions 10+ supported |
| **SQLite** | ✅ Available | Local file-based databases |
| **Oracle** | 🚧 Coming Soon | Planned for future release |
| **MySQL** | 🚧 Coming Soon | Planned for future release |

## Before You Begin

Make sure you have:
- **Connection credentials**: Host/server address, username, password
- **Network access**: Firewall rules allow connections from your computer
- **Database permissions**: Appropriate permissions for the operations you'll perform

> 💡 **Tip**: Start with read-only permissions while learning LuceData, then grant write permissions when ready.

## Adding a Connection

### Step 1: Open the Connection Dialog

1. Look for the **Connections** panel on the left side
2. Click the **"+" (Add Connection)** button at the top of the panel
3. The "Add New Connection" dialog will open

### Step 2: Select Database Type

Choose your database type from the tabs:
- **SQL Server** - Microsoft SQL Server
- **PostgreSQL** - PostgreSQL database
- **SQLite** - Local SQLite file

## SQL Server Connection

### Basic Connection

**Fields:**
- **Connection Name**: A friendly name (e.g., "Production Database", "Dev SQL Server")
- **Server**: Server address or hostname
  - Examples: `localhost`, `192.168.1.100`, `sql.example.com`, `server.database.windows.net` (Azure)
- **Port**: Default is `1433` (leave empty to use default)
- **Authentication Type**: 
  - **SQL Server Authentication** (username/password)
  - **Windows Authentication** (current Windows user)
- **Username**: SQL Server login name (if using SQL Server Authentication)
- **Password**: SQL Server password
- **Database**: (Optional) Specific database to connect to
  - Leave empty to connect to default database and see all databases

**Example - Local SQL Server:**
```
Connection Name: Local SQL Server
Server: localhost
Port: 1433
Authentication: SQL Server Authentication
Username: sa
Password: YourPassword123!
Database: (leave empty)
```

**Example - Azure SQL Database:**
```
Connection Name: Azure Production
Server: myserver.database.windows.net
Port: 1433
Authentication: SQL Server Authentication
Username: sqladmin
Password: YourSecurePassword!
Database: ProductionDB
```

### Advanced Options

Click **"Advanced"** to configure additional settings:

- **Connection Timeout**: Seconds to wait for connection (default: 15)
- **Encrypt Connection**: Enable SSL/TLS encryption (recommended for cloud)
- **Trust Server Certificate**: Skip certificate validation (local dev only)
- **Application Name**: Identifier shown in SQL Server logs (default: "LuceData")
- **Multi-Subnet Failover**: Enable for SQL Server AlwaysOn configurations

### Named Instance Connection

For SQL Server named instances:
```
Server: localhost\SQLEXPRESS
or
Server: MYSERVER\INSTANCE1
```

## PostgreSQL Connection

### Basic Connection

**Fields:**
- **Connection Name**: A friendly name (e.g., "Postgres Dev", "Production PG")
- **Host**: Server address or hostname
  - Examples: `localhost`, `192.168.1.100`, `postgres.example.com`
- **Port**: Default is `5432`
- **Username**: PostgreSQL username
- **Password**: PostgreSQL password
- **Database**: Database name to connect to (required)
  - Common default: `postgres`
- **SSL Mode**: 
  - **Disable**: No SSL (local dev only)
  - **Require**: Require SSL connection (recommended)
  - **Verify-CA**: Verify certificate authority
  - **Verify-Full**: Full certificate verification

**Example - Local PostgreSQL:**
```
Connection Name: Local Postgres
Host: localhost
Port: 5432
Username: postgres
Password: yourpassword
Database: mydb
SSL Mode: Disable
```

**Example - Cloud PostgreSQL (AWS RDS, Azure, etc.):**
```
Connection Name: Production PG
Host: mydb.abc123.us-east-1.rds.amazonaws.com
Port: 5432
Username: dbadmin
Password: SecurePassword123!
Database: production
SSL Mode: Require
```

### Advanced Options

- **Connection Timeout**: Seconds to wait for connection (default: 15)
- **Application Name**: Identifier in PostgreSQL logs
- **Schema**: Default schema to use (default: `public`)
- **Search Path**: Schema search order (e.g., `public,custom`)

## SQLite Connection

### Basic Connection

**Fields:**
- **Connection Name**: A friendly name (e.g., "My Local DB", "Test Database")
- **File Path**: Path to the SQLite database file
  - Click **"Browse"** to select a file
  - Or type the path manually
- **Create if not exists**: Check this to create a new database file if it doesn't exist

**Example - Existing Database:**
```
Connection Name: App Database
File Path: /Users/yourname/Documents/myapp.db
Create if not exists: ☐
```

**Example - New Database:**
```
Connection Name: Test Database
File Path: /Users/yourname/Documents/test.db
Create if not exists: ☑
```

### Advanced Options

- **Read-Only Mode**: Open database in read-only mode (prevents all writes)
- **Busy Timeout**: Milliseconds to wait when database is locked (default: 5000)

## Step 3: Test the Connection

Before saving:

1. Click the **"Test Connection"** button
2. LuceData will attempt to connect to your database
3. You'll see one of these results:
   - ✅ **Success**: Connection works! Database info displayed.
   - ❌ **Error**: Review the error message and fix the issue.

**Common Errors:**

| Error | Solution |
|-------|----------|
| **Cannot connect to server** | Check server address, port, and network connectivity |
| **Login failed** | Verify username and password are correct |
| **Database does not exist** | Check database name spelling or create the database first |
| **Connection timeout** | Check firewall rules and increase timeout in Advanced settings |
| **SSL/TLS error** | Adjust SSL settings or install required certificates |

## Step 4: Set Permissions

Configure what operations are allowed for this connection:

- **Allow Read Operations (SELECT)**: ✅ Always recommended
- **Allow Write Operations (INSERT, UPDATE, DELETE)**: ⚠️ Enable if you need to modify data
- **Allow DDL Operations (CREATE, ALTER, DROP)**: ⚠️ Enable if you need to modify schema

> 🔒 **Security Note**: 
> - Start with **read-only** (SELECT only) while learning
> - Enable write operations only when needed
> - DDL operations can modify or delete entire tables—use with caution
> - All operations require your explicit confirmation before execution

**Recommended Permission Sets:**

**For Exploring/Learning:**
```
✅ Allow Read Operations
☐ Allow Write Operations
☐ Allow DDL Operations
```

**For Development Work:**
```
✅ Allow Read Operations
✅ Allow Write Operations
✅ Allow DDL Operations
```

**For Production (Read-Only Reporting):**
```
✅ Allow Read Operations
☐ Allow Write Operations
☐ Allow DDL Operations
```

## Step 5: Save the Connection

1. Review all settings
2. Click **"Save"**
3. The connection will appear in the Connections panel
4. Click the connection to expand and explore your databases

## Managing Connections

### Editing a Connection

1. **Right-click** the connection in the Connections panel
2. Select **"Edit Connection"**
3. Modify the settings
4. Click **"Test Connection"** to verify changes
5. Click **"Save"**

### Deleting a Connection

1. **Right-click** the connection in the Connections panel
2. Select **"Delete Connection"**
3. Confirm the deletion

> 💡 **Note**: Deleting a connection does not affect the actual database—it only removes it from LuceData.

### Duplicating a Connection

Useful for creating connections to different databases on the same server:

1. **Right-click** the connection
2. Select **"Duplicate Connection"**
3. Modify the new connection (e.g., change database name)
4. Click **"Save"**

### Connection Groups

Organize connections into groups:

1. **Right-click** in the Connections panel
2. Select **"New Group"**
3. Name the group (e.g., "Production", "Development", "Staging")
4. **Drag and drop** connections into the group

## Connection Security

### Credential Storage

- All credentials are stored **locally on your device**
- Encrypted using industry-standard encryption
- We do **not** have access to your credentials
- Credentials are never transmitted to LuceData servers

### Best Practices

✅ **Do:**
- Use strong, unique passwords for each database
- Enable SSL/TLS encryption for remote connections
- Use read-only accounts when write access isn't needed
- Regularly rotate database passwords
- Use service accounts (not personal accounts) for production

❌ **Don't:**
- Share credentials with others
- Use the same password across multiple databases
- Connect to production databases without proper authorization
- Disable SSL encryption for internet-facing databases

## Troubleshooting

### Cannot Connect to SQL Server

**Check:**
1. SQL Server service is running
2. TCP/IP protocol is enabled in SQL Server Configuration Manager
3. Firewall allows port 1433 (or your custom port)
4. SQL Server Browser service is running (for named instances)
5. Mixed mode authentication is enabled (for SQL auth)

**Test connectivity:**
```bash
# Windows
Test-NetConnection -ComputerName localhost -Port 1433

# macOS/Linux
nc -zv localhost 1433
```

### Cannot Connect to PostgreSQL

**Check:**
1. PostgreSQL service is running
2. `postgresql.conf` has `listen_addresses` set correctly
3. `pg_hba.conf` allows your IP address
4. Firewall allows port 5432
5. SSL certificates are valid (if using SSL)

**Test connectivity:**
```bash
# Test connection (with psql installed)
psql -h localhost -U postgres -d postgres

# Test port
nc -zv localhost 5432
```

### SQLite File Not Found

**Check:**
1. File path is correct (absolute path recommended)
2. You have read permissions on the file
3. File extension is correct (usually `.db`, `.sqlite`, `.sqlite3`)
4. Check "Create if not exists" to create a new database

### Slow Connections

**Solutions:**
- Reduce connection timeout
- Check network latency (for remote databases)
- Use connection pooling (in Advanced settings)
- Place SQLite files on local drives (not network shares)

### "Too many connections" Error

**Solutions:**
- Close unused connections
- Check your database's max connections limit
- Reduce connection timeout to release connections faster

## Advanced Topics

### Connection Strings

For advanced users, you can use connection strings directly:

**SQL Server:**
```
Server=myserver;Database=mydb;User Id=sa;Password=pass;
```

**PostgreSQL:**
```
Host=myserver;Port=5432;Database=mydb;Username=user;Password=pass;
```

### SSH Tunneling

To connect to databases behind firewalls via SSH tunnel:

1. Set up SSH tunnel in terminal:
   ```bash
   ssh -L 5432:localhost:5432 user@jumphost.example.com
   ```
2. In LuceData, connect to `localhost:5432`

> 🚧 **Coming Soon**: Built-in SSH tunnel support in LuceData!

## Next Steps

Now that you've added a connection:
1. ✅ [**Using the Connections Tree**](./connections-tree.md) - Navigate your database objects
2. ✅ [**Using the Work Area**](./work-area.md) - Write and execute queries
3. ✅ [**Using the AI Assistant**](./ai-assistant.md) - Generate SQL with natural language

---

Need help? Contact us at support@lucedata.com
