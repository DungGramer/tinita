# Code Standards & Conventions

Cập nhật: 2026-09-24 (vòng 2) · commit 0a1dd88

---

## Overview

Tài liệu này định nghĩa chuẩn code, tổ chức file, naming convention cho Tinita. Phân tách rõ giữa **Hiện Trạng** (code đang áp dụng) và **Định Hướng** (quy tắc mong muốn từ design-brief).

---

## File Organization

### Monorepo Structure

```
tinita/
├── packages/
│   ├── tinita                (4 utilities)
│   └── tinita-react          (2 hooks + 3 components + CSS)
├── apps/storybook            (Storybook 10.1.4)
├── config/
│   ├── eslint-config
│   ├── typescript-config
│   └── ui
├── scripts/
│   ├── publish.mjs
│   └── update-package-versions.mjs
└── docs/
```

### Package Structure: tinita

```
packages/tinita/
├── src/
│   ├── file/
│   │   ├── fileSize.ts                # One file = one utility
│   │   ├── getFileNameParts.ts
│   │   └── truncateFileName.ts
│   ├── uuid/
│   │   └── generateUUID.ts
│   └── index.ts                       # Barrel export (re-exports tất cả)
├── dist/
├── package.json
├── tsup.config.ts
└── tsconfig.json
```

### Package Structure: tinita-react

**Hiện Trạng:**

```
packages/tinita-react/
├── src/
│   ├── hooks/
│   │   ├── index.ts                   # Barrel export
│   │   ├── useToggle.ts               # One file = one hook
│   │   └── useIsomorphicLayoutEffect.ts
│   ├── ui/
│   │   ├── index.ts                   # Barrel export
│   │   ├── file-tree/
│   │   │   ├── FileTree.tsx           # Main component (PascalCase, tên file riêng)
│   │   │   ├── FileTree.css           # CSS (CSS variables + Tailwind)
│   │   │   ├── types.ts               # Type definitions
│   │   │   ├── utils/                 # Utilities riêng component
│   │   │   ├── components/            # Private subcomponents
│   │   │   └── index.ts               # Re-export ONLY (đúng, là .ts không .tsx)
│   │   ├── ping/
│   │   │   ├── Ping.tsx
│   │   │   └── index.ts
│   │   └── carousel-ticker/
│   │       ├── CarouselTicker.tsx
│   │       ├── CarouselTicker.css
│   │       ├── .types.ts, .utils.ts
│   │       └── index.ts
│   ├── utils/
│   │   └── autoInjectStyles.ts
│   ├── styles/
│   │   ├── globals.css                # Tailwind base + tokens
│   │   ├── animations.css             # @keyframes
│   │   ├── build-entry.css            # PostCSS entry
│   │   └── index.css
│   └── index.ts                       # CÓ barrel export (mâu thuẫn với quy tắc)
├── scripts/build-css.mjs
├── .storybook/
├── package.json
├── tsup.config.ts
├── tailwind.config.cjs
└── vitest.config.ts
```

**⚠️ Mâu Thuẫn:**

- `src/index.ts` CÓ barrel export (re-export useToggle, useIsomorphicLayoutEffect, ui/file-tree, ping, carousel-ticker, autoInjectStyles)
- Quy tắc nói "NO barrel import cho tinita-react" nhưng code hiện tại vi phạm
- Đây là **xung đột code-vs-rule đã biết, nên sửa**

---

## Naming Conventions

### Files

