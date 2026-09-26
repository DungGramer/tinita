import { defineConfig } from 'tsup';
import { globSync } from 'glob';

/** Auto-discover: mỗi file .ts trong src/ là một entry, trừ index (barrel) và test. */
const autoDiscoverEntries = () => {
  const entries = [
    'src/index.ts',
    ...globSync('src/*.ts', {
      ignore: ['**/*.test.ts', '**/*.spec.ts', '**/index.ts'],
    }),
  ];
  return [...new Set(entries)]
    .map((e) => e.replace(/\\/g, '/'))
    .filter(Boolean);
};

const entries = autoDiscoverEntries();
console.log(`📦 Auto-discovered ${entries.length} entry points`);

export default defineConfig({
  entry: entries,
  format: ['cjs', 'esm'],
  dts: true,
  // bundle:true BẮT BUỘC. smooth-scroll.ts import './wheel-source'; với bundle:false esbuild giữ
  // specifier KHÔNG có đuôi và tsup không viết lại -> Node ESM ERR_MODULE_NOT_FOUND. Đây đúng là
  // bug đã publish trong tinita@0.0.1 (cặp truncateFileName/getFileNameParts).
  bundle: true,
  splitting: false,
  clean: true,
  minify: true,
  esbuildOptions(options) {
    options.legalComments = 'none';
  },
  // exports trong package.json trỏ require -> .cjs; thiếu outExtension thì tsup emit .js và mọi
  // require() gãy. Đây là bug B1 đã publish.
  outExtension: ({ format }) => ({ js: format === 'cjs' ? '.cjs' : '.mjs' }),
  outDir: 'dist',
});
