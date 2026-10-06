# CLAUDE.md

Hướng dẫn cho Claude Code khi làm việc trong repo này.

Chi tiết và số đo nằm ở `docs/`. File này chỉ giữ thứ cần biết ngay và không suy
ra được từ code.

## Đọc trước

- `docs/code-standards.md` - quy tắc dependency, `typesVersions`, API một kiểu trả
  về, đặt tên, **validation**, CSS chống rò rỉ global, reduced-motion. Mỗi quy tắc đi
  kèm số đo.
- `docs/system-architecture.md` - chiến lược đóng gói, bảng rò rỉ CSS đã đo.
- `compatibility/README.md` - lab, quy tắc cô lập, những gì còn treo.
- `ARCHITECTURE.md`, `CONTRIBUTING.md` - nguyên tắc kiến trúc và quy trình.

## Ba package

```
packages/tinita/       chạy MỌI NƠI (Node + browser), 0 dependency, 0 peer
packages/tinita-react/ hook + UI component, 0 dependency, peer: react (bắt buộc)
                       + @base-ui/react và lucide-react (optional)
packages/tinita-dom/   browser tối thiểu, 0 dependency, 0 peer
                       (devDependency `tinita` cho lúc build; bundle:true inline nên
                        bản publish không có runtime dep)
```

`config/` giữ eslint/typescript/ui dùng chung. `apps/storybook` là nơi xem
component. `compatibility/` là lab kiểm package từ góc nhìn người dùng - **không**
nằm trong pnpm workspace, và có ca L2 chặn việc thêm nó vào.

pnpm + Turborepo. Node >= 18.

## Lệnh

```bash
pnpm gate           # CỔNG: format, lint, types, build, test, stories, doc-links,
                    #      assert-reuse, L1
pnpm gate:full      # thêm L2 và L4 (cần chromium, vài phút) - chạy trước publish

pnpm build          # turbo run build
pnpm test           # vitest run, cả 3 package
pnpm lint
pnpm check-types
pnpm format         # prettier --write
pnpm format:check   # dùng cái này làm cổng, đừng --write rồi xem diff
pnpm check-stories  # mọi subpath publish ra đều phải có story
pnpm check-doc-links # mọi đường nhập viết trong .md đều phải tồn tại trong exports
pnpm check-assert-reuse # điều kiện inline không được trùng primitive ở tinita/asserts/*
pnpm storybook
```

**Không có CI.** Owner chốt: repo một người, `pnpm gate` trên máy là đủ.

`npm publish` và `npm deprecate` là **hành động của owner**. `scripts/publish.mjs`
dừng ở `npm whoami` - đừng bypass.

## Không tồn tại - đừng thêm lại từ ký ức

- **`generate:exports`**: không có `scripts/generate-package-exports.mjs`, không có
  task trong `turbo.json`. `exports`, entry tsup và barrel đều sửa TAY.
  (`scripts/generate-mime-table.mjs` là chuyện khác: nó sinh **dữ liệu** bảng MIME từ
  `mime-db` rồi commit kết quả, không sinh `exports`.)
  `tinita-react/tsup.config.ts` có tự quét entry bằng glob, nhưng `exports` thì
  không. Thêm subpath = sửa `package.json` + `typesVersions` + `contract.json`.
- **`tailwind.config.cjs`**: đã xoá. `build-entry.css` cố ý không
  `@import "tailwindcss"` nên `content` của nó chưa bao giờ được dùng.
- **`src/styles/index.css`**: đã xoá, mồ côi.
- **Tailwind `--prefix`**: chưa từng tồn tại. Đừng viết tài liệu như thể có.
- **`CSS_GUIDE.md`**: không tồn tại.

## Build: bốn bất biến, mỗi cái từ một bug thật

`tsup` cho `tinita` và `tinita-dom`. Với **`tinita-react` thì tsup CHỈ sinh
declaration**: `build:js` là `vite build` chạy hai lần (`TNT_FORMAT=es` rồi `cjs`),
`build:types` mới là tsup. Sửa output JS của `tinita-react` trong `tsup.config.ts`
là sửa file không ai dùng - đo 2026-10-06. Đừng đổi những thứ sau mà không đọc lý
do:

1. **`bundle: true`** - bắt buộc, KHÔNG phải `false`. Với `bundle: false` esbuild
   giữ nguyên specifier tương đối không đuôi trong `.mjs`, và Node ESM đòi đuôi:
   `ERR_MODULE_NOT_FOUND` ở mọi import nội bộ. Đây là bug B2 của lab.
2. **`outExtension: cjs -> .cjs, esm -> .mjs`** - `exports.require` trỏ `.cjs`;
   không có nó tsup emit `.js` và mọi `require()` gãy. Bug B1.
3. **`types` tách theo condition** - `import` -> `.d.mts`, `require` -> `.d.ts`.
   Dạng phẳng (`{types, import, require}`) làm `import` nhận declaration kiểu CJS
   cho một file ESM. **Đo 2026-10-06**: 10 subpath của `tinita-react` dùng dạng
   phẳng, và `attw` báo đúng 10 dòng `Masquerading as CJS`, khớp 1-1. Nợ #18 từng
   ghi "không tái lập được" - đúng, vì ca `02-attw` đang CRASH và báo xanh; xem
   mục "Quy tắc làm việc" bên dưới.
