# SQLHelper - AI-Assisted SQL Database Desktop App

A cross-platform desktop application for managing SQL databases with AI assistance. Built with Electron, React, and TypeScript.

## Features

- **AI-Powered SQL Generation**: Natural language to SQL conversion with multiple AI provider support
- **Cross-Platform**: Runs on macOS, Windows, and Linux
- **Security First**: Comprehensive guardrails and read-only mode by default
- **Modern UI**: Three-pane layout inspired by Azure Data Studio with light/dark themes
- **SQL Server Support**: First-class Microsoft SQL Server integration with extensible architecture

## Quick Start

```bash
# Install dependencies
pnpm install

# Start development
pnpm dev

# Build for production
pnpm build
```

## Architecture

This is a monorepo structured as follows:

- `apps/desktop` - Electron main process
- `apps/renderer` - React UI application
- `packages/db-core` - Database abstraction and SQL Server provider
- `packages/ai-core` - AI provider integrations and MCP tools
- `packages/guardrails` - SQL execution safety and validation
- `packages/local-store` - SQLite-based local storage
- `packages/ui-kit` - Shared UI components
- `packages/common` - Shared types and utilities

## Development

### Prerequisites

- Node.js 18+
- pnpm 8+
- Git

### Getting Started

1. Clone the repository
2. Install dependencies: `pnpm install`
3. Start development: `pnpm dev`

### Available Scripts

**Desktop Application:**

- `./dev.sh` - Start desktop app development (Electron + Vite renderer)
- `./dev.sh prod` - Build and run desktop app in production mode
- `pnpm build` - Build all packages
- `pnpm test` - Run all tests
- `pnpm lint` - Lint all code
- `pnpm format` - Format code with Prettier

**Product Website:**

- `./runwebsite.sh` - Start the Next.js marketing website (port 3000)
- See `website/README.md` for more details

**Note:** The desktop app and website are completely separate and can run simultaneously.

## Security & Privacy

- **Read-only by default**: AI-generated SQL requires explicit user action to execute
- **Comprehensive guardrails**: Prevents dangerous operations with configurable allowlists
- **Secure credential storage**: Uses OS keychain for database credentials
- **Audit logging**: Tracks all SQL execution with hashed queries
- **No data transmission**: All AI processing respects user privacy settings

## Documentation

See the `/docs` directory for:

- Architecture diagrams
- Security policies
- Extension guides
- API documentation

## License

[License information to be added]

## Contributing

[Contributing guidelines to be added]
