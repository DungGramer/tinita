import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  server: { port: 5180, open: true },
  // Tarball được cài vào node_modules như package thật, nên KHÔNG alias, KHÔNG
  // dedupe thủ công, KHÔNG optimizeDeps.exclude. Thêm bất kỳ cái nào trong đó là
  // playground không còn kiểm thứ người dùng thật gặp.
});
