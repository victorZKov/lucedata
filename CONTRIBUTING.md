# Contributing to LuceData

Thank you for your interest in contributing to LuceData! This document provides guidelines for contributing to the project.

## Getting Started

1. **Fork the repository** and clone your fork locally.
2. **Install dependencies:**
   ```bash
   pnpm install
   ```
3. **Start the development server:**
   ```bash
   pnpm dev
   ```

## Development Workflow

1. Create a new branch from `main` for your feature or bug fix.
2. Make your changes with clear, descriptive commit messages following the [Conventional Commits](https://www.conventionalcommits.org/) specification (enforced by commitlint).
3. Run linting and formatting before committing:
   ```bash
   pnpm lint
   pnpm format
   ```
4. Run type checking:
   ```bash
   pnpm type-check
   ```
5. Open a Pull Request against `main`.

## Commit Message Format

This project uses [Conventional Commits](https://www.conventionalcommits.org/). Each commit message must follow this pattern:

```
<type>(<scope>): <description>
```

Allowed types: `build`, `chore`, `ci`, `docs`, `feat`, `fix`, `perf`, `refactor`, `revert`, `style`, `test`

Examples:
- `feat(ui): add dark mode toggle`
- `fix(database): handle connection timeout`
- `docs: update installation guide`

## Project Structure

This is a monorepo managed with pnpm workspaces and Turbo:

- `apps/desktop` — Electron main process
- `apps/renderer` — React UI (Vite)
- `packages/database-core` — Database abstraction layer
- `packages/ai-integration` — AI provider integrations
- `packages/security-guardrails` — SQL safety & validation
- `packages/storage` — Local storage (SQLite + Drizzle)
- `website` — Next.js product website

## Code Style

- **TypeScript** for all code
- **Prettier** for formatting (run `pnpm format`)
- **ESLint** for linting (run `pnpm lint`)
- Follow existing patterns in the codebase

## Reporting Issues

- Use GitHub Issues to report bugs or request features.
- Include steps to reproduce for bug reports.
- Check existing issues before opening a new one.

## License

By contributing, you agree that your contributions will be licensed under the [MIT License](LICENSE).
