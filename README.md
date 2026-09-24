# Tinita

Monorepo với framework-agnostic utilities, React hooks + UI components, Storybook.

**Packages:** `tinita` (v0.0.1, 4 utilities) · `tinita-react` (v0.0.2-alpha.1, 2 hooks + 3 components)

---

## Quick Start

```bash
pnpm install      # Cài dependencies
pnpm build        # Xây toàn bộ
pnpm dev          # Dev mode
pnpm storybook    # Chạy Storybook (xem note bên dưới)
```

---

## Packages

### tinita (v0.0.1)

4 framework-agnostic utilities:

```typescript
import { fileSize } from 'tinita/file/fileSize';
import { getFileNameParts } from 'tinita/file/getFileNameParts';
import { truncateFileName } from 'tinita/file/truncateFileName';
import { generateUUID } from 'tinita/uuid/generateUUID';
```

### tinita-react (v0.0.2-alpha.1)

2 hooks + 3 UI components (CSS included). **Import từng file, không dùng barrel:**

```typescript
// Hooks
import { useToggle } from 'tinita-react/hooks/useToggle';
import { useIsomorphicLayoutEffect } from 'tinita-react/hooks/useIsomorphicLayoutEffect';

// Components
import { FileTree } from 'tinita-react/ui/file-tree';
import { Ping } from 'tinita-react/ui/ping';
import { CarouselTicker } from 'tinita-react/ui/carousel-ticker';

// Utility
import { autoInjectStyles } from 'tinita-react/utils/autoInjectStyles';

// CSS
import 'tinita-react/styles.css';
```

#### Component Dependencies

| Component | Runtime Dependencies | Notes |
|-----------|---------------------|-------|
| `Ping` | - | Zero external dependencies |
| `CarouselTicker` | clsx, tailwind-merge | Bundled in output (no install needed) |
| `FileTree` | @radix-ui/react-accordion, lucide-react | Both externalized |

**⚠️ Current Issue:** `npm install tinita-react` kéo theo ~20 gói (bao gồm `motion` không được dùng). Chỉ dùng `Ping` vẫn phải cài cả `@radix-ui/react-accordion`, `lucide-react`, `motion`. Định hướng: chuyển sang optional peer dependencies (xem `docs/system-architecture.md`).

---

## Root Scripts (13)

| Script | Mục đích | Status |
|--------|---------|--------|
| build | Xây toàn bộ | ✓ |
| dev | Dev mode (Storybook + tsup watch) | ✓ |
| lint | Lint toàn bộ | ✓ |
| test | Run tests (vitest) | ✓ |
| format | Format với prettier | ✓ |
| check-types | Type check | ✓ |
| storybook | Chạy Storybook | ⚠️ Hỏng* |
| build-storybook | Build Storybook static | ⚠️ Hỏng* |
| publish:tinita | Publish tinita | ✓ |
| publish:tinita-react | Publish tinita-react | ✓ |
| publish:all | Publish cả hai | ✓ |
| publish:dry-run | Dry run | ✓ |
| generate:exports | Generate exports | ❌ Không tồn tại** |

\* Storybook lỗi vì filter package sai và script name không khớp. Thay bằng: `turbo build --filter=storybook && cd apps/storybook && pnpm dev`.  
\*\* Script này không tồn tại. Exports maintain thủ công trong `package.json`.

---

## Cấu trúc

```
tinita/
  ├── packages/tinita          # 4 utilities
  ├── packages/tinita-react    # 2 hooks + 3 components + CSS
  ├── apps/storybook           # Storybook 10.1.4
  ├── config/                  # ESLint, TypeScript, UI configs
  ├── scripts/                 # publish.mjs, update-package-versions.mjs
  └── docs/                    # Documentation (xem docs/README.md)
```

---

## Stack

- **Workspace:** pnpm 9.0.0 + Turborepo
- **Node:** >=18
- **Build:** tsup (JS) + PostCSS (CSS)
- **Test:** Vitest (0 test hiện tại)
- **Release:** Manual qua `scripts/publish.mjs`

---

## Docs

Xem [`docs/README.md`](./docs/README.md) để tìm:
- **Project Overview & PDR** - mục tiêu, roadmap, requirements
- **Codebase Summary** - thực trạng hiện tại, metrics
- **Code Standards** - quy tắc naming, colocation, CSS
- **System Architecture** - kiến trúc workspace, build pipeline
- **Design Guidelines** - nguyên tắc design component (định hướng)

---

## Known Issues

Xem `docs/system-architecture.md` phần "Known Issues" để chi tiết. Tóm tắt:
1. **Storybook scripts hỏng** - filter package sai scope, script name không khớp
2. **generate:exports không tồn tại** - exports maintain thủ công
3. **tsconfig base path alias chết** - trỏ tới package không tồn tại
4. **ESLint next preset export sai** - named import không tồn tại
5. **`motion` là dependency chết** - khai trong dependencies nhưng không file nào import
6. **`Ping` + `CarouselTicker` cần Tailwind** - dùng class Tailwind thô trong JSX, chỉ hiển thị đúng nếu host có Tailwind (xem chi tiết ở `docs/system-architecture.md` phần CSS)

---

## Contributing

Đọc [ARCHITECTURE.md](./ARCHITECTURE.md) và [CONTRIBUTING.md](./CONTRIBUTING.md) trước. Nguyên tắc: one-file-one-function, subpath exports, strict typing.

---

Cập nhật: 2026-09-24 (vòng 2) · commit 0a1dd88
