# SQL Helper - Troubleshooting Guide

## Application Won't Start

If SQL Helper fails to start or shows an error dialog, a detailed startup log is automatically created to help diagnose the issue.

### Finding the Log File

The log file is saved in your system's temporary directory with a timestamp:

**macOS:**

```
/var/folders/[random]/[session]/T/sqlhelper-startup-[timestamp].log
```

**Windows:**

```
C:\Users\[YourUsername]\AppData\Local\Temp\sqlhelper-startup-[timestamp].log
```

**Linux:**

```
/tmp/sqlhelper-startup-[timestamp].log
```

### Easy Access to Logs

1. When an error occurs, the error dialog will show the exact path to the log file
2. Copy the path from the error dialog
3. Navigate to that location in your file manager

### What the Log Contains

The startup log includes:

- Application environment details (platform, versions, paths)
- Initialization sequence
- Database setup
- Window creation steps
- Error details with full stack traces
- File system checks (preload script, renderer bundle, etc.)

### Reporting Issues

When reporting a startup issue:

1. Locate the log file (path shown in error dialog)
2. Attach the complete log file to your bug report
3. Include a screenshot of any error dialogs
4. Mention your operating system and version

### Common Issues

**"Cannot open application"** (macOS)

- Check the log file for code signing or permission issues
- Try: Right-click > Open (instead of double-click) on first launch

**"Renderer bundle not found"**

- This indicates the installation is incomplete
- Check the log for the list of searched paths
- May require reinstallation

**Database initialization failed**

- Check the log for database path and permissions
- Ensure the user data directory is writable

### Developer Mode

For developers, you can also check console output by running from terminal:

```bash
# macOS/Linux
/Applications/SQL\ Helper.app/Contents/MacOS/SQL\ Helper

# Windows
"C:\Program Files\SQL Helper\SQL Helper.exe"
```

This will show real-time console output in addition to the log file.
