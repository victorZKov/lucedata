# PRD: Windows Deployment for **lucedata.ai — SQLHelper**

**Doc ID:** 0001  
**Date:** 2025-09-30  
**Owner:** LuceData Team  
**Status:** Draft (ready for implementation)

---

## 1) Introduction / Overview

The existing Electron desktop application (internal code **SQLHelper**, brand **lucedata.ai**) runs successfully on macOS. We need a **Windows 11** deployment: a signed installer, clean runtime behavior, and CI/CD via Azure DevOps. No auto-update in v1. The target is **direct download** distribution from our site/CDN (default to Azure Storage Static Website). We’ll use **electron-builder** to package **NSIS (.exe)** installers for **x64 and arm64**.

**Primary goal:** Produce a reproducible pipeline that outputs a Windows installer for **lucedata.ai — SQLHelper**, optionally signed via **Azure Code Signing (ACS)** once ACS is configured; until then, unsigned builds are acceptable for internal testing.

---

## 2) Goals

1. Package Windows builds with **electron-builder** targeting **win32 nsis** for **x64 + arm64**.
2. Create a **deterministic CI pipeline** in **Azure DevOps** on `windows-latest` that:
   - Restores & builds the Electron app.
   - Detects & rebuilds native modules (e.g., `better-sqlite3`) for Windows.
   - Produces artifacts: `lucedata-Setup-x64.exe`, `lucedata-Setup-arm64.exe` (+ logs, symbols).
   - Optionally signs artifacts via **ACS**, with graceful fallback to unsigned if ACS not available.
3. Use per-user configuration at `%APPDATA%\lucedata\config.json` with optional machine-wide overrides in `%PROGRAMDATA%\lucedata\config.json`.
4. Outbound-only networking (HTTPS) with allowlist-friendly documentation of endpoints.
5. Generate a **Windows .ico** app icon from brand instructions (see Appendix) and integrate into the build.
6. Minimal telemetry **opt-in** at first launch: send anonymous usage to **Application Insights** and **Log Analytics**.

---

## 3) User Stories

- **As an internal tester**, I can download and install `lucedata.ai — SQLHelper` on Windows 11 (x64/arm64) and launch it from Start Menu.
- **As a release engineer**, I can trigger an Azure DevOps pipeline that outputs ready-to-distribute `.exe` installers and related artifacts.
- **As a security reviewer**, I can see that the installer is signed (once ACS is set up) and that runtime config is kept per-user (%APPDATA%), with no admin rights needed.
- **As an enterprise admin**, I can allowlist the app’s outbound endpoints and deploy the installer at scale.

---

## 4) Functional Requirements

1. **Packaging**
   1. Use **electron-builder** with `win` target `nsis`, `arch: ["x64","arm64"]`.
   2. App ID: `ie.lucedata.app`; Product Name: `lucedata.ai — SQLHelper`.
   3. Publisher: `Your Company Name` (note: consider shortening to legal name only for signing UI).
   4. Embed Windows icon `.ico` into EXE and shortcut.
2. **Installer (NSIS)**
   1. Per-user install by default; allow per-machine optional.
   2. Create Start Menu shortcut and file associations only if declared.
   3. Uninstaller removes app files but preserves user data in `%APPDATA%\lucedata`.
3. **Configuration**
   1. Default config file: `%APPDATA%\lucedata\config.json` created on first run.
   2. Machine-wide override (if exists): `%PROGRAMDATA%\lucedata\config.json` merged over defaults.
   3. Secrets are **not** bundled; the app reads any secrets from environment or Windows Credential Manager in future iterations (not in scope v1).
4. **Networking**
   1. Outbound HTTPS only. Initial known endpoint(s):
      - `https://sw-g-kov-genai-openai01.openai.azure.com/`
   2. No inbound listeners or firewall rules required.
5. **Telemetry (opt-in)**
   1. On first launch, show an **opt-in** toggle for anonymous telemetry.
   2. If enabled, send basic events to **Application Insights** and operational logs to **Log Analytics** (workspace to be supplied via config).
6. **Code Signing**
   1. Support **Azure Code Signing (ACS)**. If ACS not configured, build remains unsigned but emits clear pipeline warning.
7. **Native Modules**
   1. Auto-detect native modules (e.g., `better-sqlite3`) and rebuild for Win x64/arm64 during CI using `node-gyp` / `@electron/rebuild`.
   2. Ensure ASAR unpack for native binaries if required by module.
