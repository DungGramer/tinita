# Context đã kiểm chứng - đầu vào cho plan

Mọi số liệu dưới đây đo trực tiếp trên repo ngày 2026-09-25, không phải suy luận.
Planner dùng luôn, không cần scout lại.

## Môi trường máy dev

| Thứ | Trạng thái |
|---|---|
| Docker | 29.7.2, daemon ĐANG CHẠY |
| npm | 11.16.0 |
| pnpm | 9.0.0 |
| yarn | Bị chặn trong repo bởi `packageManager: pnpm@9.0.0` ở root `package.json`. Chạy được ngoài cây repo hoặc trong Docker. |
| bun | CHƯA cài |
| Node | **CHỈ 24.18.0** (mise). Matrix Node 18/20/22 buộc phải qua Docker. |
| Playwright | Chưa cài |

## Hai package

### `tinita` v0.0.1
- 5 utility: `fileSize`, `getFileNameParts`, `truncateFileName`, `truncateFileNameParts`, `generateUUID`
- 6 subpath export (`.` + 5 utility), mỗi cái 3 condition (`types`/`import`/`require`) = 18 đường dẫn + `main`/`module`/`types`
- tsup: `bundle: true`, `outExtension` cjs->`.cjs` esm->`.mjs`, `dts: true`, `minify: true`
- 35 test ở `packages/tinita/tests/truncateFileName.test.ts`
- KHÔNG có `dependencies`

### `tinita-react` v0.0.2-alpha.1
- 2 hook (`useToggle`, `useIsomorphicLayoutEffect`), 3 UI component (`ping`, `carousel-ticker`, `file-tree`), 2 util (`autoInjectStyles`, `cn`)
- 9 subpath export + 3 CSS export (`./styles.css`, `./styles/globals.css`, `./styles/animations.css`)
- **0 test**
- tsup: `bundle: true`, `outExtension`, `external: ['react','react-dom','lucide-react','@radix-ui/react-accordion']`
- **KHÔNG có `dependencies`.** `peerDependencies`: `react >=18.0.0` (bắt buộc),
  `@radix-ui/react-accordion >=1.2.0` + `lucide-react >=0.400.0` (cả hai `optional: true`)
- `clsx`, `tailwind-merge` ở `devDependencies` - đã bị tsup inline vào `dist/` (không trong `external`)

### Dependency theo component - ĐÃ ĐO trên `dist/` đã build
```
dist/ui/ping/index.mjs            -> chỉ react/jsx-runtime
dist/ui/carousel-ticker/index.mjs -> chỉ react, react/jsx-runtime
dist/ui/file-tree/index.mjs       -> react, react/jsx-runtime, @radix-ui/react-accordion, lucide-react
```

## Bug THẬT đã vá - phải thành ca regression của lab

### B1. exports trỏ `.cjs` mà build emit `.js`
Thiếu `outExtension` trong tsup, `package.json` không có `"type":"module"`.
**Trước khi vá: 6/18 đường dẫn của `tinita` gãy** (`main` + 5 `require`), `tinita-react` 7 tham chiếu sai.
Signature: `Error: Cannot find module '.../dist/index.cjs'` từ `createEsmNotFoundErr`.

### B2. `bundle: false` sinh import ESM không đuôi
`dist/file/truncateFileName.mjs` chứa `import{...}from"./getFileNameParts"` - thiếu `.mjs`.
tsup KHÔNG viết lại specifier khi `bundle: false` (đã thử `outExtension` riêng lẻ: không đủ).
Signature: `ERR_MODULE_NOT_FOUND ... imported from .../truncateFileName.mjs`.

**Quan trọng cho thiết kế ca test:** B1 và B2 lộ ra ở CHIỀU KHÁC NHAU tuỳ subpath.
`tinita/file/fileSize` chạy ESM nhưng gãy CJS (không có internal import).
`tinita/file/truncateFileName` gãy CẢ HAI. => phải phủ `require()` VÀ `import()` cho TỪNG subpath.

### B3. Phép thử bằng symlink là VÔ NGHĨA - đã chứng minh
Symlink `packages/tinita-react` vào `node_modules` của project thử: `FileTree` load THÀNH CÔNG
dù optional peer chưa cài, vì Node resolve ngược lên `node_modules` của monorepo qua symlink.
Chỉ `npm pack` + `npm install <tarball>` mới lộ `Cannot find module 'lucide-react'`.
=> Lab CẤM symlink, CẤM `file:` tới thư mục package, CẤM `workspace:*`.

