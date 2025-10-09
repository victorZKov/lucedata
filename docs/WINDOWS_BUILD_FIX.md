# Windows Build Fix - electron-store Module Not Found

## Problem

When running the Windows installer (NSIS or portable), the app crashed with:

```
Error [ERR_MODULE_NOT_FOUND]: Cannot find package 'electron-store' imported from
C:\apps\LuceData\resources\app\dist\apps\desktop\src\main.js
```

## Root Cause

The issue was caused by the way `node_modules` were being packaged for Windows:

1. **Original Configuration**: Used `extraResources` to copy node_modules to a different location
2. **ASAR Packaging**: When `asar: true`, modules inside ASAR have different path resolution
3. **pnpm Structure**: pnpm's node_modules structure with `.pnpm` directory complicates module resolution

## Solution

Changed `electron-builder.json` to properly include node_modules in the app directory:

```json
{
  "files": [
    "dist/**/*",
    "../renderer/dist/**/*",
    "assets/**/*",
    "package.json",
    {
      "from": "node_modules.packaged/node_modules",
      "to": "node_modules",
      "filter": ["**/*"]
    }
  ],
  "asar": false,
  "npmRebuild": false
}
```

### Key Changes:

1. **Direct node_modules Inclusion**: Copy `node_modules.packaged/node_modules` directly to `node_modules` in the app
2. **Disabled ASAR**: Set `asar: false` to avoid path resolution issues
3. **Removed extraResources**: No longer copying to a separate `app/node_modules` location

## File Structure (Before)

```
LuceData/
└── resources/
    ├── app/
    │   ├── dist/
    │   └── package.json
    └── app/
        └── node_modules/  ← Wrong location
            └── electron-store/
```

## File Structure (After - Fixed)

```
LuceData/
└── resources/
    └── app/
        ├── dist/
        ├── package.json
        └── node_modules/  ← Correct location
            ├── electron-store/
            ├── electron-updater/
            ├── keytar/
            └── @sqlhelper/
```

## Verification

After the fix, verify the structure:

```bash
# Check if node_modules exists in correct location
ls -la release/win-unpacked/resources/app/node_modules/

# Should show:
# electron-store
# electron-updater
# keytar
# @sqlhelper
```

## Trade-offs

### asar: false

**Pros:**

- Simpler module resolution
- No path resolution issues
- Easier debugging
- Works consistently across platforms

**Cons:**

- Larger installer size (no compression)
- Slower app startup (more files to read)
- Source code is visible (not obfuscated)

**Alternative (asar: true with proper unpacking):**

If you want to use ASAR in the future, you need:

```json
{
  "asar": true,
  "asarUnpack": [
    "node_modules/electron-store/**/*",
    "node_modules/keytar/**/*",
    "node_modules/@sqlhelper/**/*",
    "node_modules/.pnpm/**/*"
  ]
}
```

But this can be complex with pnpm's structure.

## Testing

To test the Windows build:

1. Build: `npm exec electron-builder -- --win --x64`
2. Install on Windows machine
3. Run the app
4. Check if it starts without the electron-store error

## macOS vs Windows Differences

- **macOS**: Tends to be more forgiving with module resolution
- **Windows**: Stricter path resolution, backslashes vs forward slashes
- **Linux**: Similar to macOS

The fix ensures consistent behavior across all platforms.

## Recommendations

1. Keep `asar: false` for now until you need the performance/security benefits
2. Test on actual Windows machine, not just build on macOS
3. Consider migrating from pnpm to npm/yarn if module resolution continues to be problematic
4. Always test installers on target platforms before release

## Related Files

- `apps/desktop/electron-builder.json` - Build configuration
- `apps/desktop/node_modules.packaged/` - Pre-packaged dependencies
- `release/win-unpacked/` - Unpacked Windows build for inspection

## Additional Notes

The `node_modules.packaged` directory is created during the build process and contains only the production dependencies needed for the Electron app. This is different from the workspace's root `node_modules` which contains development dependencies for all packages.