| Loại                    | Quy Tắc                              | Ví Dụ                                            |
| ----------------------- | ------------------------------------ | ------------------------------------------------ |
| Utilities (tinita)      | camelCase.ts                         | `fileSize.ts`, `generateUUID.ts`                 |
| Hooks                   | `use` + PascalCase.ts                | `useToggle.ts`, `useIsomorphicLayoutEffect.ts`   |
| Components (Main)       | PascalCase.tsx                       | `FileTree.tsx`, `Ping.tsx`                       |
| Components (Private)    | camelCase.tsx                        | `fileLabel.tsx`, `folderNode.tsx`                |
| CSS                     | Match component + .css               | `FileTree.css`, `CarouselTicker.css`             |
| Types                   | types.ts hoặc ComponentName.types.ts | `types.ts`, `FileTree.types.ts`                  |
| Utils (component-local) | camelCase.ts                         | `parser.ts`, `icons.ts`                          |
| Tests                   | Match source + .test                 | `fileSize.test.ts`, `useToggle.test.tsx`         |
| Index (re-export)       | index.ts (không .tsx nếu không JSX)  | `src/hooks/index.ts`, `src/ui/FileTree/index.ts` |

### Directories

| Loại               | Quy Tắc    | Ví Dụ                                          |
| ------------------ | ---------- | ---------------------------------------------- |
| Utility Categories | kebab-case | `src/file/`, `src/uuid/`                       |
| Component Folders  | kebab-case | `src/ui/file-tree/`, `src/ui/carousel-ticker/` |
| Utilities          | camelCase  | `utils/`, `helpers/`, `constants/`             |
| Config             | camelCase  | `config/`, `.storybook/`                       |

---

## Component Colocation Pattern

**Quy Tắc:** Main component file riêng + index.ts chỉ re-export.

**✅ Đúng (hiện trạng):**

```
src/ui/FileTree/
  ├── FileTree.tsx              ← Main logic (PascalCase, tên file riêng)
  ├── FileTree.css              ← Styles
  ├── types.ts                  ← Type definitions
  ├── utils/                    ← Helper utilities
  │   ├── parser.ts
  │   └── icons.ts
  ├── components/               ← Private subcomponents
  │   ├── FileLabel.tsx
  │   ├── FolderNode.tsx
  │   └── index.ts              ← Re-export private components
  └── index.ts                  ← Re-export PUBLIC (chỉ FileTree)
```

**❌ Sai (don't do this):**

```
src/ui/FileTree/
  ├── index.tsx                 ← Logic ở index (khó tìm)
  ├── FileLabel.tsx
  └── FolderNode.tsx
```

**Lợi ích:**

1. **Discoverability** - `FileTree.tsx` dễ tìm hơn logic trong index
2. **Maintainability** - Rõ ràng main logic vs barrel export
3. **Scalability** - Dễ thêm types, utils mà không cluttering
4. **Convention** - Theo Meta, Google, Microsoft (1 unit = 1 file)

---

## TypeScript Configuration

**File:** `config/typescript-config/base.json`

| Compiler Option  | Value                     | Ghi chú                            |
| ---------------- | ------------------------- | ---------------------------------- |
| target           | **ES2020** (KHÔNG ES2022) | Ground-truth: ES2020, không ES2022 |
| module           | ESNext                    |                                    |
| moduleResolution | **Node** (KHÔNG NodeNext) | Ground-truth: Node, không NodeNext |
| lib              | [ES2020, DOM]             |                                    |
| strict           | true                      |                                    |
| esModuleInterop  | true                      |                                    |
| declaration      | true                      |                                    |
| sourceMap        | true                      |                                    |
| skipLibCheck     | true                      |                                    |

**Extends:**

- `react-library.json` - base + `jsx: react-jsx`
- `nextjs.json` - base + Bundler moduleResolution, allowJs, noEmit
- `vue-library.json` - base + `jsx: preserve`

**⚠️ Note:** Docs cũ nói base.json có "ES2022 target, NodeNext, noUncheckedIndexedAccess, isolatedModules" - **đều SAI**. Thực tế là ES2020 + Node.

---

## Build Configuration

### tsup (tinita)

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
  bundle: true,               // bắt buộc: bundle:false sinh import ESM không đuôi
  outExtension: ({ format }) => ({ js: format === 'cjs' ? '.cjs' : '.mjs' }),
  splitting: false,
  clean: true,
  minify: true,
  outDir: 'dist'
}
```

### tsup (tinita-react)

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
  bundle: true,               // Bundle components (khác tinita)
  external: [
    'react', 'react-dom',
    'lucide-react',
    '@radix-ui/react-accordion',
    'motion'                  // External runtime deps
  ],
  splitting: false,
  clean: !isWatchMode,
  minify: true,
  outDir: 'dist'
}
```

