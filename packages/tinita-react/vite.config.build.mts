import { readdirSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { defineConfig } from 'vite';

/**
 * Build JS + CSS Modules cho tinita-react.
 *
 * VÌ SAO KHÔNG PHẢI TSUP: tsup không làm được CSS Modules. Đo 2026-09-26, ba cách
 * đều cho mapping RỖNG (`var Ping_default = {}`) và tên class KHÔNG scope:
 * `.module.css` mặc định, `--loader ".module.css=local-css"`, và `esbuildPlugins`
 * với `onLoad` trả `loader: 'local-css'`. tsup chặn CSS ở tầng plugin riêng của nó.
 *
 * esbuild TRỰC TIẾP thì làm được (0.25.12: `.root` -> `.Ping_root` + mapping đúng),
 * nhưng nó KHÔNG cho cấu hình tên scoped. Tên sẽ là `Ping_root` - không namespace.
 * Vite cho `generateScopedName`, nên tên vừa scope vừa giữ prefix `tnt-`. Đó là lý
 * do chọn Vite chứ không phải esbuild trần.
 *
 * TYPES VẪN DO TSUP SINH (`dts: { only: true }`). Đường types hiện tại đã được
 * `attw` xác minh sạch `FalseCJS` trên cả 3 package; dựng lại nó bằng `tsc` +
 * copy `.d.ts` -> `.d.mts` là mời đúng lớp bug đó quay lại. Mỗi tool làm đúng việc
 * nó làm được.
 */

const SRC = resolve(import.meta.dirname, 'src');

/** Entry = mọi subpath trong `exports`. Giữ đúng bộ tsup đang dùng. */
function discoverEntries(): Record<string, string> {
  const entries: Record<string, string> = { index: resolve(SRC, 'index.ts') };

  for (const file of readdirSync(resolve(SRC, 'hooks'))) {
    if (!file.endsWith('.ts') || file === 'index.ts' || file.includes('.test.')) continue;
    entries[`hooks/${file.replace(/\.ts$/, '')}`] = resolve(SRC, 'hooks', file);
  }

  for (const dir of readdirSync(resolve(SRC, 'ui'))) {
    const full = resolve(SRC, 'ui', dir);
    if (!statSync(full).isDirectory()) continue;
    const entry = ['index.tsx', 'index.ts'].find((name) => {
      try {
        return statSync(resolve(full, name)).isFile();
      } catch {
        return false;
      }
    });
    if (entry) entries[`ui/${dir}/index`] = resolve(full, entry);
  }

  for (const file of readdirSync(resolve(SRC, 'utils'))) {
    if (!file.endsWith('.ts') || file.includes('.test.')) continue;
    entries[`utils/${file.replace(/\.ts$/, '')}`] = resolve(SRC, 'utils', file);
  }

  return entries;
}

const entry = discoverEntries();

/**
 * MỘT format mỗi lần chạy, chọn bằng `TNT_FORMAT`.
 *
 * Vì sao không để `formats: ['es','cjs']` trong một lần chạy: `chunkFileNames` khi
 * đó phải là một hàm dùng chung cho cả hai format, mà nó KHÔNG nhận format. Đuôi
 * chunk sẽ sai - `.js` trong ngữ cảnh ESM là đúng bug B2 ở một chỗ khác. Placeholder
 * `[format]` của Rollup cho `es`/`cjs`, không cho `.mjs`/`.cjs`.
 */
const format = process.env.TNT_FORMAT === 'cjs' ? 'cjs' : 'es';
const extension = format === 'cjs' ? 'cjs' : 'mjs';

export default defineConfig({
  css: {
    modules: {
      /**
       * Tên scoped VẪN mang namespace `tnt-`, và vẫn đọc được.
       *
       * Hash mù (`.a7f3c1`) thì người dùng mất hẳn khả năng override bằng CSS -
       * với một design system npm mà nhiều project consume, đó là bề mặt họ cần.
       * `[folder]` là thư mục component (`ping`, `file-tree`, `carousel-ticker`)
       * nên tên ổn định qua các lần build, không phụ thuộc nội dung file.
       */
      generateScopedName: 'tnt-[folder]-[local]',
      localsConvention: 'camelCaseOnly',
    },
  },
  esbuild: { jsx: 'automatic' },
  build: {
    lib: {
      entry,
      formats: [format],
      fileName: (_f, name) => `${name}.${extension}`,
    },
    rollupOptions: {
      // `react/jsx-runtime` phải external riêng - nó không nằm trong `react`.
      external: ['react', 'react/jsx-runtime', 'react-dom', 'lucide-react', '@radix-ui/react-accordion'],
      output: {
        // `'use client'`: esbuild XOÁ directive khỏi source nên banner là cách duy
        // nhất giữ được nó. Cả package là client - hooks, autoInjectStyles chạm
        // `document`, cả 3 component đều có hook hoặc handler.
        banner: "'use client';",
        // Chunk dùng chung phải mang đuôi đúng theo format, nếu không `.js` trong
        // ngữ cảnh ESM sẽ gãy.
        chunkFileNames: `chunks/[name]-[hash].${extension}`,
        assetFileNames: 'components.css',
      },
    },
    // Một file CSS cho toàn bộ component. `build-css.mjs` ghép nó với globals.css
    // và animations.css thành `styles.css`.
    cssCodeSplit: false,
    cssMinify: true,
    minify: true,
    sourcemap: false,
    // Chỉ lần chạy ESM được xoá dist. Lần CJS chạy sau, xoá là mất output của lần trước.
    emptyOutDir: format === 'es',
    outDir: 'dist',
  },
});
