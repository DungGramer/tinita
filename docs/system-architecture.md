# System Architecture

Cập nhật: 2026-09-24 (vòng 2) · commit 0a1dd88

---

## Overview

Tinita là monorepo (Turborepo + pnpm) với 6 workspace members:

- 2 packages publishable (tinita + tinita-react)
- 3 config packages (eslint, typescript, ui)
- 1 private app (storybook)

Build: tsup (per-file, bundle false/true tuỳ package) + PostCSS + Tailwind v4.  
Release: thủ công qua scripts/publish.mjs (không CI/CD).

---

## Monorepo Structure

```
tinita/ (root)
├── packages/
│   ├── tinita/                    (v0.0.1)
│   │   ├── src/
│   │   │   ├── file/
│   │   │   │   ├── fileSize.ts
│   │   │   │   ├── getFileNameParts.ts
│   │   │   │   └── truncateFileName.ts
│   │   │   ├── uuid/
│   │   │   │   └── generateUUID.ts
│   │   │   └── index.ts (barrel)
│   │   ├── dist/                  (ESM + CJS)
│   │   ├── package.json
│   │   ├── tsup.config.ts
│   │   └── tsconfig.json
│   │
│   └── tinita-react/              (v0.0.2-alpha.1)
│       ├── src/
│       │   ├── hooks/
│       │   │   ├── useToggle.ts
│       │   │   ├── useIsomorphicLayoutEffect.ts
│       │   │   └── index.ts (barrel)
│       │   ├── ui/
│       │   │   ├── file-tree/
│       │   │   │   ├── FileTree.tsx
│       │   │   │   ├── FileTree.css
│       │   │   │   ├── types.ts
│       │   │   │   ├── utils/
│       │   │   │   ├── components/
│       │   │   │   └── index.ts
│       │   │   ├── ping/
│       │   │   ├── carousel-ticker/
│       │   │   └── index.ts (barrel)
│       │   ├── utils/
│       │   │   └── autoInjectStyles.ts
│       │   ├── styles/
│       │   │   ├── globals.css
│       │   │   ├── animations.css
│       │   │   ├── build-entry.css
│       │   │   └── index.css
│       │   └── index.ts (CÓ barrel - xung đột quy tắc)
│       ├── scripts/
│       │   └── build-css.mjs
│       ├── dist/                  (ESM + CJS + CSS)
│       ├── .storybook/
│       ├── package.json
│       ├── tsup.config.ts
│       ├── tailwind.config.cjs
│       └── vitest.config.ts
│
├── apps/
│   └── storybook/                 (@tinita/storybook, private)
│       ├── src/
│       ├── stories/
│       │   ├── FileTree/          (6 stories)
│       │   ├── Ping/
│       │   ├── CarouselTicker/
│       │   └── Animations/
│       ├── .storybook/
│       └── package.json
│
├── config/
│   ├── eslint-config/             (@repo/eslint-config)
│   │   ├── base.js
│   │   ├── react-internal.js
│   │   └── next.js
│   ├── typescript-config/         (@repo/typescript-config)
│   │   ├── base.json              (ES2020, Node, strict)
│   │   ├── react-library.json
│   │   ├── nextjs.json
│   │   └── vue-library.json
│   └── ui/                        (@repo/ui)
│       ├── src/
│       │   ├── button.tsx
│       │   ├── card.tsx
│       │   └── code.tsx
│       └── package.json
│
├── scripts/
│   ├── publish.mjs                (Publish thủ công)
│   └── update-package-versions.mjs
│
├── docs/
│   ├── README.md
│   ├── project-overview-pdr.md
│   ├── codebase-summary.md
│   ├── code-standards.md
│   ├── system-architecture.md (đây)
│   ├── naming-guidelines.md
│   ├── project-roadmap.md
│   └── design-guidelines.md
│
├── package.json               (Root, 13 scripts)
├── pnpm-workspace.yaml        (packages/*, apps/*, config/*)
├── turbo.json                 (7 tasks)
├── .eslintrc.cjs              (Legacy ESLint)
├── prettier.config.js
├── .gitattributes
└── README.md
```

---

## Dependency Graph

### Thực Trạng (Verified)

```
storybook (@tinita/storybook)
  └── tinita-react (workspace:*)
       ├── @radix-ui/react-accordion ^1.2.12
       ├── clsx ^2.1.1
       ├── lucide-react ^0.555.0
       └── tailwind-merge ^3.4.0

tinita (v0.0.1)
  └── (ZERO dependencies)

@repo/ui
  └── react, react-dom (dev)

@repo/eslint-config, @repo/typescript-config
  └── (No runtime dependencies)
```

### Workspace Dependencies

```
All packages:
  └── @repo/eslint-config (workspace:*)
  └── @repo/typescript-config (workspace:*)
```

---

## Build System

### tsup Configurations

**tinita (bundle: true - bắt buộc, xem ghi chú dưới)**

```typescript
{
  entry: [
    'src/index.ts',
    'src/file/fileSize.ts',
    'src/file/getFileNameParts.ts',
    'src/file/truncateFileName.ts',
    'src/uuid/generateUUID.ts'
  ],
  format: ['cjs', 'esm'],
  dts: true,
  bundle: true,         // xem ghi chú dưới: bundle:false làm gãy ESM
  outExtension: ({ format }) => ({ js: format === 'cjs' ? '.cjs' : '.mjs' }),
  splitting: false,
  clean: true,
  minify: true,
  outDir: 'dist'
}
```

