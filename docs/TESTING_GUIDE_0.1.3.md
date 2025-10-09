# Guía de Pruebas - LuceData v0.1.3

## Cambios Implementados

### ✅ Código Firmado y Notarizado (macOS)

- **Certificado**: Developer ID Application: KOVIMATIC LIMITED (M67Z86T2VX)
- **Notarización**: Completada con Apple
- **Resultado**: Sin advertencias de seguridad en macOS

### ✅ Módulos Nativos Reconstruidos

- **better-sqlite3**: Compilado para cada arquitectura (ARM64, x64)
- **keytar**: Compilado para cada arquitectura
- **Resultado**: Funciona correctamente en macOS Intel y Apple Silicon

### ✅ Dependencias pnpm Copiadas (Windows)

**Problema anterior**: pnpm usa symlinks que no funcionan en instaladores Windows
**Solución**: Hook afterPack copia 12 paquetes críticos como archivos reales:

- electron-store
- conf
- type-fest
- ajv, ajv-formats
- atomically
- debounce-fn
- dot-prop
- env-paths
- json-schema-typed
- semver
- uint8array-extras

**Resultado esperado**: `electron-store` funciona correctamente en Windows

---

## Archivos en Azure Storage

**URL base**: https://nedevcolst01.z16.web.core.windows.net

### macOS

- ✅ `LuceData-0.1.3-mac.zip` (195 MB) - x64 (Intel) - Firmado y notarizado
- ✅ `LuceData-0.1.3-arm64-mac.zip` (192 MB) - ARM64 (Apple Silicon) - Firmado y notarizado
- ✅ `LuceData-0.1.3.dmg` (192 MB) - x64 (Intel)
- ✅ `LuceData-0.1.3-arm64.dmg` (189 MB) - ARM64 (Apple Silicon)
- ✅ `latest-mac.yml` - Manifiesto de actualizaciones

### Windows

- ✅ `LuceData Setup 0.1.3.exe` (154 MB) - Instalador NSIS con dependencias copiadas
- ✅ `latest.yml` - Manifiesto de actualizaciones

---

## Plan de Pruebas

### 1. macOS Intel (x64) ⚠️ CRÍTICO

**Archivo**: `LuceData-0.1.3.dmg` o `LuceData-0.1.3-mac.zip`

**Qué probar**:

1. ✅ **Instalación sin advertencias de seguridad**
   - Verificar que no aparece "no confiable" o "desarrollador no identificado"
2. ✅ **Inicio de la aplicación**
   - Verificar que arranca correctamente
3. ✅ **Error anterior resuelto**:
   ```
   Error: dlopen(...better_sqlite3.node, 0x0001):
   (mach-o file, but is an incompatible architecture
   (have 'arm64', need 'x86_64h' or 'x86_64'))
   ```
   **Esperado**: Este error NO debe aparecer
4. ✅ **Funcionalidad de base de datos**
   - Conectar a base de datos SQL
   - Ejecutar consultas
   - Verificar que SQLite funciona (storage local)

### 2. macOS Apple Silicon (ARM64)

**Archivo**: `LuceData-0.1.3-arm64.dmg` o `LuceData-0.1.3-arm64-mac.zip`

**Qué probar**:

1. ✅ Instalación sin advertencias
2. ✅ Inicio normal
3. ✅ Funcionalidad de base de datos
4. ✅ Rendimiento óptimo (nativo ARM64)

### 3. Windows ⚠️ MUY CRÍTICO

**Archivo**: `LuceData Setup 0.1.3.exe`

**Qué probar**:

1. ⚠️ **Windows Defender advertirá** "Publisher Unknown" (esperado - no hay firma)
   - Hacer clic en "Más información" → "Ejecutar de todos modos"
2. ✅ **Error anterior resuelto**:
   ```
   Error [ERR_MODULE_NOT_FOUND]:
   Cannot find package 'electron-store' imported from
   C:\apps\LuceData\resources\app\dist\apps\desktop\src\main.js
   ```
   **Esperado**: Este error NO debe aparecer