4. **`banner: { js: "'use client';" }` cho tinita-react** - esbuild XOÁ directive
   khỏi output, nên đặt `'use client'` trong source là không đủ. Đo được: dist bắt
   đầu bằng `import{...}`. Cả package là client nên áp toàn bộ là khai đúng.

`typesVersions` phải đồng bộ với `exports` cho cả 3 package (QĐ-2 của owner:
support `moduleResolution: node`). Nó không có tool đồng bộ - ca L1
`08-typesversions-sync` là cửa chặn duy nhất. Hình dạng đúng là **key tường minh
từng subpath, KHÔNG wildcard**; xem `docs/code-standards.md`.

## Đường nhập

**105 subpath công khai** (tính cả root của mỗi package). Danh sách thật nằm trong `exports` của từng
`package.json`; `pnpm check-doc-links` làm đỏ nếu một `.md` nào nhắc tới đường
không tồn tại, nên đừng liệt kê lại ở đây.

`tinita` (61) - barrel hoặc subpath đều được. Thư mục: `array/`, `asserts/`,
`converter/`, `date/`, `file/`, `html/`, `mime/`, `object/`, `print/`, `string/`,
`unit/`, `uuid/`, `validation/`.

`tinita-dom` (23) - browser-only, **có chủ ý không có SSR guard khi GỌI**, nhưng
mọi module phải **import** sạch khi không có DOM. Thư mục: `converter/`,
`dimension/`, `file/`, `html/`, `image/`, `storage/`, `style/`, `unit/`,
`validation/`, cộng `smooth-scroll` và `wheel-source`.

`tinita-react` (21, trong đó 4 là CSS) - dùng **subpath cụ thể**. 9 hook,
5 component, 2 util.

<!-- doc-links-ignore -->

`tinita-react/hooks` và `tinita-react/ui` **không tồn tại** - CLAUDE.md từng ghi
chúng là bắt buộc và chỉ người dùng vào đường chết. Đó là lý do
`scripts/check-doc-links.mjs` tồn tại.

Barrel `tinita-react` tồn tại nhưng nó re-export `./ui/file-tree`, nên
`import { Ping } from 'tinita-react'` đòi `@base-ui/react` và `lucide-react` dù
Ping không cần. Đây là lý do KỸ THUẬT để tránh barrel.

`installSmoothScroll()` gọi một lần ngoài React và trả về hàm gỡ.

`tinita-react/hooks/useDragSnap` và `hooks/useWindowDrag` là hai hook của
`FloatingWindow`, mở thành subpath công khai 2026-10-05 theo quyết định của owner. Chúng
**controlled**: chỉ giữ gesture đang chạy, caller sở hữu vị trí và quyết định có ghi nhớ
hay không. Cả hai re-export kiểu mà signature của chúng dùng (`Point`, `Viewport`,
`WindowGeometry`, `SnapSide`), nên không cần mở thêm subpath cho `geometry` - file đó cố
ý vẫn nằm trong folder component, vì `src/hooks/` và `src/utils/` bị quét PHẲNG nên đặt
ở đó là tự sinh thêm một entry build-mà-không-export.

## Dependency: optional peer, không phải dependencies

Component có phụ thuộc khác nhau - có cái dùng `motion`, có cái dùng `antd`, có
cái dùng Base UI. Người dùng 1-2 component **không được** bị buộc cài hết. Vì vậy
mọi thư viện của component là `peerDependencies` + `peerDependenciesMeta.optional`.

npm **không cảnh báo** khi optional peer thiếu, nên bảng component -> peer trong
README là bắt buộc, không phải trang trí. Quy tắc đầy đủ ở
`docs/code-standards.md` mục "Quy Tắc Dependency".

## Validation: dùng vốn từ có sẵn, đừng viết `if` mới

`packages/tinita/src/asserts/` có **8 primitive**, đều là subpath công khai.
`tinita-dom` và `tinita-react` dùng qua `tinita/asserts/*`.

```
assertString          assertNonEmptyString     assertArray
assertFiniteNumber    assertPositiveFiniteNumber
assertInteger         assertObject             assertDpi
```

Hình dạng thông báo, ba thành phần đều có lý do:

```
<tênAPI>: <tênTham số> must be <invariant>, got <mô tả>
```

`assertString(value, 'titleCase')` · `assertNonEmptyString(name, 'cookieJar.set', 'name')`

**`pnpm check-assert-reuse` làm đỏ một điều kiện inline trùng primitive**, và nó nằm
trong `pnpm gate`. Thoát bằng `// assert-reuse-ignore <lý do>` ở dòng trên hoặc cùng
dòng - **lý do là bắt buộc**, marker rỗng vẫn đỏ.

Guard này tồn tại vì quy ước đã thất bại một lần, đo được: `html/html.ts` có sẵn
`assertString` với đúng signature `asserts`, giải một điều kiện có ở **14 file**, và
được dùng ở **1**. Một ngày sau `assertDpi` được viết ở `unit/printPixels.ts`
**không** có `asserts`. Không ai thấy cả hai vì không có gì đang nhìn.

### Bốn thứ KHÔNG được làm

**Đừng tạo primitive mới cho một hai consumer.** `assertFunction` (2 chỗ),
`assertBlob` (2), `assertUint8Array` (1), `assertNonNegativeInteger` (1) đều **cố ý
không có**. Giữ inline kèm marker.

**Đừng retrofit predicate.** `isX` trả `boolean` và không bao giờ ném. `isUrl(42)`
phải là `false`, không phải một throw. Cả `validation/*` của `tinita` lẫn của
`tinita-dom` đều không được chuyển.

