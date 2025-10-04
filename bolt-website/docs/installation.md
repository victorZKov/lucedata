# Installation Guide

Welcome to LuceData! This guide will help you install the application on your macOS or Windows computer.

## System Requirements

### macOS
- **Operating System**: macOS 11.0 (Big Sur) or later
- **Architecture**: Intel (x64) or Apple Silicon (ARM64)
- **RAM**: 4 GB minimum, 8 GB recommended
- **Disk Space**: 500 MB free space
- **Internet**: Required for initial download and AI features

### Windows
- **Operating System**: Windows 10 (version 1809 or later) or Windows 11
- **Architecture**: 64-bit (x64)
- **RAM**: 4 GB minimum, 8 GB recommended
- **Disk Space**: 500 MB free space
- **Internet**: Required for initial download and AI features

### Linux
- **Status**: Coming soon
- Linux support is planned for a future release

## Before You Begin

### 1. Register for Beta Access
If you haven't already:
1. Visit [https://lucedata.com](https://lucedata.com)
2. Click **"Register for Beta Access"**
3. Fill out the registration form with:
   - Your name
   - Email address
   - Intended use case
4. Check your email for the download link

### 2. Prepare Your AI API Key (BYOM)
LuceData requires you to **Bring Your Own Model** during the beta period. You'll need an API key from at least one of these providers:
- **OpenAI** ([platform.openai.com](https://platform.openai.com))
- **Azure OpenAI** (via Azure Portal)
- **Anthropic Claude** ([console.anthropic.com](https://console.anthropic.com))
- **Google Gemini** ([ai.google.dev](https://ai.google.dev))
- **Ollama** (free, runs locally - [ollama.ai](https://ollama.ai))

## Installation Instructions

### macOS Installation

#### Step 1: Download
1. Open the email from LuceData containing your download link
2. Click the **macOS Download** link
3. The `.dmg` file will download to your Downloads folder

#### Step 2: Verify Download (Optional but Recommended)
1. Open Terminal
2. Navigate to your Downloads folder:
   ```bash
   cd ~/Downloads
   ```
3. Verify the checksum (provided in the email):
   ```bash
   shasum -a 256 "LuceData-*.dmg"
   ```
4. Compare the output with the checksum in your email

#### Step 3: Install
1. **Double-click** the downloaded `.dmg` file
2. A new window will open showing the LuceData app icon
3. **Drag and drop** the LuceData icon into the Applications folder
4. Wait for the copy to complete
5. **Eject** the LuceData disk image from Finder

#### Step 4: First Launch
1. Open **Applications** folder
2. **Right-click** (or Control+click) on **LuceData**
3. Select **"Open"** from the context menu
4. Click **"Open"** in the security dialog

> **Note**: This extra step is required because LuceData is downloaded from the internet. After the first launch, you can open it normally.

#### Step 5: Grant Permissions
macOS may ask for permissions:
- **Network Access**: Required to connect to databases and AI services
- Click **"Allow"** when prompted

### Windows Installation

#### Step 1: Download
1. Open the email from LuceData containing your download link
2. Click the **Windows Download** link
3. The `.msi` installer will download to your Downloads folder

#### Step 2: Verify Download (Optional but Recommended)
1. Open PowerShell
2. Navigate to your Downloads folder:
   ```powershell
   cd $env:USERPROFILE\Downloads
   ```
3. Verify the checksum (provided in the email):
   ```powershell
   Get-FileHash "LuceData-*.msi" -Algorithm SHA256
   ```
4. Compare the output with the checksum in your email

#### Step 3: Install
1. **Double-click** the downloaded `.msi` file
2. If Windows SmartScreen appears:
   - Click **"More info"**
   - Click **"Run anyway"**
3. The LuceData Setup Wizard will open
4. Click **"Next"**
5. Accept the license agreement and click **"Next"**
6. Choose installation location (default is recommended) and click **"Next"**
7. Click **"Install"**
8. Wait for installation to complete
9. Click **"Finish"**

#### Step 4: First Launch
1. LuceData will launch automatically after installation (or find it in the Start Menu)
2. Windows Firewall may ask for network access:
   - Check both **"Private networks"** and **"Public networks"**
   - Click **"Allow access"**

## Post-Installation Setup

### 1. Configure Your First AI Engine
On first launch, you'll be guided through AI setup:
1. Select your preferred AI provider
2. Enter your API key
3. (Optional) Test the connection
4. Click **"Save"**

See the [**Add a New AI Engine**](./add-ai-engine.md) guide for detailed instructions.

### 2. Add Your First Database Connection
1. Click the **"+"** button in the Connections panel
2. Select your database type (SQL Server, PostgreSQL, or SQLite)
3. Enter connection details
4. Test and save the connection

See the [**Add a New Connection**](./add-connection.md) guide for detailed instructions.

## Updating LuceData

### Automatic Updates
LuceData checks for updates automatically:
1. When an update is available, you'll see a notification
2. Click **"Download and Install"**
3. The app will restart with the new version

### Manual Updates
You can also check for updates manually:
1. Open LuceData
2. Go to **Settings** (gear icon)
3. Click **"Check for Updates"**

## Uninstalling LuceData

### macOS
1. Open **Applications** folder
2. **Drag** LuceData to the **Trash**
3. Empty the Trash
4. (Optional) Remove application data:
   ```bash
   rm -rf ~/Library/Application\ Support/LuceData
   rm -rf ~/Library/Preferences/com.lucedata.com.plist
   ```

### Windows
1. Open **Settings** → **Apps** → **Installed apps**
2. Find **LuceData**
3. Click the **three dots** (⋯) and select **"Uninstall"**
4. Follow the uninstall wizard
5. (Optional) Remove application data:
   - Navigate to: `%APPDATA%\LuceData`
   - Delete the folder

## Troubleshooting

### macOS: "App can't be opened because Apple cannot check it"
**Solution**: Right-click the app and select "Open" instead of double-clicking.

### macOS: App crashes on startup
**Solution**: Check Console.app for crash logs or contact support at support@lucedata.com

### Windows: "Windows protected your PC" message
**Solution**: Click "More info" → "Run anyway"

### Windows: Installation fails with error
**Solution**: 
- Ensure you're running as Administrator
- Check that you have enough disk space
- Try downloading the installer again

### Can't connect to databases
**Solution**:
- Check your network/firewall settings
- Verify database credentials
- See the [Add a New Connection](./add-connection.md) guide

### AI features not working
**Solution**:
- Verify your API key is correct
- Check your internet connection
- Ensure you have credits/quota with your AI provider
- See the [Add a New AI Engine](./add-ai-engine.md) guide

## Getting Help

If you encounter issues:
- **Email**: support@lucedata.com
- **Documentation**: [https://lucedata.com/docs](https://lucedata.com/docs)
- **Known Issues**: Check our changelog for known issues and workarounds

## Next Steps

Now that LuceData is installed:
1. ✅ [**Add a New AI Engine**](./add-ai-engine.md) - Configure your AI provider
2. ✅ [**Add a New Connection**](./add-connection.md) - Connect to your first database
3. ✅ [**Using the Connections Tree**](./connections-tree.md) - Navigate your databases
4. ✅ [**Using the Work Area**](./work-area.md) - Write and execute queries

---

Welcome to LuceData! We're excited to have you in our beta program. 🚀