**Khác biệt:**

- tinita: `bundle: true` - buộc phải vậy (xem `system-architecture.md`); tree-shaking vẫn theo subpath vì mỗi utility là 1 entry
- tinita-react: `bundle: true` - vì có runtime deps, dùng external để avoid bundling framework

---

## CSS Standards

### Architecture (Hiện Trạng)

**Tailwind v4 build-time approach:**

- Developers write CSS với Tailwind utilities + CSS variables
- Build compiles Tailwind -> Pure CSS via PostCSS
- Users receive pre-compiled CSS (no Tailwind dependency)

**CSS Files:**

- `src/styles/globals.css` - Tailwind base + theme tokens (CSS variables)
- `src/styles/animations.css` - @keyframes animations
- Component CSS (`FileTree.css`, `CarouselTicker.css`) - CSS variables + vanilla CSS, KHÔNG @apply

**Build** (script tự log: Step 1, 1.5, 2, 3, 4):

1. Copy globals.css -> dist/styles/globals.css
   1.5. Copy animations.css -> dist/styles/animations.css
2. PostCSS build-entry.css -> theme CSS
3. PostCSS ui/\*_/_.css -> component CSS, minified -> dist/ui/
4. Bundle stage: theme + components -> minify -> ghi đè dist/styles.css

Watch mode (`--watch`) là chế độ riêng, không phải một step: debounce 300ms, chạy lại pipeline.

### Naming & Prefixing

**Quy Tắc (Hiện Trạng ✓):**

- Prefix tất cả class: `tinita-{component}__*`
- BEM-like: `tinita-filetree__label--folder`
- CSS variable: `tinita-primary`, `tinita-radius-md`, `tinita-ease-in-out`

**Ví dụ:**

```css
/* src/ui/FileTree/FileTree.css */
.tinita-filetree {
  background-color: var(--tinita-filetree-bg);
  color: var(--tinita-filetree-text);
}

.tinita-filetree__label {
  padding: var(--tinita-spacing-2);
}

.tinita-filetree__label--folder {
  font-weight: 600;
}
```

### Customization

**CSS Variables (Level 1):**

```css
:root {
  --tinita-filetree-bg: #ffffff;
  --tinita-filetree-text: #000000;
  --tinita-primary: #007bff;
}
```

**Variants + Props (Level 2):**

```typescript
<Button variant="primary" size="lg" />
```

**className Escape Hatch (Level 3):**

```typescript
<FileTree className="my-custom-styles" />
```

---

## CSS Định Hướng (Target - Chưa Triển Khai Toàn Bộ)

**6 Nguyên Tắc từ design-brief:**

1. **Không ship Preflight** - Tránh global reset trên img, button, input
2. **Prefix utilities** - Tất cả Tailwind utilities prefix `tinita-`
3. **Namespace tokens** - CSS variables cho design tokens, không hard-code
4. **CSS layers** - Tổ chức CSS vào layers (resets, tokens, components, overrides)
5. **className escape hatch** - Cho phép consumer override via className
6. **Semantic variants** - `<Button variant="primary" />` thay vì raw Tailwind classes

**Hiện Trạng:**

- ✓ Prefix `tinita-` - đã áp dụng
- ✓ CSS variables - đã áp dụng
- ✓ className prop - đã có
- ❌ No Preflight - chưa ép (cần check Tailwind config)
- ❌ CSS layers - chưa áp dụng
- ❓ Semantic variants - Ping có, FileTree chưa check

---

## ESLint & Prettier

### ESLint

**Root:** `.eslintrc.cjs` (legacy)

- base config: js.recommended + tseslint.recommended + turbo plugin
- ignore: dist/\*\*

**Flat Configs (at packages):**

- base.js (base config flat)
- react-internal.js (base + react)
- next.js (next/core-web-vitals + react-hooks)