**Đừng validate trong đệ quy.** `omitEmptyValues` lập invariant **một lần** ở hàm
công khai và `filter` nội bộ tin nó. Nhưng `converter/objectToMap` **tự gọi chính nó
như API công khai** nên nó kiểm từng tầng. Hai hàm đệ quy, hai phán quyết trái nhau,
lý do nằm trong code - đọc trước khi sửa.

**Đừng thêm assert vào thân hook React.** `usePagination` có hợp đồng là **clamp**,
không ném, và một property test 2000 mẫu khoá việc `NaN` với `Infinity` đi qua được.
Thân hook chạy lại mỗi render.

### Hàm công khai bọc hàm công khai thì phải TỰ assert dưới tên nó

Nếu không, người gọi nhận thông điệp nêu tên một hàm họ chưa từng gọi - đúng thứ tham
số `caller` sinh ra để loại bỏ. Đo được **6 chỗ** vi phạm sau khi guard đã xanh:
`base64ToString` và `base64ToBlob` nêu `base64ToBytes`; `toDevicePixels` nêu
`convertLength`; `truncateFileName` và `truncateFileNameParts` nêu `getFileNameParts`;
`provisionalWheelSource` nêu `decisiveWheelSource`. Giá là một `typeof` thêm mỗi lời
gọi.

`toDevicePixels` là ca đáng nhớ: `fromDevicePixels` **ngay dưới nó trong cùng file** đã
assert đúng từ đầu. Hai hàm anh em, hai hình dạng - lặp lại đúng defect mà cả vốn từ
này sinh ra để diệt.

### `check-assert-reuse` MÙ với việc không validate gì cả

Nó bắt điều kiện inline **trùng** primitive. Một hàm công khai **không có điều kiện
nào** thì nó không thấy - và lớp đó tệ hơn vì im lặng: `fileSize(-5)` trả chuỗi
`"NaN undefined"`, `provisionalWheelSource('x')` trả `'smoothed'` (một phán quyết SAI
mà trông đúng), `objectToMap(42)` trả `Map` rỗng, `base64ToFile(42)` trả một `File`
tên `undefined`.

Cách thứ hai, mù khác chỗ, có trong `docs/code-standards.md`: đọc kiểu tham số đầu từ
`dist/*.d.mts`, gọi bằng giá trị sai kiểu, phân loại thành im lặng / nêu sai tên / nêu
đúng tên. Dùng lại nó sau khi thêm export mới.

### `TypeError` hay `RangeError`

```
TypeError     typeof sai, không finite, không integer, <= 0, rỗng
RangeError    CHỈ khi đúng kiểu nhưng ngoài một khoảng CÓ BIÊN tường minh
```

Phân biệt là **có biên**, không phải "có vi phạm giá trị". `dpi <= 0` là contract
dương nên `TypeError`. Cả repo có **đúng một** `RangeError`: `resizeImage.quality`,
khoảng `0..1`.

Phải ghi ở đây vì chuẩn gốc liệt kê `value <= 0` dưới **cả hai** nhóm; owner chốt
cách đọc "chỉ khoảng có biên" ngày 2026-10-02.

Chi tiết và bằng chứng extract từng primitive: `docs/code-standards.md` mục
"Quy Tắc Validation".

## CSS đi theo component - `ui/*` đòi consumer hiểu CSS

`import { Ping } from 'tinita-react/ui/ping'` tự kéo CSS. **Không phải import
stylesheet.** Chi tiết và số đo ở `docs/system-architecture.md` mục 6b; đây là thứ cần
biết ngay:

```
ui/<name>/index.ts       import the bridge below, bare specifier  <- viết TAY
ui/<name>/index.css      bridge: @import token chung + motion + riêng + styles
ui/<name>/styles.css     CSS Modules đã compile (vite emit)
ui/<name>/tokens.css     token của riêng component
styles/tokens.css        36 token dùng chung: màu + radius + font
styles/motion-tokens.css 5 token motion mà CSS component tham chiếu
```

**Token motion ở file RIÊNG, không nằm trong `styles/tokens.css`.** Ba ràng buộc
cùng lúc, chỉ file riêng thoả cả ba: bridge cần 5 token (import `animations.css`
là trả 56 token + 18 keyframes); **16 rule của chính `animations.css`** cũng dùng
5 token đó nên nó không nhường đi được; và `docs/design-guidelines.md` khai
`tinita-react/styles/animations.css` là đường nhập công khai nên nó phải tự đủ.
Gộp vào `tokens.css` rồi cho `animations.css` import lại thì postcss inline
`tokens.css` **hai lần** - đo 2026-10-06: `dist/styles.css` nhảy 190 -> 230 khai
báo. Bridge nào dùng token motion thì `@import
'tinita-react/styles/motion-tokens.css'`; hiện là `tree`, `ping`,
`floating-window`, `file-tree`.

**Thêm component mới thì phải viết `index.css` và dòng `import` trong `index.ts`.** Không
có bước build nào chèn nó - nếu thiếu, component ship ra không có style và chỉ ca
`css-graph:*` của L2 bắt được.

**Specifier phải BARE** - bắt đầu bằng tên package. Tương đối thì rollup viết lại thành chỗ
không tồn tại: đo được `./index.css` ra `../../ping/index.css`.

