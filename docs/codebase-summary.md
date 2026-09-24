# Codebase Summary

Cập nhật: 2026-09-24 (vòng 2) · commit 0a1dd88

---

## Overview

Tinita là monorepo với framework-agnostic utilities (tinita) + React hooks + UI components (tinita-react), build bằng Turborepo + pnpm + tsup, CSS build qua PostCSS + Tailwind v4.

**Metrics:**
- 6 workspace members
- 4 utilities + 2 hooks + 3 UI components
- 13 root scripts (1 hỏng, 1 không tồn tại)
- 7 turbo tasks
- 0 tests (vitest wired nhưng chưa dùng)
- 0 CI/CD (release thủ công)

---

## Workspace Members (6)

```
tinita/
├── packages/tinita                v0.0.1 - 4 utilities
├── packages/tinita-react          v0.0.2-alpha.1 - 2 hooks + 3 components + CSS
├── apps/storybook                 @tinita/storybook private - Storybook 10.1.4
├── config/eslint-config           @repo/eslint-config
├── config/typescript-config       @repo/typescript-config
└── config/ui                      @repo/ui - shared React components
```

---

## Packages

### tinita (v0.0.1)

**4 Utilities** - Framework-agnostic, zero dependencies.

| Utility | File | Mục đích |
|---------|------|---------|
| `fileSize` | `src/file/fileSize.ts` | Format bytes to human-readable (KB/MB) |
| `getFileNameParts` | `src/file/getFileNameParts.ts` | Parse filename into name + extension |
| `truncateFileName` | `src/file/truncateFileName.ts` | Shorten long filenames |
| `generateUUID` | `src/uuid/generateUUID.ts` | Cross-platform UUID v4 |

**Exports (4 subpath):**
```json
{
  ".": "./dist/index.{cjs,mjs}",
  "./file/fileSize": "./dist/file/fileSize.{cjs,mjs}",
  "./file/getFileNameParts": "./dist/file/getFileNameParts.{cjs,mjs}",
  "./file/truncateFileName": "./dist/file/truncateFileName.{cjs,mjs}",
  "./uuid/generateUUID": "./dist/uuid/generateUUID.{cjs,mjs}"
}
```

**Build:** tsup, `bundle: false`, `splitting: false`, minified, dts, cjs+esm.

---

### tinita-react (v0.0.2-alpha.1)

**2 Hooks + 3 Components** + CSS (Tailwind v4 + CSS variables).

#### Hooks (2)

| Hook | File | Mục đích |
|------|------|---------|
| `useToggle` | `src/hooks/useToggle.ts` | Boolean toggle state |
| `useIsomorphicLayoutEffect` | `src/hooks/useIsomorphicLayoutEffect.ts` | Browser/SSR safe layoutEffect |

#### Components (3)

| Component | Folder | Mô tả |
|-----------|--------|-------|
| `FileTree` | `src/ui/file-tree/` | File/folder tree view với icon, expand/collapse |
| `Ping` | `src/ui/ping/` | Activity/loading indicator (Ping animation) |
| `CarouselTicker` | `src/ui/carousel-ticker/` | Auto-scroll carousel |

#### Colocation Pattern (3/3 ✓)

**Mẫu chuẩn (được tuân thủ):**
```
src/ui/FileTree/
  ├── FileTree.tsx           # Main component (đúng, tên file riêng)
  ├── FileTree.css           # Styles (CSS variables + Tailwind)
  ├── types.ts               # Type definitions
  ├── utils/                 # Component utilities
  ├── components/            # Private subcomponents (FileLabel, FolderNode, TreeNodes, etc.)
  └── index.ts               # Re-export only (đúng, là .ts không phải .tsx)
```

**Exports (9 subpath):**
```json
{
  ".": "./dist/index.{cjs,mjs}",
  "./hooks/useToggle": "./dist/hooks/useToggle.{cjs,mjs}",
  "./hooks/useIsomorphicLayoutEffect": "./dist/hooks/useIsomorphicLayoutEffect.{cjs,mjs}",
  "./ui/file-tree": "./dist/ui/file-tree/index.{cjs,mjs}",
  "./ui/ping": "./dist/ui/ping/index.{cjs,mjs}",
  "./ui/carousel-ticker": "./dist/ui/carousel-ticker/index.{cjs,mjs}",
  "./utils/autoInjectStyles": "./dist/utils/autoInjectStyles.{cjs,mjs}",
  "./styles.css": "./dist/styles.css",
  "./styles/animations.css": "./dist/styles/animations.css"
}
```