**tinita-react (bundle: true = for runtime deps)**

```typescript
{
  entry: [
    'src/index.ts',
    'src/hooks/useToggle.ts',
    'src/hooks/useIsomorphicLayoutEffect.ts',
    'src/ui/file-tree/index.ts',
    'src/ui/ping/index.ts',
    'src/ui/carousel-ticker/index.ts',
    'src/utils/autoInjectStyles.ts'
  ],
  format: ['cjs', 'esm'],
  dts: true,
  bundle: true,         // Bundle components (có runtime deps)
  external: [
    'react',
    'react-dom',
    'lucide-react',
    '@radix-ui/react-accordion',
    'motion'
  ],
  splitting: false,
  clean: !isWatchMode,
  minify: true,
  outDir: 'dist'
}
```

---

## CSS Build Pipeline

**Script:** `packages/tinita-react/scripts/build-css.mjs`

**Main Build Steps** (script logs: Step 1, 1.5, 2, 3, 4):

1. Copy `src/styles/globals.css` -> `dist/styles/globals.css` (Tailwind base config + theme tokens via @theme inline)
   1.5. Copy `src/styles/animations.css` -> `dist/styles/animations.css` (@keyframes for animations)
2. PostCSS compile `src/styles/build-entry.css` -> theme CSS (needs `tailwind.config.cjs` for content globs)
3. PostCSS compile `src/ui/**/*.css` -> component CSS, minified to `dist/ui/<relpath>` (fallback raw copy if error)
4. **Bundle stage** in `createBundledCSS()`:
   - Concatenate: theme CSS + all component CSS -> `dist/styles.temp.css`
   - PostCSS minify + ghi đè `dist/styles.css` (final bundle = theme + components)
   - Cleanup: `rm dist/styles.temp.css`

**Watch Mode** (--watch flag):

- fs.watch `src/styles/` + `src/ui/`, debounce 300ms, re-run entire pipeline

**Output:**

- `dist/styles.css` - Complete bundle (globals + animations + components), minified
- `dist/styles/globals.css` - Base tokens only
- `dist/styles/animations.css` - Keyframes only
- `dist/ui/<component>/<component>.css` - Component-specific CSS, minified

**Tailwind v4:**

- Config: `packages/tinita-react/tailwind.config.cjs` (content globs only, no preset/theme - uses @theme in CSS)
- No Preflight import, just `@theme inline` in globals.css
- Post-build: Pure CSS output, no Tailwind dependency for users

---

## Module Resolution

**TypeScript Config (base.json):**

```json
{
  "moduleResolution": "Node",
  "module": "ESNext",
  "target": "ES2020"
}
```

**Path Alias (base.json):**

```json
{
  "@tinita-internal/*": "packages/core/src/*" // BROKEN - packages/core not exist
}
```

**tsconfig Inheritance:**

- tinita: extends @repo/typescript-config/base.json
- tinita-react: extends @repo/typescript-config/react-library.json + jsdom for tests
- storybook: custom tsconfig.json

---

## Turborepo Task Graph (7 Tasks)

```
┌─────────────┐
│   build     │─────────> outputs: dist/**
│ cache: yes  │
│ dependsOn:  │
│   ^build    │  (depends on parent workspaces' build)
└─────────────┘
      ▲
      │
      ├──────────────────┐
      │                  │
┌───────────┐      ┌──────────┐
│   lint    │      │  check   │
│ cache: yes      │  types   │
│ dependsOn: ^lint│ cache: yes
│ (^check-types)  │ dependsOn: ^check-types
└───────────┘      └──────────┘

┌──────────┐
│   dev    │────────> cache: false, persistent: true
│ watch    │         (dev mode, not cached)
└──────────┘

┌──────────┐
│   test   │─────────> depends on build, cache: no
│ Vitest   │         (tinita: 35 test; tinita-react: 0)
└──────────┘

┌─────────────────┐
│   storybook     │─────────> cache: false, persistent: true
│ Storybook dev   │         (watch mode)
└─────────────────┘

┌──────────────────────┐
│ build-storybook      │─────────> outputs: storybook-static/**
│ cache: yes           │
│ dependsOn: ^build    │
└──────────────────────┘
```

**Run Example:**

```bash
turbo build              # All packages sequentially per dependsOn
turbo build --filter=tinita
turbo dev                # All dev tasks in parallel
turbo lint --filter=tinita-react
```

---

## Root Scripts (13)

