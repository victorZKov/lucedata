// afterPack hook for electron-builder
// Copies renderer assets after packaging but before installer creation

const fs = require('fs-extra');
const path = require('path');

module.exports = async function(context) {
  const { appOutDir, electronPlatformName } = context;
  
  console.log('\n🔧 Running afterPack hook...');
  console.log(`Platform: ${electronPlatformName}`);
  console.log(`Output dir: ${appOutDir}`);
  
  // Determine the resources path based on platform
  let resourcesPath;
  if (electronPlatformName === 'darwin') {
    resourcesPath = path.join(appOutDir, 'LuceData.app', 'Contents', 'Resources', 'app');
  } else if (electronPlatformName === 'win32') {
    resourcesPath = path.join(appOutDir, 'resources', 'app');
  } else {
    resourcesPath = path.join(appOutDir, 'resources', 'app');
  }
  
  // Get workspace root (go up from apps/desktop/scripts to workspace root)
  const workspaceRoot = path.resolve(__dirname, '../../..');
  const assetsSource = path.join(workspaceRoot, 'apps', 'renderer', 'dist', 'assets');
  const assetsTarget = path.join(resourcesPath, 'dist', 'apps', 'renderer', 'dist', 'assets');
  
  console.log(`Source: ${assetsSource}`);
  console.log(`Target: ${assetsTarget}`);
  
  // Check if source exists
  if (!fs.existsSync(assetsSource)) {
    console.warn('⚠️  Assets source directory not found!');
    return;
  }
  
  // Create target directory if it doesn't exist
  fs.ensureDirSync(path.dirname(assetsTarget));
  
  // Copy assets
  try {
    await fs.copy(assetsSource, assetsTarget, { overwrite: true });
    console.log('✅ Assets copied successfully!');
    
    // Verify
    const files = fs.readdirSync(assetsTarget);
    console.log(`📦 Assets in target: ${files.join(', ')}`);
  } catch (error) {
    console.error('❌ Error copying assets:', error);
    throw error;
  }
  
  // Fix for Windows: Copy electron-store and dependencies from pnpm to actual node_modules
  // This is needed because pnpm uses symlinks which don't work in Windows installers
  if (electronPlatformName === 'win32') {
    console.log('\n🔧 Fixing Windows pnpm symlinks...');
    
    const nodeModulesInApp = path.join(resourcesPath, 'node_modules');
    const pnpmStore = path.join(workspaceRoot, 'node_modules', '.pnpm');
    
    // List of packages to copy with their versions
    // These need to be copied because pnpm uses symlinks which don't work in Windows installers
    const packagesToFix = [
      // electron-store and its direct dependencies
      { name: 'electron-store', version: '10.1.0' },
      { name: 'conf', version: '14.0.0' },
      { name: 'type-fest', version: '4.41.0' },
      
      // conf dependencies
      { name: 'ajv', version: '8.17.1', pnpmPath: 'ajv@8.17.1' },
      { name: 'ajv-formats', version: '3.0.1', pnpmPath: 'ajv-formats@3.0.1_ajv@8.17.1' },
      { name: 'atomically', version: '2.0.3' },
      { name: 'debounce-fn', version: '6.0.0' },
      { name: 'dot-prop', version: '9.0.0' },
      { name: 'env-paths', version: '3.0.0' },
      { name: 'json-schema-typed', version: '8.0.1' },
      { name: 'semver', version: '7.7.2' },
      { name: 'uint8array-extras', version: '1.5.0' }
    ];
    
    try {
      for (const pkg of packagesToFix) {
        const pnpmPath = pkg.pnpmPath || `${pkg.name}@${pkg.version}`;
        const pkgSource = path.join(pnpmStore, pnpmPath, 'node_modules', pkg.name);
        const pkgTarget = path.join(nodeModulesInApp, pkg.name);
        
        if (fs.existsSync(pkgSource)) {
          // Remove symlink if exists
          if (fs.existsSync(pkgTarget)) {
            fs.removeSync(pkgTarget);
          }
          
          // Copy actual files
          await fs.copy(pkgSource, pkgTarget, { 
            overwrite: true,
            dereference: true // Follow symlinks and copy actual files
          });
          
          console.log(`✅ ${pkg.name} copied`);
        } else {
          console.log(`⚠️  ${pkg.name}@${pkg.version} not found, skipping...`);
        }
      }
      
      console.log('✅ All critical packages fixed for Windows');
    } catch (error) {
      console.error('❌ Error fixing packages:', error);
      // Don't throw - let build continue
    }
  }
};