8. **CI/CD**
   1. Azure DevOps pipeline uses `windows-latest` agent.
   2. Secrets stored in **Library** variable groups; ACS credentials/tenant kept separately for future activation.
   3. Artifacts published with clear naming: `lucedata-Setup-x64.exe`, `lucedata-Setup-arm64.exe`.
9. **Testing**
   1. Smoke test script runs app `--version` and basic startup on a clean Win11 VM.
   2. Validate installer/uninstaller exit codes and presence of Start Menu shortcut.

---

## 5) Non-Goals (Out of Scope v1)

- Auto-update mechanisms (Squirrel/electron-updater/GitHub Releases/Azure Blob feed).
- Microsoft Store (MSIX) packaging.
- Complex EULA or support portals (installer shows none for now).
- In-depth enterprise management (Intune packaging instructions may be added later).

---

## 6) Design Considerations

- **Branding:** Use a clean, minimal `.ico` derived from the Appendix brief.
- **App Name shown to users:** `lucedata.ai — SQLHelper`.
- **Accessibility:** Default Windows scaling/DPI supported; no custom accessibility work required in v1.

---

## 7) Technical Considerations

- **Electron version / Node ABI:** Pull from `package.json`; pipeline locks Node to the Electron ABI using `@electron/rebuild`.
- **Native toolchain:** Use `windows-build-tools` equivalents or preinstalled MSVC via `vswhere` path on hosted agent.
- **SQLite family:** If `better-sqlite3` is present, ensure correct prebuilds or compile from source; unpack native `.node` files from ASAR as needed.
- **AppConfig merge:** On startup, load defaults, then overlay `%PROGRAMDATA%`, then overlay `%APPDATA%`.

---

## 8) Success Metrics

- ✅ Pipeline completes under 10 minutes producing two installers (x64/arm64).
- ✅ App installs and launches successfully on a clean Win11 VM.
- ✅ (If ACS configured) Windows shows “Verified publisher: Your Company …” with no SmartScreen warnings related to unsigned binaries.
- ✅ Opt-in telemetry events visible in App Insights and LAW when enabled.

---

## 9) Open Questions

- Should Publisher string be shortened to the legal name only for signing dialogs?
- Confirm whether `better-sqlite3` is used (and any other native modules).
- Provide target **Application Insights** and **Log Analytics** resource instrumentation keys/connection strings.

---

# Appendix A — **Instruction Set for AI Build Agent**

Use the following **precise instructions** to generate a Windows deployment for _lucedata.ai — SQLHelper_.

## A. Project Facts

- **Packager:** electron-builder
- **Windows Target:** Windows 11
- **Architectures:** x64 and arm64
- **Installer:** NSIS `.exe`
- **App ID:** `ie.lucedata.app`
- **Product Name:** `lucedata.ai — SQLHelper`
- **Publisher:** `Your Company Name`
- **Distribution:** Direct download (hosted in Azure Storage Static Website by default)
- **Auto-Updates:** None in v1
- **Telemetry:** Opt-in; send to App Insights + Log Analytics
- **Config:** `%APPDATA%\lucedata\config.json` (user) + `%PROGRAMDATA%\lucedata\config.json` (machine override)
- **Networking:** HTTPS outbound; allowlist `sw-g-kov-genai-openai01.openai.azure.com`

## B. Repo Changes

1. **Install electron-builder**
   ```bash
   npm i -D electron-builder @electron/rebuild
   ```
2. **`package.json` additions**

   ```json
   {
     "name": "lucedata",
     "version": "1.0.0",
     "build": {
       "appId": "ie.lucedata.app",
       "productName": "lucedata.ai — SQLHelper",
       "directories": {
         "buildResources": "build"
       },
       "files": ["dist/**", "node_modules/**", "package.json"],
       "asar": true,
       "asarUnpack": ["**/*.node", "**/vendor/**"],
       "win": {
         "target": [
           {
             "target": "nsis",
             "arch": ["x64", "arm64"]
           }
         ],
         "icon": "build/icon.ico",
         "publisherName": ["Your Company Name"]
       },
       "nsis": {
         "oneClick": true,
         "perMachine": false,
         "allowToChangeInstallationDirectory": false,
         "deleteAppDataOnUninstall": false
       }
     },
     "scripts": {
       "rebuild:native": "electron-rebuild -f -w better-sqlite3 || echo no native rebuild needed",
       "dist:win": "npm run rebuild:native && electron-builder --win nsis --x64 --arm64",
       "postinstall": "electron-builder install-app-deps || true"
     }
   }
   ```

   > Note: keep only modules you actually use in `-w`; add others as discovered.