**Chú ý:** KHÔNG có export `./hooks` hay `./ui` - phải import từng file (quy tắc NO barrel).

#### Dependencies

**Peer:** `react >=18.0.0`

**Runtime:** (5 hard dependencies - tất cả phải cài bất kể dùng component nào)
- `@radix-ui/react-accordion ^1.2.12` - FileTree component
- `clsx ^2.1.1` - Class name utility
- `lucide-react ^0.555.0` - Icons for FileTree
- `motion ^12.23.25` - (KHÔNG DÙNG ĐÂUUU - dep chết)
- `tailwind-merge ^3.4.0` - Merge Tailwind classes

**Component -> Runtime Dependency (thực tế):**

| Component | Dep ngoài | Ghi chú |
|-----------|----------|--------|
| `Ping` | - | Zero dependencies |
| `CarouselTicker` | clsx, tailwind-merge | Bundled (inline vào dist) |
| `FileTree` | @radix-ui/react-accordion, lucide-react | Externalized (import lúc runtime) |

**Issue:** Motion không ai dùng, nhưng vẫn phải cài. Ping chỉ cần 0 dep nhưng user phải cài cả 5. Định hướng: chuyển sang optional peer deps (xem `docs/system-architecture.md` mục "Dependency Packing Strategy").

**Dev:** tailwindcss, @tailwindcss/postcss, postcss tools, testing libraries, concurrently, etc.

#### CSS Build Pipeline

**Script:** `packages/tinita-react/scripts/build-css.mjs`

**Main Build Steps** (script logs: Step 1, 1.5, 2, 3, 4):
1. Copy `src/styles/globals.css` -> `dist/styles/globals.css`
1.5. Copy `src/styles/animations.css` -> `dist/styles/animations.css`
2. PostCSS compile `src/styles/build-entry.css` -> theme CSS (dùng `tailwind.config.cjs`)
3. PostCSS compile `src/ui/**/*.css` -> component CSS, minified (fallback copy thô nếu lỗi)
4. Bundle stage: nối theme + components -> `dist/styles.temp.css` -> minify -> ghi đè `dist/styles.css` (bundle cuối)

**Watch Mode** (--watch flag):
- fs.watch `src/styles/` + `src/ui/`, debounce 300ms, re-run entire pipeline

**Output:**
- `dist/styles.css` - Complete bundle (globals + animations + components), minified
- `dist/styles/globals.css` - Base tokens only
- `dist/styles/animations.css` - Keyframes only
- `dist/ui/<component>/<component>.css` - Component-specific CSS, minified

**Tailwind v4:** CSS-only (no @apply bundling), `@theme inline` trong `globals.css`, cần `tailwind.config.cjs` (chỉ dùng content globs).

#### Storybook

**Version:** 10.1.4  
**Builder:** @storybook/react-vite, Vite 7.2.6

**Stories (4 folder):**
- `stories/FileTree/` - 6 stories (FileTree, accessibility, nojs, responsive, rtl, themes)
- `stories/Ping/` - 1 story (Ping.stories.tsx)
- `stories/CarouselTicker/` - 1 story (CarouselTicker.stories.tsx)
- `stories/Animations/` - 1 story (Animations.stories.tsx)

**Alias:** `tinita-react` -> source mapping commented out (tiêu thụ dist, không source).

**Run:** `pnpm dev` hay `pnpm storybook` (cách thứ 2 hỏng).

---

## Config Packages (3)

### @repo/eslint-config

**Exports:**
- `./base` -> base.js (flat config, js.recommended + tseslint.recommended + turbo plugin)
- `./react-internal` -> react-internal.js (base + react + react-hooks)
- `./next-js` -> next.js (next/core-web-vitals + react-hooks)

**Known Issue:** next.js imports `{ config as baseConfig }` từ `./base.js`, nhưng base.js là default export (named export không có) -> throw khi next preset dùng.

### @repo/typescript-config

**Presets (as file trực tiếp, không exports field):**
- `base.json` - target ES2020, module ESNext, moduleResolution **Node** (KHÔNG NodeNext), strict true, declaration true
- `react-library.json` - extends base + jsx: react-jsx
- `nextjs.json` - extends base + moduleResolution Bundler, allowJs true, noEmit true
- `vue-library.json` - extends base + jsx: preserve

