import { defineConfig } from 'tsdown';
import { globSync } from 'glob';

/**
 * Auto-discover entry points
 * - Automatically scans for all utility functions in category folders
 * - No need to manually add entries when creating new utilities
 */
const autoDiscoverEntries = () => {
  const entries = [
    'src/index.ts', // Main barrel export

    // Category barrel exports (index.ts per category, any depth)
    ...globSync('src/**/index.ts'),

    // Auto-discover all utilities in category folders (file/, uuid/, download/, etc.)
    ...globSync('src/*/**/*.ts', {
      ignore: ['**/*.test.ts', '**/*.spec.ts', '**/index.ts']
    }),
  ];

  // Remove duplicates, normalize paths (Windows backslash -> forward slash)
  return [...new Set(entries)]
    .map(entry => entry.replace(/\\/g, '/'))
    .filter(Boolean);
};

const entries = autoDiscoverEntries();
const isProd = process.env.NODE_ENV === 'production';

console.log(`📦 Auto-discovered ${entries.length} entry points`);

export default defineConfig({
  entry: entries,
  format: ['cjs', 'esm'],
  dts: true,
  unbundle: true, // Keep unbundled for optimal tree-shaking (utilities don't have dependencies)
  clean: isProd,
  minify: isProd,
  outDir: 'dist',
  target: isProd ? 'es2020' : false,
});