### B4. Hành vi optional peer - đã đo trong project cô lập
`npm install react@19 tinita-react-0.0.2-alpha.1.tgz` -> `node_modules` chỉ có `react`, `tinita-react`.
npm KHÔNG cài optional peer, KHÔNG cảnh báo gì.
```
require('tinita-react/ui/ping')                -> OK
require('tinita-react/ui/carousel-ticker')      -> OK
require('tinita-react/hooks/useToggle')         -> OK
require('tinita-react/utils/autoInjectStyles')  -> OK
require('tinita-react/ui/file-tree')            -> Cannot find module 'lucide-react'
```
Sau `npm install @radix-ui/react-accordion lucide-react` -> `file-tree` OK.
Lưu ý: `typeof FileTree` là `'object'` không phải `'function'` (component bị bọc) - assertion đừng
dùng `=== 'function'`.

## Bề mặt rò rỉ CSS - sự cố production, có file:dòng

| Bề mặt | file:dòng |
|---|---|
| Reset tự viết `@layer base { * { @apply border-border } body { @apply bg-background text-foreground } }` | `src/styles/globals.css:116-127` |
| 22 token KHÔNG prefix trong `@theme inline` (`--color-*` 15, `--radius`, `--radius-{sm,md,lg}`, `--spacing-tree-indent`, `--font-{sans,mono}`) - namespace riêng của Tailwind v4 + trùng khít token chuẩn shadcn | `src/styles/globals.css:81-111` |
| 27 class KHÔNG prefix: 18 `.animate-*`, 8 `.transition-*`, `.interactive` | `src/styles/animations.css:114-318` |
| Selector `.dark` không prefix | `globals.css:54-76`, `animations.css:213,224,234`, `FileTree.css:42,487,493,499,505` |
| `*, *::before, *::after { ... !important }` reduced-motion không scope | `src/styles/animations.css:530-539` |
| CSS component NGOÀI mọi `@layer` -> luôn thắng layer của consumer | `FileTree.css`, `CarouselTicker.css` (grep `@layer` = 0) |
| `.tinita-carousel-ticker * { box-sizing }` ép lên children của consumer | `CarouselTicker.css:15-17, 20-25` |
| Tailwind class THÔ trong JSX mà bundle không ship utility | `Ping.tsx:45-50`, `CarouselTicker.tsx:211-291` |
| `var(--radix-accordion-content-height)` trong keyframes public | `FileTree.css:230,237` |
| `tailwind.config.cjs` thiếu `prefix`, `important`, `corePlugins.preflight:false` | toàn file (17 dòng) |

Điểm sáng: Preflight chính chủ KHÔNG được ship - `build-entry.css` (entry thật theo
`scripts/build-css.mjs:23`) chỉ `@import "./globals.css"` + `"./animations.css"`, không
`@import "tailwindcss"`. File `src/styles/index.css` CÓ `@import "tailwindcss"` nhưng **mồ côi**
(không trong build pipeline, không trong `exports`, không ai reference).

## SSR - chưa từng kiểm
- `src/utils/autoInjectStyles.ts` chạm `document.head` (dòng 22-25), CÓ SSR guard (dòng 12),
  chống trùng theo id (dòng 17), nhưng **không component nào gọi nó** - export chết về runtime.
- Source `tinita-react` KHÔNG có directive `'use client'` ở đâu cả. `FileTree` dùng Radix accordion
  (có state/hook) -> cần xác minh Next App Router.

## CSS build pipeline (`packages/tinita-react/scripts/build-css.mjs`)
Script tự log các chặng: Step 1, 1.5, 2, 3, 4 (KHÔNG phải 6 bước).
1) copy `globals.css` -> `dist/styles/globals.css`
1.5) copy `animations.css` -> `dist/styles/animations.css`
2) postcss `build-entry.css` -> theme CSS (cần `tailwind.config.cjs`)
3) postcss `src/ui/**/*.css` -> `dist/ui/<relpath>` minified
4) nối theme + components -> `dist/styles.temp.css` -> minify -> **ghi đè** `dist/styles.css`, xoá temp
`--watch`: fs.watch, debounce 300ms.
Lưu ý: `postcss-cli` từng KHÔNG có trong `node_modules/.bin` khiến build CSS fail - giờ đã
`pnpm install` nên có. Lab cần tính tới việc này khi build trong container sạch.

## Workspace - điều kiện sống còn của lab
`pnpm-workspace.yaml` hiện glob: `packages/*`, `apps/*`, `config/*`.
=> `compatibility/*` TỰ ĐỘNG nằm ngoài workspace. Plan phải kiểm chứng và GIỮ điều này, và phải có
ca test chủ động xác minh consumer không bị workspace resolve cứu.

## Trạng thái publish
`npm view tinita` -> `latest: 0.0.1`. `tinita-react` -> `0.0.2`.
**Cả hai đã publish TRƯỚC khi vá B1/B2**, nên bản trên registry gần như chắc chắn có exports gãy.
Chưa kiểm tarball thật từ registry - đây là việc lab nên làm được.
Ngoài ra API `truncateFileName` vừa đổi breaking (bỏ cờ `output`, tách thành 2 hàm) nên cần bump
version trước lần publish tới.

