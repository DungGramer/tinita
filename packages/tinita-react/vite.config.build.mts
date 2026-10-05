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
/**
 * `Ping.css` -> `ui/ping`. Khoá là tên file vite đặt cho CSS của một `.module.css`
 * khi nó DÙNG CHUNG giữa nhiều entry, lúc đó `originalFileNames` rỗng nên không còn
 * cách nào khác để quy nó về component.
 */
const MODULE_CSS_OWNER = new Map<string, string>(
  readdirSync(resolve(SRC, 'ui')).flatMap((dir) => {
    const full = resolve(SRC, 'ui', dir);
    if (!statSync(full).isDirectory()) return [];
    return readdirSync(full)
      .filter((f) => f.endsWith('.module.css'))
      .map((f) => [f.replace(/\.module\.css$/, '.css'), `ui/${dir}`] as [string, string]);
  })
);

function discoverEntries(): Record<string, string> {
  const entries: Record<string, string> = { index: resolve(SRC, 'index.ts') };

  // `.ts` AND `.tsx`. The version this replaced matched only `.ts`, so a hook or
  // util written as `.tsx` was silently left out of the JS build while tsup still
  // emitted its `.d.ts` - `exports` then pointed at a `.mjs` that did not exist.
  // `utils/jsxJoin.tsx` hit exactly that. Same defect class as the flat `src/*.ts`
  // glob in tinita-dom, caught in phase 03, and as the `src/*/**` glob in tinita.
  const isEntry = (file: string) =>
    /\.tsx?$/.test(file) && !/^index\.tsx?$/.test(file) && !file.includes('.test.');

  for (const file of readdirSync(resolve(SRC, 'hooks'))) {
    if (!isEntry(file)) continue;
    entries[`hooks/${file.replace(/\.tsx?$/, '')}`] = resolve(SRC, 'hooks', file);
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
    if (!isEntry(file)) continue;
    entries[`utils/${file.replace(/\.tsx?$/, '')}`] = resolve(SRC, 'utils', file);
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
      // PHẢI khớp `peerDependencies`. Quên một tên ở đây là package đó bị BUNDLE
      // VÀO dist thay vì để làm optional peer - và không có gì báo, vì component
      // vẫn chạy. Đã xảy ra khi đổi từ react-accordion sang react-collapsible:
      // chunk Tree phình lên 28310 bytes vì nuốt cả Radix vào trong.
      external: (id) =>
        [
          'react',
          'react/jsx-runtime',
          'react-dom',
          'lucide-react',
          '@base-ui/react/collapsible',
          '@base-ui/react',
        ].includes(id) ||
        // CSS thường để NGUYÊN external, nên `import 'tinita-react/ui/x/index.css'`
        // viết trong source SỐNG SÓT tới artifact và consumer tự nạp CSS. `.module.css`
        // thì KHÔNG external - nó là import lấy GIÁ TRỊ (bảng class name) nên vite phải
        // xử lý, và `generateScopedName` mới gắn được tiền tố `tnt-`.
        (/\.css$/.test(id) && !/\.module\.css$/.test(id)) ||
        // Barrel re-export qua subpath của chính package - xem src/index.ts.
        /^tinita-react\//.test(id),
      output: {
        // `'use client'`: esbuild XOÁ directive khỏi source nên banner là cách duy
        // nhất giữ được nó. Cả package là client - hooks, autoInjectStyles chạm
        // `document`, cả 3 component đều có hook hoặc handler.
        banner: "'use client';",
        // Chunk dùng chung phải mang đuôi đúng theo format, nếu không `.js` trong
        // ngữ cảnh ESM sẽ gãy.
        chunkFileNames: `chunks/[name]-[hash].${extension}`,
        // CSS đã compile đặt cạnh ENTRY sở hữu nó, không theo tên chunk: mọi entry
        // `ui/*` đều tên `index` nên `[name].css` cho `index.css`, `index2.css`...
        //
        // Hai trường hợp, cả hai đo được 2026-10-05:
        //  - CSS của riêng một entry: `originalFileNames[0] === 'src/ui/<c>/index.ts'`.
        //  - CSS DÙNG CHUNG giữa nhiều entry: `originalFileNames` RỖNG và `name` là tên
        //    file module (`Tree.css`). `Tree.module.css` nằm trong cả `ui/tree` và
        //    `ui/file-tree` vì FileTree bọc Tree, nên nó là shared CSS primitive.
        //    `MODULE_CSS_OWNER` tra ngược tên đó về thư mục component.
        assetFileNames: (info) => {
          const from = (info.originalFileNames?.[0] ?? info.originalFileName ?? '').replace(/\\/g, '/');
          const owner = /(?:^|\/)src\/(ui\/[^/]+)\//.exec(from);
          if (owner) return `${owner[1]}/styles.css`;
          const shared = MODULE_CSS_OWNER.get(info.name ?? '');
          if (shared) return `${shared}/styles.css`;
          // Không quy được về component nào. `build-css.mjs` làm đỏ nếu file này tồn
          // tại, vì nó nghĩa là có CSS không thuộc entry nào và sẽ không ai nạp.
          return 'unattributed.css';
        },
      },
    },
    // MỘT file CSS cho mỗi component, không phải một file cho tất cả: đó là điều kiện
    // để `ui/ping` chỉ kéo CSS của Ping. `build-css.mjs` ghép chúng lại thành
    // `styles.css` cho người dùng design system.
    cssCodeSplit: true,
    cssMinify: true,
    minify: true,
    sourcemap: false,
    // Chỉ lần chạy ESM được xoá dist. Lần CJS chạy sau, xoá là mất output của lần trước.
    emptyOutDir: format === 'es',
    outDir: 'dist',
  },
});