**Bridge KHÔNG được import `globals.css` hay `animations.css`.** Đo 2026-10-05: 0
component dùng `var(--color-*)` và 0/18 keyframes của `animations.css` được component
nào tham chiếu. Import vào là bắt một component trả 150 mapping Tailwind, 18 keyframes
và token của mọi component khác.

**`sideEffects` phải kể tên JS ENTRY có side effect**, không chỉ CSS. Dạng
`["./dist/**/*.css"]` - đúng dạng docs webpack khuyên - làm rollup **xoá** import CSS, và
nó chỉ hỏng ở production build chứ không hỏng ở dev. Giá trị đúng:
`["./dist/**/*.css", "./dist/ui/*/index.mjs"]`.

**Hợp đồng Node-safe giờ chỉ gồm `hooks/*` và `utils/*`.** `ui/*` và root (nó re-export
component) không load được bằng `node` trần. `contract.json` khai
`cssAwareSpecifiers`, và ca lab đọc trường đó - **đừng** viết ca khẳng định
`ERR_UNKNOWN_FILE_EXTENSION`, đó là chi tiết loader của Node hôm nay chứ không phải hợp
đồng của package.

**Conditional `node` export đã thử và đã loại**, đừng mở lại: nó làm Next mất CSS khi
page là Server Component (đo: 0 byte, đối chứng bỏ condition ra thì 2424 byte). Next
server graph phải thấy cạnh CSS để client graph thừa hưởng.

### Sàn browser của CSS: `oklch()` và `color-mix()`

```
oklch()      Chrome 111  Safari 15.4  Firefox 113   --tnt-ping, --tnt-ping-dot
color-mix()  Chrome 111  Safari 16.2  Firefox 113   --tnt-tree-selected-bg,
                                                    --tnt-floating-window-border-idle
```

`oklch()` đã nằm trong CSS publish từ trước khi ai viết nó ra - đo 2026-10-06, 3 khai
báo. `color-mix()` thêm có chủ ý 2026-10-06 để hai token kia dẫn xuất từ `--tnt-ring`
và `--tnt-border` thay vì đóng băng một giá trị tính tay.

**`rgb(from ...)` đã cân và loại**: nó giữ được serialization `rgba()` nhưng sàn
Firefox là 128 (7/2024) so với 113 mà package đã đòi - khoảng 15 tháng Firefox cho
một khác biệt hình thức.

**`in srgb`, KHÔNG `in oklab`.** Đo trong Chromium: `in srgb` cho kênh trùng khít
literal cũ, `in oklab` đi qua không gian khác và serialize ra `oklab(...)`.

Hệ quả quan sát được: `color-mix()` serialize thành
`color(srgb 0.145098 0.388235 0.921569 / 0.12)`, không phải `rgba(37, 99, 235, 0.12)`.
Cùng màu trong phạm vi làm tròn float - đo `99.0` ra `98.9999` - nhưng **mọi phép so
sánh trên `getComputedStyle` phải so SỐ, không so chuỗi**. Và đừng đọc màu bằng
canvas: nó lưu 8-bit và làm tròn màu alpha thấp, đo được `rgba(37, 99, 235, 0.12)` ra
`[33, 99, 239, 31]`.

### Token mới đặt ở đâu - năm câu, hai câu đầu máy kiểm được

```
1. Có >= 2 component CSS tham chiếu nó?          -> styles/tokens.css
2. Consumer cần đổi nó để retheme library?       -> styles/tokens.css
3. Chỉ một component, và là quyết định design?   -> ui/<name>/tokens.css,
                                                    khớp ^--tnt-<name>(-|$)
4. Do JS set, hoặc bọc biến third-party?         -> khai LOCAL trong .module.css,
                                                    BẮT BUỘC có fallback trong var()
5. Hằng số layout dùng một lần?                  -> viết thẳng, không thành token
```

Nhánh `$` của câu 3 là bắt buộc: `ui/ping/tokens.css` khai `--tnt-ping` (khối light
và khối dark), và luật thiếu nhánh đó bắt oan đúng hai khai báo ấy.

Quy tắc này tồn tại vì không có nó thì `--tnt-spacing-tree-indent` - token của Tree,
trùng giá trị với `--tnt-tree-indent` của chính Tree - nằm trong file chung và chỉ
`globals.css` dùng. Đo 2026-10-06.

**`pnpm check-css-tokens` canh bốn thứ trên `dist`, và nó nằm trong `pnpm gate`**
(sau `build`, vì nó đọc `dist`):

```
I6  mọi var(--tnt-*) trong CSS graph của component phải được khai TRONG graph đó,
    hoặc có fallback
I4  token trong ui/<name>/tokens.css phải khớp ^--tnt-<name>(-|$)
I8  bridge không được import styles.css / styles.layer.css / globals.css /
    animations.css
I2  graph phải kéo ui/<name>/styles.css của chính component, và mọi @import phải
    giải được qua exports
```

I2 là phần chống xanh-oan: không có nó thì một bridge bị xoá hết `@import` cho graph
rỗng -> 0 use -> guard XANH, trong khi component ship ra không có style nào. Đo
2026-10-06 bằng cách xoá `@import` khỏi `dist/ui/ping/index.css`: I6 tụt 11 -> 10,
tức con số TRÔNG NHƯ ĐỠ HƠN.

Guard đọc `dist` chứ không `src`, vì specifier trong bridge là bare và giải qua
`exports` - `dist` là graph consumer thật nhận.

