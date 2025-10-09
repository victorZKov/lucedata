#!/bin/bash
# Setup script for macOS code signing and notarization
# Save this as setup-codesigning.sh and run: source setup-codesigning.sh

echo "🔐 Configurando credenciales para Code Signing y Notarización de macOS"
echo ""

# Apple ID
export APPLE_ID="victorxata@gmail.com"
echo "✅ APPLE_ID configurado: $APPLE_ID"

# Team ID
export APPLE_TEAM_ID="M67Z86T2VX"
echo "✅ APPLE_TEAM_ID configurado: $APPLE_TEAM_ID"

# App-Specific Password (necesitas crearla en https://appleid.apple.com)
echo ""
echo "⚠️  Necesitas configurar APPLE_APP_SPECIFIC_PASSWORD"
echo "   1. Ve a: https://appleid.apple.com/account/manage"
echo "   2. En 'Sign-In and Security', busca 'App-Specific Passwords'"
echo "   3. Crea una nueva con el nombre: 'LuceData Notarization'"
echo "   4. Copia la contraseña generada (formato: xxxx-xxxx-xxxx-xxxx)"
echo ""
echo "Luego ejecuta:"
echo "export APPLE_APP_SPECIFIC_PASSWORD='tu-contraseña-aqui'"
echo ""

# Certificate identity (ya lo tenemos instalado)
export CSC_NAME="Developer ID Application: KOVIMATIC LIMITED (M67Z86T2VX)"
echo "✅ CSC_NAME configurado: $CSC_NAME"

echo ""
echo "🎯 Para verificar que todo está configurado correctamente, ejecuta:"
echo "   security find-identity -v -p codesigning"
echo ""
echo "📝 Para guardar estas variables permanentemente, agrégalas a tu ~/.zshrc"
