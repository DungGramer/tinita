import { defineConfig } from 'tsup';
import { globSync } from 'glob';

/**
 * Auto-discover entry points
 * - Automatically scans for all utility functions in category folders
 * - No need to manually add entries when creating new utilities
 */
const autoDiscoverEntries = () => {
  const entries = [
    'src/index.ts', // Main barrel export

    // Auto-discover all utilities in category folders (file/, uuid/, etc.)
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
console.log(`📦 Auto-discovered ${entries.length} entry points`);

export default defineConfig({
  entry: entries,
  format: ['cjs', 'esm'],
  dts: true,
  bundle: false, // Keep unbundled for optimal tree-shaking (utilities don't have dependencies)
  splitting: false,
  clean: true,
  minify: true,
  // Remove comments when minifying
  esbuildOptions(options) {
    options.legalComments = 'none';
  },
  outDir: 'dist'
});
