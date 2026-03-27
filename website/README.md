# LuceData Website

This directory contains the LuceData product website built with Next.js.

## Running the Website

The website is **separate from the main desktop app workspace** to avoid build conflicts.

### Development Server

**Option 1: Use the dedicated script (Recommended)**

```bash
# From the project root
./runwebsite.sh
```

**Option 2: Run manually**

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

## Installer request flow (email + direct link)

The Downloads form sends an email notification and then reveals the correct installer link based on the selected platform (macOS ARM64, macOS Intel x64, Windows).

1. Configure environment variables (copy `.env.example` to `.env.local`):

```
RESEND_API_KEY=<your_resend_api_key>
EMAIL_FROM=downloads@lucedata.app
DOWNLOAD_REQUESTS_EMAIL=your-team@example.com

NEXT_PUBLIC_DOWNLOAD_URL_MAC_ARM64=<public_url_to_arm64_dmg_or_zip>
NEXT_PUBLIC_DOWNLOAD_URL_MAC_X64=<public_url_to_intel_dmg_or_zip>
NEXT_PUBLIC_DOWNLOAD_URL_WINDOWS=<public_url_to_windows_installer_exe_or_zip>
```

2. Start the site and test the flow at the Downloads section.

Notes:

- If `RESEND_API_KEY` is not set, the API will skip sending the email but will still return the download link (useful for local testing).
- The email is sent to the address set in `DOWNLOAD_REQUESTS_EMAIL`; if not set, the notification email is skipped.

## Deploying to Vercel

- Create a new Vercel project and set the "Root Directory" to `website`.
- Framework preset: Next.js
- Build Command: `npm run build` (or `pnpm build` if using PNPM)
- Output Directory: `.next`
- Set the following Environment Variables in Vercel:
  - `RESEND_API_KEY`
  - `EMAIL_FROM`
  - `DOWNLOAD_REQUESTS_EMAIL` (required for notification emails)
  - `NEXT_PUBLIC_DOWNLOAD_URL_MAC_ARM64`
  - `NEXT_PUBLIC_DOWNLOAD_URL_MAC_X64`
  - `NEXT_PUBLIC_DOWNLOAD_URL_WINDOWS`

After the first deployment, visit `/` and use the Downloads form to verify that:

- An email is received at the configured address
- The correct platform-specific link is shown and downloadable
