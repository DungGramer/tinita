# CLAUDE.md

Hướng dẫn cho Claude Code khi làm việc trong repo này.

Chi tiết và số đo nằm ở `docs/`. File này chỉ giữ thứ cần biết ngay và không suy
ra được từ code.

## Đọc trước

- `docs/code-standards.md` - quy tắc dependency, `typesVersions`, API một kiểu trả
  về, CSS chống rò rỉ global, reduced-motion. Mỗi quy tắc đi kèm số đo.
- `docs/system-architecture.md` - chiến lược đóng gói, bảng rò rỉ CSS đã đo.
- `compatibility/README.md` - lab, quy tắc cô lập, những gì còn treo.
- `ARCHITECTURE.md`, `CONTRIBUTING.md` - nguyên tắc kiến trúc và quy trình.

## Ba package

```
packages/tinita/       utility framework-agnostic, 0 dependency, 0 peer
packages/tinita-react/ hook + UI component, 0 dependency, peer: react (bắt buộc)
                       + @radix-ui/react-accordion và lucide-react (optional)
packages/tinita-dom/   utility DOM thuần, 0 dependency, 0 peer, browser-only
```

`config/` giữ eslint/typescript/ui dùng chung. `apps/storybook` là nơi xem
component. `compatibility/` là lab kiểm package từ góc nhìn người dùng - **không**
nằm trong pnpm workspace, và có ca L2 chặn việc thêm nó vào.

pnpm + Turborepo. Node >= 18.

## Lệnh

```bash
pnpm gate           # CỔNG: format, lint, types, build, test, stories, L1 (~84s)
pnpm gate:full      # thêm L2 và L4 (cần chromium, vài phút) - chạy trước publish

pnpm build          # turbo run build
pnpm test           # vitest run, cả 3 package
pnpm lint
pnpm check-types
pnpm format         # prettier --write
pnpm format:check   # dùng cái này làm cổng, đừng --write rồi xem diff
pnpm check-stories  # mọi subpath publish ra đều phải có story
pnpm storybook
```

**Không có CI.** Owner chốt: repo một người, `pnpm gate` trên máy là đủ.

`npm publish` và `npm deprecate` là **hành động của owner**. `scripts/publish.mjs`
dừng ở `npm whoami` - đừng bypass.

## Không tồn tại - đừng thêm lại từ ký ức

- **`generate:exports`**: không có `scripts/generate-package-exports.mjs`, không có
  task trong `turbo.json`. `exports`, entry tsup và barrel đều sửa TAY.
  `tinita-react/tsup.config.ts` có tự quét entry bằng glob, nhưng `exports` thì
  không. Thêm subpath = sửa `package.json` + `typesVersions` + `contract.json`.
- **`tailwind.config.cjs`**: đã xoá. `build-entry.css` cố ý không
  `@import "tailwindcss"` nên `content` của nó chưa bao giờ được dùng.
- **`src/styles/index.css`**: đã xoá, mồ côi.
- **Tailwind `--prefix`**: chưa từng tồn tại. Đừng viết tài liệu như thể có.
- **`CSS_GUIDE.md`**: không tồn tại.

## Build: bốn bất biến, mỗi cái từ một bug thật

`tsup` cho cả 3 package. Đừng đổi những thứ sau mà không đọc lý do:

1. **`bundle: true`** - bắt buộc, KHÔNG phải `false`. Với `bundle: false` esbuild
   giữ nguyên specifier tương đối không đuôi trong `.mjs`, và Node ESM đòi đuôi:
   `ERR_MODULE_NOT_FOUND` ở mọi import nội bộ. Đây là bug B2 của lab.
2. **`outExtension: cjs -> .cjs, esm -> .mjs`** - `exports.require` trỏ `.cjs`;
   không có nó tsup emit `.js` và mọi `require()` gãy. Bug B1.
3. **`types` tách theo condition** - `import` -> `.d.mts`, `require` -> `.d.ts`.
   Không tách thì `attw` báo `FalseCJS` toàn bộ subpath.
4. **`banner: { js: "'use client';" }` cho tinita-react** - esbuild XOÁ directive
   khỏi output, nên đặt `'use client'` trong source là không đủ. Đo được: dist bắt
   đầu bằng `import{...}`. Cả package là client nên áp toàn bộ là khai đúng.

`typesVersions` phải đồng bộ với `exports` cho cả 3 package (QĐ-2 của owner:
support `moduleResolution: node`). Nó không có tool đồng bộ - ca L1
`08-typesversions-sync` là cửa chặn duy nhất. Hình dạng đúng là **key tường minh
từng subpath, KHÔNG wildcard**; xem `docs/code-standards.md`.

## Đường nhập

`tinita` - barrel hoặc subpath đều được.

`tinita-react` - dùng **subpath cụ thể**. 9 key thật:

```
tinita-react/hooks/useToggle   tinita-react/ui/ping
tinita-react/ui/file-tree      tinita-react/ui/carousel-ticker
tinita-react/utils/autoInjectStyles
tinita-react/styles.css        tinita-react/styles.layer.css
tinita-react/styles/globals.css  tinita-react/styles/animations.css
```

`tinita-react/hooks` và `tinita-react/ui` **không tồn tại** - CLAUDE.md từng ghi
chúng là bắt buộc và chỉ người dùng vào đường chết.

Barrel `tinita-react` tồn tại nhưng nó re-export `./ui/file-tree`, nên
`import { Ping } from 'tinita-react'` đòi `@radix-ui/react-accordion` và
`lucide-react` dù Ping không cần. Đây là lý do KỸ THUẬT để tránh barrel.

