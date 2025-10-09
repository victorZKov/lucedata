# Azure Storage Update Deployment Guide

## Overview

LuceData is configured to check for updates from Azure Storage at:

```
https://nedevcolst01.z16.web.core.windows.net
```

## Required Files on Azure Storage

When you build and release a new version, you need to upload these files to your Azure Storage container:

### For macOS:

1. **Installer Files:**
   - `LuceData-{version}-arm64.dmg`
   - `LuceData-{version}-arm64.dmg.zip`
   - `LuceData-{version}-arm64.dmg.blockmap`
   - `LuceData-{version}-x64.dmg` (if building for Intel)
   - `LuceData-{version}-x64.dmg.zip`
   - `LuceData-{version}-x64.dmg.blockmap`

2. **Update Manifest (REQUIRED):**
   - `latest-mac.yml`

### For Windows:

1. **Installer Files:**
   - `LuceData Setup {version}.exe`
   - `LuceData Setup {version}.exe.blockmap`
   - `LuceData-{version}-win.zip` (portable version)

2. **Update Manifest (REQUIRED):**
   - `latest.yml`

### For Linux:

1. **Installer Files:**
   - `LuceData-{version}.AppImage`
   - `LuceData-{version}.deb`

2. **Update Manifest (REQUIRED):**
   - `latest-linux.yml`

## Creating Update Manifests

electron-builder automatically generates these manifest files when you build. They will be in the `release/` directory.

### Example: latest-mac.yml

```yaml
version: 0.1.845
files:
  - url: LuceData-0.1.845-arm64.dmg.zip
    sha512: [hash]
    size: 123456789
  - url: LuceData-0.1.845-x64.dmg.zip
    sha512: [hash]
    size: 123456789
path: LuceData-0.1.845-arm64.dmg.zip
sha512: [hash]
releaseDate: "2025-10-04T00:00:00.000Z"
```

### Example: latest.yml (Windows)

```yaml
version: 0.1.845
files:
  - url: LuceData Setup 0.1.845.exe
    sha512: [hash]
    size: 123456789
path: LuceData Setup 0.1.845.exe
sha512: [hash]
releaseDate: "2025-10-04T00:00:00.000Z"
```

## Deployment Process

### Step 1: Build the App

```bash
# Make sure you're in the project root
cd /Users/victorzaragoza/Documents/Dev/k/agentfactory/SQLHelper

# Build all packages
pnpm build

# Build installers for all platforms
cd apps/desktop
electron-builder --mac --win --linux
```

### Step 2: Files Generated

After building, you'll find these files in `release/`:

```
release/
├── LuceData-0.1.844-arm64.dmg
├── LuceData-0.1.844-arm64.dmg.zip
├── LuceData-0.1.844-arm64.dmg.blockmap
├── LuceData Setup 0.1.844.exe
├── LuceData Setup 0.1.844.exe.blockmap
├── LuceData-0.1.844.AppImage
├── LuceData-0.1.844.deb
├── latest-mac.yml      ⭐ IMPORTANT
├── latest.yml          ⭐ IMPORTANT
└── latest-linux.yml    ⭐ IMPORTANT
```

### Step 3: Upload to Azure Storage

#### Option A: Azure Portal

1. Go to Azure Portal → Your Storage Account (nedevcolst01)
2. Navigate to **Static website** or your container
3. Upload ALL files from `release/` directory
4. Make sure the files are publicly accessible

#### Option B: Azure CLI

```bash
# Login to Azure
az login

# Set variables
STORAGE_ACCOUNT="nedevcolst01"
CONTAINER_NAME="\$web"  # For static websites
RELEASE_DIR="../../release"

# Upload all files
az storage blob upload-batch \
  --account-name $STORAGE_ACCOUNT \
  --destination $CONTAINER_NAME \
  --source $RELEASE_DIR \
  --overwrite \
  --auth-mode login

# Verify uploads
az storage blob list \
  --account-name $STORAGE_ACCOUNT \
  --container-name $CONTAINER_NAME \
  --output table
```