3. **Config paths in app startup**
   - On bootstrap, load defaults then merge `%PROGRAMDATA%\lucedata\config.json` then `%APPDATA%\lucedata\config.json`. Create user file on first run if missing.

4. **Telemetry opt-in**
   - On first launch, show a modal with an **opt-in** checkbox (default unchecked).
   - If enabled, initialize App Insights and LAW clients using values from config.

## C. Azure DevOps Pipeline (`azure-pipelines.yml`)

```yaml
trigger:
  branches:
    include: [main]

pool:
  vmImage: windows-latest

variables:
  Node_Version: "20.x"
  ELECTRON_BUILDER_CACHE: '$(Pipeline.Workspace)\.cache\electron-builder'

steps:
  - task: NodeTool@0
    inputs:
      versionSpec: "$(Node_Version)"
    displayName: "Use Node $(Node_Version)"

  - script: |
      corepack enable
      npm ci
    displayName: "Install dependencies"

  - script: |
      npm run dist:win
    displayName: "Build Windows installers (x64 + arm64)"

  # Optional: Azure Code Signing (ACS) once configured
  # - script: |
  #     echo "Sign with ACS here (not yet configured)"
  #   displayName: 'Code sign with Azure Code Signing'

  - task: PublishBuildArtifacts@1
    inputs:
      PathtoPublish: "dist"
      ArtifactName: "windows"
      publishLocation: "Container"
    displayName: "Publish artifacts"
```

## D. ACS (Azure Code Signing) – Future Activation

- When ACS is ready, add a signing step post-build:
  - Use `signtool` with ACS endpoint, or integrate `electron-builder` `afterSign` hook to call ACS.
  - Store ACS credentials in **Library** variable group; never commit secrets.

## E. Native Modules Strategy

- Detect with `node -e "console.log(Object.keys(require('./package.json').dependencies||{}))"` and grep known natives (`better-sqlite3`, `sharp`, `keytar`, etc.).
- Rebuild using `electron-rebuild`. Ensure `.node` files are ASAR-unpacked.

## F. Icon Generation & Integration

1. **Design brief** (for AI/image tool):
   - **Style:** Minimal, flat.
   - **Primary colors:** LuceData brand blues; neutral dark for contrast.
   - **Motif:** Stylized “L” over a database cylinder (subtle), or interlocking “L•D”.
   - **Edge treatment:** Soft rounded square to read well at 16×16 up to 256×256.
   - **Background:** Transparent PNG at 1024×1024.
2. Export a 1024×1024 PNG, then create `build/icon.ico` (multiple sizes) using ImageMagick or Node:
   ```bash
   magick convert icon_1024.png -define icon:auto-resize=256,128,64,48,32,16 build/icon.ico
   ```

## G. Distribution (Direct Download)

- Default to **Azure Storage Static Website**:
  - Container `$web` → upload `lucedata-Setup-x64.exe` and `lucedata-Setup-arm64.exe`.
  - Provide the public URL(s) on release notes.

## H. Smoke Test Checklist (Win11)

- Install from `.exe`, launch, verify version and menu.
- Confirm `%APPDATA%\lucedata\config.json` created.
- Toggle telemetry and see events in App Insights/LAW (if configured).
- Uninstall; verify user data retained.

---

# Appendix B — Example Config File

`%APPDATA%\lucedata\config.json`:

```json
{
  "telemetry": {
    "enabled": false,
    "appInsightsConnectionString": "<set if enabled>",
    "logAnalyticsWorkspaceId": "<optional>",
    "logAnalyticsSharedKey": "<optional>"
  },
  "services": {
    "azureOpenAIBaseUrl": "https://sw-g-kov-genai-openai01.openai.azure.com/"
  }
}
```

---

# Appendix C — Risks & Mitigations

- **Unsigned binaries (until ACS ready):** Gate external distribution; mark “internal testing”.
- **Native module breakage:** Ensure `electron-rebuild` and ASAR-unpack; pin module versions.
- **Telemetry compliance:** Keep opt-in default OFF; document data collected.
- **Publisher display string:** Use legal name to avoid mismatch with certificate CN.