**Đã vá 2026-09-25:** next.js và config/ui từng import named `{ config }` từ preset chỉ có default export. Nay cả 3/3 consumer dùng default import.

### Prettier

**File:** `prettier.config.js`

- Uỷ quyền hoàn toàn cho preset ngoài: `{ ...require("@dunggramer/prettier") }`
- Không override gì

---

## Testing

**Setup:**

- vitest.config.ts (root) - environment: node, globals: true, coverage: v8
- vitest.config.ts (tinita-react) - environment: jsdom, globals: true

**Quy Tắc (chưa áp dụng):**

- Location: `tests/` directory (parallel structure with src/)
- Format: `*.test.ts` hoặc `*.test.tsx`
- Coverage: > 80% (mục tiêu)

**Current:** `packages/tinita/tests/truncateFileName.test.ts` - 35 test (unit + bất biến trên mọi tổ hợp). `tinita-react`: chưa có test.

---

## One-File-One-Function Rule

**Quy Tắc (Hiện Trạng ✓):**

**tinita:**

- Mỗi utility = 1 file
- `fileSize.ts` = `fileSize()` function
- `generateUUID.ts` = `generateUUID()` function

**tinita-react hooks:**

- Mỗi hook = 1 file
- `useToggle.ts` = `useToggle()` hook
- `useIsomorphicLayoutEffect.ts` = `useIsomorphicLayoutEffect()` hook

**tinita-react components:**

- Mỗi component = 1 folder
- Main logic ở `ComponentName.tsx`
- Private components gom trong `components/` subfolder

**Lợi ích:**

- Perfect tree-shaking
- Subpath imports work
- Easy to locate, modify, test
- Clear responsibility

---

## Export Management

### tinita

**Hiện Trạng:** Barrel + subpath

```typescript
// src/index.ts - barrel export (re-exports tất cả)
export * from './file/fileSize';
export * from './file/getFileNameParts';
export * from './file/truncateFileName';
export * from './uuid/generateUUID';

// Usage
import { fileSize } from 'tinita'; // Barrel
import { fileSize } from 'tinita/file/fileSize'; // Subpath (optimal)
```

### tinita-react

**⚠️ Hiện Trạng (vi phạm quy tắc):**

```typescript
// src/index.ts - CÓ barrel export
export { useToggle } from './hooks/useToggle';
export { useIsomorphicLayoutEffect } from './hooks/useIsomorphicLayoutEffect';
export * from './ui/file-tree';
export * from './ui/ping';
export * from './ui/carousel-ticker';
export { autoInjectStyles } from './utils/autoInjectStyles';

// Usage
import { useToggle } from 'tinita-react'; // Barrel (không nên)
import { useToggle } from 'tinita-react/hooks/useToggle'; // Subpath (đúng)
```

**Quy Tắc (Mong Muốn):** NO barrel - chỉ subpath

```typescript
// src/index.ts - EMPTY (đúng quy tắc)
export {};

// Usage - phải dùng subpath
import { useToggle } from 'tinita-react/hooks/useToggle';
import { FileTree } from 'tinita-react/ui/file-tree';
```

**Tình Hình:** Code hiện tại vi phạm. Nên fix: xoá barrel exports khỏi `src/index.ts`.

---

## Quy Tắc Dependency

**Ràng Buộc (từ 2026-09-24):** tinita-react sẽ có foundation không đồng nhất (antd, Base UI, Radix v.v.), nên user chỉ dùng 1-2 component KHÔNG được phải cài toàn bộ dependency.

### Quy Tắc Cụ Thể

1. **Thêm component mới + dùng lib mới -> lib KHÔNG vào `dependencies` cứng**
   - Hiện trạng: tất cả 5 lib (`@radix-ui/react-accordion`, `clsx`, `lucide-react`, `motion`, `tailwind-merge`) ở `dependencies`
   - Tương lai: chuyển sang `peerDependencies` với `peerDependenciesMeta.optional: true` (xem chi tiết ở `docs/system-architecture.md`)
   - Điều kiện: PHẢI cập nhật bảng component->dependency (xem dưới) để user biết component nào cần lib gì