**Lớp lỗi nó canh đã xảy ra thật, và cả hai tầng browser của repo đều mù với nó.**
8 declaration trong `Tree`, `Ping`, `FloatingWindow` tham chiếu 5 token motion chỉ
khai trong `animations.css`. Đo trong Chromium: `animation` là shorthand nên `var()`
không giải được làm invalid CẢ declaration, `animation-name` về `none`, pulse của
Ping MẤT HẲN. Nó sống sót vì consumer browser của **cả** L2 (`vite:render`) **và**
L4 (root layout của app Next) đều `import 'tinita-react/styles.css'` - và trong Next
App Router root layout áp cho mọi route nên không route nào tránh được. Ca
`motion-present` của L2 là ca đầu tiên dựng consumer KHÔNG nhập `styles.css`.

## CSS: không được chạm vào trang khách

Owner đã dính production: Tailwind và CSS global của library xung đột với web của
client. Mọi quy tắc dưới đây có số đo và có guard.

- **Prefix `tnt-`** cho mọi class, custom property, và `@keyframes`. Không chỉ
  class: `@keyframes accordion-down` trùng thẳng tên keyframes của shadcn.
  **Cách làm là CSS Modules với tên LOCAL, không phải hash.** Cả 5 component đều
  `import styles from './<Tên>.module.css'` và viết `.root`, `.header`; build sinh
  `tnt-ping-root`, `tnt-floating-window-header` - vẫn đọc được, vẫn override được
  bằng CSS. Cái owner chốt không dùng (2026-09-26) là **hash tên**: nó lấy mất khả
  năng override của người dùng. CLAUDE.md từng ghi gọn thành "không dùng CSS
  Modules", trái hẳn với code - đo 2026-10-02: 5/5 component dùng. Lý do đầy đủ ở
  `docs/system-architecture.md`.
- **Không** rule nào nhắm `body`, `html`, hay `*`. Không `color-scheme`.
- **Dark mode ĐỌC quy ước của host**, không định nghĩa nó:
  `:where(.dark, [data-theme='dark'])`. `:where()` cho specificity 0 nên host luôn
  đè lại được - cách antd v5 dùng.
- **Biến runtime của third-party** (`--radix-*`) không được nằm trong CSS công
  khai. Bọc lại sau token của tinita.
- **Không class Tailwind trong JSX.** Bundle cố ý không ship utility nào, nên một
  class Tailwind là phụ thuộc NGẦM vào Tailwind của host. Đo được: `Ping` từng
  nhận `display: block` thay vì `inline-flex` khi host không có Tailwind.
- **Biến thể đi qua `data-*`**, không qua chuỗi class, và luôn qua
  `src/utils/variantAttributes.ts`. Viết `data-*` thẳng trong JSX bị guard chặn.
  Boolean render tường minh `'true'`/`'false'` (CSS có rule cho cả hai);
  `undefined` bỏ attribute và nghĩa là "theo chủ nhà" - đó là cơ chế của `theme`.
- **`theme` không có default.** Default `'light'` sẽ ép sáng mọi component nằm
  trong host dark. Và token light phải khai bằng `:where(:root, ...)` chứ không
  `:root` trần: `:root` là (0,1,0), `:where(.dark)` là (0,0,0), nên `.dark` đặt
  trên chính `<html>` (cách Tailwind và shadcn làm) thì dark mode vỡ. Đo được
  2026-09-28; guard là ca L2 `theme-matrix`.
- **Source CSS KHÔNG tự bọc `@layer`.** Build sinh hai bản: `styles.css` không
  layer và `styles.layer.css` bọc `@layer tnt`, từ cùng một nguồn. Consumer chọn.
  Đây là cách Mantine làm.

Guard: `packages/tinita-react/tests/styles/no-global-leak.test.ts` (10 ca, chạy
trong `pnpm test`) và ca `css-leak` của L2 (đo thật trong Chromium). Hai cái không
thay thế nhau - ca L2 mạnh hơn nhưng cần chromium nên không chạy trong vòng lặp.

## Tree và FileTree: primitive và adapter

`Tree` nhận dữ liệu (`nodes: TreeNode[]`). `FileTree` đọc chuỗi cây CLI/thụt lề,
gắn icon theo phần mở rộng, rồi đưa cho `Tree`. Có sẵn dữ liệu dạng cây thì dùng
thẳng `Tree` - đừng chuyển ngược về chuỗi để parse lại.

`Tree` không phụ thuộc thư viện icon (nhận `ReactNode`), chỉ `FileTree` dùng
`lucide-react`. Cả hai cần `@base-ui/react` cho phần đóng/mở.

### Animation: dùng NGUYÊN mẫu của Base UI, đừng tự chế

Bản gốc nằm ngay trong package: `@base-ui/react/docs/react/components/accordion.md`.
Viết bằng Tailwind, dịch sang CSS thường:

```css
.panel {
  height: var(--accordion-panel-height); /* hoặc --collapsible-panel-height */
  overflow: hidden;
  transition: height 150ms ease-out;
}
.panel[data-starting-style],
.panel[data-ending-style] {
  height: 0;
}
```

**TRANSITION trên `height`, không phải `@keyframes`.** Đó là chi tiết quyết định.
`getAnimationType` của Base UI đọc computed style ngay tại thời điểm đổi trạng thái
và chỉ chạy animation khi phát hiện được. Với transition, `transition-duration`
luôn khác 0 trên class gốc nên nó luôn phát hiện đúng.

