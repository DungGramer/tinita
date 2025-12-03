import { defineConfig } from 'tsup';

export default defineConfig({
  entry: [
    'src/index.ts',
    'src/hooks/useToggle.ts',
    'src/ui/file-tree/index.ts',
    'src/ui/ping/index.ts',
    'src/utils/autoInjectStyles.ts'
  ],
  format: ['cjs', 'esm'],
  dts: true,
  // Bundle UI components but not hooks/utils (for tree-shaking)
  bundle: true,
  external: ['react', 'react-dom', 'lucide-react', '@radix-ui/react-accordion'],
  splitting: false,
  clean: true,
  minify: true,
  // Remove comments when minifying
  esbuildOptions(options) {
    options.legalComments = 'none';
  },
  outDir: 'dist'
});
