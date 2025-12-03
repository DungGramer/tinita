#!/usr/bin/env node
/* eslint-env node */
/**
 * Build CSS files for tinita-react
 *
 * 1. Compiles Tailwind CSS to static CSS (so users don't need Tailwind)
 * 2. Copies component CSS files from src/ to dist/
 * 3. Creates bundled styles.css with Tailwind + component styles
 */

import { readFileSync, writeFileSync, readdirSync, statSync, existsSync, mkdirSync, copyFileSync } from 'fs';
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
const tailwindInputFile = join(srcDir, 'styles', 'tailwind.css');
const tailwindOutputFile = join(distDir, 'tailwind.css');

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

  console.log('   ⚙️  Compiling Tailwind CSS...');

  const inputCSS = readFileSync(tailwindInputFile, 'utf-8');

  try {
    const result = await postcss([
      tailwindcssPlugin,
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
    console.log('   ✓ Compiled Tailwind CSS to dist/tailwind.css');

    return result.css;
  } catch (error) {
    console.error('   ❌ Failed to compile Tailwind CSS:', error.message);
    throw error;
  }
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

  // Minify bundled CSS (remove header comments before minifying)
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
    // Step 1: Compile Tailwind CSS
    console.log('\n   🎨 Step 1: Compiling Tailwind CSS');
    const tailwindCSS = await compileTailwindCSS();

    // Step 2: Find and copy component CSS files (excluding tailwind.css)
    console.log('\n   🔍 Step 2: Scanning for component CSS files...');
    const allCSSFiles = findCSSFiles(srcDir, srcDir);

    // Exclude tailwind.css from component CSS files
    const componentCSSFiles = allCSSFiles.filter(
      ({ relativePath }) => !relativePath.includes('styles/tailwind.css')
    );

    if (componentCSSFiles.length > 0) {
      console.log(`   ✓ Found ${componentCSSFiles.length} component CSS file(s)`);

      // Copy and minify component CSS files to dist
      console.log('   📝 Copying and minifying component CSS files...');
      for (const { srcPath, relativePath } of componentCSSFiles) {
        await copyCSSFile(srcPath, relativePath);
      }
    } else {
      console.log('   ℹ️  No component CSS files found (only Tailwind)');
    }

    // Step 3: Create bundled CSS with Tailwind + components
    console.log('\n   📦 Step 3: Creating bundled styles.css...');
    await createBundledCSS(componentCSSFiles, tailwindCSS);

    console.log('\n   ✅ CSS build complete!\n');
  } catch (error) {
    console.error('\n   ❌ CSS build failed:', error.message);
    // process is available in Node.js runtime
    // eslint-disable-next-line no-undef
    process.exit(1);
  }
}

main();
