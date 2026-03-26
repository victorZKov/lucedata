#!/bin/bash
# Setup script for macOS code signing and notarization
# Save this as setup-codesigning.sh and run: source setup-codesigning.sh
#
# Before running, set the following environment variables (or create a .env.local file):
#   APPLE_ID            – Your Apple Developer account email
#   APPLE_TEAM_ID       – Your Apple Developer Team ID
#   CSC_NAME            – Certificate identity (e.g. "Developer ID Application: Your Name (TEAM_ID)")
#   APPLE_APP_SPECIFIC_PASSWORD – App-specific password for notarization

echo "🔐 Setting up macOS Code Signing and Notarization credentials"
echo ""

# Apple ID
if [ -z "$APPLE_ID" ]; then
  echo "⚠️  APPLE_ID is not set. Please export it before running this script."
  echo "   export APPLE_ID=\"your-apple-id@example.com\""
else
  echo "✅ APPLE_ID is set: $APPLE_ID"
fi

# Team ID
if [ -z "$APPLE_TEAM_ID" ]; then
  echo "⚠️  APPLE_TEAM_ID is not set. Please export it before running this script."
  echo "   export APPLE_TEAM_ID=\"YOUR_TEAM_ID\""
else
  echo "✅ APPLE_TEAM_ID is set: $APPLE_TEAM_ID"
fi

# App-Specific Password
if [ -z "$APPLE_APP_SPECIFIC_PASSWORD" ]; then
  echo ""
  echo "⚠️  APPLE_APP_SPECIFIC_PASSWORD is not set."
  echo "   1. Go to: https://appleid.apple.com/account/manage"
  echo "   2. Under 'Sign-In and Security', find 'App-Specific Passwords'"
  echo "   3. Create a new one named 'LuceData Notarization'"
  echo "   4. Copy the generated password (format: xxxx-xxxx-xxxx-xxxx)"
  echo ""
  echo "   Then run:"
  echo "   export APPLE_APP_SPECIFIC_PASSWORD='your-password-here'"
else
  echo "✅ APPLE_APP_SPECIFIC_PASSWORD is set"
fi

# Certificate identity
if [ -z "$CSC_NAME" ]; then
  echo "⚠️  CSC_NAME is not set. Please export it before running this script."
  echo "   export CSC_NAME=\"Developer ID Application: Your Name (TEAM_ID)\""
else
  echo "✅ CSC_NAME is set: $CSC_NAME"
fi

echo ""
echo "🎯 To verify your code signing setup, run:"
echo "   security find-identity -v -p codesigning"
echo ""
echo "📝 To persist these variables, add them to your ~/.zshrc or ~/.bashrc"