| Script               | Command                                              | Turbo | Notes                                                              |
| -------------------- | ---------------------------------------------------- | ----- | ------------------------------------------------------------------ |
| build                | turbo build                                          | yes   | Per-file + CSS build                                               |
| dev                  | concurrently tsup --watch + build:css --watch        | yes   | storybook dev also runs                                            |
| lint                 | turbo lint                                           | yes   | ESLint all                                                         |
| test                 | turbo test                                           | yes   | Vitest - tinita 35 test, tinita-react 0 test (`--passWithNoTests`) |
| format               | prettier --write                                     | no    | Prettier pass                                                      |
| check-types          | turbo check-types                                    | yes   | tsc --noEmit                                                       |
| storybook            | turbo run storybook --filter=@storybook/tinita       | yes   | ⚠️ BROKEN (filter sai)                                             |
| build-storybook      | turbo run build-storybook --filter=@storybook/tinita | yes   | ⚠️ BROKEN (filter sai)                                             |
| publish:tinita       | scripts/publish.mjs tinita                           | no    | Thủ công                                                           |
| publish:tinita-react | scripts/publish.mjs tinita-react                     | no    | Thủ công                                                           |
| publish:all          | scripts/publish.mjs all                              | no    | Thủ công                                                           |
| publish:dry-run      | scripts/publish.mjs --dry-run                        | no    | Thủ công                                                           |
| generate:exports     | turbo run generate:exports                           | yes   | ❌ KHÔNG TỒN TẠI                                                   |

---

## Export Strategy

### tinita

**Barrel + Subpath (both work):**

```typescript
// src/index.ts - barrel export
export * from './file/fileSize';
export * from './uuid/generateUUID';

// package.json exports
{
  ".": "./dist/index.{mjs,cjs}",
  "./file/fileSize": "./dist/file/fileSize.{mjs,cjs}",
  "./uuid/generateUUID": "./dist/uuid/generateUUID.{mjs,cjs}"
}

// Usage
import { fileSize } from 'tinita';                      // Barrel
import { fileSize } from 'tinita/file/fileSize';       // Subpath (tree-shake optimal)
```

### tinita-react

**Current (CÓ barrel - xung đột quy tắc):**

```typescript
// src/index.ts
export { useToggle, useIsomorphicLayoutEffect } from './hooks';
export * from './ui/file-tree';
export * from './ui/ping';
export * from './ui/carousel-ticker';
export { autoInjectStyles } from './utils/autoInjectStyles';

// Usage
import { useToggle } from 'tinita-react'; // Barrel (không nên per quy tắc)
import { useToggle } from 'tinita-react/hooks/useToggle'; // Subpath (đúng)
```

**Rule Says (NO barrel):** KHÔNG export từ `src/index.ts`, dùng subpath only.

**Status:** Code vi phạm quy tắc, đây là known issue.

---

## Publishing Workflow (Manual)

**Script:** `scripts/publish.mjs`

```
1. npm whoami (verify login)
2. Read package name + version từ package.json
3. npm view <package> version (kiểm tra đã publish chưa, cảnh báo nếu có)
4. cd <package>
5. pnpm run build (rebuild trước publish)
6. Verify dist/ exists
7. npm publish --dry-run (+ --no-provenance nếu không có CI env)
8. Nếu --dry-run flag: stop
9. Hỏi "Publish X@Y to npm? (yes/no)"
10. npm publish
```

**Version Management:** `scripts/update-package-versions.mjs` (thủ công)

---

## Testing Infrastructure

**Setup:**

- vitest.config.ts (root) - environment: node
- vitest.config.ts (tinita-react) - environment: jsdom

**Files:** `packages/tinita/tests/truncateFileName.test.ts` (35 test). `tinita-react`: 0 test (nợ M3).

**Convention (nếu viết tests):**

- Location: `tests/` parallel with `src/`
- Format: `*.test.ts(x)`
- Coverage target: 80%+

---

## Linting & Type Checking

**ESLint:**

- Root: `.eslintrc.cjs` (legacy, js.recommended + tseslint)
- Packages: flat config (base.js, react-internal.js, next.js)

**Prettier:**

- Config: `prettier.config.js` (delegates to preset)

**TypeScript:**

- Base: ES2020 + Node (NOT ES2022/NodeNext)
- Strict: true
- All packages extend config/typescript-config

---

## Package Thứ Ba: `tinita-dom`

Thêm 2026-09-26. Zero dependency, zero peer dependency, **browser-only**.

```
tinita-dom
├── smooth-scroll   installSmoothScroll - một listener wheel cho toàn app
└── wheel-source    classifyWheelSource + 6 hằng số đã đo (public, không phải nội bộ)
```

`smooth-scroll` import `wheel-source`, nên nó rơi chính xác vào bẫy B2: với `bundle: false`, esbuild
giữ specifier tương đối không đuôi và Node ESM báo `ERR_MODULE_NOT_FOUND`. `tsup.config.ts` của nó có
`bundle: true` + `outExtension` từ dòng đầu, và có ca chứng minh: dựng bản `bundle: false` thì
`publint` báo 4 đường dẫn gãy và `import()` throw.

Dependency graph: không có cạnh nào. Nó không phụ thuộc `tinita`, `tinita-react`, hay React.

---

## Chiến Lược Đóng Gói Dependency

**Ràng buộc từ owner (2026-09-24):** component sẽ dùng lib không đồng nhất - có component dùng
`motion`, có component không; có component dùng `antd`, có component dùng Base UI. User chỉ dùng
1-2 component **không được** phải cài toàn bộ dependency của library.

### Vì sao hiện tại chưa đạt

