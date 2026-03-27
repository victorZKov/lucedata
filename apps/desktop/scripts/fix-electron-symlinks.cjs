/**
 * Fix macOS framework symlinks that get broken by pnpm's content-addressable store.
 * electron-builder install-app-deps extracts the Electron zip without preserving
 * the framework bundle symlinks (Current, binary, Resources, Libraries).
 */
const fs = require("fs");
const path = require("path");

if (process.platform !== "darwin") {
  process.exit(0);
}

const electronPath = path.dirname(require.resolve("electron"));
const fwDir = path.join(
  electronPath,
  "dist",
  "Electron.app",
  "Contents",
  "Frameworks"
);

if (!fs.existsSync(fwDir)) {
  process.exit(0);
}

const entries = fs.readdirSync(fwDir);
for (const entry of entries) {
  if (!entry.endsWith(".framework")) continue;

  const fwPath = path.join(fwDir, entry);
  const name = entry.replace(".framework", "");
  const versionsA = path.join(fwPath, "Versions", "A");

  if (!fs.existsSync(versionsA)) continue;

  // Versions/Current -> A
  const currentLink = path.join(fwPath, "Versions", "Current");
  if (!fs.existsSync(currentLink)) {
    fs.symlinkSync("A", currentLink);
  }

  // Framework binary
  const binaryLink = path.join(fwPath, name);
  if (!fs.existsSync(binaryLink)) {
    fs.symlinkSync(path.join("Versions", "Current", name), binaryLink);
  }

  // Resources
  if (
    fs.existsSync(path.join(versionsA, "Resources")) &&
    !fs.existsSync(path.join(fwPath, "Resources"))
  ) {
    fs.symlinkSync("Versions/Current/Resources", path.join(fwPath, "Resources"));
  }

  // Libraries
  if (
    fs.existsSync(path.join(versionsA, "Libraries")) &&
    !fs.existsSync(path.join(fwPath, "Libraries"))
  ) {
    fs.symlinkSync("Versions/Current/Libraries", path.join(fwPath, "Libraries"));
  }
}
