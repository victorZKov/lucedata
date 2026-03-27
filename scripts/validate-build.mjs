#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(__dirname, '..');
const desktopPkgPath = path.join(rootDir, 'apps/desktop/package.json');
const builderConfigPath = path.join(rootDir, 'apps/desktop/electron-builder.json');

console.log('🔍 Validating build configuration for LuceData...\n');

let hasErrors = false;

// Check desktop package.json exists
if (!fs.existsSync(desktopPkgPath)) {
  console.error('❌ apps/desktop/package.json not found');
  process.exit(1);
}

const pkg = JSON.parse(fs.readFileSync(desktopPkgPath, 'utf-8'));

// Check electron-updater is in dependencies (not devDependencies)
if (!pkg.dependencies || !pkg.dependencies['electron-updater']) {
  console.error('❌ electron-updater not found in dependencies');
  console.error('   Add it with: cd apps/desktop && pnpm add electron-updater');
  hasErrors = true;
} else {
  console.log('✅ electron-updater in dependencies:', pkg.dependencies['electron-updater']);
}

// Check for ES module configuration
if (pkg.type === 'module') {
  console.log('✅ Package type is "module" (ES modules enabled)');
} else {
  console.warn('⚠️  Warning: Package type is not set to "module"');
}

// Check electron-builder config exists
if (!fs.existsSync(builderConfigPath)) {
  console.error('❌ apps/desktop/electron-builder.json not found');
  process.exit(1);
}
console.log('✅ electron-builder.json exists');

// Validate electron-builder configuration
const builderConfig = JSON.parse(fs.readFileSync(builderConfigPath, 'utf-8'));

// Check asar setting
if (builderConfig.asar === false) {
  console.log('✅ asar is disabled (good for debugging)');
} else {
  console.log('ℹ️  asar is enabled or not set');
}

// Check files configuration
if (!builderConfig.files) {
  console.error('❌ No files configuration in electron-builder.json');
  hasErrors = true;
} else {
  console.log('✅ Files configuration present');
}

// Check if dist is included
const hasDistFiles = builderConfig.files.some(f => 
  typeof f === 'string' && f.includes('dist')
);
if (!hasDistFiles) {
  console.error('❌ dist/** not included in files configuration');
  hasErrors = true;
} else {
  console.log('✅ dist/** included in files');
}

// Check if node_modules is included (accepts node_modules.packaged mapping)
const hasNodeModules = builderConfig.files.some(f => {
  if (typeof f === 'string') {
    return f.includes('node_modules');
  }
  if (typeof f === 'object' && f.from && f.to) {
    return f.from.includes('node_modules') && f.to === 'node_modules';
  }
  return false;
});
if (!hasNodeModules) {
  console.error('❌ node_modules not included in files configuration');
  console.error('   This will cause "module not found" errors in packaged app!');
  hasErrors = true;
} else {
  console.log('✅ node_modules included in files (via node_modules.packaged)');
}

// Check TypeScript build output exists
const mainJsPath = path.join(rootDir, 'apps/desktop', pkg.main);
if (!fs.existsSync(mainJsPath)) {
  console.warn(`⚠️  Warning: Main file not found: ${pkg.main}`);
  console.warn('   Run: pnpm --filter @sqlhelper/desktop build');
} else {
  console.log('✅ Main file exists:', pkg.main);
}

// Check renderer build exists
const rendererDistPath = path.join(rootDir, 'apps/renderer/dist');
if (!fs.existsSync(rendererDistPath)) {
  console.warn('⚠️  Warning: Renderer dist not found');
  console.warn('   Run: pnpm --filter @sqlhelper/renderer build');
} else {
  console.log('✅ Renderer build exists');
}

console.log('');

if (hasErrors) {
  console.error('❌ Build configuration has errors. Please fix them before building.\n');
  process.exit(1);
} else {
  console.log('✅ Build configuration validated successfully!\n');
  process.exit(0);
}