## Gate hiện tại
`turbo check-types`, `lint`, `build`, `test` - cả 4 EXIT 0. Không có CI (`.github/` không tồn tại).

## Nợ liên quan trong roadmap
- **M2** đã xong phần chuyển optional peer; CÒN THIẾU đúng phần "kiểm tự động rằng
  `import 'tinita-react/ui/<x>'` không đòi lib mà `<x>` không dùng" -> chính là L1/L2 của lab này.
- **M3** dành cho test baseline của `tinita-react` (0 test) -> L0 cho tinita-react thuộc M3,
  plan lần này phải nói rõ có chồng chéo hay không.
- **M4** là CI -> lab lần này chỉ script local, thiết kế để M4 gọi lại được.

---

# Thực nghiệm tool L1 - team-lead tự chạy 2026-09-25

Mục đích: trước khi plan chọn tool, kiểm xem `publint`/`attw` có thật bắt được B1/B2 hay không.
Cách làm: copy `packages/tinita`, dựng lại đúng B1 (bỏ `outExtension`) + B2 (`bundle: false`),
build, rồi chạy tool.

## Kết quả

| Bug | publint | attw | Thực thi thật (`require`/`import`) |
|---|---|---|---|
| **B1** exports trỏ file không tồn tại | **BẮT ĐƯỢC, chính xác cả 7 đường dẫn** | không nhắm vào việc này | bắt được |
| **B2** import ESM thiếu đuôi -> `ERR_MODULE_NOT_FOUND` | **KHÔNG bắt** | **KHÔNG bắt** | **CHỈ cách này bắt được** |

publint trên bản gãy, nguyên văn:
```
Errors:
1. pkg.exports["."].require is ./dist/index.cjs but the file does not exist.
... (6 dòng tương tự cho từng subpath)
7. pkg.main is dist/index.cjs but the file does not exist.
```

Chạy thật trên bản gãy đã install từ tarball:
```
ESM  import('tinita/file/truncateFileName')  -> ERR_MODULE_NOT_FOUND
CJS  require('tinita/file/truncateFileName') -> Cannot find module '.../truncateFileName.cjs'
```

**=> Kết luận cho plan: static tool là CẦN nhưng KHÔNG ĐỦ.** L1 phải có 3 chân bổ sung nhau:
1. `publint` - manifest đối chiếu file tồn tại (bắt B1), tĩnh, nhanh
2. `attw` - type resolution / CJS-ESM masquerading, tĩnh
3. **Smoke runner tự viết** - `require()` VÀ `import()` từng subpath trong project đã install từ
   tarball. Đây là chân DUY NHẤT bắt được B2, và cũng là chân duy nhất bắt được lỗi optional peer.

## Phát hiện MỚI trên bản ĐÃ VÁ (chưa ai biết, lab sẽ bắt ngay ngày đầu)

Chạy trên `packages/tinita` hiện tại:

**publint:**
- WARNING: `pkg.exports["."].types` bị hiểu là CJS khi resolve với condition `import` -> type nhập
  nhằng khi default-import. Đề xuất tách `types` theo `import`/`require` và dùng `.d.mts`.
- SUGGESTION: thiếu field `"type"` -> Node phải tự dò loại package.
- SUGGESTION: thiếu `"sideEffects"` -> bundler không tối ưu tree-shaking được. Đáng chú ý vì
  tree-shaking là mục tiêu được nêu của `tinita`; `tinita-react` CÓ khai `sideEffects` (cho CSS)
  nhưng `tinita` thì KHÔNG.

**attw:**
- `node16 (from ESM): Masquerading as CJS` trên **cả 6/6 subpath** - `FalseCJS`. Nguyên nhân:
  `exports[x].types` trỏ `.d.ts` trong khi `import` trỏ `.mjs`. tsup CÓ emit `.d.mts` nhưng
  `exports` không dùng tới. Đây là lỗi ĐANG TỒN TẠI, ảnh hưởng mọi consumer TypeScript dùng ESM.
- `node10: Resolution failed` trên 5/6 subpath - TS cũ (`moduleResolution: node`) không resolve
  được subpath exports. Có quan trọng hay không tuỳ vào việc có cam kết support TS cũ. Plan nên
  nêu đây là quyết định cần chốt, không tự quyết.

Ba mục này là bằng chứng cụ thể cho giá trị của lab: chúng tồn tại ngay lúc này, gate hiện tại
(`check-types`/`lint`/`build`/`test` đều EXIT 0) không thấy gì.
