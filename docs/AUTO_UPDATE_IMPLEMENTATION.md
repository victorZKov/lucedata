# Auto-Update Implementation

## Overview

SQL Helper now includes automatic update functionality using `electron-updater`. The app checks for updates on GitHub Releases and provides a user-friendly interface for downloading and installing updates.

## Architecture

### Backend (Main Process)

**File:** `apps/desktop/src/main.ts`

The main process handles the auto-update logic using the `electron-updater` library:

```typescript
import { autoUpdater } from "electron-updater";

// Configuration
autoUpdater.autoDownload = false; // User must approve download
autoUpdater.autoInstallOnAppQuit = true; // Install when app closes
autoUpdater.logger = log;
```

**Key Features:**

- **User Control:** Updates are not downloaded automatically. Users see a dialog and must click "Download Update"
- **Event-Driven:** All update events are forwarded to the renderer process via IPC
- **Error Handling:** Comprehensive error logging and user feedback
- **Background Downloads:** Downloads happen in the background with progress updates

**IPC Handlers:**

1. `check-for-updates` - Manually check for updates
2. `download-update` - Start downloading an available update
3. `install-update` - Install downloaded update and restart app

**Events Sent to Renderer:**

- `update-checking` - Update check has started
- `update-available` - Update is available (includes version, release notes)
- `update-not-available` - App is up to date
- `update-error` - Error occurred during update process
- `download-progress` - Download progress (percent, speed, bytes)
- `update-downloaded` - Update downloaded and ready to install

### Preload Script

**File:** `apps/desktop/src/preload.ts`

Exposes a secure API to the renderer process:

```typescript
updates: {
  // Methods
  checkForUpdates: () => Promise<{available: boolean; updateInfo?: any; error?: string}>,
  downloadUpdate: () => Promise<{success: boolean; error?: string}>,
  installUpdate: () => void,

  // Event Listeners
  onUpdateChecking: (callback) => void,
  onUpdateAvailable: (callback) => void,
  onUpdateNotAvailable: (callback) => void,
  onUpdateError: (callback) => void,
  onDownloadProgress: (callback) => void,
  onUpdateDownloaded: (callback) => void,
  removeAllListeners: () => void
}
```

### Frontend (Renderer Process)

**Component:** `apps/renderer/src/components/UpdateNotification.tsx`

A React component that provides a beautiful dialog UI for the update process:

**Features:**

- Automatic update checking on app launch
- Modal dialog with status indicators
- Progress bar with download speed and size
- Release notes display
- Action buttons: "Download Update", "Install & Restart", "Skip This Version"
- Theme-aware (dark/light mode)
- Uses Headless UI for accessibility

**Type Definitions:** `apps/renderer/src/types/electron.d.ts`

TypeScript definitions ensure type safety for the updates API.

## Update Flow

```
1. App Launch
   ↓
2. Check for Updates (automatic)
   ↓
3. Update Available?
   ├─ No → Silent (log only)
   └─ Yes → Show Dialog
       ↓
4. User Clicks "Download Update"
   ↓
5. Download in Background (with progress)
   ↓
6. Download Complete → Show "Install & Restart" button
   ↓
7. User Clicks "Install & Restart"
   ↓
8. App Quits and Installs Update
   ↓
9. App Restarts with New Version
```

## Configuration

### Update Provider

**File:** `apps/desktop/electron-builder.json`

```json
{
  "publish": {
    "provider": "github",
    "owner": "sqlhelper",
    "repo": "sqlhelper"
  }
}
```

The app uses GitHub Releases as the update distribution channel. When you create a new release on GitHub with signed installers, electron-updater will detect it.

### Code Signing (Important!)

For auto-updates to work securely:

**macOS:**

- Must code sign the app with Apple Developer certificate
- Configured in `electron-builder.json`: `hardenedRuntime: true`
- Entitlements file: `assets/entitlements.mac.plist`

**Windows:**

- Code signing recommended but optional
- Can configure with `win.certificateFile` and `win.certificatePassword`

**Without code signing:** Updates will work in development but may be blocked by OS security in production.

## Testing

### Development Testing

1. **Enable Updates in Dev Mode** (main.ts):

   ```typescript
   // Remove or comment out the isDev check
   // if (!isDev) {
   setupAutoUpdater();
   // }
   ```

