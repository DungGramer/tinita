import { defineConfig } from 'tsup';

export default defineConfig({
  entry: [
    'src/index.ts',
    'src/hooks/useToggle.ts',
    'src/ui/file-tree/index.tsx',
    'src/utils/autoInjectStyles.ts'
],
  format: ['cjs', 'esm'],
  dts: true,
  bundle: false,
    external: ['react', 'react-dom'],
  splitting: false,
  clean: true,
  outDir: 'dist'
});
