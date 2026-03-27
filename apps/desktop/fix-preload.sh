#!/bin/bash

# Script to automatically fix the preload.cjs file
PRELOAD_FILE="dist/apps/desktop/src/preload.cjs"
WORKING_FILE="temp/preload.js"

echo "Fixing preload.cjs..."

if [ -f "$WORKING_FILE" ]; then
    cp "$WORKING_FILE" "$PRELOAD_FILE"
    echo "✅ Preload file fixed!"
    
    # Verify the fix
    if grep -q "createSqlTab" "$PRELOAD_FILE"; then
        echo "✅ createSqlTab method found in preload"
    else
        echo "❌ createSqlTab method still missing"
    fi
else
    echo "❌ Working preload file not found at $WORKING_FILE"
fi