**Known Issue:** tsconfig base có path alias `@tinita-internal/*` -> `packages/core/src/*`, nhưng `packages/core` không tồn tại.

### @repo/ui

**Exports:** `./*` -> `./src/*.tsx`  
**Components:** button.tsx, card.tsx, code.tsx  
**Scripts:** lint, check-types, `generate:component` (turbo gen).

---

## Root Scripts (13)

| Script | Status | Mục đích |
|--------|--------|---------|
| build | ✓ | tsup + postcss, all packages |
| dev | ✓ | concurrently tsup --watch + build:css --watch + storybook dev |
| lint | ✓ | ESLint all packages |
| test | ✓ | Vitest all packages |
| format | ✓ | Prettier --write `**/*.{ts,tsx,md}` |
| check-types | ✓ | tsc --noEmit all packages |
| storybook | ⚠️ | turbo run storybook --filter=@storybook/tinita (filter sai, task chạy hỏng) |
| build-storybook | ⚠️ | turbo run build-storybook --filter=@storybook/tinita (filter sai) |
| publish:tinita | ✓ | scripts/publish.mjs tinita |
| publish:tinita-react | ✓ | scripts/publish.mjs tinita-react |
| publish:all | ✓ | scripts/publish.mjs all |
| publish:dry-run | ✓ | scripts/publish.mjs --dry-run |
| generate:exports | ❌ | Không tồn tại (hỏng, nên gỡ) |

---

## Turborepo Tasks (7)