`dependencies` trong `package.json` là khai báo ở **cấp package**, không phải cấp entry. Package
manager giải dependency tree lúc `install`, khi đó nó chưa biết user sẽ `import` subpath nào. Nên
`npm install tinita-react` kéo mọi dependency được khai, bất kể user import subpath nào.

**Tập dependency của 3 component RỜI NHAU hoàn toàn** (đã kiểm chứng bằng grep toàn bộ `src/`):

| Component        | Dependency ngoài thật sự                     | tsup xử lý                   |
| ---------------- | -------------------------------------------- | ---------------------------- |
| `Ping`           | **không có** (chỉ type `ReactNode` từ react) | -                            |
| `CarouselTicker` | `clsx`, `tailwind-merge` (qua `utils/cn.ts`) | inline vào bundle            |
| `FileTree`       | `@radix-ui/react-accordion`, `lucide-react`  | external, import lúc runtime |

**Đã sửa 2026-09-25:** `motion ^12.23.25` từng khai trong `dependencies` mà **không file nào import** - hit duy nhất của
chuỗi "motion" trong `src/` là comment `prefers-reduced-motion` tại `src/ui/file-tree/types.ts:93`.
Nó kéo theo chuỗi `motion` -> `framer-motion` -> `motion-dom`, `motion-utils` (~4 gói) cho mọi
consumer mà không đổi lại gì.

**Giá phải trả hôm nay:** user chỉ dùng `Ping` (component 0 dependency) vẫn tải ~20 gói vào
`node_modules` (motion-family ~4 + radix-family 14 + lucide-react + clsx + tailwind-merge).

### Hệ quả của `bundle: true` + `external`

`external: ['react', 'react-dom', 'lucide-react', '@radix-ui/react-accordion', 'motion']`

- Nằm trong `external` -> giữ nguyên `import` ở output, cần có mặt trong `node_modules` lúc runtime.
- KHÔNG nằm trong `external` -> bị esbuild **inline vào bundle**. `clsx` và `tailwind-merge` rơi
  vào nhóm này, nghĩa là code của chúng đã nằm sẵn trong `dist/`. Về mặt kỹ thuật chúng không cần
  là `dependencies` cứng, có thể hạ xuống `devDependencies`.

### Vì sao export map không giải quyết được

`exports` có tách subpath (`./ui/file-tree`, `./ui/ping`, `./ui/carousel-ticker`). Đây là tách
**IMPORT** - giúp bundler của user tree-shake code. Nó **không tách INSTALL** - `node_modules` vẫn
đầy đủ mọi dependency đã khai.

Tree-shaking giảm **bytes gửi tới browser**; nó không giảm **thứ phải tải về khi cài**.

### Hướng đã chọn: A - optional peer dependencies (triển khai 2026-09-25)

**A. `peerDependencies` + `peerDependenciesMeta.optional: true` - ĐÃ LÀM**

`tinita-react` không còn khối `dependencies`. Manifest hiện tại:

```json
"peerDependencies": {
  "@radix-ui/react-accordion": ">=1.2.0",
  "lucide-react": ">=0.400.0",
  "react": ">=18.0.0"
},
"peerDependenciesMeta": {
  "@radix-ui/react-accordion": { "optional": true },
  "lucide-react": { "optional": true }
}
```

Cả 2 lib optional cũng nằm trong `devDependencies` để workspace build/typecheck/Storybook chạy được.

- Đổi lại đã chấp nhận: thiếu lib thì lỗi lúc **runtime**, không phải lúc install, và npm không
  cảnh báo về optional peer. Vì vậy bảng component -> peer trong `README.md`,
  `code-standards.md` và `codebase-summary.md` là **bắt buộc**, phải cập nhật cùng commit khi thêm
  component. Quy tắc đầy đủ: `code-standards.md` mục "Quy Tắc Dependency".
- Đo được: project cô lập (`npm pack` + `npm install`) chỉ có `react` và `tinita-react` trong
  `node_modules`. `Ping`, `CarouselTicker`, `useToggle`, `autoInjectStyles` load được;
  `FileTree` báo `Cannot find module 'lucide-react'` và load được sau khi cài 2 peer.
- Lưu ý phương pháp: **symlink vào `node_modules` không kiểm được việc này** - Node resolve ngược
  lên monorepo và tìm thấy lib, nên mọi thứ trông như chạy. Phải `npm pack`.

**B. Subpath + bỏ barrel `src/index.ts`**

- `src/index.ts` hiện re-export **mọi** component. `import { Ping } from 'tinita-react'` kéo theo
  đồ thị module của cả `file-tree` (radix + lucide) lẫn `carousel-ticker`.
- Đây là lý do **kỹ thuật** để bỏ barrel, mạnh hơn lý do "quy ước" mà docs vẫn nêu.
- Lưu ý: `apps/storybook/stories/Ping/Ping.stories.tsx:3` đang dùng barrel, 7 story còn lại dùng
  subpath - chính storybook đang vi phạm quy ước.
