import { defineConfig } from 'tsup';
import { globSync } from 'glob';

/**
 * Auto-discover entry points
 * - Automatically scans for hooks, UI components, utils, and theme files
 * - No need to manually add entries when creating new components
 */
const autoDiscoverEntries = () => {
  const entries = [
    'src/index.ts', // Main barrel export

    // Auto-discover hooks
    ...globSync('src/hooks/**/*.ts', {
      ignore: ['**/*.test.ts', '**/*.stories.ts', '**/index.ts'],
    }),

    // Auto-discover UI components (folder-based with index.ts/tsx)
    ...globSync('src/ui/*/index.{ts,tsx}'),

    // Auto-discover utils
    ...globSync('src/utils/**/*.ts', {
      ignore: ['**/*.test.ts'],
    }),
  ];

  // Remove duplicates, normalize paths (Windows backslash -> forward slash)
  return [...new Set(entries)].map((entry) => entry.replace(/\\/g, '/')).filter(Boolean);
};

const entries = autoDiscoverEntries();
console.log(`📦 Auto-discovered ${entries.length} entry points`);

const isWatchMode = process.argv.includes('--watch');

export default defineConfig({
  entry: entries,
  format: ['cjs', 'esm'],
  dts: true,
  bundle: true,
  external: ['react', 'react-dom', 'lucide-react', '@radix-ui/react-accordion'],
  splitting: false,
  clean: !isWatchMode,
  minify: true,
  // Remove comments when minifying
  esbuildOptions(options) {
    options.legalComments = 'none';
  },
  // esbuild XOÁ directive `'use client'` khỏi output - đặt nó trong source là không
  // đủ, đo được 2026-09-26: dist/ui/file-tree/index.mjs bắt đầu bằng `import{...}`.
  // Banner là cách duy nhất giữ được nó qua tsup.
  //
  // Áp cho CẢ package, không phải từng entry: tsup không cho banner theo entry, và
  // toàn bộ tinita-react là client - hooks, autoInjectStyles chạm `document`, cả 3
  // component đều có hook hoặc handler. Khai đúng thực tế, không phải khai rộng.
  banner: { js: "'use client';" },
  // exports trong package.json trỏ require -> .cjs; không có outExtension thì tsup emit .js
  // và mọi require() gãy.
  outExtension: ({ format }) => ({ js: format === 'cjs' ? '.cjs' : '.mjs' }),
  outDir: 'dist',
});
