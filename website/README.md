# LuceData Website

This directory contains the LuceData product website built with Next.js.

## Running the Website

The website is **separate from the main desktop app workspace** to avoid build conflicts.

### Development Server

```bash
# From the project root
cd website && pnpm install && pnpm dev

# Or directly from the website folder
pnpm install
pnpm dev
```

The website will be available at `http://localhost:3000` (or another port if 3000 is busy).

### Building for Production

```bash
pnpm build
pnpm start
```

## Important Notes

- The website is **commented out** in `pnpm-workspace.yaml` to prevent it from being built when running `./dev.sh`
- This keeps the desktop app development separate from the website
- The website has its own dependencies and build process

## Features

- ✅ LuceData branding
- ✅ Beta registration form
- ✅ Legal pages (Privacy, Terms, License)
- ✅ Documentation pages
- ✅ BYOM messaging
- ✅ Responsive design with dark/light mode
