import { defineConfig } from 'tsup';

export default defineConfig({
  entry: [
    'src/index.ts',
    'src/file/fileSize.ts',
    'src/file/getFileNameParts.ts',
    'src/file/truncateFileName.ts',
    'src/uuid/generateUUID.ts'
],
  format: ['cjs', 'esm'],
  dts: true,
  bundle: false,
  splitting: false,
  clean: true,
  outDir: 'dist'
});
