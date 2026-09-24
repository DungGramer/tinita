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
       ├── motion ^12.23.25
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

**tinita (bundle: false = tree-shakeable)**

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
  bundle: false,        // CRITICAL: no bundling, each file separate
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
  "@tinita-internal/*": "packages/core/src/*"  // BROKEN - packages/core not exist
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
│ Vitest   │         (0 test files currently)
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

| Script | Command | Turbo | Notes |
|--------|---------|-------|-------|
| build | turbo build | yes | Per-file + CSS build |
| dev | concurrently tsup --watch + build:css --watch | yes | storybook dev also runs |
| lint | turbo lint | yes | ESLint all |
| test | turbo test | yes | Vitest (0 tests) |
| format | prettier --write | no | Prettier pass |
| check-types | turbo check-types | yes | tsc --noEmit |
| storybook | turbo run storybook --filter=@storybook/tinita | yes | ⚠️ BROKEN (filter sai) |
| build-storybook | turbo run build-storybook --filter=@storybook/tinita | yes | ⚠️ BROKEN (filter sai) |
| publish:tinita | scripts/publish.mjs tinita | no | Thủ công |
| publish:tinita-react | scripts/publish.mjs tinita-react | no | Thủ công |
| publish:all | scripts/publish.mjs all | no | Thủ công |
| publish:dry-run | scripts/publish.mjs --dry-run | no | Thủ công |
| generate:exports | turbo run generate:exports | yes | ❌ KHÔNG TỒN TẠI |

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
import { useToggle } from 'tinita-react';                      // Barrel (không nên per quy tắc)
import { useToggle } from 'tinita-react/hooks/useToggle';     // Subpath (đúng)
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

## Testing Infrastructure (0 Tests)

**Setup:**
- vitest.config.ts (root) - environment: node
- vitest.config.ts (tinita-react) - environment: jsdom

**Files:** 0 test files currently

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

## Chiến Lược Đóng Gói Dependency

**Ràng buộc từ owner (2026-09-24):** component sẽ dùng lib không đồng nhất - có component dùng
`motion`, có component không; có component dùng `antd`, có component dùng Base UI. User chỉ dùng
1-2 component **không được** phải cài toàn bộ dependency của library.

### Vì sao hiện tại chưa đạt

`dependencies` trong `package.json` là khai báo ở **cấp package**, không phải cấp entry. Package
manager giải dependency tree lúc `install`, khi đó nó chưa biết user sẽ `import` subpath nào. Nên
`npm install tinita-react` luôn kéo cả 5 dependency.

**Tập dependency của 3 component RỜI NHAU hoàn toàn** (đã kiểm chứng bằng grep toàn bộ `src/`):

| Component | Dependency ngoài thật sự | tsup xử lý |
|---|---|---|
| `Ping` | **không có** (chỉ type `ReactNode` từ react) | - |
| `CarouselTicker` | `clsx`, `tailwind-merge` (qua `utils/cn.ts`) | inline vào bundle |
| `FileTree` | `@radix-ui/react-accordion`, `lucide-react` | external, import lúc runtime |

`motion ^12.23.25` khai trong `dependencies` nhưng **không file nào import**. Hit duy nhất của
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
đầy đủ 5 dependency.

Tree-shaking giảm **bytes gửi tới browser**; nó không giảm **thứ phải tải về khi cài**.

### Bốn hướng xử lý (chưa chốt - đây là lựa chọn của owner)

**A. `peerDependencies` + `peerDependenciesMeta.optional: true`**
- Chuyển `@radix-ui/react-accordion`, `lucide-react` (và sau này `antd`, `@base-ui/react`) sang
  optional peer. User chỉ cài lib mà component họ dùng cần.
- Đổi lại: user phải biết component nào cần lib gì -> **bắt buộc có bảng component -> dependency
  trong README**, nếu không DX rất tệ. Thiếu lib thì lỗi lúc runtime, không lỗi lúc install.
- Hiện `peerDependencies` chỉ có `react >=18.0.0`, chưa có `peerDependenciesMeta` nào.

**B. Subpath + bỏ barrel `src/index.ts`**
- `src/index.ts` hiện re-export **mọi** component. `import { Ping } from 'tinita-react'` kéo theo
  đồ thị module của cả `file-tree` (radix + lucide) lẫn `carousel-ticker`.
- Đây là lý do **kỹ thuật** để bỏ barrel, mạnh hơn lý do "quy ước" mà docs vẫn nêu.
- Lưu ý: `apps/storybook/stories/Ping/Ping.stories.tsx:3` đang dùng barrel, 7 story còn lại dùng
  subpath - chính storybook đang vi phạm quy ước.
- B giảm được code, nhưng không thay thế A. **A và B bổ sung cho nhau, cả hai làm được ngay.**

**C. Tách nhiều package theo cụm dependency**
- `tinita-react` (core zero-dep) + `tinita-react-antd` + `tinita-react-base` + ...
- Cô lập triệt để nhất, mỗi package khai đúng dependency của mình.
- Đổi lại: nhiều package phải version/publish/đồng bộ; user phải biết component nằm ở package nào;
  chi phí maintain tăng theo số cụm.