#### Option C: Using azcopy

```bash
# Download azcopy if you don't have it
# https://docs.microsoft.com/en-us/azure/storage/common/storage-use-azcopy-v10

# Upload files
azcopy copy \
  "../../release/*" \
  "https://nedevcolst01.z16.web.core.windows.net/" \
  --recursive
```

### Step 4: Verify Deployment

Test that the files are accessible:

```bash
# Check if latest-mac.yml is accessible
curl https://nedevcolst01.z16.web.core.windows.net/latest-mac.yml

# Check if installer is accessible
curl -I "https://nedevcolst01.z16.web.core.windows.net/SQL Helper-0.1.845-arm64.dmg.zip"
```

Both should return 200 OK status.

## Update File Structure on Azure

Your Azure Storage should look like this:

```
https://nedevcolst01.z16.web.core.windows.net/
├── latest-mac.yml
├── latest.yml
├── latest-linux.yml
├── LuceData-0.1.844-arm64.dmg
├── LuceData-0.1.844-arm64.dmg.zip
├── LuceData-0.1.844-arm64.dmg.blockmap
├── LuceData-0.1.844-x64.dmg
├── LuceData-0.1.844-x64.dmg.zip
├── LuceData-0.1.844-x64.dmg.blockmap
├── LuceData Setup 0.1.844.exe
├── LuceData Setup 0.1.844.exe.blockmap
├── LuceData-0.1.844.AppImage
├── LuceData-0.1.844.deb
├── LuceData-0.1.845-arm64.dmg       (newer version)
├── LuceData-0.1.845-arm64.dmg.zip
├── LuceData-0.1.845-arm64.dmg.blockmap
└── ... (newer versions)
```

## Important Notes

### 1. Always Update the Manifest Files

The `latest-*.yml` files MUST be updated when you release a new version. These files tell electron-updater:

- What version is available
- Where to download it
- File size and checksum

### 2. File Naming Convention

electron-updater expects specific file naming patterns:

- macOS: `{productName}-{version}-{arch}.dmg.zip`
- Windows: `{productName} Setup {version}.exe`
- Linux: `{productName}-{version}.AppImage`

**Important:** The product name "LuceData" is a single word (no spaces), which makes the filenames cleaner.

### 3. CORS Configuration

If users get CORS errors, you need to configure CORS on your Azure Storage:

```bash
az storage cors add \
  --account-name nedevcolst01 \
  --services b \
  --methods GET HEAD \
  --origins "*" \
  --allowed-headers "*" \
  --exposed-headers "*" \
  --max-age 3600
```

Or in Azure Portal:

1. Go to Storage Account → Resource sharing (CORS)
2. Add rule for Blob service:
   - Allowed origins: `*`
   - Allowed methods: `GET, HEAD`
   - Allowed headers: `*`
   - Exposed headers: `*`
   - Max age: 3600

### 4. Public Access

Make sure your container allows public read access:

- Container access level: **Blob (anonymous read access for blobs only)**

## Testing Updates

### 1. Test in Development

```bash
# Start the app
cd /Users/victorzaragoza/Documents/Dev/k/agentfactory/SQLHelper
./dev.sh
```

The app will check for updates on launch. Check the console for:

```
[AutoUpdater] Checking for updates...
[AutoUpdater] Update available: 0.1.845
```

### 2. Test the Update URL Manually

```bash
# Check if electron-updater can fetch the manifest
curl https://nedevcolst01.z16.web.core.windows.net/latest-mac.yml
```

Should return something like:

```yaml
version: 0.1.845
files:
  - url: SQL Helper-0.1.845-arm64.dmg.zip
    sha512: abc123...
    size: 123456789
```

### 3. Test Full Update Flow