- B giảm được code, nhưng không thay thế A. **Chưa làm** - barrel vẫn còn (nợ #7); A đã làm nên
  việc _cài_ đã hết vấn đề, B còn lại chỉ ảnh hưởng bytes gửi tới browser.

**C. Tách nhiều package theo cụm dependency - CHƯA LÀM, và A có thể đã làm C thành không cần thiết**

- `tinita-react` (core zero-dep) + `tinita-react-antd` + `tinita-react-base` + ...
- Cô lập triệt để nhất, mỗi package khai đúng dependency của mình.
- Đổi lại: nhiều package phải version/publish/đồng bộ; user phải biết component nằm ở package nào;
  chi phí maintain tăng theo số cụm.
- Sau khi có A, lý do chính để chọn C (cô lập install) đã mất. Chỉ cân nhắc lại nếu số cụm
  foundation lớn tới mức bảng component -> peer trở nên khó tra.

**D. Registry distribution kiểu shadcn**

- User copy source component vào codebase của họ; CLI khai và cài đúng dependency cần.
- Giải quyết **triệt để** đúng bài toán này - không tồn tại khái niệm "cài cả lib".
- Đổi lại: user sở hữu source, không nhận update qua `npm update`; phải dựng và duy trì registry.

**Đã triển khai 2026-09-25:** `peerDependenciesMeta.optional` cho
`@radix-ui/react-accordion` và `lucide-react`; `tinita-react` từ 5 hard dependency
xuống **0**. Chưa dùng: `optionalDependencies`, package con, export condition theo
dependency. Ca L1 `04b-optional-peer-matrix` kiểm 6 đường nhập x 2 trạng thái peer.

---

## Bề Mặt Rò Rỉ CSS Ra Global Scope

**Ràng buộc từ owner (2026-09-24):** đã từng deploy library vào web của client và **CSS global +
Tailwind của library xung đột với CSS của client**. Đây là **sự cố production đã xảy ra**.

**TRẠNG THÁI 2026-09-26: ĐÃ BỊT HẾT.** Ca L2 `css-leak` đo 11 bề mặt, **0 rò rỉ ở CẢ HAI chế độ
layer** (trước đó: 1 ở unlayered, 4 ở layered). Ca vẫn chạy như cửa chặn hồi quy, không phải bản báo
cáo một lần. Danh sách cái gì rò rỉ và sửa thế nào ở mục "Đã bịt" dưới.

**Cập nhật 2026-09-25 - bảng cũ SAI và đã được thay.** Bảng trước được suy từ source. Nay đo trực
tiếp trên `dist/styles.css` trong Chromium thật (`compatibility/cases/l2`, ca `css-leak`). Ba điều
suy từ source không ra được:

### 1. Token `@theme inline` KHÔNG được emit vào bundle

`--color-primary`, `--radius`, `--font-sans` và bạn bè **không tồn tại** trong `dist/styles.css`
(`grep -c -- '--color-primary' dist/styles.css` = 0; `--tnt-*` = 278). Khẳng định trước đây rằng
"client dùng shadcn là va chạm chắc chắn" là **sai** - khối `@theme inline` không ship. Nó chỉ tồn
tại trong source để map sang utility lúc build.

### 2. Reset và class không prefix CÓ ship, nhưng nằm trong layer

`dist/styles.css:47` mở `@layer base` (chứa reset `* { border-color }` và `body { ... }`);
`dist/styles.css:113` mở `@layer utilities` (chứa `.animate-*`, `.transition-*`, `.interactive`).
CSS component (`FileTree.css`, `CarouselTicker.css`) thì **layerless**.

### 3. Quyết định thắng/thua là THỨ TỰ KHAI LAYER, không phải specificity

Đây là phần quan trọng nhất và chưa từng được nêu:

| Consumer                                                                           | Kết quả            | Vì sao                                                                                       |
| ---------------------------------------------------------------------------------- | ------------------ | -------------------------------------------------------------------------------------------- |
| **Không** khai `@layer` order                                                      | **Library thắng**  | `@layer base` của library được khai SAU layer của consumer, layer khai sau thắng             |
| Khai `@layer theme, base, components, utilities` trước (đúng cách Tailwind v4 làm) | **Consumer thắng** | `@layer base` của library map vào layer `base` ĐÃ KHAI, sort trước `components` của consumer |

=> **Consumer tự bảo vệ được bằng một dòng khai layer order.** Đây là cách xử lý rẻ nhất cho sự cố
đã xảy ra, và nên được đưa vào hướng dẫn cho người dùng.

### Rò rỉ THẬT, đo được (consumer có khai layer order)

| Bề mặt                                        | Trước -> Sau                                          | Nguồn                                                                                                             |
| --------------------------------------------- | ----------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `body` background                             | `rgb(10,20,30)` -> `rgb(255,255,255)`                 | `globals.css:121-126` -> dist `@layer base`                                                                       |
| `body` color                                  | `rgb(40,50,60)` -> `rgb(26,26,26)`                    | `globals.css:121-126`                                                                                             |
| `.animate-fade-in` bị **chiếm**               | `hostFade` -> `tnt-fade-in`                           | `animations.css:243` -> dist `@layer utilities`                                                                   |
| `.transition-fast`                            | `777ms` -> `200ms`                                    | `animations.css:156` -> `dist:114`                                                                                |
| `Ping` khi host KHÔNG có Tailwind             | `display: block` (đúng phải `inline-flex`)            | `Ping.tsx:45-50` viết utility thô mà bundle không ship                                                            |
| Element chủ nhà dưới `prefers-reduced-motion` | `animation 5s/spin + transition 5s` -> `0s/none + 0s` | `animations.css:538-546` `*, *::before, *::after { ... !important }`; ca L4 `reduced-motion-scope`, đo 2026-09-26 |

### Không rò rỉ như từng nghĩ - kèm lý do

| Từng khẳng định                                       | Thực tế đo được                                                                                                                  |
| ----------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| 22 token không prefix đè token consumer               | **Không ship** - xem mục 1                                                                                                       |
| `* { border-color }` đè mọi element                   | Thua `div[data-host]` về specificity khi **cùng layer** (`*` = 0,0,0)                                                            |
| `.interactive` đè `opacity` của consumer              | `dist:171` là `.interactive:hover, .interactive:focus-visible` và chỉ set `will-change` - không đụng `opacity` ở trạng thái tĩnh |
| `.tnt-carousel-ticker *` ép `box-sizing` lên children | Inline style của consumer thắng mọi stylesheet                                                                                   |

### Bề mặt chưa đo (vẫn là rủi ro, chưa xác nhận)

`.dark` không prefix; `--radix-accordion-content-height` trong keyframes public
(`FileTree.css:230,237`); `tailwind.config.cjs` thiếu `prefix`/`important`/`corePlugins.preflight`;
`src/styles/index.css` mồ côi có `@import "tailwindcss"`; `autoInjectStyles` append cuối
`document.head` (không component nào gọi nó). Pha 05 của plan phủ nhóm này.

**Điểm sáng vẫn đúng:** Preflight chính chủ KHÔNG được ship - `build-entry.css` chỉ import
`globals.css` + `animations.css`.

**Cách tái lập:** `node compatibility/run.mjs l2 --no-pack`, ca `css-leak:unlayered` và
`css-leak:layered`. Probe được chứng minh bằng ca `css-probe-proof` (chèn rule có chủ ý phải đo
được), nên bảng trống sẽ fail chứ không đọc thành "library sạch".

### Đã bịt (2026-09-26)

| Rò rỉ                                                                                      | Sửa                                                                   |
| ------------------------------------------------------------------------------------------ | --------------------------------------------------------------------- |
| `@layer base { * { @apply border-border } body { @apply bg-background text-foreground } }` | XOÁ HẲN cả khối. Nguồn của 3 rò rỉ đo được.                           |
| `color-scheme: light` trên `:root`, `dark` trên `.dark`                                    | XOÁ. Nó đổi scrollbar và form control của cả trang khách.             |
| `.dark, [data-theme='dark']` ghi lên element của host                                      | `:where(...)` - specificity 0, host luôn đè lại được                  |
| 27 class trần (18 `.animate-*`, 8 `.transition-*`, `.interactive`)                         | prefix `tnt-`. `.animate-fade-in` từng CHIẾM class cùng tên của host. |
| `@keyframes accordion-down` / `accordion-up`                                               | `tnt-accordion-down/up`. Hai tên đó là keyframes của shadcn.          |
| `@media (prefers-reduced-motion)` nhắm `*, *::before, *::after`                            | `[class*='tnt-']`                                                     |
| `.tnt-carousel-ticker *` ép `box-sizing` lên children của người dùng                       | liệt kê element của chính component                                   |
| `var(--radix-accordion-content-height)` trong keyframes public                             | bọc sau `--tnt-accordion-content-height`                              |
| Tailwind thô trong JSX của `Ping` và `CarouselTicker`                                      | CSS thật + `data-*`. `Ping` chưa từng có file CSS.                    |
| Thiếu `'use client'`                                                                       | tsup `banner` - esbuild xoá directive khỏi source                     |

Guard sau khi bịt: 10 ca tĩnh trong `packages/tinita-react/tests/styles/no-global-leak.test.ts`
(chạy trong `pnpm test`, đọc source) + ca `css-leak` của L2 (đo trong Chromium). Cả 10 guard tĩnh đã
được chứng minh bằng mutation: 10 mutation, 10 bị bắt.

---

## Quyết Định Kiến Trúc Styling (2026-09-26)

Chốt sau khi đọc cách các library lớn xử lý, và sau khi lab đo được cả 5 rò rỉ CSS
đã bịt. Ghi lại để lần sau không phải bàn lại.

### Bốn mô hình tham chiếu, và mô hình nào áp dụng được

| Library           | Styling                | Variant              | Áp dụng cho tinita?                                                                                                                                                                          |
| ----------------- | ---------------------- | -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **shadcn/ui**     | Tailwind + `cva`       | class composition    | **KHÔNG.** shadcn copy code vào repo người dùng, nên `@layer base { body {...} }` của nó là CSS của chính app đó. tinita là npm package - cùng một dòng CSS đó là ghi đè lên web người khác. |
| **GitHub Primer** | CSS Modules            | class + `data-*`     | Một phần. Họ bỏ CSS-in-JS runtime, đo được SSR nhanh hơn 55%. tinita chưa từng có CSS-in-JS nên không có gì để bỏ.                                                                           |
| **Mantine**       | CSS / CSS Modules      | class + CSS variable | **Có.** Họ ship `styles.css` **và** `styles.layer.css` - đã copy nguyên.                                                                                                                     |
| **Radix**         | unstyled, `data-state` | `data-*`             | **Có.** State expose qua `data-*`, styling là việc của CSS.                                                                                                                                  |
| **Ant Design v5** | CSS-in-JS + token      | token                | Một phần: `:where()` để hạ specificity xuống 0 - đã copy cho selector dark mode.                                                                                                             |

MUI (Emotion) và Ant Design (CSS-in-JS runtime) **không** dùng làm tham chiếu cho
styling: cả hai đang tự đi ngược khỏi runtime CSS.

### Cái đã chốt

1. **CSS thật, build-time, zero runtime.** Không CSS-in-JS. Không `styled()`.
2. **Không Tailwind bên trong package.** Không phải vì Tailwind kém - vì một npm
   package không biết consumer dùng Tailwind hay không, v3 hay v4, có scan được
   source của package hay không, và có xung đột Preflight hay không. Đo được:
   `Ping` từng nhận `display: block` thay vì `inline-flex` khi host không có
   Tailwind. Tailwind vẫn là lựa chọn tốt ở **application layer** của consumer.
3. **Bỏ Preflight đúng cách của Tailwind v4:** không import
   `tailwindcss/preflight.css`. `build-entry.css` không `@import "tailwindcss"`
   chút nào, nên không có reset nào chạm trang khách.
4. **Token = CSS variable, prefix `--tnt-`.** Theme qua
   `:where(.dark, [data-theme='dark'])` - ĐỌC quy ước của host, không định nghĩa.
5. **Variant = `data-*` attribute**, không phải chuỗi class.
   `variant × size × state × orientation` nhân thành chuỗi class dài vô hạn; một
   thuộc tính `data-` mỗi chiều thì không, và nó inspect được trong DevTools. Đã
   áp cho `CarouselTicker`: `data-orientation`, `data-overflow`.
6. **Ship hai artifact CSS.** `styles.css` không layer, `styles.layer.css` bọc
   `@layer tnt`, sinh từ cùng một nguồn nên không lệch được. Bọc layer thì CSS
   không layer của host luôn thắng - sửa component không cần `!important` - nhưng
   đánh đổi là mọi CSS không layer của host đè lên component, kể cả vô ý. Đó là
   quyết định của consumer, không phải của library.

### 7. Class global có prefix, KHÔNG CSS Modules - owner chốt 2026-09-26

Đã cân nhắc CSS Modules (cách của Primer và Mantine) và **quyết định không đổi**.
Đây là câu đã hỏi và đã trả lời - đừng mở lại mà không có lý do mới.

|                              | Class global prefix `tnt-` (đang dùng)     | CSS Modules hash tên                            | CSS Modules tên ổn định |
| ---------------------------- | ------------------------------------------ | ----------------------------------------------- | ----------------------- |
| Trùng tên với host           | gần 0, nhờ prefix + guard                  | bất khả về cơ chế                               | gần 0, như cột 1        |
| Người dùng override bằng CSS | **được** - nhắm `.tnt-filetree__label`     | **không** - chỉ còn CSS variable và `className` | được                    |
| Cài đặt cho người dùng       | một lần `import 'tinita-react/styles.css'` | như cột 1                                       | như cột 1               |
| Chi phí đổi                  | 0                                          | đổi pipeline CSS, 3 component, contract của lab | như cột giữa            |

Ba lý do chốt cột 1:

1. **Rò rỉ đo được đang là 0** trên 11 bề mặt, cả hai chế độ layer. CSS Modules
   không sửa vấn đề nào đang tồn tại - nó đổi lớp bảo vệ từ "prefix + guard" sang
   "cơ chế". Cái giá là một migration, và cái được là đóng một lớp rủi ro đã đo
   bằng 0.
2. **Hash tên thu hẹp bề mặt tuỳ biến của người dùng.** Một design system npm tồn
   tại để nhiều project consume, và các project đó sẽ cần sửa thứ ta không lường
   trước. `.tnt-filetree__label` là hợp đồng công khai; hash thì không có hợp đồng.
3. **CSS Modules + tên ổn định** (cách Mantine làm) trả toàn bộ chi phí migration
   để nhận lại đúng mức chống trùng của cột 1 - vì tên lại ổn định. Chỉ còn lợi thế
   colocation, và colocation ta đã có: `FileTree.tsx` nằm cạnh `FileTree.css`.

Cái **thay thế** CSS Modules ở đây là kỷ luật, và nó đã có răng: 10 guard tĩnh
trong `tests/styles/no-global-leak.test.ts` (chạy mỗi `pnpm test`, cả 10 chứng minh
bằng mutation) cộng ca `css-leak` của L2 đo thật trong Chromium. Nếu một ngày số
component tăng đến mức guard không theo được, đó mới là lúc mở lại - và khi đó phải
quyết tên ổn định trước, vì nó là thứ người dùng phụ thuộc.

---

## Target Architecture (Định Hướng - Chưa Triển Khai)

### Phân Tầng (Future)

```
tokens (CSS variables + design system)
  ↓
core/primitives (utility functions, Slot, Portal, cn)
  ↓
react (8-12 core components: Button, Input, Select, Dialog, etc.)
  ↓
blocks (complex components: DataTable, FilterBar, Form)
  ↓
registry (shadcn-style distribution model)
```

### CSS Strategy (Future)

**6 Nguyên Tắc:**

1. No Preflight - tránh global reset
2. Prefix utilities - `tnt-` trên tất cả Tailwind classes
3. Namespace tokens - CSS variables, không hard-code
4. CSS layers - organize into layers (resets, tokens, components, overrides)
5. className escape hatch - allow consumer override
6. Semantic variants - `<Button variant="primary" />` not `className="..."`

**Current Status:**

- ✓ Prefix tnt- (done)
- ✓ CSS variables (done)
- ✓ className prop (done)
- ❌ No Preflight (check needed)
- ❌ CSS layers (not implemented)
- ❓ Semantic variants (partial)

### Foundation Choice

- **Primitive:** Base UI (@base-ui/react) - headless, MIT
- **Distribution:** shadcn-as-reference (not dependency)
- **Scope:** 8-12 components chất lượng cao khởi đầu

---

## Known Issues (5)

### 1. Storybook Script Filter Sai Scope

- **Root script:** `pnpm storybook` / `pnpm build-storybook`
- **Filter:** `--filter=@storybook/tinita`
- **Actual package name:** `@tinita/storybook`
- **Result:** Filter matches 0 packages, script fails
- **Fix:** Change filter to `--filter=storybook` or `--filter=@tinita/storybook`, and check script name

### 2. Storybook Task Cannot Run

- **Even if filter fixed**, turbo task `storybook` calls non-existent script
- **apps/storybook has:** `dev`, `build-storybook`, `lint`, `check-types`
- **No script named:** `storybook`
- **Fix:** Either create `storybook` script, or run `pnpm dev` directly in apps/storybook

### 3. generate:exports Script Not Exists

- **Root script:** `pnpm generate:exports`
- **Calls:** `turbo run generate:exports`
- **Issue:** Task không tồn tại, file `scripts/generate-package-exports.mjs` không có
- **Reality:** Exports maintain thủ công trong package.json, tsup tự khám phá via glob
- **Fix:** Remove script hoặc implement nó

### 4. TypeScript Config Path Alias Dead

- **File:** `config/typescript-config/base.json`
- **Alias:** `@tinita-internal/*` -> `packages/core/src/*`
- **Issue:** `packages/core` không tồn tại
- **Impact:** Không ai dùng prefix này nên chưa throw, nhưng alias dead
- **Fix:** Remove alias hoặc tạo packages/core

### 5. ESLint next Preset Named Export Sai

- **File:** `config/eslint-config/next.js`
- **ĐÃ VÁ 2026-09-25.** Import cũ: `{ config as baseConfig } from './base.js'`
- **Issue:** base.js chỉ có default export. `config/ui/eslint.config.mjs` mắc cùng lỗi và làm lint gãy thật
- **Impact:** Throw nếu preset next được dùng
- **Status:** Không xác minh ai dùng preset next
- **Fix:** Import default instead: `import baseConfig from './base.js'`

---

## Data Flow

### Development Loop

```
Developer edits src/file.ts
          │
          ▼
Turbo detects change (watch mode via tsup --watch)
          │
          ▼
tsup recompiles:
  └─ Reads src/
  └─ Outputs dist/{cjs,mjs,d.ts}
          │
          ▼
Browser hot-reload (if dev server running)
          │
          ▼
Developer sees changes
```

### CSS Build Flow (tinita-react)

```
Developer edits src/styles/globals.css
          │
          ▼
build-css.mjs watch detects change
          │
          ▼
Step 1-5 execute:
  1. Copy globals
  2. Copy animations
  3. PostCSS theme
  4. PostCSS components
  5. Bundle + minify
          │
          ▼
dist/styles.css updated
          │
          ▼
Browser sees new CSS
```

### Publishing Flow

```
pnpm publish:tinita
          │
          ▼
scripts/publish.mjs executes:
  1. npm whoami (verify)
  2. Check version conflict
  3. cd packages/tinita
  4. pnpm build
  5. npm publish --dry-run
  6. Confirm prompt
  7. npm publish
          │
          ▼
Package live on NPM
```

---

## Performance Considerations

### Bundle Size

**Per-file Builds:**

- tinita: Each utility ~500 bytes gzipped
- tinita-react: Components bundled (runtime deps require bundling)

**Tree-shaking Effectiveness:**

- Subpath import: `tinita/file/fileSize` -> only fileSize shipped
- Barrel import: `tinita` -> all utilities shipped (tree-shake off if any used)

### Build Times

**Dev:** Incremental via tsup watch (fast)
**Production:** Sequential per turbo dependsOn (cached)

---

## Related Documentation

- [project-overview-pdr.md](./project-overview-pdr.md) - Vision, roadmap, requirements
- [codebase-summary.md](./codebase-summary.md) - Current state snapshot
- [code-standards.md](./code-standards.md) - Coding conventions
- [naming-guidelines.md](./naming-guidelines.md) - Naming & colocation detailed
- [ARCHITECTURE.md](../ARCHITECTURE.md) - Principles and compliance rules
- [CONTRIBUTING.md](../CONTRIBUTING.md) - Contribution workflow
