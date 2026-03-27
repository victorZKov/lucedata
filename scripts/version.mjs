#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const versionPath = join(process.cwd(), 'version.json');

function getVersion() {
  const version = JSON.parse(readFileSync(versionPath, 'utf8'));
  return version;
}

function updateVersion(type = 'build') {
  const version = getVersion();
  
  switch (type) {
    case 'major':
      version.major += 1;
      version.minor = 0;
      version.build = 0;
      break;
    case 'minor':
      version.minor += 1;
      version.build = 0;
      break;
    case 'build':
    default:
      version.build += 1;
      break;
  }
  
  version.version = `${version.major}.${version.minor}.${version.build}`;
  
  writeFileSync(versionPath, JSON.stringify(version, null, 2));
  console.log(`Version updated to ${version.version}`);
  return version;
}

function getCurrentVersion() {
  const version = getVersion();
  console.log(`Current version: ${version.version}`);
  return version;
}

// CLI handling
const command = process.argv[2];
const type = process.argv[3];

switch (command) {
  case 'update':
    updateVersion(type);
    break;
  case 'get':
    getCurrentVersion();
    break;
  default:
    console.log('Usage: node version.mjs [update|get] [major|minor|build]');
    console.log('  update: Increment version');
    console.log('  get: Show current version');
    break;
}