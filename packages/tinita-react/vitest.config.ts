import { defineConfig } from 'vitest/config';

export default defineConfig({
  css: {
    modules: {
      // PHẢI khớp `vite.config.build.mts`. Nếu lệch, test đo một bộ tên còn người
      // dùng nhận một bộ khác - và không có gì báo.
      generateScopedName: 'tnt-[folder]-[local]',
      localsConvention: 'camelCaseOnly',
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    // Mặc định vitest KHÔNG xử CSS: `import styles from './x.module.css'` trả proxy
    // và `styles.root` ra `_root_hash`. Mọi assertion về tên class sẽ đo đồ giả.
    // `classNameStrategy: 'scoped'` mới dùng `generateScopedName` ở trên. Mặc định của
    // vitest là `'stable'`, cho `_root_22a315` - test sẽ đo một bộ tên mà người dùng
    // không bao giờ thấy. Đo được 2026-09-26 bằng probe.
    css: { include: [/\.module\.css$/], modules: { classNameStrategy: 'scoped' } },
  },
});
