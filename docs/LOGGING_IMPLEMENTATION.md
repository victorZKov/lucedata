# Startup Logging Implementation

## Changes Made

### 1. Comprehensive Logging System (`apps/desktop/src/main.ts`)

Added a complete startup logging system that:

- **Creates log files automatically** in the system temp directory with timestamps
- **Logs all startup phases**:
  - Environment and platform information
  - Application paths and configuration
  - Database initialization
  - Window creation
  - Renderer bundle location search
  - All errors with full stack traces

- **Handles all error scenarios**:
  - Uncaught exceptions
  - Unhandled promise rejections
  - Preload script errors
  - Renderer bundle not found
  - Database initialization failures

- **Shows user-friendly error dialogs** that include:
  - Clear error message
  - Path to the detailed log file
  - Instructions to share the log when reporting issues

### 2. Log File Access (`apps/desktop/src/preload.ts`)

Added IPC handlers for programmatic log access:

- `getLogFilePath()` - Returns the path to the current log file
- `openLogFile()` - Opens the log file location in the system file manager

### 3. Documentation (`apps/desktop/TROUBLESHOOTING.md`)

Created comprehensive troubleshooting guide with:

- How to find log files on each platform
- What information is logged
- Common issues and solutions
- How to report bugs with logs

## Log File Location

### Format

```
[temp-directory]/sqlhelper-startup-[timestamp].log
```

### Platform-Specific Paths

- **macOS**: `/var/folders/.../T/sqlhelper-startup-[timestamp].log`
- **Windows**: `C:\Users\[User]\AppData\Local\Temp\sqlhelper-startup-[timestamp].log`
- **Linux**: `/tmp/sqlhelper-startup-[timestamp].log`

## Log Contents

Each log entry includes:

- ISO 8601 timestamp
- Log level indicator (✅ success, ❌ error, ⚠️ warning, etc.)
- Detailed context (paths, configurations, etc.)
- Full error stack traces when errors occur

Example log output:

```
[2025-10-03T10:15:23.456Z] ================================================================================
[2025-10-03T10:15:23.456Z] SQL Helper Application Starting
[2025-10-03T10:15:23.456Z] ================================================================================
[2025-10-03T10:15:23.457Z] Log file location:
{
  "logFilePath": "/var/folders/.../sqlhelper-startup-1727953523456.log"
}
[2025-10-03T10:15:23.458Z] Platform:
{
  "platform": "darwin",
  "arch": "arm64",
  "version": "v20.11.0",
  "electronVersion": "28.2.0"
}
...
[2025-10-03T10:15:23.789Z] ✅ Database initialized successfully
[2025-10-03T10:15:23.890Z] ✅ BrowserWindow created
[2025-10-03T10:15:23.891Z] ✅ Found renderer index.html: /Applications/SQL Helper.app/Contents/Resources/renderer/index.html
```

## Error Handling

### Before (No Logging)

- App crashes silently
- No way to diagnose issues
- Users can't provide useful bug reports

### After (With Logging)

- All errors are logged with full context
- Error dialog shows log file location
- Users can share detailed logs with developers
- Easier to debug installation and packaging issues

## Testing

To test the logging system:

1. **Normal startup** - Check that log is created in temp directory
2. **Missing renderer** - Temporarily rename renderer dist, verify error is logged
3. **Database error** - Simulate DB failure, check error details in log
4. **General errors** - Verify uncaught exceptions are logged

## Usage for Debugging Installation Issues

When users report "app won't start" issues:

1. Ask them to check the error dialog for the log file path
2. Request they send the log file
3. Log will show:
   - Exact paths being checked for renderer bundle
   - File system permissions
   - Module loading errors
   - Any missing dependencies

## Future Enhancements

Potential improvements:

- Rotate/clean up old log files
- Add log viewer in the app (Help > View Logs)
- Upload logs to support system
- Configurable log levels
- Separate logs for main/renderer processes