`tinita-dom` - `tinita-dom/smooth-scroll`, `tinita-dom/wheel-source`.
Browser-only, không có SSR guard, có chủ ý. `installSmoothScroll()` gọi một lần
ngoài React và trả về hàm gỡ.

## Dependency: optional peer, không phải dependencies

Component có phụ thuộc khác nhau - có cái dùng `motion`, có cái dùng `antd`, có
cái dùng Base UI. Người dùng 1-2 component **không được** bị buộc cài hết. Vì vậy
mọi thư viện của component là `peerDependencies` + `peerDependenciesMeta.optional`.

npm **không cảnh báo** khi optional peer thiếu, nên bảng component -> peer trong
README là bắt buộc, không phải trang trí. Quy tắc đầy đủ ở
`docs/code-standards.md` mục "Quy Tắc Dependency".

## CSS: không được chạm vào trang khách

Owner đã dính production: Tailwind và CSS global của library xung đột với web của
client. Mọi quy tắc dưới đây có số đo và có guard.

- **Prefix `tnt-`** cho mọi class, custom property, và `@keyframes`. Không chỉ
  class: `@keyframes accordion-down` trùng thẳng tên keyframes của shadcn.
  CSS Modules đã cân nhắc và **owner chốt không dùng** (2026-09-26): hash tên thì
  người dùng mất khả năng override bằng CSS, còn CSS Modules tên ổn định thì trả
  hết chi phí migration mà nhận lại đúng mức chống trùng đang có. Lý do đầy đủ ở
  `docs/system-architecture.md`. Đừng mở lại mà không có lý do mới.
- **Không** rule nào nhắm `body`, `html`, hay `*`. Không `color-scheme`.
- **Dark mode ĐỌC quy ước của host**, không định nghĩa nó:
  `:where(.dark, [data-theme='dark'])`. `:where()` cho specificity 0 nên host luôn
  đè lại được - cách antd v5 dùng.
- **Biến runtime của third-party** (`--radix-*`) không được nằm trong CSS công
  khai. Bọc lại sau token của tinita.
- **Không class Tailwind trong JSX.** Bundle cố ý không ship utility nào, nên một
  class Tailwind là phụ thuộc NGẦM vào Tailwind của host. Đo được: `Ping` từng
  nhận `display: block` thay vì `inline-flex` khi host không có Tailwind.
- **Biến thể đi qua `data-*`**, không qua chuỗi class:
  `data-orientation`, `data-overflow`, `data-state`. Hướng của Radix và Primer;
  state inspect được ngay trong DevTools và không nổ combinatorial.
- **Source CSS KHÔNG tự bọc `@layer`.** Build sinh hai bản: `styles.css` không
  layer và `styles.layer.css` bọc `@layer tnt`, từ cùng một nguồn. Consumer chọn.
  Đây là cách Mantine làm.

Guard: `packages/tinita-react/tests/styles/no-global-leak.test.ts` (10 ca, chạy
trong `pnpm test`) và ca `css-leak` của L2 (đo thật trong Chromium). Hai cái không
thay thế nhau - ca L2 mạnh hơn nhưng cần chromium nên không chạy trong vòng lặp.

## Reduced motion: tắt hẳn

`@media (prefers-reduced-motion: reduce)` phải `animation: none` /
`transition: none`. **KHÔNG** `0.01ms`: với 0.01ms animation VẪN chạy nên
`animationend`/`transitionend` vẫn fire, sinh lỗi thứ tự chỉ xuất hiện trên máy
người bật reduced-motion. Owner đã gặp thật.

CSS không tắt được Web Animations API, `requestAnimationFrame`, hay smooth scroll
tự viết. Những cái đó phải tự tắt ở JS qua `matchMedia` + listener `change`. Mẫu ở
`CarouselTicker.tsx` (`usePrefersReducedMotion` + `pinContentAtStart`) và
`smooth-scroll.ts`. `CarouselTicker.css` có khối reduced-motion từ đầu và nó
**chưa bao giờ** tắt được marquee.

## Thêm component mới

1. Folder trong `src/ui/<tên>/`: `<Tên>.tsx` (logic), `<Tên>.css` nếu có style,
   `index.tsx` chỉ re-export. Logic KHÔNG nằm trong `index.tsx`.
2. CSS thật, prefix `tnt-`, BEM, biến thể qua `data-*`. Không Tailwind trong JSX.
3. Thêm subpath vào `package.json` `exports` **và** `typesVersions`, thêm
   specifier vào `compatibility/contract.json`.
4. **Story trong `apps/storybook/stories/<Tên>/<Tên>.stories.tsx`** - bắt buộc,
   cho cả `tinita-react` và `tinita-dom`. `pnpm check-stories` đọc `exports` và
   làm đỏ nếu thiếu. Story import bằng subpath cụ thể, không qua barrel.
5. Test trong `packages/<pkg>/tests/`.
6. `pnpm gate`.

## Quy tắc làm việc trong repo này

**Guard mới phải được chứng minh bằng cách phá đúng thứ nó canh**, không phải bằng
việc nó xanh. Đã có bốn lần một ca báo xanh mà không kiểm thứ nó nói đang kiểm:
cell `bun` advisory PASS khi chưa chạy được; ca `08-typesversions-sync` bản đầu
không thể fail; ca `reduced-motion-scope` dò một hằng số nên mù khi cơ chế đổi;
cell `yarn-pnp` pass 19 ca mà chưa từng đi qua PnP. Mẫu lặp lại, và đây là cách
chặn duy nhất đã dùng được.

Khi bịt xong một rò rỉ thì **đảo `expected`** trong ca của lab, đừng viết lại ca -
ca là cửa chặn hồi quy, không phải bản báo cáo một lần.
