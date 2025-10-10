# Add a New AI Engine

LuceData's AI Assistant requires you to **Bring Your Own Model (BYOM)** during the beta period. This guide will help you configure AI engines to power natural language to SQL generation.

## Supported AI Providers

LuceData supports multiple AI providers:

| Provider             | Type                              | Cost        | Local/Cloud |
| -------------------- | --------------------------------- | ----------- | ----------- |
| **OpenAI**           | GPT-5, GPT-4+                     | Pay-per-use | Cloud       |
| **Azure OpenAI**     | GPT-5, GPT-4+                     | Pay-per-use | Cloud       |
| **Anthropic Claude** | Claude 3 (Opus, Sonnet, Haiku)    | Pay-per-use | Cloud       |
| **Google Gemini**    | Gemini Pro, Ultra                 | Pay-per-use | Cloud       |
| **Ollama**           | Llama 3, Mistral, CodeLlama, etc. | **Free**    | Local       |

> 💡 **Tip**: For the best SQL generation quality, we recommend **GPT-5** or **Claude 4.5 Sonnet**. For a free option, try **Ollama** with Llama 3 or CodeLlama.

## Before You Begin

### Obtain an API Key

Choose your provider and get an API key:

#### OpenAI

1. Visit [platform.openai.com](https://platform.openai.com)
2. Sign up or log in
3. Go to **API Keys** in your account settings
4. Click **"Create new secret key"**
5. Copy the key (starts with `sk-...`)
6. Add credits to your account if needed

#### Azure OpenAI

1. Log in to [Azure Portal](https://portal.azure.com)
2. Create an **Azure OpenAI** resource (if you don't have one)
3. Go to **Keys and Endpoint**
4. Copy the **Key** and **Endpoint URL**
5. Note your **Deployment Name**

#### Anthropic Claude

1. Visit [console.anthropic.com](https://console.anthropic.com)
2. Sign up or log in
3. Go to **API Keys**
4. Click **"Create Key"**
5. Copy the key (starts with `sk-ant-...`)

#### Google Gemini

1. Visit [ai.google.dev](https://ai.google.dev)
2. Sign up or log in
3. Click **"Get API Key"**
4. Create a new project or select existing
5. Copy the API key

#### Ollama (Local, Free)

1. Visit [ollama.ai](https://ollama.ai)
2. Download and install Ollama for your OS
3. Open Terminal/Command Prompt
4. Pull a model:
   ```bash
   ollama pull llama3
   # or
   ollama pull codellama
   # or
   ollama pull mistral
   ```
5. Start Ollama (it runs locally on `http://localhost:11434`)

## Adding an AI Engine

### Method 1: During First Launch

When you first open LuceData, you'll be prompted to configure an AI engine:

1. **Select Provider**: Choose from the dropdown (OpenAI, Azure OpenAI, Claude, Gemini, Ollama)
2. **Enter Details**: Fill in the required fields (see provider-specific instructions below)
3. **Test Connection**: Click **"Test"** to verify the configuration
4. **Save**: Click **"Save"** to complete setup

### Method 2: From Settings

To add additional AI engines or modify existing ones:

1. Click the **Settings** icon (⚙️) in the bottom-left corner
2. Select **"AI Engines"** from the left menu
3. Click **"+ Add New Engine"**
4. Follow the configuration steps below

## Configuration by Provider

### OpenAI Configuration

**Fields:**

- **Engine Name**: Give it a descriptive name (e.g., "OpenAI GPT-4")
- **API Key**: Your OpenAI API key (starts with `sk-...`)
- **Model**: Select from dropdown:
  - `gpt-4` (recommended for quality)
  - `gpt-4-turbo`
  - `gpt-3.5-turbo` (faster, cheaper)
- **Organization ID** (optional): If you belong to multiple organizations
- **Temperature**: 0.0 - 1.0 (default: 0.7)
  - Lower = more deterministic
  - Higher = more creative

**Example:**

```
Name: OpenAI GPT-4
API Key: sk-proj-xxxxxxxxxxxxxxxxxxxxx
Model: gpt-4-turbo
Temperature: 0.7
```

### Azure OpenAI Configuration

**Fields:**

- **Engine Name**: Descriptive name (e.g., "Azure GPT-4")
- **Endpoint**: Your Azure OpenAI endpoint URL
  - Example: `https://your-resource.openai.azure.com/`
- **API Key**: Your Azure OpenAI key
- **Deployment Name**: The name of your deployed model
- **API Version**: Usually `2023-05-15` or `2024-02-15-preview`
- **Temperature**: 0.0 - 1.0 (default: 0.7)

**Example:**

```
Name: Azure GPT-4
Endpoint: https://my-openai.openai.azure.com/
API Key: abc123def456...
Deployment Name: gpt-4-deployment
API Version: 2024-02-15-preview
Temperature: 0.7
```

### Anthropic Claude Configuration

**Fields:**

- **Engine Name**: Descriptive name (e.g., "Claude 3 Opus")
- **API Key**: Your Anthropic API key (starts with `sk-ant-...`)
- **Model**: Select from dropdown:
  - `claude-3-opus-20240229` (most capable)
  - `claude-3-sonnet-20240229` (balanced)
  - `claude-3-haiku-20240307` (fastest, cheapest)
- **Max Tokens**: Maximum response length (default: 4096)
- **Temperature**: 0.0 - 1.0 (default: 0.7)

**Example:**

```
Name: Claude 3 Opus
API Key: sk-ant-xxxxxxxxxxxxxxxxxxxxx
Model: claude-3-opus-20240229
Max Tokens: 4096
Temperature: 0.7
```

### Google Gemini Configuration

**Fields:**

- **Engine Name**: Descriptive name (e.g., "Gemini Pro")
- **API Key**: Your Google AI API key
- **Model**: Select from dropdown:
  - `gemini-pro` (text and reasoning)
  - `gemini-ultra` (most capable, limited access)
- **Temperature**: 0.0 - 1.0 (default: 0.7)

**Example:**

```
Name: Gemini Pro
API Key: AIzaSyxxxxxxxxxxxxxxxxxxxxx
Model: gemini-pro
Temperature: 0.7
```

### Ollama Configuration (Local)

**Fields:**

- **Engine Name**: Descriptive name (e.g., "Ollama Llama 3")
- **Base URL**: Usually `http://localhost:11434`
- **Model**: The model you've pulled:
  - `llama3` (recommended for SQL)
  - `codellama` (code-focused)
  - `mistral`
  - `phi3`
- **Temperature**: 0.0 - 1.0 (default: 0.7)

**Example:**

```
Name: Ollama Llama 3
Base URL: http://localhost:11434
Model: llama3
Temperature: 0.7
```

> 💡 **Tip**: Make sure Ollama is running before testing the connection.

## Testing Your Configuration

After entering your details:

1. Click the **"Test Connection"** button
2. LuceData will send a test request to the AI provider
3. You'll see one of these results:
   - ✅ **Success**: Configuration is correct
   - ❌ **Error**: Review the error message and adjust your settings

**Common errors:**

- **Invalid API Key**: Double-check your key is copied correctly
- **Network Error**: Check your internet connection (for cloud providers)
- **Model Not Found**: Verify the model name is correct
- **Rate Limit**: You may have exceeded your provider's rate limits
- **Insufficient Credits**: Add credits to your provider account

## Managing Multiple AI Engines

You can configure multiple AI engines and switch between them:

### Adding Multiple Engines

1. Go to **Settings** → **AI Engines**
2. Click **"+ Add New Engine"** for each provider you want to use
3. Configure each engine with its own name and credentials

### Switching Between Engines

1. In the **AI Assistant** panel, look for the engine selector dropdown (top-right)
2. Click the dropdown to see all configured engines
3. Select the engine you want to use
4. The selected engine will be used for all subsequent AI queries

**Example Use Cases:**

- Use **GPT-4** for complex queries requiring high accuracy
- Use **GPT-3.5** for quick, simple queries to save costs
- Use **Ollama** for offline work or privacy-sensitive queries
- Use **Claude** for queries requiring large context windows

## Setting a Default Engine

1. Go to **Settings** → **AI Engines**
2. Find your preferred engine in the list
3. Click the **"Set as Default"** button
4. This engine will be selected automatically when you start LuceData

## Editing an Existing Engine

1. Go to **Settings** → **AI Engines**
2. Find the engine you want to edit
3. Click the **Edit** icon (pencil)
4. Modify the settings
5. Click **"Test Connection"** to verify
6. Click **"Save"**

## Deleting an Engine

1. Go to **Settings** → **AI Engines**
2. Find the engine you want to remove
3. Click the **Delete** icon (trash can)
4. Confirm the deletion

> ⚠️ **Warning**: You cannot delete the last remaining AI engine. At least one engine must be configured.

## Best Practices

### Security

- ✅ **Never share your API keys** with others
- ✅ Keep your API keys secure and rotate them periodically
- ✅ Use environment-specific keys (dev vs. production)
- ✅ Monitor your API usage and costs regularly

### Performance

- 💡 Use **GPT-4** or **Claude Opus** for complex database schemas
- 💡 Use **GPT-3.5** or **Claude Haiku** for simple queries to reduce latency and cost
- 💡 Use **Ollama** for local, offline work

### Cost Management

- 💰 Start with less expensive models (GPT-3.5, Claude Haiku)
- 💰 Set up billing alerts with your AI provider
- 💰 Use Ollama (free) for development and testing
- 💰 Monitor your token usage in your provider's dashboard

## Troubleshooting

### "Invalid API Key" Error

- Verify you copied the entire key without extra spaces
- Check that the key hasn't been revoked or expired
- Ensure you're using the correct key format for the provider

### "Model Not Available" Error

- Verify the model name is spelled correctly
- Check that you have access to the model (some require waitlist approval)
- For Azure, ensure your deployment name matches exactly

### Connection Timeout

- Check your internet connection
- For Ollama, ensure the Ollama service is running
- Try increasing the timeout in Settings → Advanced

### High Costs

- Switch to a cheaper model (GPT-3.5, Claude Haiku)
- Use Ollama for routine queries
- Review your usage patterns in the provider's dashboard

## Next Steps

Now that you've configured your AI engine:

1. ✅ [**Add a New Connection**](./add-connection.md) - Connect to a database
2. ✅ [**Using the AI Assistant**](./ai-assistant.md) - Learn how to use natural language queries
3. ✅ [**Using the Work Area**](./work-area.md) - Write and execute SQL queries

## Future: Commercial AI Model

In the commercial version of LuceData, we'll provide:

- 🎯 **Custom database-specialized AI model**
- 🔄 **Updated weekly** with the latest SQL best practices
- 🚀 **Optimized for database operations** (DDL, DML, complex queries)
- 💡 **Pre-trained on common database patterns**

BYOM will remain available as an option for users who prefer their own models.

---

Need help? Contact us at support@lucedata.com
