# macOS Code Signing Guide

## Problem

When trying to install LuceData on macOS, you see:

```
"LuceData" Not Opened

Apple could not verify "LuceData" is free of malware
that may harm your Mac or compromise your privacy.
```

## Why This Happens

macOS requires apps to be:

1. **Code signed** with an Apple Developer certificate
2. **Notarized** by Apple (submitted to Apple for malware scanning)

Without these, macOS blocks the app by default (Gatekeeper protection).

## Solutions

### Option 1: For Development/Testing Only

Users can bypass Gatekeeper temporarily:

1. **Right-click** the app → **Open** (instead of double-clicking)
2. Or run this command:
   ```bash
   xattr -cr /Applications/LuceData.app
   open /Applications/LuceData.app
   ```
3. Or go to **System Settings → Privacy & Security** → click "Open Anyway"

⚠️ **This is NOT recommended for distribution!** Only for your own testing.

### Option 2: Self-Signed Certificate (Ad-hoc signing)

For local development, you can use ad-hoc signing:

```bash
# Sign the app with ad-hoc signature
codesign --force --deep --sign - /Applications/LuceData.app
```

This won't fix the Gatekeeper warning but helps with basic validation.

### Option 3: Apple Developer Certificate (REQUIRED for Distribution)

For production releases, you **MUST** get an Apple Developer account and certificate.

#### Step 1: Join Apple Developer Program

1. Go to https://developer.apple.com/programs/
2. Enroll (costs $99 USD/year)
3. Wait for approval (usually 1-2 days)

#### Step 2: Create Certificates

1. Go to https://developer.apple.com/account/resources/certificates/
2. Create **Developer ID Application** certificate
3. Download and install in Keychain Access

#### Step 3: Update electron-builder.json

Add your certificate identity:

```json
{
  "mac": {
    "identity": "Developer ID Application: Your Name (TEAM_ID)",
    "hardenedRuntime": true,
    "gatekeeperAssess": false,
    "entitlements": "assets/entitlements.mac.plist",
    "entitlementsInherit": "assets/entitlements.mac.plist"
  },
  "afterSign": "scripts/notarize.js"
}
```

#### Step 4: Set Environment Variables

```bash
# In your terminal or CI/CD
export APPLE_ID="your-apple-id@email.com"
export APPLE_APP_SPECIFIC_PASSWORD="xxxx-xxxx-xxxx-xxxx"  # App-specific password
export APPLE_TEAM_ID="YOUR_TEAM_ID"  # From developer.apple.com
```

#### Step 5: Create Notarization Script

Create `apps/desktop/scripts/notarize.js`:

```javascript
const { notarize } = require("@electron/notarize");

exports.default = async function notarizing(context) {
  const { electronPlatformName, appOutDir } = context;
  if (electronPlatformName !== "darwin") {
    return;
  }

  const appName = context.packager.appInfo.productFilename;

  return await notarize({
    appBundleId: "com.lucedata.app",
    appPath: `${appOutDir}/${appName}.app`,
    appleId: process.env.APPLE_ID,
    appleIdPassword: process.env.APPLE_APP_SPECIFIC_PASSWORD,
    teamId: process.env.APPLE_TEAM_ID,
  });
};
```

#### Step 6: Install Notarization Package

```bash
pnpm add -D @electron/notarize
```

#### Step 7: Build with Signing

```bash
# Set environment variables
export APPLE_ID="your-apple-id@email.com"
export APPLE_APP_SPECIFIC_PASSWORD="xxxx-xxxx-xxxx-xxxx"
export APPLE_TEAM_ID="YOUR_TEAM_ID"

# Build
./deploy-update.sh
```

## Verification

After signing and notarizing:

```bash
# Check code signature
codesign --verify --deep --strict --verbose=2 /Applications/LuceData.app

# Check notarization
spctl -a -vvv -t install /Applications/LuceData.app

# Should output: "accepted"
```

## Common Issues

### Issue 1: "No identity found"

**Solution**: Make sure you've installed the certificate in Keychain Access:

```bash
# List available identities
security find-identity -v -p codesigning
```

### Issue 2: Notarization timeout

**Solution**: Notarization can take 5-30 minutes. Be patient!

### Issue 3: "App-specific password" error

**Solution**:

1. Go to https://appleid.apple.com/account/manage
2. Sign in → Security → App-Specific Passwords
3. Generate new password (NOT your Apple ID password!)

## Current State (No Certificate)

Right now, you have these options:

1. **Use Option 1** for local testing (bypass Gatekeeper)
2. **Distribute as ZIP** instead of DMG (users can extract and run with right-click → Open)
3. **Get Apple Developer account** for production distribution

## Distribution Without Code Signing

If you can't get a certificate immediately, you can:

1. **Distribute as ZIP file** (not DMG)
2. **Include instructions** for users:
   ```
   Installation Instructions:
   1. Download LuceData-0.1.0-arm64-mac.zip
   2. Extract the ZIP file
   3. Right-click LuceData.app → Open
   4. Click "Open" in the security dialog
   ```

## Recommendation

For **LuceData** to be production-ready:

- ✅ Get Apple Developer account ($99/year)
- ✅ Code sign with Developer ID certificate
- ✅ Notarize the app
- ✅ Users can install without warnings

Until then, use the ZIP distribution method with clear instructions for users.

## Links

- [Apple Developer Program](https://developer.apple.com/programs/)
- [Code Signing Guide](https://developer.apple.com/support/code-signing/)
- [Notarization Guide](https://developer.apple.com/documentation/security/notarizing_macos_software_before_distribution)
- [electron-builder Notarization](https://www.electron.build/configuration/mac#notarization)