3. ✅ **Inicio de la aplicación**
   - Debe iniciar correctamente después de la instalación
4. ✅ **electron-store funciona**
   - La aplicación debe guardar preferencias locales
   - Verificar en: `%APPDATA%\LuceData\config.json`
5. ✅ **Funcionalidad de base de datos**
   - Conectar a SQL Server / PostgreSQL / MySQL
   - Ejecutar consultas
   - Verificar que SQLite funciona (storage local)
6. ✅ **better-sqlite3 funciona**
   - No debe haber errores de arquitectura
   - SQLite debe funcionar correctamente

### 4. Auto-actualización

Si tienes una instalación anterior (0.1.2), probar:

1. ✅ La aplicación detecta la actualización disponible
2. ✅ Descarga e instala automáticamente
3. ✅ Reinicia mostrando la nueva versión

---

## Logs de Diagnóstico

### macOS

**Ubicación**:

- `/var/folders/.../sqlhelper-startup-*.log`
- Console.app → búsqueda: "LuceData"

### Windows

**Ubicación**:

- `%TEMP%\sqlhelper-startup-*.log`
- Event Viewer → Application Logs

---

## Checklist de Validación

### macOS Intel (x64)

- [ ] Instalación sin advertencias de seguridad
- [ ] Aplicación inicia correctamente
- [ ] No hay error de arquitectura (better_sqlite3.node)
- [ ] SQLite funciona
- [ ] Conexiones a bases de datos SQL funcionan
- [ ] electron-store guarda preferencias

### macOS ARM64

- [ ] Instalación sin advertencias de seguridad
- [ ] Aplicación inicia correctamente
- [ ] Rendimiento óptimo (nativo)
- [ ] SQLite funciona
- [ ] Conexiones a bases de datos SQL funcionan
- [ ] electron-store guarda preferencias

### Windows

- [ ] Instalación completa (con advertencia esperada)
- [ ] Aplicación inicia correctamente
- [ ] No hay error de electron-store not found
- [ ] SQLite funciona (better-sqlite3)
- [ ] Conexiones a bases de datos SQL funcionan
- [ ] electron-store guarda preferencias en %APPDATA%
- [ ] keytar funciona para almacenamiento seguro

---

## Problemas Conocidos

### Windows

⚠️ **Windows Defender bloqueará la instalación** porque el ejecutable no está firmado digitalmente.

- **Solución temporal**: "Más información" → "Ejecutar de todos modos"
- **Solución permanente**: Obtener certificado de firma de código Windows ($200-600/año)

### macOS

✅ **Sin problemas conocidos** - Completamente firmado y notarizado

---

## Siguientes Pasos

### Si las pruebas son exitosas:

1. ✅ Confirmar que todas las funcionalidades trabajan
2. 📋 Documentar cualquier comportamiento inesperado
3. 🚀 Considerar versión 0.1.3 como estable

### Si se encuentra un error:

1. 📋 Documentar el error exacto con logs
2. 🔍 Verificar ubicación del error (macOS vs Windows, Intel vs ARM)
3. 🛠️ Identificar si es un problema de:
   - Módulo nativo (better-sqlite3, keytar)
   - Dependencia (electron-store, conf, etc.)
   - Arquitectura específica
   - Sistema operativo específico

### Certificado de firma Windows (opcional):

Si deseas eliminar la advertencia de Windows Defender:

1. Comprar certificado Code Signing ($200-600/año)
2. Proveedores recomendados:
   - DigiCert
   - Sectigo
   - GlobalSign
3. Configurar signtool.exe en macOS (vía osslsigncode o similar)
4. Actualizar electron-builder.json con configuración de firma

---

## Contacto y Soporte

Si encuentras algún problema durante las pruebas, documenta:

- ✅ Sistema operativo y versión
- ✅ Arquitectura (Intel/ARM64)
- ✅ Mensaje de error exacto
- ✅ Logs de la aplicación
- ✅ Pasos para reproducir el error

**Fecha de build**: 2025-10-05
**Versión**: 0.1.3
**Build number**: 973