Với keyframes thì hỏng: lúc ĐÓNG, `[data-open]` vừa bị gỡ còn `[data-ending-style]`
chưa được thêm, Base UI đọc ra `animation-name: none`, kết luận không có animation,
và bỏ luôn animation đóng. Đo được 2026-09-28: panel biến mất ở t=9ms,
`data-ending-style` không bao giờ xuất hiện. `keepMounted` KHÔNG cứu được.

### Biến CSS của Base UI không có namespace

Nó là `--collapsible-panel-height`, không phải `--base-ui-...`. Hai hệ quả: nó có
thể đụng biến cùng tên của host, và guard dò biến third-party không thể dựa vào
tiền tố nhà cung cấp - phải liệt kê tên thật. Bọc nó sau token của tinita ngay tại
chỗ dùng, đúng một lần.

## FloatingWindow: controlled, và prop là hàm nên RSC cần `'use client'` của consumer

`'use client'` mà library tự khai (banner của tsup) đủ cho `Ping`, `FileTree`,
`CarouselTicker` - consumer đặt chúng thẳng vào Server Component được. **`FloatingWindow`
thì không**, vì nó nhận prop là hàm (`onOpenChange`). Đo thật 2026-10-02 bằng
`next build`:

```
Error: Event handlers cannot be passed to Client Component props.
  {open: true, onOpenChange: function onOpenChange, title: ..., children: ...}
```

Consumer phải tự bọc `'use client'`. Hai ca L2 khoá đúng cặp này:
`next:rsc-floatingwindow-no-directive` (mong đợi FAIL, **và** khớp đúng chuỗi lỗi trên)
và `next:rsc-floatingwindow-app-directive` (PASS). Ca mong đợi fail phải khớp cả exit
code lẫn lý do - chỉ đòi `exit != 0` thì nó xanh y nguyên khi nguyên nhân đổi sang thứ
khác.

Component **không giữ state nào**: `open`, `mode`, `geometry`, vị trí bubble đều là
prop, có fallback nội bộ khi không truyền. Bản từ app dùng store `zustand` + `persist`
ở module scope, nên chỉ cần import là library dựng một singleton và ghi vào
`localStorage` của consumer dưới key mang tên ứng dụng gốc. Lưu trữ là quyết định của
consumer, nên nó là `onGeometryChange` và không gì khác.

**Minimize KHÔNG unmount.** Window thu nhỏ bằng `transform: scale`, giữ nguyên
`width`/`height` thật, nên body không reflow về 48px - `<iframe>` bên trong giữ state
và không reload. Body bị gỡ khỏi hit-testing lúc thu nhỏ, vì `pointer-events: auto`
của chính iframe thắng `none` đặt trên tổ tiên và sẽ ăn hết click dành cho bubble.

**Icon là SVG inline, không `lucide-react`.** `lucide-react` là peer **optional**, nên
import nó ở đây sẽ làm component throw ở consumer không cài. `Tree` cũng chọn vậy (nhận
`ReactNode`); chỉ `FileTree` phụ thuộc thư viện icon.

`react-dom` giờ là **peer bắt buộc** (`createPortal`). Nó đã nằm trong `external` của
vite từ trước mà chưa được khai peer - comment ở đó nói "PHẢI khớp `peerDependencies`",
nên đây là bịt lệch cũ chứ không phải thêm phụ thuộc mới.

### Phím tắt là PROP, không có mặc định nào

`keyBindings` nhận cú pháp của `tinita/converter/parseKeyCombination`, nên `cmd`, `⌘`,
`option`, `win` đều hiểu được, và một action nhận được nhiều tổ hợp:

```tsx
keyBindings={{ close: 'Escape', minimize: ['Ctrl+M', 'Cmd+M'], maximize: 'F11' }}
```

**Không phím nào bị bind sẵn.** Window này không phải modal, nên một `Escape` hardcode
sẽ ném đi thứ người đọc đang làm trong đó, và không phím nào là lựa chọn đúng cho mọi
ứng dụng. Owner chốt 2026-10-05.

Ba quyết định trong `useKeyBindings.ts` không suy ra được từ code, đọc trước khi sửa:

1. **Listener trên `document`, cổng là `open && active`.** Đặt trên chính element thì
   nó không làm gì cho tới khi người đọc click vào trong, nên một window vừa mở sẽ bỏ
   qua phím tắt của chính nó và trông như hỏng. `active` là thứ đã có để phân biệt
   nhiều window - chỉ cái đang active trả lời.
2. **Một phím in được không có modifier bị bỏ qua khi focus đang ở field.** Bind `'m'`
   cho minimize thì nếu không có guard này, mỗi lần gõ chữ m vào input trong window là
   window thu nhỏ. Tổ hợp có modifier, và phím có tên như `Escape`/`F2`, **vẫn** chạy
   trong field - chúng không đụng việc gõ. Không làm thành prop, vì phương án còn lại
   chưa bao giờ là thứ caller muốn.
3. **Dep của effect là `JSON.stringify(bindings)`, không phải `bindings`.** Caller viết
   `keyBindings={{ close: 'Escape' }}` inline nên object đổi identity mỗi render, và
   dep theo object sẽ gỡ/gắn listener mỗi render - đúng bẫy `Object.is` mà
   `useWindowSize` đã ghi. `run` giữ trong ref cùng lý do.

Phần so khớp event với `KeyCombination` nằm **nội bộ** trong `useKeyBindings.ts`, không
thành primitive ở `tinita`: đúng một consumer, nên theo §19 giữ local. Có consumer thứ
hai thì mới chuyển.

