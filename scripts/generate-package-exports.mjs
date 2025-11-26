#!/usr/bin/env node
/**
 * Generate exports for a package based on its source files
 * Usage: node scripts/generate-package-exports.mjs <package-dir>
 * Example: node scripts/generate-package-exports.mjs packages/tinita
 */

import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from 'fs';
import { join, relative } from 'path';

/**
 * Recursively get all source files in a directory
 */
function getAllSourceFiles(dir, baseDir = dir, extensions = ['.ts', '.tsx']) {
  const files = [];

  if (!existsSync(dir)) {
    return files;
  }

  const items = readdirSync(dir);

  for (const item of items) {
    const fullPath = join(dir, item);
    const stat = statSync(fullPath);

    if (stat.isDirectory()) {
      files.push(...getAllSourceFiles(fullPath, baseDir, extensions));
    } else {
      const isSourceFile = extensions.some(ext => item.endsWith(ext));
      const isNotTest = !item.includes('.test.') && !item.includes('.spec.');
      const isNotIndex = item !== 'index.ts' && item !== 'index.tsx';

      if (isSourceFile && isNotTest && isNotIndex) {
        const relativePath = relative(baseDir, fullPath);
        files.push(relativePath.replace(/\\/g, '/'));
      }
    }
  }

  return files;
}

/**
 * Generate package.json exports field
 */
function generateExports(files) {
  const exports = {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.mjs",
      "require": "./dist/index.cjs"
    }
  };

  for (const file of files) {
    const withoutExt = file.replace(/\.(ts|tsx)$/, '');
    const exportPath = `./${withoutExt}`;

    exports[exportPath] = {
      "types": `./dist/${withoutExt}.d.ts`,
      "import": `./dist/${withoutExt}.mjs`,
      "require": `./dist/${withoutExt}.cjs`
    };
  }

  return exports;
}

/**
 * Generate tsup.config.ts entry array
 */
function generateTsupEntry(files) {
  return ['src/index.ts', ...files.map(f => `src/${f}`)];
}

/**
 * Generate src/index.ts barrel exports
 */
function generateBarrelExports(files) {
  const groups = {};

  // Group files by directory
  for (const file of files) {
    const parts = file.split('/');
    const dir = parts.length > 1 ? parts[0] : 'root';
    if (!groups[dir]) groups[dir] = [];
    groups[dir].push(file);
  }

  let content = '';

  // Generate exports grouped by category
  for (const [dir, fileList] of Object.entries(groups).sort()) {
    if (dir !== 'root') {
      const label = dir.charAt(0).toUpperCase() + dir.slice(1);
      content += `// ${label} utilities\n`;
    }

    for (const file of fileList.sort()) {
      const withoutExt = file.replace(/\.(ts|tsx)$/, '');
      content += `export * from './${withoutExt}';\n`;
    }

    content += '\n';
  }

  return content.trim() + '\n';
}

/**
 * Update package.json with new exports
 */
function updatePackageJson(packagePath, exports) {
  if (!existsSync(packagePath)) {
    console.error(`❌ package.json not found at: ${packagePath}`);
    process.exit(1);
  }

  const pkg = JSON.parse(readFileSync(packagePath, 'utf-8'));
  pkg.exports = exports;
  writeFileSync(packagePath, JSON.stringify(pkg, null, 2) + '\n');
}

/**
 * Update tsup.config.ts with new entry points
 */
function updateTsupConfig(configPath, entries) {
  const content = `import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ${JSON.stringify(entries, null, 4).replace(/"/g, "'")},
  format: ['cjs', 'esm'],
  dts: true,
  bundle: false,
  splitting: false,
  clean: true,
  outDir: 'dist'
});
`;
  writeFileSync(configPath, content);
}

/**
 * Main execution
 */
function main() {
  // Auto-detect package directory
  // If running from package dir (via turbo), use current dir
  // If running from root, use provided argument
  let packageDir;

  if (existsSync('package.json') && existsSync('src')) {
    // Running from package directory
    packageDir = process.cwd();
  } else {
    // Running from root, use argument
    packageDir = process.argv[2];

    if (!packageDir) {
      console.error('❌ Usage: node scripts/generate-package-exports.mjs <package-dir>');
      console.error('   Example: node scripts/generate-package-exports.mjs packages/tinita');
      process.exit(1);
    }

    if (!existsSync(packageDir)) {
      console.error(`❌ Package directory not found: ${packageDir}`);
      process.exit(1);
    }
  }

  const packageJsonPath = join(packageDir, 'package.json');
  if (!existsSync(packageJsonPath)) {
    console.error(`❌ package.json not found in: ${packageDir}`);
    process.exit(1);
  }

  const pkg = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
  const packageName = pkg.name || packageDir.split(/[/\\]/).pop();
  const srcDir = join(packageDir, 'src');

  console.log(`\n📦 Generating exports for: ${packageName}`);

  // Detect file extensions based on package name
  const extensions = packageName.includes('react') || packageName.includes('vue')
    ? ['.ts', '.tsx']
    : ['.ts'];

  // Scan source files
  console.log(`   🔍 Scanning ${srcDir}...`);
  const files = getAllSourceFiles(srcDir, srcDir, extensions);

  if (files.length === 0) {
    console.log(`   ⚠️  No source files found, creating minimal exports...`);

    // Still update with just the index export
    const minimalExports = {
      ".": {
        "types": "./dist/index.d.ts",
        "import": "./dist/index.mjs",
        "require": "./dist/index.cjs"
      }
    };

    updatePackageJson(join(packageDir, 'package.json'), minimalExports);

    const minimalEntry = ['src/index.ts'];
    updateTsupConfig(join(packageDir, 'tsup.config.ts'), minimalEntry);

    console.log(`   ✅ Done (minimal exports)\n`);
    return;
  }

  console.log(`   ✓ Found ${files.length} file(s)`);

  // Generate configurations
  const exports = generateExports(files);
  const tsupEntries = generateTsupEntry(files);
  const barrelExports = generateBarrelExports(files);

  // Update files
  console.log('   📝 Updating package.json exports...');
  updatePackageJson(join(packageDir, 'package.json'), exports);

  console.log('   📝 Updating tsup.config.ts entries...');
  updateTsupConfig(join(packageDir, 'tsup.config.ts'), tsupEntries);

  console.log('   📝 Updating src/index.ts barrel...');
  writeFileSync(join(srcDir, 'index.ts'), barrelExports);

  console.log(`   ✅ Generated ${files.length} export(s)\n`);
}

main();
