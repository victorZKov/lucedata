#!/bin/bash

# Azure Storage Update Deployment Script
# Builds and deploys LuceData updates to Azure Storage

set -e

# Configuration
STORAGE_ACCOUNT="nedevcolst01"
CONTAINER="\$web"
RELEASE_DIR="release"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Functions
log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Check if Azure CLI is installed
if ! command -v az &> /dev/null; then
    log_error "Azure CLI is not installed. Please install it first:"
    echo "  brew install azure-cli"
    exit 1
fi

# Check if logged in to Azure
if ! az account show &> /dev/null; then
    log_warning "Not logged in to Azure. Logging in..."
    az login
fi

# Get current version
CURRENT_VERSION=$(node -p "require('./package.json').version")
log_info "Current version: $CURRENT_VERSION"

# Check if git is clean
if ! git diff-index --quiet HEAD -- 2>/dev/null; then
    log_warning "Git working directory is not clean."
    echo "Uncommitted changes:"
    git status --short
    echo ""
    read -p "Do you want to commit changes before versioning? (y/N) " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        git add -A
        read -p "Commit message: " COMMIT_MSG
        git commit -m "$COMMIT_MSG"
        log_success "Changes committed"
    else
        log_warning "Proceeding without committing. Version bump will be skipped."
        NEW_VERSION=$CURRENT_VERSION
    fi
fi

# Ask if user wants to increment version
if [ "$NEW_VERSION" != "$CURRENT_VERSION" ] || git diff-index --quiet HEAD -- 2>/dev/null; then
    echo ""
    read -p "Do you want to increment the version? (y/N) " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "Select version bump type:"
        echo "  1) Patch (0.1.844 → 0.1.845)"
        echo "  2) Minor (0.1.844 → 0.2.0)"
        echo "  3) Major (0.1.844 → 1.0.0)"
        read -p "Choice (1-3): " -n 1 -r VERSION_TYPE
        echo ""
        
        case $VERSION_TYPE in
            1)
                npm version patch
                ;;
            2)
                npm version minor
                ;;
            3)
                npm version major
                ;;
            *)
                log_warning "Invalid choice. Keeping current version."
                ;;
        esac
        
        NEW_VERSION=$(node -p "require('./package.json').version")
        log_success "Version updated to: $NEW_VERSION"
    else
        NEW_VERSION=$CURRENT_VERSION
        log_info "Keeping current version: $NEW_VERSION"
    fi
else
    NEW_VERSION=$CURRENT_VERSION
    log_info "Keeping current version due to uncommitted changes: $NEW_VERSION"
fi

# Clean previous build
log_info "Cleaning previous build..."
rm -rf $RELEASE_DIR
log_success "Clean complete"

# Build the app
log_info "Building application..."
echo ""
pnpm build

# Build installers
log_info "Building installers for all platforms..."
echo ""
cd apps/desktop

# Choose platforms to build
echo "Select platforms to build:"
echo "  1) macOS only"
echo "  2) Windows only"
echo "  3) Linux only"
echo "  4) macOS + Windows"
echo "  5) All platforms"
read -p "Choice (1-5): " -n 1 -r PLATFORM_CHOICE
echo ""

case $PLATFORM_CHOICE in
    1)
        pnpm exec electron-builder --mac
        ;;
    2)
        pnpm exec electron-builder --win
        ;;
    3)
        pnpm exec electron-builder --linux
        ;;
    4)
        pnpm exec electron-builder --mac --win
        ;;
    5)
        pnpm exec electron-builder --mac --win --linux
        ;;
    *)
        log_error "Invalid choice"
        exit 1
        ;;
esac

cd ../..

log_success "Build complete"

# List generated files
log_info "Generated files:"
echo ""
ls -lh $RELEASE_DIR/
echo ""