### Tooltip hiện phím tắt, và nó phải là phím CHẠY ĐƯỢC

Hover vào control thì `title` thành `Minimize (Ctrl + M)`, trên Apple là
`Minimize (⌘M)`. Bốn điều quyết định ở `formatKeyCombination.ts`:

- **Control <-> Command tự đổi theo platform, nhưng CHỈ khi caller chưa cover cả hai.**
  Owner chốt 2026-10-05. Một action vừa có tổ hợp chỉ-Ctrl vừa có tổ hợp chỉ-Cmd thì
  **không map gì**: caller đã nói rõ cho từng nền. Chỉ có một trong hai thì nó được
  **đổi** sang phím của nền đang chạy.

  Phép đổi áp cho **cả listener**, không chỉ nhãn - đó là thứ làm nhãn trung thực. Bind
  `'Ctrl+M'`, mở trên Mac, thì `⌘M` là phím **thật sự chạy**. Đây là quy ước `Mod` mà
  mọi editor dùng (CodeMirror, ProseMirror, Tiptap), áp tự động chứ không qua keyword.

  Nửa gây ngạc nhiên: trên Mac, `'Ctrl+M'` đơn lẻ **thành** Command, nên Control+M
  **không còn chạy**. "Đổi" nghĩa là thay thế, không phải thêm. Muốn giữ cả hai thì bind
  cả hai.

  Không bị map: tổ hợp không có cả hai modifier (`F11`, `Escape`, `Alt+M`), và tổ hợp
  có **cả hai** (`Ctrl+Cmd+M`) - nó đã tự nói rõ.

- **Nhãn hiện tổ hợp đã map**, nên nó luôn là phím chạy được. `parseBindings` map một
  lần, kết quả dùng cho **cả** listener lẫn tooltip - hai lần parse là cách nhãn và phím
  đi lệch nhau.
- **`aria-label` giữ nguyên tên hành động, phím tắt đi vào `aria-keyshortcuts`** - đó
  là attribute ARIA định nghĩa cho việc này. Gộp vào label sẽ khiến screen reader hiểu
  attribute đó đọc hai lần. `aria-keyshortcuts` liệt kê **mọi** tổ hợp đã bind, không
  chỉ cái đang hiện, vì tất cả đều chạy.
- **`useKeyBindings` nhận map ĐÃ parse**, không nhận prop thô - nên chỉ còn đúng một
  chỗ parse, và control không thể quảng cáo một phím nó không trả lời.

- **Apple NỐI LIỀN, nơi khác có dấu phân cách.** `⌘M` chứ không `⌘ + M`: mọi menu
  macOS viết liền nên một dấu `+` giữa các glyph đọc ra lạ ở đó. Ngoài Apple thì
  modifier là CHỮ, mà chữ thì cần phân cách - `CtrlM` không đọc được. Owner chốt kiểu
  Apple thuần 2026-10-05, thay bản trước dùng `' + '` cho cả hai phía.
  Bỏ dấu phân cách **một mình là chưa đủ**: `Cmd+Escape` sẽ ra `⌘Escape`, glyph dán vào
  một từ. Nên có bảng `APPLE_KEY_GLYPHS` - `⎋ ⇥ ↩ ⌫ ⌦ ↑↓←→ ⇞⇟ ↖↘`. Chỉ phím có glyph
  **rõ ràng trong UI của Apple** mới vào bảng; phím không có thì giữ nguyên chữ, đúng
  như macOS làm: `F11` vẫn là `F11`, `Space` vẫn là chữ `Space` chứ không `␣`.

Thứ tự modifier: Apple là `⌃⌥⇧⌘` đúng thứ tự mọi menu Mac dùng; ARIA là
`Control, Alt, Shift, Meta` - spec chỉ đòi modifier đứng trước phím, không quy định thứ
tự giữa chúng, nên thứ tự này cố định để giá trị attribute ổn định. **ARIA không bao giờ
nhận glyph** - nó cần TÊN phím, nên `aria-keyshortcuts` của `Cmd+Escape` là
`Meta+Escape`.

`isApplePlatform()` **cố ý không dùng** `isMacOS()` của `tinita-dom/validation/platform`
dù đó mới là bản canonical. Lý do: `tinita-react` bắt buộc sống qua SSR, còn `tinita-dom`
bị đánh `browserOnly: true` và ca SSR của L2 **bỏ qua hẳn** nó - tức câu "mọi module
`tinita-dom` phải import sạch khi không có DOM" trong file này **không có guard**, đo
2026-10-05. Một regex trùng lặp rẻ hơn một cạnh package dựa trên bất biến không ai canh.
Ghi ở nợ #21.

### React 18 là sàn CỨNG, và chỉ L4 đo nó

`ui/tree/store.ts` và `hooks/useWindowSize.ts` dùng `useSyncExternalStore` - API của
React 18. `FloatingWindow` dùng `useWindowSize` nên thừa hưởng sàn đó. Hạ xuống React
17 không phải nới một con số, mà là viết lại hai chỗ kia.

Nhưng `peerDependencies` khai `>=18` trong khi **L1 và L2 chỉ cài `react@19`**; chỉ L4
chạy cả `['18', '19']`. Đo 2026-10-02. Từ 2026-10-02 L4 mount `FloatingWindow` trong
Chromium thật ở cả hai phiên bản (`react18:floating-window-mounts`,
`react19:...`), nên component này có coverage 18 thật; phần L1/L2 còn thiếu nằm ở nợ
kỹ thuật #20. **Đừng khai một sàn peer rộng hơn thứ lab đo được** mà không ghi lại
khoảng trống.

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