**D. Registry distribution kiểu shadcn**
- User copy source component vào codebase của họ; CLI khai và cài đúng dependency cần.
- Giải quyết **triệt để** đúng bài toán này - không tồn tại khái niệm "cài cả lib".
- Đổi lại: user sở hữu source, không nhận update qua `npm update`; phải dựng và duy trì registry.

**Chưa có cơ chế nào trong số này được triển khai.** Không `optionalDependencies`, không
`peerDependenciesMeta.optional`, không package con, không export condition.

---

## Bề Mặt Rò Rỉ CSS Ra Global Scope

**Ràng buộc từ owner (2026-09-24):** đã từng deploy library vào web của client và **CSS global +
Tailwind của library xung đột với CSS của client**. Đây là **sự cố production đã xảy ra**, không
phải rủi ro giả định.

Nguyên tắc bị vi phạm: *library không được sở hữu global CSS của consumer*.

| Bề mặt rò rỉ | file:dòng | Ảnh hưởng tới client |
|---|---|---|
| Reset tự viết `@layer base { * { @apply border-border } body { @apply bg-background text-foreground } }` | `src/styles/globals.css:116-127` | `*` set `border-color` lên mọi element; `body` đổi nền/chữ/font-smoothing toàn trang |
| 22 token KHÔNG prefix trong `@theme inline` | `src/styles/globals.css:81-111` | Ghi vào namespace `--color-*`/`--radius*`/`--spacing-*`/`--font-*` **Tailwind v4 dành riêng**, đồng thời trùng khít bộ token chuẩn **shadcn/ui** (`background`, `primary`, `border`, `ring`...) |
| 27 class KHÔNG prefix: 18 `.animate-*`, 8 `.transition-*`, `.interactive` | `src/styles/animations.css:114-318` | Tên chung chung, đụng class của client; `.animate-*` đụng thẳng utility `animate-*` của Tailwind bên client |
| Selector `.dark` không prefix | `globals.css:54-76`, `animations.css:213,224,234`, `FileTree.css:42,487,493,499,505` | `.dark` là convention dark-mode chuẩn của Tailwind; client toggle dark mode của họ thì token tinita cũng fire |
| `*, *::before, *::after { ... !important }` trong reduced-motion | `src/styles/animations.css:530-539` | Universal + `!important`, không scope, đè mọi xử lý reduced-motion của client |
| `FileTree.css` và `CarouselTicker.css` nằm NGOÀI mọi `@layer` | cả 2 file, 0 match `@layer` | Theo spec cascade layers, CSS không thuộc layer nào **luôn thắng** CSS trong layer của client. Client muốn override phải đấu specificity hoặc `!important` |
| `.tinita-carousel-ticker * { box-sizing: border-box }` (+ bản `!important`) | `CarouselTicker.css:15-17, 20-25` | Ép style lên **mọi children client truyền vào** `<CarouselTicker>` |
| Tailwind utility thô trong JSX | `Ping.tsx:45-50`, `CarouselTicker.tsx:211-291` | `build-entry.css` không `@import "tailwindcss"` nên `dist/styles.css` KHÔNG ship utility. 2 component này chỉ hiển thị đúng nếu **host** có Tailwind với đúng version/theme, và content-scan quét tới `node_modules/tinita-react` |
| `--radix-accordion-content-height` trong keyframes public | `FileTree.css:230,237` | Biến nội bộ của Radix thành phụ thuộc ngầm trong contract CSS công khai; đổi foundation sẽ vỡ keyframes |
| `tailwind.config.cjs` thiếu hàng rào | toàn file (17 dòng) | Không có `prefix`, không có `important`, không có `corePlugins.preflight: false` |
| `src/styles/index.css` có `@import "tailwindcss"` | `src/styles/index.css:8` | File mồ côi - `build-css.mjs:23` chỉ compile `build-entry.css`, không có trong `exports`, không ai reference. Chưa rò rỉ hôm nay nhưng là mìn chờ |
| `autoInjectStyles` append cuối `document.head` | `src/utils/autoInjectStyles.ts:22-25` | Load sau stylesheet của client -> thắng theo thứ tự nguồn khi cùng specificity. Có SSR guard và chống trùng id, nhưng không tự gỡ khi unmount. **Hiện không component nào gọi** |

**Điểm sáng:** Preflight chính chủ của Tailwind KHÔNG được ship - `build-entry.css` chỉ import
`globals.css` + `animations.css`, không `@import "tailwindcss"`. Nhưng block reset tự viết ở hàng
đầu bảng gây hậu quả tương đương trên đúng những property hay va chạm nhất.

**Giới hạn kiểm chứng:** không verify được trên `dist/` vì `packages/*/dist` chưa từng được build
và `postcss-cli` không có trong `node_modules/.bin`. Các kết luận trên dựa trên đọc source +
logic `build-css.mjs`; riêng 3 mục đầu bảng đã được grep xác minh trực tiếp trên source.

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
2. Prefix utilities - `tinita-` trên tất cả Tailwind classes
3. Namespace tokens - CSS variables, không hard-code
4. CSS layers - organize into layers (resets, tokens, components, overrides)
5. className escape hatch - allow consumer override
6. Semantic variants - `<Button variant="primary" />` not `className="..."`

**Current Status:**
- ✓ Prefix tinita- (done)
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
- **Import:** `{ config as baseConfig } from './base.js'`
- **Issue:** base.js only has default export (no named export `config`)
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
