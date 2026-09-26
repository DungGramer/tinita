#!/usr/bin/env node
/* eslint-env node */
/**
 * Build CSS files for tinita-react using PostCSS CLI
 *
 * 1. Copies globals.css and animations.css (raw files)
 * 2. Compiles build-entry.css qua PostCSS (`@tailwindcss/postcss` xử `@theme
 *    inline` rồi bỏ nó - bundle KHÔNG chứa utility Tailwind nào, cố ý)
 * 3. Copies and minifies component CSS files
 * 4. Creates bundled styles.css  (KHÔNG layer)
 * 5. Creates styles.layer.css    (cùng nội dung, bọc `@layer tnt`)
 *
 * Vì sao ship hai bản: bọc layer thì CSS KHÔNG layer của host luôn thắng, nên
 * host sửa được component mà không cần đấu specificity. Nhưng nó cũng có nghĩa
 * mọi CSS không layer của host đè lên component, kể cả vô tình. Mantine ship
 * `styles.css` + `styles.layer.css` cho đúng lý do này và để consumer chọn.
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
 * Compile theme CSS (globals + animations) qua PostCSS.
 *
 * KHÔNG phát utility Tailwind: `build-entry.css` cố ý không `@import
 * "tailwindcss"`. Đó cũng chính là cách bỏ Preflight của Tailwind v4 - không
 * import `tailwindcss/preflight.css` thì không có reset nào chạm vào trang khách.
 * `@tailwindcss/postcss` vẫn cần để xử `@theme inline` trong globals.css.
 */
function compileThemeCSS() {
  if (!existsSync(tailwindInputFile)) {
    console.log('   ⚠️  build-entry.css not found, skipping theme compilation');
    return null;
  }

  console.log('   ⚙️  Compiling theme CSS from build-entry.css...');

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
    console.log('   ✓ Compiled theme CSS to dist/styles.css');

    return readFileSync(tailwindOutputFile, 'utf-8');
  } catch (error) {
    console.error('   ❌ Failed to compile theme CSS:', error.message);
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

  writeLayeredCSS(bundledPath);
}

/**
 * Sinh `dist/styles.layer.css`: cùng nội dung `styles.css`, bọc `@layer tnt`.
 *
 * Đọc lại từ file đã ghi để hai bản luôn cùng nội dung - nếu bọc bản chưa minify
 * thì hai file sẽ lệch và không ai phát hiện.
 *
 * Consumer xếp thứ tự bằng cách khai layer trước khi import:
 *   @layer tnt, base, components, utilities;
 *   @import 'tinita-react/styles.layer.css';
 */
function writeLayeredCSS(bundledPath) {
  const layeredPath = join(distDir, 'styles.layer.css');
  const css = readFileSync(bundledPath, 'utf-8');
  const header =
    '/* tinita-react - cùng nội dung styles.css, bọc @layer tnt.\n' +
    '   Dùng bản này khi CSS của bạn đang bị tinita đè: CSS không layer luôn\n' +
    '   thắng CSS trong layer, nên style của bạn sẽ thắng mà không cần\n' +
    '   !important. Đánh đổi: MỌI CSS không layer của bạn đè lên component,\n' +
    '   kể cả vô tình. Xếp thứ tự bằng `@layer tnt, base, components, utilities;`\n' +
    '   khai TRƯỚC khi import. */\n';
  writeFileSync(layeredPath, `${header}@layer tnt {\n${css.trim()}\n}\n`);
  console.log('  ✓ Created styles.layer.css (@layer tnt)');
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
    const themeCSS = compileThemeCSS();

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