1. Folder trong `src/ui/<tên>/`: `<Tên>.tsx` (logic), `<Tên>.module.css` nếu có
   style, `index.ts` chỉ re-export. Logic KHÔNG nằm trong `index.ts`.
   (Tên file: `.module.css` và `index.ts`, không phải `.css`/`index.tsx` - đo
   2026-10-02, cả 5 component đều vậy, và vite chỉ quét `ui/<dir>/index.{ts,tsx}`.)
2. CSS thật, prefix `tnt-`, biến thể qua `data-*`. **Không class Tailwind trong
   JSX** - và từ 2026-10-02 việc này CÓ guard: ca
   `NO className in src/ui receives a literal string` trong
   `tests/styles/variant-contract.test.ts`. Mọi `className` phải đi qua `styles.*`
   hoặc prop `className` được chuyển tiếp. Guard dò "không literal" chứ không dò từ
   điển Tailwind, vì 5 component có sẵn đều 0 literal nên quy tắc chính xác không
   cần từ điển phải bảo trì, và nó bắt mọi framework utility.
   Đường lẻn thứ hai cũng bị canh: `@apply`/`@tailwind` trong `.module.css`.
3. Thêm subpath vào `package.json` `exports` **và** `typesVersions`, thêm
   specifier vào `compatibility/contract.json`.
4. **Story trong `apps/storybook/stories/<Tên>/<Tên>.stories.tsx`** - bắt buộc,
   cho cả `tinita-react` và `tinita-dom`. `pnpm check-stories` đọc `exports` và
   làm đỏ nếu thiếu. Story import bằng subpath cụ thể, không qua barrel.
5. Test trong `packages/<pkg>/tests/`.
6. `pnpm gate`.

## Quy tắc làm việc trong repo này

**Guard mới phải được chứng minh bằng cách phá đúng thứ nó canh**, không phải bằng
việc nó xanh. Đã có **sáu** lần một ca báo xanh mà không kiểm thứ nó nói đang kiểm:
cell `bun` advisory PASS khi chưa chạy được; ca `08-typesversions-sync` bản đầu
không thể fail; ca `reduced-motion-scope` dò một hằng số nên mù khi cơ chế đổi;
cell `yarn-pnp` pass 19 ca mà chưa từng đi qua PnP; `check-stories` PASS trên
`feature/snap-corner` vì nó đọc `exports`, mà component mới chưa khai subpath - khai
xong là nó đỏ ngay; và ca `02-attw` PASS trên **cả ba** package trong khi
`@arethetypeswrong/cli@0.18.2` CRASH (`exit=3`,
`Cannot read properties of undefined (reading 'filename')`) - ca đọc CHỈ stdout và
bỏ exit code, nên output của bản crash không khớp mẫu nào và `problems` ra rỗng.
Nó che `FalseCJS` trên 10 subpath, và chính dòng detail "vấn đề: không (đều trong
allowlist)" làm nó đọc như có kiểm soát trong khi `accepted` là mảng RỖNG. Đo
2026-10-06.

Mẫu lặp lại, và đây là cách chặn duy nhất đã dùng được. Hai bài học cụ thể từ lần
thứ sáu:

- **Một ca gọi tool ngoài phải phán quyết cả việc tool có CHẠY hay không**, không
  chỉ grep output của nó. `exit != 0` một mình không đủ khi tool dùng exit code để
  báo "có vấn đề" (attw: 1 = có problem, 0 = sạch) - phải dò cả dấu hiệu crash.
- **Đừng dò mẫu trên cả output.** Phần chú giải của attw chứa câu "Import failed to
  resolve to type declarations or JavaScript files", khớp mẫu `failed to resolve`,
  nên dò trên cả output là tự sinh false positive. Ca giờ chỉ đọc dòng bảng có
  entrypoint trong ngoặc kép.

### `expectedFailure` làm một ca đỏ thành XFAIL, và XFAIL KHÔNG làm suite đỏ

`compatibility/scripts/report.mjs:18` in `XFAIL` thay vì `FAIL` khi meta có
`expectedFailure`, và `:25` loại nó khỏi danh sách fail. Nên một ca truyền
`expectedFailure` sẽ **xanh bất kể nó phán quyết gì**.

Đo 2026-10-02: ca `next:rsc-floatingwindow-no-directive` khẳng định `next build` phải
fail kèm đúng chuỗi `Event handlers cannot be passed to Client Component props`. Đổi
chuỗi đó thành một chuỗi không tồn tại -> ca in `XFAIL` ... `lý do khớp: KHÔNG` và
suite vẫn **exit 0**. Đã bỏ `expectedFailure` khỏi nhóm ca này; phán quyết nằm trong
tham số `ok` của `add()`.

Dùng `expectedFailure` chỉ cho thứ **đã biết hỏng và tạm chấp nhận** (như
`07-registry-vs-local` chờ publish). Một ca khẳng định "việc này PHẢI fail" thì không
dùng nó - encode vào `ok`, nếu không ca chỉ đang canh "có fail", và nó sẽ xanh y
nguyên khi nguyên nhân đổi sang thứ khác.

Khi bịt xong một rò rỉ thì **đảo `expected`** trong ca của lab, đừng viết lại ca -
ca là cửa chặn hồi quy, không phải bản báo cáo một lần.