# Check for required manifest files
MANIFEST_FOUND=false
if [ -f "$RELEASE_DIR/latest-mac.yml" ]; then
    log_success "Found latest-mac.yml"
    MANIFEST_FOUND=true
fi
if [ -f "$RELEASE_DIR/latest.yml" ]; then
    log_success "Found latest.yml (Windows)"
    MANIFEST_FOUND=true
fi
if [ -f "$RELEASE_DIR/latest-linux.yml" ]; then
    log_success "Found latest-linux.yml"
    MANIFEST_FOUND=true
fi

if [ "$MANIFEST_FOUND" = false ]; then
    log_error "No manifest files found! Update won't work."
    exit 1
fi

# Show manifest content
echo ""
log_info "Manifest files content:"
echo ""
echo "=== latest-mac.yml ==="
[ -f "$RELEASE_DIR/latest-mac.yml" ] && cat "$RELEASE_DIR/latest-mac.yml"
echo ""
echo "=== latest.yml (Windows) ==="
[ -f "$RELEASE_DIR/latest.yml" ] && cat "$RELEASE_DIR/latest.yml"
echo ""
echo "=== latest-linux.yml ==="
[ -f "$RELEASE_DIR/latest-linux.yml" ] && cat "$RELEASE_DIR/latest-linux.yml"
echo ""

# Confirm upload
read -p "Upload to Azure Storage? (y/N) " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    log_warning "Upload cancelled"
    exit 0
fi

# Upload to Azure Storage
log_info "Uploading to Azure Storage..."
echo ""

az storage blob upload-batch \
  --account-name $STORAGE_ACCOUNT \
  --destination $CONTAINER \
  --source $RELEASE_DIR \
  --overwrite \
  --auth-mode login \
  --output table

log_success "Upload complete!"

# Verify deployment
echo ""
log_info "Verifying deployment..."
echo ""

BASE_URL="https://nedevcolst01.z16.web.core.windows.net"

# Check latest-mac.yml
if curl -f -s "$BASE_URL/latest-mac.yml" > /dev/null; then
    log_success "latest-mac.yml is accessible"
    REMOTE_VERSION=$(curl -s "$BASE_URL/latest-mac.yml" | grep "^version:" | awk '{print $2}')
    log_info "Remote version (macOS): $REMOTE_VERSION"
else
    log_error "latest-mac.yml is NOT accessible"
fi

# Check latest.yml (Windows)
if curl -f -s "$BASE_URL/latest.yml" > /dev/null; then
    log_success "latest.yml (Windows) is accessible"
    REMOTE_VERSION_WIN=$(curl -s "$BASE_URL/latest.yml" | grep "^version:" | awk '{print $2}')
    log_info "Remote version (Windows): $REMOTE_VERSION_WIN"
else
    log_error "latest.yml (Windows) is NOT accessible"
fi

# Check latest-linux.yml
if curl -f -s "$BASE_URL/latest-linux.yml" > /dev/null; then
    log_success "latest-linux.yml is accessible"
    REMOTE_VERSION_LINUX=$(curl -s "$BASE_URL/latest-linux.yml" | grep "^version:" | awk '{print $2}')
    log_info "Remote version (Linux): $REMOTE_VERSION_LINUX"
else
    log_error "latest-linux.yml is NOT accessible"
fi

echo ""
log_success "Deployment complete! 🎉"
echo ""
log_info "Update URL: $BASE_URL"
log_info "Version deployed: $NEW_VERSION"
echo ""
log_info "Users will receive update notifications on next app launch."
echo ""

# Ask if user wants to commit and push the version bump
if [ "$NEW_VERSION" != "$CURRENT_VERSION" ]; then
    echo ""
    read -p "Commit and push version bump to git? (y/N) " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        git add package.json
        git commit -m "chore: bump version to $NEW_VERSION"
        git tag "v$NEW_VERSION"
        git push
        git push --tags
        log_success "Version bump committed and pushed"
    fi
fi

log_success "All done! ✨"
