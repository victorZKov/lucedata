#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Read version from version.json
const versionPath = join(__dirname, '..', 'version.json');
const version = JSON.parse(readFileSync(versionPath, 'utf8'));

// Update build number on each build
version.build += 1;
version.version = `${version.major}.${version.minor}.${version.build}`;

// Write back to version.json
writeFileSync(versionPath, JSON.stringify(version, null, 2));

// Update VersionDialog.tsx with actual version info
const versionDialogPath = join(__dirname, '..', 'apps', 'renderer', 'src', 'components', 'VersionDialog.tsx');
let versionDialogContent = readFileSync(versionDialogPath, 'utf8');

// Current timestamp for build date
const buildDate = new Date().toISOString().split('T')[0];

// Replace the VERSION_INFO constant
const versionInfoReplacement = `const VERSION_INFO = {
  major: ${version.major},
  minor: ${version.minor},
  build: ${version.build},
  version: "${version.version}",
  buildDate: "${buildDate}",
};`;

versionDialogContent = versionDialogContent.replace(
  /const VERSION_INFO = \{[^}]+\};/s,
  versionInfoReplacement
);

writeFileSync(versionDialogPath, versionDialogContent);

console.log(`✅ Version updated to ${version.version} (build ${version.build})`);
console.log(`📅 Build date: ${buildDate}`);