# Tinita

Monorepo với framework-agnostic utilities, React hooks + UI components, Storybook.

**Packages:** `tinita` (v0.1.0, 5 utilities) · `tinita-react` (v0.1.0, 2 hooks + 3 components) · `tinita-dom` (v0.1.0, DOM utilities, browser-only)

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

### tinita (v0.1.0)

4 framework-agnostic utilities:

```typescript
import { fileSize } from 'tinita/file/fileSize';
import { getFileNameParts } from 'tinita/file/getFileNameParts';
import { truncateFileName } from 'tinita/file/truncateFileName';
import { generateUUID } from 'tinita/uuid/generateUUID';
```

### tinita-react (v0.1.0)

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

#### Cài theo component

`tinita-react` **không có `dependencies`**. Lib nào chỉ một phần component cần thì là **optional
peer** - bạn chỉ cài cái mà component bạn dùng đòi.

| Import                                | Cần cài thêm                                 |
| ------------------------------------- | -------------------------------------------- |
| `tinita-react/ui/ping`                | không cần gì                                 |
| `tinita-react/ui/carousel-ticker`     | không cần gì                                 |
| `tinita-react/hooks/*`                | không cần gì                                 |
| `tinita-react/utils/autoInjectStyles` | không cần gì                                 |
| `tinita-react/ui/file-tree`           | `@radix-ui/react-accordion` + `lucide-react` |

`react >=18` là peer bắt buộc cho mọi đường nhập.

```bash
npm install tinita-react                                          # Ping, CarouselTicker, hooks
npm install tinita-react @radix-ui/react-accordion lucide-react   # thêm FileTree
```

Thiếu peer thì lỗi xuất hiện lúc chạy (`Cannot find module 'lucide-react'`), không phải lúc install -
npm không cảnh báo về optional peer. Bảng trên là chỗ tra.

#### CSS của library không chạm vào CSS của bạn

Đo được 2026-09-26 trong Chromium trên một app thật (`compatibility/cases/l2`, ca `css-leak`):
**11 bề mặt, 0 rò rỉ**. Cụ thể là:

- Không rule nào nhắm `body`, `html`, hay `*`. Không set `color-scheme`.
- Mọi class, custom property và `@keyframes` đều mang prefix `tnt-`. Kể cả keyframes: tên
  `accordion-down` / `accordion-up` trùng với shadcn nên đã đổi.
- Dark mode **đọc** quy ước của bạn (`.dark` hoặc `[data-theme='dark']`) qua `:where()`, nên
  specificity là 0 và bạn luôn đè lại được mà không cần `!important`.
- JSX không chứa class Tailwind nào. Component hiển thị đúng dù app của bạn **không** có Tailwind.

Bạn không phải làm gì cả. Nếu vẫn muốn chắc chắn CSS của bạn thắng trong mọi tình huống, dùng bản
bọc layer:

```css
@layer tnt, theme, base, components, utilities; /* khai TRƯỚC khi import */
@import 'tinita-react/styles.layer.css';
```

CSS **không** nằm trong layer luôn thắng CSS trong layer, nên với bản `.layer.css` thì mọi CSS
thường của bạn đè lên component - sửa gì cũng được, không cần `!important`. Đánh đổi: nó đè cả khi
bạn không cố ý. Vì vậy hai bản cùng được ship và bạn chọn:

| File                            | Khi nào dùng                                                  |
| ------------------------------- | ------------------------------------------------------------- |
| `tinita-react/styles.css`       | mặc định                                                      |
| `tinita-react/styles.layer.css` | khi CSS của bạn đang bị đè, hoặc bạn muốn toàn quyền override |

Hai file có nội dung giống nhau, sinh từ cùng một nguồn lúc build.

---

### tinita-dom (v0.1.0)

Tiện ích DOM framework-agnostic. **Browser-only** - nó chạm `document`, `window.matchMedia`,
`requestAnimationFrame`. Không có SSR guard, và đó là có chủ ý: `installSmoothScroll` cài listener
trên `document`, trên server không có gì để cài.

Zero dependency. Zero peer dependency. Không cần React.

```ts
import { installSmoothScroll } from 'tinita-dom/smooth-scroll';

// Gọi MỘT LẦN, ngoài React - effect bị gọi hai lần của StrictMode sẽ cài nó hai lần.
const uninstall = installSmoothScroll();
uninstall(); // gỡ khi cần
```

Một listener `wheel` cho toàn app. Hai hành vi riêng biệt: wheel có detent được làm mượt trên đúng
element browser vốn sẽ scroll; và wheel dọc trên element chỉ scroll ngang được thì scroll nó ngang
(browser không làm việc này). Input vốn đã mượt (trackpad, Mos, Mac Mouse Fix) được để nguyên cho
browser - làm mượt lần hai là thứ khiến trang có cảm giác trễ so với tay.

Nó cố ý không đụng: wheel đã `defaultPrevented`, `Ctrl+wheel`, wheel đã có `deltaX`, subtree có
`data-no-smooth-scroll`, và người đã bật `prefers-reduced-motion`.

```ts
import { classifyWheelSource } from 'tinita-dom/wheel-source';
```

Chi tiết: `packages/tinita-dom/README.md`.

---

## Root Scripts (13)

| Script               | Mục đích                          | Status               |
| -------------------- | --------------------------------- | -------------------- |
| build                | Xây toàn bộ                       | ✓                    |
| dev                  | Dev mode (Storybook + tsup watch) | ✓                    |
| lint                 | Lint toàn bộ                      | ✓                    |
| test                 | Run tests (vitest)                | ✓                    |
| format               | Format với prettier               | ✓                    |
| check-types          | Type check                        | ✓                    |
| storybook            | Chạy Storybook                    | ⚠️ Hỏng\*            |
| build-storybook      | Build Storybook static            | ⚠️ Hỏng\*            |
| publish:tinita       | Publish tinita                    | ✓                    |
| publish:tinita-react | Publish tinita-react              | ✓                    |
| publish:all          | Publish cả hai                    | ✓                    |
| publish:dry-run      | Dry run                           | ✓                    |
| generate:exports     | Generate exports                  | ❌ Không tồn tại\*\* |

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
- **Test:** Vitest - `tinita` 35 test, `tinita-react` chưa có test
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
