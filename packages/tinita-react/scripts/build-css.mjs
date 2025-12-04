#!/usr/bin/env node
/* eslint-env node */
/**
 * Build CSS files for tinita-react
 *
 * Builds CSS from globals.css using Tailwind v4 CSS-first approach.
 */

import { readFileSync, writeFileSync, readdirSync, statSync, existsSync, mkdirSync, copyFileSync, unlinkSync, watch } from 'fs';
import { join, relative, dirname } from 'path';
import { fileURLToPath } from 'url';
import postcss from 'postcss';
import tailwindcssPlugin from '@tailwindcss/postcss';
import autoprefixer from 'autoprefixer';
import cssnano from 'cssnano';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const packageRoot = join(__dirname, '..');
const srcDir = join(packageRoot, 'src');
const distDir = join(packageRoot, 'dist');
const tailwindInputFile = join(srcDir, 'styles', 'index.css');
const tailwindOutputFile = join(distDir, 'styles.css');
const globalsSrcFile = join(srcDir, 'styles', 'globals.css');
const globalsDistFile = join(distDir, 'styles', 'globals.css');
const tailwindConfigFile = join(packageRoot, 'tailwind.config.lib.cjs');

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
 * Copy and minify CSS file to dist maintaining structure
 */
async function copyCSSFile(srcPath, relativePath) {
  const destPath = join(distDir, relativePath);
  const destDir = dirname(destPath);

  // Create directory if it doesn't exist
  if (!existsSync(destDir)) {
    mkdirSync(destDir, { recursive: true });
  }

  // Read, minify, and write CSS file
  try {
    const content = readFileSync(srcPath, 'utf-8');
    const result = await postcss([
      cssnano({
        preset: 'default',
        discardComments: { removeAll: true },
      }),
    ]).process(content, {
      from: srcPath,
      to: destPath,
    });
    writeFileSync(destPath, result.css);
    console.log(`  ✓ Copied and minified ${relativePath}`);
  } catch (error) {
    console.error(`   ⚠️  Failed to minify ${relativePath}, copying unminified:`, error.message);
    copyFileSync(srcPath, destPath);
    console.log(`  ✓ Copied ${relativePath} (unminified)`);
  }
}

/**
 * Compile Tailwind CSS to static CSS using PostCSS
 */
async function compileTailwindCSS() {
  if (!existsSync(tailwindInputFile)) {
    console.log('   ⚠️  Tailwind input file not found, skipping Tailwind compilation');
    return null;
  }

  if (!existsSync(tailwindConfigFile)) {
    console.error('   ❌ tailwind.config.lib.cjs not found. Make sure it exists.');
    throw new Error('tailwind.config.lib.cjs not found');
  }

  console.log('   ⚙️  Compiling Tailwind CSS from index.css (includes globals.css)...');

  const inputCSS = readFileSync(tailwindInputFile, 'utf-8');

  // Temporarily copy config to standard name for Tailwind detection
  const standardConfigFile = join(packageRoot, 'tailwind.config.cjs');
  const configCopied = !existsSync(standardConfigFile);

  try {
    if (configCopied) {
      copyFileSync(tailwindConfigFile, standardConfigFile);
    }

    const result = await postcss([
      tailwindcssPlugin(),
      autoprefixer,
      cssnano({
        preset: 'default',
        discardComments: { removeAll: true },
      }),
    ]).process(inputCSS, {
      from: tailwindInputFile,
      to: tailwindOutputFile,
    });

    // Ensure dist directory exists
    if (!existsSync(distDir)) {
      mkdirSync(distDir, { recursive: true });
    }

    writeFileSync(tailwindOutputFile, result.css);
    console.log('   ✓ Compiled Tailwind CSS to dist/styles.css');

    return result.css;
  } catch (error) {
    console.error('   ❌ Failed to compile Tailwind CSS:', error.message);
    throw error;
  } finally {
    // Clean up temporary config file
    if (configCopied && existsSync(standardConfigFile)) {
      unlinkSync(standardConfigFile);
    }
  }
}

