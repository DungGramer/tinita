#!/usr/bin/env node
/**
 * Build CSS files for tinita-react
 *
 * Copies CSS files from src/ to dist/ maintaining structure
 * and creates a bundled styles.css with all component styles
 */

import { readFileSync, writeFileSync, readdirSync, statSync, existsSync, mkdirSync, copyFileSync } from 'fs';
import { join, relative, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const packageRoot = join(__dirname, '..');
const srcDir = join(packageRoot, 'src');
const distDir = join(packageRoot, 'dist');

/**
 * Recursively find all CSS files
 */
function findCSSFiles(dir, baseDir = dir) {
  const cssFiles = [];

  if (!existsSync(dir)) {
    return cssFiles;
  }

  const items = readdirSync(dir);

  for (const item of items) {
    const fullPath = join(dir, item);
    const stat = statSync(fullPath);

    if (stat.isDirectory()) {
      cssFiles.push(...findCSSFiles(fullPath, baseDir));
    } else if (item.endsWith('.css')) {
      const relativePath = relative(baseDir, fullPath);
      cssFiles.push({
        srcPath: fullPath,
        relativePath: relativePath.replace(/\\/g, '/'),
      });
    }
  }

  return cssFiles;
}

/**
 * Copy CSS file to dist maintaining structure
 */
function copyCSSFile(srcPath, relativePath) {
  const destPath = join(distDir, relativePath);
  const destDir = dirname(destPath);

  // Create directory if it doesn't exist
  if (!existsSync(destDir)) {
    mkdirSync(destDir, { recursive: true });
  }

  // Copy file
  copyFileSync(srcPath, destPath);
  console.log(`  ✓ Copied ${relativePath}`);
}

/**
 * Create bundled styles.css with all component styles
 */
function createBundledCSS(cssFiles) {
  let bundledCSS = `/**
 * tinita-react - Bundled Styles
 *
 * This file contains all component styles.
 * Import this file to load all styles at once.
 *
 * @example
 * import 'tinita-react/styles.css';
 */

`;

  for (const { srcPath, relativePath } of cssFiles) {
    const content = readFileSync(srcPath, 'utf-8');
    bundledCSS += `/* ${relativePath} */\n`;
    bundledCSS += content;
    bundledCSS += '\n\n';
  }

  const bundledPath = join(distDir, 'styles.css');
  writeFileSync(bundledPath, bundledCSS);
  console.log(`  ✓ Created bundled styles.css`);
}

/**
 * Main execution
 */
function main() {
  console.log('\n📦 Building CSS files...');

  // Find all CSS files
  console.log('   🔍 Scanning for CSS files...');
  const cssFiles = findCSSFiles(srcDir, srcDir);

  if (cssFiles.length === 0) {
    console.log('   ⚠️  No CSS files found\n');
    return;
  }

  console.log(`   ✓ Found ${cssFiles.length} CSS file(s)`);

  // Copy CSS files to dist
  console.log('   📝 Copying CSS files...');
  for (const { srcPath, relativePath } of cssFiles) {
    copyCSSFile(srcPath, relativePath);
  }

  // Create bundled CSS
  console.log('   📝 Creating bundled styles.css...');
  createBundledCSS(cssFiles);

  console.log('   ✅ CSS build complete\n');
}

main();