2. **Component không cần lib ngoài -> giữ zero-dep**
   - Ping hiện tại zero-dep, phải giữ nguyên
   - Không được vô tình kéo `cn()` hay `clsx` vào component vốn không cần

3. **Phải cập nhật bảng "Component -> Runtime Dependency" cùng lúc thêm component**
   - Bảng ở `docs/codebase-summary.md`
   - Mỗi component mới phải ghi rõ dep runtime mà nó cần (nếu có)

### Bảng Component -> Runtime Dependency (Hiện Trạng)

| Component        | Runtime Dep                             | Status           |
| ---------------- | --------------------------------------- | ---------------- |
| `Ping`           | -                                       | Zero-dep ✓       |
| `CarouselTicker` | clsx, tailwind-merge                    | Bundled (inline) |
| `FileTree`       | @radix-ui/react-accordion, lucide-react | Externalized     |

---

## Quy Tắc CSS Chống Rò Rỉ Global

**Ràng Buộc (từ 2026-09-24, từ sự cố production):** CSS của library KHÔNG được xung đột global scope của app client.

### Quy Tắc & Hiện Trạng Vi Phạm

1. **Không ship Preflight hay global reset**
   - ❌ **Hiện trạng vi phạm:** `src/styles/globals.css:116-127` có `@layer base { * { @apply border-border; } body { @apply bg-background text-foreground; } }`
   - Đây là global reset tự viết, tương đương Preflight -> đè lên `body`, `*` của client
   - Fix: Bỏ block này hoặc scope nó trong `[data-tinita]`

2. **Prefix tất cả class Tailwind utility**
   - ❌ **Hiện trạng vi phạm:** 27 class không prefix ở `src/styles/animations.css:114-318`
     - 18 class `.animate-*` (fade-in/out, slide-_, modal-_, etc.)
     - 8 class `.transition-*` (smooth, spring, modal, fade, slide, etc.)
     - 1 class `.interactive`
   - Tên cực kỳ chung chung, `.animate-*` va đạo trực tiếp Tailwind utility của client
   - Fix: Prefix tất cả thành `.tinita-animate-*`, `.tinita-transition-*`, `.tinita-interactive`

3. **Namespace + prefix CSS variable**
   - ❌ **Hiện trạng vi phạm:** `src/styles/globals.css:81-111` có 22 token KHÔNG prefix nằm trong Tailwind v4 namespace riêng
     - `--color-background`, `--color-foreground`, `--color-primary`... (15 token)
     - `--radius`, `--radius-sm`, `--radius-md`, `--radius-lg` (4 token)
     - `--spacing-tree-indent` (1 token)
     - `--font-sans`, `--font-mono` (2 token)
   - Tên token này **trùng khít shadcn/ui** (thư viện phổ biến nhất) -> va chạm chắc chắn
   - Fix: Prefix tất cả thành `--tinita-color-background`, `--tinita-radius-sm`, v.v.

4. **Mọi selector CSS phải bắt đầu bằng class có prefix `tinita-`**
   - ❌ **Hiện trạng vi phạm:**
     - `src/styles/globals.css:116-127`: selector `*` và `body` trần
     - `src/styles/animations.css:530-539`: `*, *::before, *::after` trong `@media (prefers-reduced-motion: reduce)` + `!important` - đè toàn trang
     - `CarouselTicker.css:15-17`: `.tinita-carousel-ticker * { box-sizing: border-box; }` - ép children của client
     - `FileTree.css`, `CarouselTicker.css`: selector `.dark` không prefix (Tailwind dark mode convention)
   - Fix: Loại bỏ selector trần, scope mọi rule trong `.tinita-{component}` hoặc `[data-tinita]`