2. **Create a Test Release:**
   - Build the app: `pnpm build`
   - Package installers: `cd apps/desktop && electron-builder`
   - Create a GitHub release with the built files
   - Increment version in `package.json`

3. **Test Update Flow:**
   - Run the older version
   - Component should detect new version on GitHub
   - Test download and install process

### Manual Update Check

You can trigger an update check manually by calling:

```typescript
window.electronAPI.updates.checkForUpdates();
```

Consider adding a menu item or button for this in Settings.

## Production Deployment

### Creating a Release

1. **Increment Version:**

   ```bash
   npm version patch  # or minor, major
   ```

2. **Build Installers:**

   ```bash
   pnpm build
   cd apps/desktop
   electron-builder --mac --win --linux
   ```

3. **Create GitHub Release:**
   - Tag version (e.g., `v0.1.845`)
   - Upload all installer files from `release/` directory
   - Add release notes (will be shown to users)
   - Publish release

4. **Automatic Updates:**
   - Users on older versions will see update notification
   - They can download and install with one click

### Update Channels (Optional)

For beta/stable channels, modify the update check:

```typescript
autoUpdater.channel = "beta"; // or "stable"
```

Then publish releases with channel tags: `v0.1.845-beta`

## Monitoring

### Logs

Update logs are written to:

- **macOS:** `~/Library/Logs/SQL Helper/main.log`
- **Windows:** `%USERPROFILE%\AppData\Roaming\SQL Helper\logs\main.log`
- **Linux:** `~/.config/SQL Helper/logs/main.log`

### Events

All update events are logged to console in development. Monitor these for debugging:

```
[AutoUpdater] Checking for updates...
[AutoUpdater] Update available: 0.1.845
[AutoUpdater] Download progress: 45%
[AutoUpdater] Update downloaded
```

## Troubleshooting

### Update Check Fails

**Problem:** `checkForUpdates()` returns no update or error

**Solutions:**

1. Verify GitHub release exists with higher version number
2. Check `electron-builder.json` has correct repo owner/name
3. Ensure app has internet connection
4. Check GitHub API rate limits (60 req/hour for unauthenticated)

### Download Fails

**Problem:** Download starts but fails to complete

**Solutions:**

1. Check firewall/proxy settings
2. Verify GitHub release files are accessible
3. Check available disk space
4. Review logs for specific error messages

### Install Fails

**Problem:** Update downloads but won't install

**Solutions:**

1. Check app has write permissions
2. Verify code signing (especially on macOS)
3. Close all app instances before installing
4. Try running installer manually from cache

### Code Signing Issues

**Problem:** macOS blocks update as "damaged" or "unverified"

**Solutions:**

1. Ensure app is properly code signed
2. Use notarization for macOS (required for Catalina+)
3. Verify entitlements file is included
4. Check Developer ID certificate is valid

## Security Considerations

1. **HTTPS Only:** Updates are downloaded over HTTPS from GitHub
2. **Code Signing:** Verifies update authenticity
3. **User Control:** Users must approve downloads (not automatic)
4. **Signature Verification:** electron-updater verifies signatures automatically
5. **No Downgrades:** Only allows updates to newer versions

## Future Enhancements

Potential improvements for the update system:

1. **Delta Updates:** Only download changed files (not full installer)
2. **Background Updates:** Download updates silently in background
3. **Scheduled Checks:** Check for updates on a schedule (e.g., daily)
4. **Update Notifications:** Show subtle notification instead of modal
5. **Rollback Support:** Allow users to revert to previous version
6. **Analytics:** Track update success/failure rates
7. **Custom Update Server:** Host updates on your own server instead of GitHub

## References

- [electron-updater Documentation](https://www.electron.build/auto-update)
- [electron-builder Configuration](https://www.electron.build/configuration/configuration)
- [Code Signing Guide](https://www.electron.build/code-signing)
- [GitHub Releases API](https://docs.github.com/en/rest/releases)

## Version History

- **v0.1.844** - Initial auto-update implementation
  - User-controlled download and install
  - Progress tracking with visual feedback
  - Release notes display
  - Theme-aware dialog UI