1. Install an older version (e.g., 0.1.844)
2. Upload version 0.1.845 to Azure Storage
3. Launch the app
4. You should see the update notification
5. Click "Download Update"
6. Monitor progress
7. Click "Install & Restart"
8. App should update and restart

## Automation Script

Create a deployment script to automate the process:

```bash
#!/bin/bash
# deploy-update.sh

set -e

STORAGE_ACCOUNT="nedevcolst01"
CONTAINER="\$web"
RELEASE_DIR="../../release"

echo "🔨 Building app..."
pnpm build
cd apps/desktop
electron-builder --mac --win --linux

echo "📦 Uploading to Azure Storage..."
cd ../..
az storage blob upload-batch \
  --account-name $STORAGE_ACCOUNT \
  --destination $CONTAINER \
  --source $RELEASE_DIR \
  --overwrite \
  --auth-mode login

echo "✅ Deployment complete!"
echo "🌐 Updates available at: https://nedevcolst01.z16.web.core.windows.net/"

# Test the deployment
echo "🧪 Testing deployment..."
curl -s https://nedevcolst01.z16.web.core.windows.net/latest-mac.yml | head -1
```

Make it executable:

```bash
chmod +x deploy-update.sh
```

## Troubleshooting

### Issue: App doesn't detect updates

**Possible causes:**

1. `latest-mac.yml` (or `latest.yml` for Windows) is missing
2. Version in manifest is not higher than installed version
3. Files are not publicly accessible
4. CORS is blocking the request

**Solution:**

```bash
# Check if manifest is accessible
curl https://nedevcolst01.z16.web.core.windows.net/latest-mac.yml

# Check version in manifest
curl https://nedevcolst01.z16.web.core.windows.net/latest-mac.yml | grep version

# Check app logs for specific error
```

### Issue: Download fails

**Possible causes:**

1. File URL in manifest is incorrect
2. File is not publicly accessible
3. Network/firewall issues

**Solution:**

```bash
# Test direct download
curl -I "https://nedevcolst01.z16.web.core.windows.net/LuceData-0.1.845-arm64.dmg.zip"
# Should return 200 OK
```

### Issue: CORS error in browser/dev tools

**Solution:**
Configure CORS on Azure Storage (see CORS Configuration section above)

## Version Management

### Incrementing Version

Before building a new release:

```bash
# In project root
npm version patch  # 0.1.844 → 0.1.845
# or
npm version minor  # 0.1.844 → 0.2.0
# or
npm version major  # 0.1.844 → 1.0.0
```

This updates `package.json` and creates a git tag.

### Rollback

If you need to rollback to a previous version:

1. Update `latest-mac.yml` to point to the older version
2. Upload the updated manifest to Azure Storage
3. Users will be notified to "update" to the older version

## Security Best Practices

1. **Code Signing:** Always sign your builds (especially macOS)
2. **Checksums:** electron-builder automatically includes SHA512 checksums
3. **HTTPS Only:** Your Azure Storage URL uses HTTPS ✅
4. **Access Control:** Consider using Azure CDN with access policies for production
5. **Version Control:** Keep old versions available in case rollback is needed

## Monitoring

Track update metrics:

1. Use Azure Storage Analytics to see download counts
2. Monitor access logs for `latest-*.yml` (check frequency)
3. Track installer downloads by version
4. Set up alerts for storage account access issues

## Cost Optimization

- **Storage:** Negligible cost for installer files
- **Bandwidth:** Pay per GB downloaded
- **Estimate:** ~100MB installer × 1000 users = 100GB = ~$8-10/month
- **Optimization:** Use Azure CDN for high-traffic scenarios

## References

- [electron-updater Generic Provider](https://www.electron.build/auto-update#generic-provider)
- [Azure Storage Static Website](https://docs.microsoft.com/en-us/azure/storage/blobs/storage-blob-static-website)
- [electron-builder Configuration](https://www.electron.build/configuration/publish)
