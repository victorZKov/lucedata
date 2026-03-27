# Code Signing Setup Guide for LuceData

Este documento explica cómo configurar la firma de código para eliminar las advertencias de seguridad en Windows y macOS.

## Estado Actual

**Problema**: Las aplicaciones muestran advertencias de seguridad porque no están firmadas:

- **Windows**: "Windows protected your PC" (SmartScreen)
- **macOS**: "LuceData cannot be opened because the developer cannot be verified" (Gatekeeper)

**Causa**: Falta de certificados de firma de código de Microsoft y Apple.

---

## Solución Temporal para Usuarios

### macOS - Permitir app no firmada

**Opción 1: Click derecho + Abrir**

1. En Finder, localiza `LuceData.app` en `/Applications`
2. **Click derecho** sobre la app
3. Selecciona **"Abrir"**
4. Click en **"Abrir"** en el diálogo de confirmación
5. Solo es necesario hacerlo una vez

**Opción 2: Comando de terminal**

```bash
xattr -cr /Applications/LuceData.app
```

**Opción 3: System Settings**

1. Ve a **System Settings** > **Privacy & Security**
2. Busca "LuceData was blocked"
3. Click en **"Open Anyway"**

### Windows - Permitir app no firmada

1. Cuando aparezca "Windows protected your PC"
2. Click en **"More info"**
3. Click en **"Run anyway"**

---

## Solución Permanente: Obtener Certificados

### macOS Code Signing

#### 1. Apple Developer Program ($99/año)

- Inscribirse en: https://developer.apple.com/programs/
- Completar el proceso de verificación (1-2 días)

#### 2. Obtener Certificado Developer ID

**Desde Xcode:**

```bash
# Instalar Xcode desde App Store si no lo tienes
xcode-select --install

# En Xcode:
# Preferences > Accounts > Manage Certificates > + > Developer ID Application
```

**O desde portal web:**

1. https://developer.apple.com/account/resources/certificates/
2. Create Certificate > Developer ID Application
3. Descargar e instalar en Keychain Access

#### 3. Verificar Certificado

```bash
# Listar certificados disponibles
security find-identity -v -p codesigning

# Deberías ver algo como:
# 1) XXXXXXXXXX "Developer ID Application: Your Name (TEAM_ID)"
```

#### 4. Configurar Variables de Entorno

Agregar a tu `~/.zshrc` o `~/.bash_profile`:

```bash
# macOS Code Signing
export CSC_NAME="Developer ID Application: Your Name (TEAM_ID)"
export APPLE_ID="your-apple-id@email.com"
export APPLE_APP_SPECIFIC_PASSWORD="xxxx-xxxx-xxxx-xxxx"  # Generar en appleid.apple.com
export APPLE_TEAM_ID="YOUR_TEAM_ID"
```

#### 5. Actualizar electron-builder.json

El archivo ya tiene la configuración básica:

```json
{
  "mac": {
    "hardenedRuntime": true,
    "entitlements": "assets/entitlements.mac.plist",
    "entitlementsInherit": "assets/entitlements.mac.plist"
  }
}
```

Para habilitar notarización automática, agregar:

```json
{
  "mac": {
    "hardenedRuntime": true,
    "gatekeeperAssess": false,
    "entitlements": "assets/entitlements.mac.plist",
    "entitlementsInherit": "assets/entitlements.mac.plist"
  },
  "afterSign": "scripts/notarize.js"
}
```

#### 6. Crear script de notarización

Crear `scripts/notarize.js`:

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

#### 7. Instalar dependencias de notarización

```bash
pnpm add -D @electron/notarize
```

#### 8. Build con firma

```bash
# Sin variables de entorno CSC_*, electron-builder buscará automáticamente
pnpm --filter @sqlhelper/desktop exec electron-builder --mac --publish never

# O forzar un certificado específico
CSC_NAME="Developer ID Application: Your Name" pnpm --filter @sqlhelper/desktop exec electron-builder --mac
```

---

### Windows Code Signing

#### 1. Obtener Certificado Code Signing

**Opciones recomendadas:**

- **DigiCert** ($399-$599/año): https://www.digicert.com/signing/code-signing-certificates
- **Sectigo (Comodo)** ($199-$299/año): https://sectigo.com/ssl-certificates-tls/code-signing
- **GlobalSign** ($249-$349/año): https://www.globalsign.com/en/code-signing-certificate

**Certificado EV (Extended Validation) - Recomendado:**

- Costo: $300-$600/año
- Ventaja: Reputación instantánea con SmartScreen
- Requiere: USB token físico para la clave privada

#### 2. Instalar Certificado