5. **CSS component phải nằm trong `@layer`**
   - ❌ **Hiện trạng vi phạm:** `FileTree.css`, `CarouselTicker.css` KHÔNG có `@layer` block
   - Css không nằm trong layer luôn thắng CSS trong layer của client (Cascade Layers spec)
   - Hệ quả: client không override được mà không đấu specificity
   - Fix: Wrap tất cả component CSS vào `@layer components { ... }`

6. **Không Tailwind class thô trong JSX**
   - ❌ **Hiện trạng vi phạm:**
     - `src/ui/Ping/Ping.tsx:45-50`: `inline-flex items-center gap-1`, `absolute size-2 animate-ping rounded-full bg-green-500 opacity-75`, `min-w-8 text-xs font-medium tabular-nums`
     - `src/ui/CarouselTicker/CarouselTicker.tsx:211-291`: `shrink-0 grow-0 flex will-change-transform`, `absolute inset-0 pointer-events-none`, `relative overflow-hidden h-full min-h-[100px]`, `m-0 p-0 relative flex w-full`...
   - Bundle KHÔNG ship các utility này (build-entry.css không import Tailwind) -> chỉ hiển thị đúng nếu client có Tailwind, đúng version/config
   - Hard-code `bg-green-500` trong Ping dù `--tinita-ping` đã có
   - Fix: Loại bỏ Tailwind class khỏi JSX, chuyển tất cả style vào CSS file với CSS variables

7. **Variable runtime từ third-party không lọt vào public CSS**
   - ❌ **Hiện trạng vi phạm:** `FileTree.css:230,237` - `height: var(--radix-accordion-content-height);` trong keyframes
   - Biến runtime nội bộ của Radix lọt vào CSS công khai -> rò rỉ chi tiết nội bộ
   - Đổi foundation sang Base UI sẽ vỡ keyframes
   - Fix: Bọc lại sau token của tinita: `--tinita-accordion-content-height: var(--radix-accordion-content-height)` rồi dùng biến tinita

---

## Turborepo Task Dependencies

```json
{
  "build": {
    "dependsOn": ["^build"],
    "outputs": ["dist/**"]
  },
  "lint": {
    "dependsOn": ["^lint"]
  },
  "check-types": {
    "dependsOn": ["^check-types"]
  },
  "dev": {
    "cache": false,
    "persistent": true
  },
  "test": {
    "dependsOn": ["build"]
  },
  "storybook": {
    "cache": false,
    "persistent": true
  },
  "build-storybook": {
    "dependsOn": ["^build"],
    "outputs": ["storybook-static/**"]
  }
}
```

**Chú ý:** Không có task `generate:exports`.

---

## Code Style

### Comments

**Quy Tắc (Caveman):** Ngắn gọn, giữ mọi con số, date, mechanism.

**✓ Tốt:**

```typescript
// Split filename into name and extension.
// Handles dots in names: "file.name.txt" -> ["file.name", "txt"]
function getFileNameParts(fileName: string) {
  // ...
}
```

**❌ Không:**

```typescript
// This function is used to split filenames. It takes a filename string
// as input and returns an object with the name and extension properties.
// This is useful when you need to separate the extension from the name.
```

### Identifiers

- Hàm: camelCase (`fileSize`, `getFileNameParts`)
- Component: PascalCase (`FileTree`, `Ping`)
- Biến: camelCase (`count`, `isOpen`)
- Constant: CONSTANT_CASE (`MAX_FILE_SIZE`)
- Type: PascalCase (`FileTreeNode`, `UseToggleReturn`)

---

## Linting Rules

**Chạy:** `pnpm lint` (all packages)

**Tools:**

- ESLint 9.39.1
- @typescript-eslint
- eslint-config-prettier (no formatting rules)
- Turbo plugin (env-var warnings)

**CI:** Không có CI/CD, lint thủ công.

---

## Related Documents

- [ARCHITECTURE.md](../ARCHITECTURE.md) - Architectural principles
- [codebase-summary.md](./codebase-summary.md) - Current state snapshot
- [system-architecture.md](./system-architecture.md) - Build system details
- [naming-guidelines.md](./naming-guidelines.md) - Detailed naming & colocation
