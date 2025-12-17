#!/usr/bin/env node
/* eslint-env node */
/**
 * Build CSS files for tinita-react using PostCSS CLI
 *
 * This script orchestrates CSS building using PostCSS CLI:
 * 1. Compiles Tailwind CSS from index.css
 * 2. Copies globals.css and animations.css (raw files)
 * 3. Copies and minifies component CSS files
 * 4. Creates bundled styles.css
 */

import { execSync } from 'child_process';
import { readFileSync, writeFileSync, readdirSync, statSync, existsSync, mkdirSync, copyFileSync, unlinkSync, watch } from 'fs';
import { join, relative, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const packageRoot = join(__dirname, '..');
const srcDir = join(packageRoot, 'src');
const distDir = join(packageRoot, 'dist');
const tailwindInputFile = join(srcDir, 'styles', 'build-entry.css');
const tailwindOutputFile = join(distDir, 'styles.css');
const globalsSrcFile = join(srcDir, 'styles', 'globals.css');
const globalsDistFile = join(distDir, 'styles', 'globals.css');
const animationsSrcFile = join(srcDir, 'styles', 'animations.css');
const animationsDistFile = join(distDir, 'styles', 'animations.css');
const tailwindConfigFile = join(packageRoot, 'tailwind.config.cjs');

/**
 * Recursively find all CSS files in src/ui
 */
function findComponentCSSFiles(dir, baseDir = dir) {
  const cssFiles = [];

  if (!existsSync(dir)) {
    return cssFiles;
  }

  const items = readdirSync(dir);

  for (const item of items) {
    const fullPath = join(dir, item);
    const stat = statSync(fullPath);

    if (stat.isDirectory()) {
      cssFiles.push(...findComponentCSSFiles(fullPath, baseDir));
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

  // Use PostCSS CLI to minify
  try {
    execSync(
      `npx postcss "${srcPath}" -o "${destPath}" --no-map`,
      { cwd: packageRoot, stdio: 'inherit' }
    );
    console.log(`  ✓ Processed ${relativePath}`);
  } catch (error) {
    console.error(`   ⚠️  Failed to process ${relativePath}, copying unminified:`, error.message);
    copyFileSync(srcPath, destPath);
    console.log(`  ✓ Copied ${relativePath} (unminified)`);
  }
}

/**
 * Compile Tailwind CSS using PostCSS CLI
 */
function compileTailwindCSS() {
  if (!existsSync(tailwindInputFile)) {
    console.log('   ⚠️  Tailwind input file not found, skipping Tailwind compilation');
    return null;
  }

  if (!existsSync(tailwindConfigFile)) {
    console.error('   ❌ tailwind.config.cjs not found. Make sure it exists.');
    throw new Error('tailwind.config.cjs not found');
  }

  console.log('   ⚙️  Compiling Tailwind CSS from index.css...');

  // Ensure dist directory exists
  if (!existsSync(distDir)) {
    mkdirSync(distDir, { recursive: true });
  }

  try {
    // Use PostCSS CLI to compile Tailwind (it will auto-detect tailwind.config.cjs)
    execSync(
      `npx postcss "${tailwindInputFile}" -o "${tailwindOutputFile}" --no-map`,
      { cwd: packageRoot, stdio: 'inherit' }
    );
    console.log('   ✓ Compiled Tailwind CSS to dist/styles.css');

    return readFileSync(tailwindOutputFile, 'utf-8');
  } catch (error) {
    console.error('   ❌ Failed to compile Tailwind CSS:', error.message);
    throw error;
  }
}

/**
 * Copy globals.css to dist (raw file for users to import)
 */
function copyGlobalsCSS() {
  if (!existsSync(globalsSrcFile)) {
    console.error('   ❌ src/styles/globals.css not found.');
    throw new Error('src/styles/globals.css not found');
  }

  const destDir = dirname(globalsDistFile);
  if (!existsSync(destDir)) {
    mkdirSync(destDir, { recursive: true });
  }

  // Copy as-is (raw file, no minification - users will process it with their Tailwind)
  copyFileSync(globalsSrcFile, globalsDistFile);
  console.log('   ✓ Copied globals.css to dist/styles/globals.css');
}

/**
 * Copy animations.css to dist (raw file for users to import)
 */
function copyAnimationsCSS() {
  if (!existsSync(animationsSrcFile)) {
    console.error('   ❌ src/styles/animations.css not found.');
    throw new Error('src/styles/animations.css not found');
  }

  const destDir = dirname(animationsDistFile);
  if (!existsSync(destDir)) {
    mkdirSync(destDir, { recursive: true });
  }

  // Copy as-is (raw file with all Apple iOS animation standards)
  copyFileSync(animationsSrcFile, animationsDistFile);
  console.log('   ✓ Copied animations.css to dist/styles/animations.css');
}

/**
 * Create bundled styles.css with theme CSS + component styles (NO Tailwind utilities)
 */
function createBundledCSS(componentCSSFiles, themeCSS) {
  let bundledCSS = '';

  // Include theme CSS (globals + animations, no Tailwind utilities)
  if (themeCSS) {
    bundledCSS += themeCSS;
    bundledCSS += '\n';
  }

  // Include component CSS files
  for (const { srcPath } of componentCSSFiles) {
    const content = readFileSync(srcPath, 'utf-8');
    bundledCSS += content;
    bundledCSS += '\n';
  }

  // Minify bundled CSS using PostCSS CLI
  const bundledPath = join(distDir, 'styles.css');
  try {
    // Write to temp file first
    const tempPath = join(distDir, 'styles.temp.css');
    writeFileSync(tempPath, bundledCSS);

    // Minify using PostCSS CLI
    execSync(
      `npx postcss "${tempPath}" -o "${bundledPath}" --no-map`,
      { cwd: packageRoot, stdio: 'inherit' }
    );

    // Clean up temp file
    try {
      unlinkSync(tempPath);
    } catch {
      // Ignore cleanup errors
    }

    console.log(`  ✓ Created minified bundled styles.css`);
  } catch (error) {
    console.error('   ⚠️  Failed to minify bundled CSS, writing unminified version:', error.message);
    writeFileSync(bundledPath, bundledCSS);
    console.log(`  ✓ Created bundled styles.css (unminified)`);
  }
}

/**
 * Main execution
 */
async function main() {
  console.log('\n📦 Building CSS files...');

  try {
    console.log('\n   🎨 Step 1: Copying globals.css (raw file for users)');
    copyGlobalsCSS();

    console.log('\n   🎨 Step 1.5: Copying animations.css (Apple iOS animation system)');
    copyAnimationsCSS();

    console.log('\n   🎨 Step 2: Compiling theme CSS (no Tailwind utilities)');
    const themeCSS = compileTailwindCSS();

    console.log('\n   🔍 Step 3: Scanning for component CSS files...');
    const uiDir = join(srcDir, 'ui');
    const componentCSSFiles = findComponentCSSFiles(uiDir, srcDir);

    if (componentCSSFiles.length > 0) {
      console.log(`   ✓ Found ${componentCSSFiles.length} component CSS file(s)`);

      console.log('   📝 Processing component CSS files...');
      for (const { srcPath, relativePath } of componentCSSFiles) {
        copyCSSFile(srcPath, relativePath);
      }
    } else {
      console.log('   ℹ️  No component CSS files found (only Tailwind)');
    }

    console.log('\n   📦 Step 4: Creating bundled styles.css...');
    createBundledCSS(componentCSSFiles, themeCSS);

    console.log('\n   ✅ CSS build complete!\n');
  } catch (error) {
    console.error('\n   ❌ CSS build failed:', error.message);
    // process is available in Node.js runtime
    // eslint-disable-next-line no-undef
    process.exit(1);
  }
}

// Check for --watch flag
// process is available in Node.js runtime
// eslint-disable-next-line no-undef
const isWatchMode = process.argv.includes('--watch');

/**
 * Watch mode - rebuild CSS on file changes
 */
function watchFiles() {
  console.log('\n👀 Starting CSS watch mode...\n');

  let rebuildTimeout = null;
  const DEBOUNCE_MS = 300;

  const scheduleRebuild = (changedFile) => {
    if (rebuildTimeout) {
      clearTimeout(rebuildTimeout);
    }

    rebuildTimeout = setTimeout(() => {
      const relativePath = relative(packageRoot, changedFile);
      console.log(`\n🔄 File changed: ${relativePath}`);
      console.log('   Rebuilding CSS...\n');

      main().then(() => {
        console.log('   ✅ Rebuild complete!\n');
      }).catch((error) => {
        console.error('   ❌ Rebuild failed:', error.message);
        console.log('   👀 Still watching for changes...\n');
      });
    }, DEBOUNCE_MS);
  };

  // Watch main CSS files
  const filesToWatch = [
    tailwindInputFile,
    globalsSrcFile,
    animationsSrcFile,
  ];

  for (const file of filesToWatch) {
    if (existsSync(file)) {
      watch(file, { persistent: true }, (eventType) => {
        if (eventType === 'change') {
          scheduleRebuild(file);
        }
      });
      const relativePath = relative(packageRoot, file);
      console.log(`   👁️  Watching: ${relativePath}`);
    }
  }

  // Watch component CSS files directory
  const uiDir = join(srcDir, 'ui');
  if (existsSync(uiDir)) {
    watch(uiDir, { recursive: true, persistent: true }, (eventType, filename) => {
      if (filename && filename.endsWith('.css')) {
        const changedFile = join(uiDir, filename);
        scheduleRebuild(changedFile);
      }
    });
    console.log(`   👁️  Watching: src/ui/**/*.css (recursive)`);
  }

  console.log('\n   ✨ Ready! Edit CSS files to trigger rebuilds.\n');
  console.log('   Press Ctrl+C to stop watching.\n');
}

if (isWatchMode) {
  // Initial build, then start watching
  main().then(() => {
    watchFiles();
  }).catch((error) => {
    console.error('\n   ❌ Initial build failed:', error.message);
    // process is available in Node.js runtime
    // eslint-disable-next-line no-undef
    process.exit(1);
  });
} else {
  main();
}
