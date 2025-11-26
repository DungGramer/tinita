import { defineConfig } from 'tsup';

export default defineConfig({
  entry: [
    'src/index.ts',
    'src/useToggle.ts'
],
  format: ['cjs', 'esm'],
  dts: true,
  bundle: false,
  splitting: false,
  clean: true,
  outDir: 'dist'
});