/**
 * Copy globals.css to dist (raw file for users to import)
 */
async function copyGlobalsCSS() {
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
 * Create bundled styles.css with Tailwind + component styles
 */
async function createBundledCSS(cssFiles, tailwindCSS) {
  // Start with empty string (comments will be removed by cssnano anyway)
  let bundledCSS = '';

  // Include compiled Tailwind CSS first
  if (tailwindCSS) {
    bundledCSS += tailwindCSS;
    bundledCSS += '\n';
  }

  // Include component CSS files
  for (const { srcPath } of cssFiles) {
    const content = readFileSync(srcPath, 'utf-8');
    bundledCSS += content;
    bundledCSS += '\n';
  }

  // Minify bundled CSS
  const bundledPath = join(distDir, 'styles.css');
  try {
    const minifiedResult = await postcss([
      cssnano({
        preset: 'default',
        discardComments: { removeAll: true },
      }),
    ]).process(bundledCSS, {
      from: bundledPath,
      to: bundledPath,
    });
    writeFileSync(bundledPath, minifiedResult.css);
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
    await copyGlobalsCSS();

    console.log('\n   🎨 Step 2: Compiling Tailwind CSS');
    const tailwindCSS = await compileTailwindCSS();

    console.log('\n   🔍 Step 3: Scanning for component CSS files...');
    const allCSSFiles = findCSSFiles(srcDir, srcDir);

    const componentCSSFiles = allCSSFiles.filter(
      ({ relativePath }) =>
        !relativePath.includes('styles/index.css') &&
        !relativePath.includes('styles/globals.css')
    );

    if (componentCSSFiles.length > 0) {
      console.log(`   ✓ Found ${componentCSSFiles.length} component CSS file(s)`);

      console.log('   📝 Copying and minifying component CSS files...');
      for (const { srcPath, relativePath } of componentCSSFiles) {
        await copyCSSFile(srcPath, relativePath);
      }
    } else {
      console.log('   ℹ️  No component CSS files found (only Tailwind)');
    }

    console.log('\n   📦 Step 4: Creating bundled styles.css...');
    await createBundledCSS(componentCSSFiles, tailwindCSS);

    console.log('\n   ✅ CSS build complete!\n');
  } catch (error) {
    console.error('\n   ❌ CSS build failed:', error.message);
    // process is available in Node.js runtime
    // eslint-disable-next-line no-undef
    process.exit(1);
  }
}

/**
 * Watch for file changes and rebuild CSS
 */
function watchFiles() {
  console.log('\n👀 Watching for CSS file changes...\n');

  let rebuildTimeout = null;
  const DEBOUNCE_MS = 300; // Debounce rebuilds by 300ms

  const scheduleRebuild = (changedFile) => {
    if (rebuildTimeout) {
      clearTimeout(rebuildTimeout);
    }

    rebuildTimeout = setTimeout(async () => {
      const relativePath = relative(packageRoot, changedFile);
      console.log(`\n🔄 File changed: ${relativePath}`);
      console.log('   Rebuilding CSS...\n');

      try {
        await main();
        console.log('   ✅ Rebuild complete!\n');
      } catch (error) {
        console.error('   ❌ Rebuild failed:', error.message);
        console.log('   👀 Still watching for changes...\n');
      }
    }, DEBOUNCE_MS);
  };

  // Watch main CSS files
  const filesToWatch = [
    tailwindInputFile,
    globalsSrcFile,
    tailwindConfigFile,
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

// Check for --watch flag
// process is available in Node.js runtime
// eslint-disable-next-line no-undef
const isWatchMode = process.argv.includes('--watch');

if (isWatchMode) {
  // Initial build
  main().then(() => {
    // Start watching after initial build
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