El certificado vendrá como archivo `.pfx` (PKCS#12):

```bash
# Guardar en un lugar seguro, ej: ~/Certificates/
mv certificado.pfx ~/Certificates/lucedata-codesign.pfx
chmod 600 ~/Certificates/lucedata-codesign.pfx
```

#### 3. Configurar Variables de Entorno

Agregar a tu `~/.zshrc`:

```bash
# Windows Code Signing
export CSC_LINK="$HOME/Certificates/lucedata-codesign.pfx"
export CSC_KEY_PASSWORD="your-certificate-password"
```

**O almacenar de forma segura en CI/CD:**

```bash
# Base64 encode del certificado para CI/CD
cat lucedata-codesign.pfx | base64 > certificate.base64.txt
# Guardar en secrets de GitHub/Azure DevOps
```

#### 4. Actualizar electron-builder.json

```json
{
  "win": {
    "target": ["nsis", "portable"],
    "icon": "assets/icon.ico",
    "signingHashAlgorithms": ["sha256"],
    "rfc3161TimeStampServer": "http://timestamp.digicert.com"
  }
}
```

Si prefieres especificar el certificado directamente:

```json
{
  "win": {
    "certificateFile": "path/to/certificate.pfx",
    "certificatePassword": "password", // Mejor usar CSC_KEY_PASSWORD
    "signingHashAlgorithms": ["sha256"],
    "rfc3161TimeStampServer": "http://timestamp.digicert.com"
  }
}
```

#### 5. Build con firma

```bash
# Con variables de entorno configuradas
pnpm --filter @sqlhelper/desktop exec electron-builder --win --publish never

# Verificar firma después del build
# En Windows:
signtool verify /pa "release/LuceData Setup 0.1.2.exe"

# En Mac/Linux con osslsigncode:
osslsigncode verify "release/LuceData Setup 0.1.2.exe"
```

---

## Verificación de Firmas

### macOS

```bash
# Verificar firma
codesign --verify --deep --strict --verbose=2 /Applications/LuceData.app

# Verificar notarización
spctl --assess --verbose /Applications/LuceData.app

# Ver información del certificado
codesign -dvv /Applications/LuceData.app
```

Resultado exitoso:

```
/Applications/LuceData.app: accepted
source=Notarized Developer ID
```

### Windows

En PowerShell:

```powershell
# Verificar firma digital
Get-AuthenticodeSignature "LuceData Setup 0.1.2.exe" | Format-List

# Debe mostrar:
# Status        : Valid
# SignerCertificate : [Certificate details]
```

---

## Costos Anuales Estimados

| Certificado                     | Costo              | Ventaja                               |
| ------------------------------- | ------------------ | ------------------------------------- |
| Apple Developer                 | $99/año            | Firma + Notarización macOS            |
| Windows Code Signing (Standard) | $200-$400/año      | Firma básica, requiere reputación     |
| Windows EV Code Signing         | $300-$600/año      | Reputación instantánea                |
| **Total (con EV)**              | **~$500-$700/año** | Sin advertencias en ambas plataformas |

---

## Build Automatizado con Firma

Una vez configurados los certificados, el script de deploy puede ser:

```bash
#!/bin/bash
# deploy-signed.sh

set -e

echo "🏗️  Building LuceData with code signing..."

# Verificar que las variables de entorno estén configuradas
if [ -z "$CSC_NAME" ] || [ -z "$APPLE_ID" ]; then
    echo "❌ Missing macOS signing credentials"
    exit 1
fi

if [ -z "$CSC_LINK" ] || [ -z "$CSC_KEY_PASSWORD" ]; then
    echo "❌ Missing Windows signing credentials"
    exit 1
fi

# Build completo
pnpm build --force

# Build macOS (firmado y notarizado)
echo "📦 Building macOS installers..."
pnpm --filter @sqlhelper/desktop exec electron-builder --mac --publish never

# Build Windows (firmado)
echo "📦 Building Windows installers..."
pnpm --filter @sqlhelper/desktop exec electron-builder --win --publish never

echo "✅ Build completed with code signing!"
echo "📤 Ready to upload to Azure Storage"
```

---

## Próximos Pasos

1. **Inmediato (sin certificados)**:
   - Documentar el proceso de "Abrir de todas formas" para usuarios
   - Agregar FAQ en sitio web sobre las advertencias de seguridad

2. **Corto plazo (1-2 semanas)**:
   - Inscribirse en Apple Developer Program
   - Obtener certificado de Windows Code Signing

3. **Configuración (después de obtener certificados)**:
   - Configurar variables de entorno
   - Probar builds con firma en desarrollo
   - Actualizar documentación

4. **Producción**:
   - Implementar builds automáticos con firma en CI/CD
   - Verificar que no aparezcan advertencias en instalaciones nuevas

---

## Recursos Adicionales

- [Electron Code Signing](https://www.electron.build/code-signing)
- [Apple Notarization Guide](https://developer.apple.com/documentation/security/notarizing_macos_software_before_distribution)
- [Windows Code Signing Best Practices](https://docs.microsoft.com/en-us/windows-hardware/drivers/dashboard/code-signing-attestation)