| Task | dependsOn | Outputs | Cache | Note |
|------|-----------|---------|-------|------|
| build | ^build | dist/** | yes | Inputs: $TURBO_DEFAULT$, .env* |
| lint | ^lint | - | yes | |
| check-types | ^check-types | - | yes | |
| dev | - | - | no | persistent: true |
| test | build | - | no | |
| storybook | - | - | no | persistent: true |
| build-storybook | ^build | storybook-static/** | yes | |

**Chú ý:** Không có task `generate:exports`.

---

## Naming Convention

| Loại | Quy tắc | Ví dụ |
|------|--------|-------|
| Directory | kebab-case | `src/ui/file-tree/`, `src/file/` |
| File (utility) | camelCase.ts | `fileSize.ts`, `generateUUID.ts` |
| File (component) | PascalCase.tsx | `FileTree.tsx`, `Ping.tsx` |
| File (private) | camelCase.ts | `utils.ts`, `parser.ts` |
| CSS Class | BEM + `tinita-` prefix | `tinita-filetree__label--folder`, `tinita-ping__pulse` |
| CSS Variable | `tinita-*` | `tinita-primary`, `tinita-radius-md`, `tinita-ease-in-out` |

---

## CSS Architecture

**Tailwind v4:**
- `src/styles/globals.css` - `@theme inline`, `@apply border-border`
- `src/styles/animations.css` - @keyframes (tinita-fade-in, tinita-slide-up, etc.)
- Component CSS (`CarouselTicker.css`, `FileTree.css`) - CSS variables, không @apply

**Token Prefix:** `tinita-` xuyên suốt
- Colors: `tinita-primary`, `tinita-background`, `tinita-border`
- Spacing/Radius: `tinita-radius-sm`, `tinita-radius-md`, `tinita-radius-lg`
- Animation: `tinita-ease-in`, `tinita-ease-out`, `tinita-duration-300`
- Motion (spring): `tinita-spring-tight`, `tinita-spring-default` (damping, mass, stiffness)
- Backdrop: `tinita-backdrop-*`

**Build Output:**
- `dist/styles.css` - Bundle cuối (globals + animations + components)
- `dist/styles/globals.css` - Base tokens
- `dist/styles/animations.css` - Keyframes
- `dist/ui/<component>/<component>.css` - Component styles riêng

---

## Testing Status

**Current:** 0 tests

**Setup:** Vitest configs tồn tại (`vitest.config.ts` root, `vitest.config.ts` tinita-react)
- Root: environment node, globals true, coverage v8, exclude node_modules|dist|*.d.ts
- tinita-react: environment jsdom, globals true

**No test files:** Zero `*.test.ts`, `*.test.tsx`, `*.spec.ts` dưới packages/

---

## Known Issues (9)

1. **Storybook script lỗi** - Root script `pnpm storybook` / `pnpm build-storybook` filter `--filter=@storybook/tinita`, nhưng package tên thật là `@tinita/storybook` (scope đảo) -> filter khớp 0 package.

2. **Storybook task không chạy** - Dù sửa filter, turbo task `storybook` vẫn lỗi vì `apps/storybook` không có script tên `storybook` (chỉ có `dev`, `build-storybook`, `lint`, `check-types`).

3. **generate:exports script không tồn tại** - Root script gọi turbo task không tồn tại. File `scripts/generate-package-exports.mjs` không có ở repo. Exports maintain thủ công.

4. **tsconfig base path alias chết** - `@tinita-internal/*` -> `packages/core/src/*`, nhưng `packages/core` không tồn tại. Không ai dùng prefix này nên lỗi chưa phát hiện.

5. **ESLint next preset export sai** - `@repo/eslint-config/next.js` import `{ config as baseConfig }` từ `./base.js`, nhưng `base.js` chỉ có default export -> named import throw nếu preset next được dùng. Chưa xác minh ai dùng preset next.

6. **`motion` là dependency CHẾT** - `package.json` khai trong `dependencies`, nhưng không file nào import. Hit duy nhất là comment "prefers-reduced-motion" ở `src/ui/file-tree/types.ts:93`. Kéo ~4 gói vào node_modules.

7. **`cn.ts` không có subpath export** - Build ra `dist/utils/cn.*` nhưng KHÔNG có `exports` trong `package.json` -> file tồn tại trên đĩa nhưng không import được chính thức. Hoặc thêm export, hoặc loại khỏi tsup entry.

8. **Ping Storybook dùng barrel** - `apps/storybook/stories/Ping/Ping.stories.tsx:3` dùng `import { Ping } from 'tinita-react'` (barrel), nhưng 7 story khác dùng subpath. Vi phạm quy ước NO barrel.

9. **`src/styles/index.css` là file mồ côi** - File có `@import "tailwindcss"` nhưng KHÔNG trong build pipeline (build-css.mjs:23 chỉ compile `build-entry.css`), không có trong exports. Không file nào reference nó. Nên gỡ hoặc nêu rõ mục đích.

10. **`autoInjectStyles` không component nào gọi** - Util tồn tại (`src/utils/autoInjectStyles.ts`), có SSR guard + chống trùng, nhưng grep chỉ ra 2 hit: định nghĩa + `src/index.ts:11` re-export. Docs cũ mô tả nó như cơ chế đang hoạt động - SAI, nó chết về runtime.

11. **`dist/` chưa từng được build** - `packages/*/dist` không tồn tại. Config + script tồn tại nhưng build lần đầu cần chạy `pnpm build` hoặc `turbo build` từ root.

---

## Dependency Graph

```
storybook
  └── tinita-react (workspace:*)
       ├── @radix-ui/react-accordion ^1.2.12
       ├── clsx ^2.1.1
       ├── lucide-react ^0.555.0
       ├── motion ^12.23.25
       └── tailwind-merge ^3.4.0

tinita
  └── (zero dependencies)

config/ui
  └── react, react-dom (dev)

config/eslint-config, config/typescript-config
  └── (no runtime deps)
```

---

## Files Cấu Trúc

- Root `README.md` (khoảng 200 dòng)
- Root `ARCHITECTURE.md`, `CONTRIBUTING.md`, `CLAUDE.md`, `CODE_OF_CONDUCT.md`, `DOCUMENT_REQUIRED.md`
- `docs/` - project-overview-pdr.md, codebase-summary.md (đây), code-standards.md, system-architecture.md, naming-guidelines.md, project-roadmap.md, design-guidelines.md
- `pnpm-workspace.yaml` - packages/*, apps/*, config/*
- `turbo.json` - 7 tasks
- `package.json` - 13 root scripts
- `.eslintrc.cjs` - legacy ESLint config
- `prettier.config.js` - uỷ quyền preset ngoài
- `postcss.config.mjs` (apps/storybook)
- `.gitattributes` - eol enforcement (lf/crlf)

---

## CI/CD

**Không có.**
- Không `.github/workflows/`
- Không `.changeset/`
- Release: thủ công qua `scripts/publish.mjs`
- Version update: thủ công qua `scripts/update-package-versions.mjs`
