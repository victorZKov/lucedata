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
  const assetsTarget = path.join(resourcesPath, 'dist', 'renderer', 'assets');
  
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
  
  // Copy workspace packages (@sqlhelper/*) from source
  // The node_modules.packaged has npm dependencies, but not our local packages
  console.log('\n� Copying workspace packages...');
  
  const nodeModulesInApp = path.join(resourcesPath, 'node_modules');
  const packagesDir = path.join(workspaceRoot, 'packages');
  
  const workspacePackages = [
    'ai-core',
    'ai-integration',
    'common',
    'database-core',
    'db-core',
    'guardrails',
    'local-store',
    'security-guardrails',
    'storage',
    'ui-kit'
  ];
  
  try {
    for (const pkgName of workspacePackages) {
      const pkgSource = path.join(packagesDir, pkgName);
      const pkgTarget = path.join(nodeModulesInApp, '@sqlhelper', pkgName);
      
      if (fs.existsSync(pkgSource)) {
        fs.ensureDirSync(path.dirname(pkgTarget));
        
        // Copy the entire package
        await fs.copy(pkgSource, pkgTarget, {
          overwrite: true,
          dereference: true
        });
        
        console.log(`  ✅ @sqlhelper/${pkgName}`);
      }
    }
    console.log('✅ All workspace packages copied');
  } catch (error) {
    console.error('❌ Error copying workspace packages:', error);
    throw error;
  }
};
