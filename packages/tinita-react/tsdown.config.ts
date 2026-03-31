import { defineConfig } from 'tsdown';
import { globSync } from 'glob';

const autoDiscoverEntries = () => {
  const entries = [
    'src/index.ts',
    ...globSync('src/hooks/*.ts', { ignore: ['**/*.test.ts', '**/*.stories.ts'] }),
    ...globSync('src/hooks/*/index.ts'),
    ...globSync('src/ui/*/index.{ts,tsx}'),
    ...globSync('src/utils/**/*.ts', { ignore: ['**/*.test.ts'] }),
  ];

  return [...new Set(entries)].map((entry) => entry.replace(/\\/g, '/')).filter(Boolean);
};

const entries = autoDiscoverEntries();
const isProd = process.env.NODE_ENV === 'production';

console.log(`📦 Auto-discovered ${entries.length} entry points`);

export default defineConfig({
  entry: entries,
  format: ['cjs', 'esm'],
  dts: true,
  clean: isProd,
  minify: isProd,
  outDir: 'dist',
  deps: {
    neverBundle: ['react', 'react-dom', 'tinita', 'lucide-react', '@radix-ui/react-accordion', 'motion'],
  },
  target: isProd ? 'es2020' : false,
});
