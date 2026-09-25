# Tinita - Project Roadmap

Cập nhật: 2026-09-24 (vòng 2) · commit 0a1dd88

Tài liệu này thay thế toàn bộ nội dung cũ (bản trước là roadmap lọt từ project
"ClaudeKit Engineer", không liên quan tới Tinita). Mọi claim về hiện trạng bên dưới lấy từ
kiểm chứng trực tiếp code ngày 2026-09-24; phần định hướng lấy từ brief kiến trúc do owner
mang vào cùng ngày.

## Tóm tắt

Tinita là monorepo pnpm + Turborepo cung cấp utility framework-agnostic (`tinita`) và React
hooks/UI components (`tinita-react`), kèm Storybook để phát triển component trực quan. Repo đã
ship được utilities và 3 UI component đầu tiên, nhưng thiếu test, có vài chỗ cấu hình hỏng, và
chưa có CI/CD. Hướng đi tiếp theo: dọn nợ kỹ thuật trước, dựng nền tảng accessibility qua lớp
chống ăn mòn (anti-corruption layer) quanh nền tảng UI không đồng nhất (antd cho một số component,
Base UI cho số khác), sau đó mới mở rộng bộ component.

**Vòng 2 (2026-09-24):** owner đưa thêm hai ràng buộc kiến trúc bắt buộc, không phải "nice to
have": (1) mỗi component phải khai dependency riêng, user chỉ dùng 1-2 component không được ép cài
cả lib; (2) CSS global của library đã từng xung đột thật với web của client khi deploy - đây là sự
cố production, không phải rủi ro giả định. Cả hai được đưa vào nợ kỹ thuật, mốc mới, và nâng ưu
tiên bên dưới.

## Điểm xuất phát (đã ship)

### packages/tinita v0.0.1

4 utility: `fileSize`, `getFileNameParts`, `truncateFileName` (dưới `file/`), `generateUUID`
(dưới `uuid/`). Build bằng tsup, `bundle: true` với một entry cho mỗi utility nên tree-shaking theo subpath vẫn nguyên,
xuất cả CJS/ESM/`.d.ts`. Không có dependency ngoài.

### packages/tinita-react v0.0.2-alpha.1

- 2 hook: `useToggle`, `useIsomorphicLayoutEffect`
- 3 UI component (đều theo đúng pattern colocation - file chính riêng + `index.ts` re-export):
  `FileTree` (dùng `@radix-ui/react-accordion` trực tiếp), `Ping`, `CarouselTicker`
- CSS pipeline: Tailwind v4 (`@theme inline` trong `globals.css`) + `packages/tinita-react/scripts/build-css.mjs` tự
  viết (copy theme CSS, compile qua PostCSS, gộp với CSS từng component thành `dist/styles.css`)
- `tsup.config.ts` ở đây dùng `bundle: true` (khác `tinita`, và khác nguyên tắc "no bundling"
  trong CLAUDE.md) vì cần external hoá `react`, `react-dom`, `lucide-react`,
  `@radix-ui/react-accordion`, `motion`

### apps/storybook

Tên workspace thật là `@tinita/storybook` (private, v0.0.1). Storybook 10.1.4 với builder
`@storybook/react-vite`, addon a11y/docs/links. 9 story file cho FileTree (6 file), Ping,
CarouselTicker, Animations.

### config/

3 package dùng chung: `@repo/eslint-config` (base/next-js/react-internal),
`@repo/typescript-config` (base/react-library/nextjs/vue-library), `@repo/ui` (card/code/button
mẫu cho nội bộ monorepo, không phải sản phẩm publish).

## Đã vá (2026-09-25)

Kiểm chứng bằng consumer thật + gate đầy đủ (`check-types`, `lint`, `build`, `test` đều EXIT 0).

| Vấn đề                                                                                                                                                  | Cách vá                                                                                                          | Bằng chứng                                                                               |
| ------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| **`exports` trỏ `require` tới `.cjs` nhưng tsup emit `.js`** - mọi `require()` gãy ở CẢ 2 package, và `tinita@0.0.1` đang live trên npm                 | thêm `outExtension` vào cả 2 `tsup.config.ts`                                                                    | 18/18 đường dẫn của `tinita` và 25/25 của `tinita-react` resolve được; trước đó 6/18 gãy |
| **`bundle: false` sinh import ESM không đuôi** (`from "./getFileNameParts"`) -> `ERR_MODULE_NOT_FOUND`; tsup không viết lại specifier                   | `tinita` chuyển sang `bundle: true` (mỗi utility vẫn là 1 entry nên tree-shaking theo subpath không đổi)         | 10/10 đường nhập CJS+ESM chạy; trước đó `tinita/file/truncateFileName` gãy cả hai chiều  |
| 8 lỗi logic trong `truncateFileName` / `getFileNameParts`                                                                                               | viết lại, xem mục dưới                                                                                           | 35 test, EXIT 0                                                                          |
| Nợ #6 - `next.js` import named `{ config }` mà export không có. Hoá ra `config/ui/eslint.config.mjs` cũng vậy và **đang làm `config/ui` lint gãy thật** | cả 2 chuyển sang default import, khớp 3 consumer còn lại                                                         | `turbo lint` 4/4 EXIT 0                                                                  |
| Nợ #10 - `motion` dep chết                                                                                                                              | gỡ khỏi `dependencies` và khỏi tsup `external`                                                                   | không còn trong `pnpm-lock.yaml`                                                         |
| Nợ #11 - `clsx`, `tailwind-merge` khai runtime nhưng bị inline                                                                                          | hạ xuống `devDependencies`                                                                                       | `dist/ui/carousel-ticker/index.mjs` chỉ import `react`                                   |
| `apps/storybook` lint 6 warning + 1 lỗi type (`--max-warnings 0` nên warning = fail)                                                                    | gỡ import/biến/dead component không dùng, `any` -> `StoryContext`, thêm `args` thiếu cho story `ThemeComparison` | `check-types` và `lint` của storybook EXIT 0                                             |
| `tinita-react#test` fail vì vitest exit 1 khi không có file test                                                                                        | thêm `--passWithNoTests`                                                                                         | `turbo test` 4/4 EXIT 0. **Vẫn 0 test thật** - nợ #1 còn nguyên cho package này          |

`tinita-react` giảm từ **5 dependency cứng xuống 2** (`@radix-ui/react-accordion`, `lucide-react` -
đúng 2 lib mà `FileTree` cần). Xác minh trên `dist/`: `ping` chỉ import `react/jsx-runtime`.

### 8 lỗi logic đã vá trong `truncateFileName`

1. `output:'parts'` trả **string** khi không cần truncate (return sớm chạy trước khi xét `output`)
2. Nhánh xử lý đúng cho trường hợp đó là **dead code** (lặp y nguyên điều kiện của return sớm)
3. Extension bị **nhân đôi** và vượt `maxLength` (`maxLength:3` trên `'a.pdf'` -> `'pdf.pdf'`, 7 ký tự)
4. `slice(-0)` trả **cả chuỗi** khi `preservedSuffixLength:0` -> kết quả 43 ký tự với `maxLength:20`
5. `maxLength` âm/NaN không bị chặn
6. Dotfile: `.gitignore` bị coi là "không tên, extension gitignore" -> `'itignore.gitignore'`
7. Emoji bị cắt giữa surrogate pair -> ký tự vỡ
8. **7/9 ví dụ JSDoc sai**, nhiều giá trị còn dài hơn chính `maxLength` nó khai

Ngoài ra: JSDoc 120 dòng đặt trước `type` nên overload không có doc (hover không thấy gì) - đã
chuyển xuống gắn đúng overload; `TruncateFileNameConfig` và `TruncatedFileNameParts` nay được
`export`; thêm field `truncated` vào parts để UI biết có cần tooltip. Mọi ví dụ JSDoc hiện được
test đối chiếu output thật, cộng 5 bất biến quét 1890 tổ hợp.

---

## Nợ kỹ thuật còn lại

| #   | Vấn đề                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            | Vị trí                                                                                                                                                                                                                                                |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | ~~Zero test trong toàn repo~~ **VÁ MỘT PHẦN**: `tinita` có 35 test; `tinita-react` vẫn 0 test. Cả 2 package khai `"test": "vitest"` và đã có `vitest.config.ts`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | `packages/tinita`, `packages/tinita-react`                                                                                                                                                                                                            |
| 2   | Root script `generate:exports` gọi `turbo run generate:exports` nhưng task này không tồn tại trong `turbo.json` (chỉ có 7 task: build, lint, check-types, dev, test, storybook, build-storybook)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | `package.json` root                                                                                                                                                                                                                                   |
| 3   | `pnpm storybook` / `pnpm build-storybook` dùng filter `--filter=@storybook/tinita`, đảo ngược scope thật (`@tinita/storybook`) -> khớp 0 package                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | `package.json` root                                                                                                                                                                                                                                   |
| 4   | `apps/storybook` không có script tên `storybook`, chỉ có `dev` -> kể cả sửa filter #3, turbo task `storybook` vẫn không chạy được                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | `apps/storybook/package.json`                                                                                                                                                                                                                         |
| 5   | Path alias chết `@tinita-internal/*` -> `packages/core/src/*`; `packages/core` không tồn tại trong workspace                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | `config/typescript-config/base.json`                                                                                                                                                                                                                  |
| 6   | **ĐÃ VÁ** - `next.js` import named `{ config as baseConfig }` từ `./base.js`, nhưng `base.js` chỉ `export default` -> `...baseConfig` sẽ throw nếu preset này được dùng ở đâu đó (chưa xác minh có consumer thật hay không)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | `config/eslint-config/next.js`                                                                                                                                                                                                                        |
| 7   | `src/index.ts` của `tinita-react` có barrel export thật (re-export hooks, cả 3 UI, util) - mâu thuẫn trực tiếp với quy tắc "NO barrel imports" trong `CLAUDE.md`. Đây là xung đột code-vs-rule đang tồn tại, chưa rõ bên nào nên nhường bên nào                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | `packages/tinita-react/src/index.ts`                                                                                                                                                                                                                  |
| 8   | `ARCHITECTURE.md` và `DOCUMENT_REQUIRED.md` còn mô tả scope `@tinita/*` (`@tinita/core`, `@tinita/react`, `@tinita/vue`, `@tinita/node`, `@tinita/config`) - tên thật không có scope (`tinita`, `tinita-react`), và package Vue/Node chưa từng tồn tại                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            | `ARCHITECTURE.md`, `DOCUMENT_REQUIRED.md`                                                                                                                                                                                                             |
| 9   | Không có CI/CD: không `.github/`, không `.changeset/`. Release hoàn toàn thủ công qua `scripts/publish.mjs` + `scripts/update-package-versions.mjs`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               | repo root                                                                                                                                                                                                                                             |
| 10  | **ĐÃ VÁ** - `motion` là dependency CHẾT: khai trong `dependencies` (`^12.23.25`) nhưng không file nào trong `src/` hay `apps/storybook` import nó - hit duy nhất là comment "prefers-reduced-motion". Kéo theo chuỗi `framer-motion` -> `motion-dom`, `motion-utils` (~4 gói) cho MỌI consumer dù không dùng. Gỡ được ngay, chi phí gần bằng 0, ưu tiên cao nhất trong nhóm dependency                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            | `packages/tinita-react/package.json`, comment tại `src/ui/file-tree/types.ts:93`                                                                                                                                                                      |
| 11  | **ĐÃ VÁ** - `clsx`, `tailwind-merge` khai ở `dependencies` cứng nhưng bị tsup inline vào bundle (không có trong mảng `external` của `tsup.config.ts`) - runtime không cần chúng là dependency ngoài, có thể hạ xuống `devDependencies` ngay                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | `packages/tinita-react/package.json`, `tsup.config.ts`                                                                                                                                                                                                |
| 12  | **VÁ MỘT PHẦN** (5 dep -> 2) - Cả 5 dependency ngoài (`@radix-ui/react-accordion`, `clsx`, `lucide-react`, `motion`, `tailwind-merge`) khai ở `dependencies` cấp package, trong khi dependency-set của 3 component RỜI NHAU hoàn toàn: `Ping`={}, `CarouselTicker`={clsx, tailwind-merge}, `FileTree`={`@radix-ui/react-accordion`, `lucide-react`}. User chỉ dùng `Ping` (0 dep thật) vẫn phải tải ~20 gói vào `node_modules`. Đây chính là ràng buộc mới #1 của owner - xem mốc M2                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | `packages/tinita-react/package.json`                                                                                                                                                                                                                  |
| 13  | `src/styles/index.css` mồ côi: có `@import "tailwindcss"` đầy đủ (tức ship cả Preflight) nhưng không nằm trong build pipeline (`build-css.mjs` chỉ compile `build-entry.css`) và không có trong `exports` - không file nào reference. Gỡ hoặc nêu rõ mục đích                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | `packages/tinita-react/src/styles/index.css`                                                                                                                                                                                                          |
| 14  | `src/utils/cn.ts` được tsup build ra `dist/utils/cn.{mjs,cjs,d.ts}` qua glob nhưng không có subpath export trong `package.json` - output tồn tại trên đĩa nhưng không import được qua entry chính thức                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            | `packages/tinita-react/src/utils/cn.ts`                                                                                                                                                                                                               |
| 15  | `apps/storybook/stories/Ping/Ping.stories.tsx:3` dùng barrel `import { Ping } from 'tinita-react'`, trong khi 7 story còn lại dùng subpath - chính storybook đang vi phạm quy ước subpath-only mà repo muốn áp dụng                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               | `apps/storybook/stories/Ping/Ping.stories.tsx`                                                                                                                                                                                                        |
| 16  | `autoInjectStyles` không component nào gọi (chỉ có định nghĩa + re-export ở `src/index.ts`), và cơ chế của nó (`document.head.appendChild` chèn cuối head) thua thứ tự nguồn nếu có ai gọi thật - API chết về runtime nhưng tài liệu cũ mô tả như đang hoạt động, cần sửa hoặc gỡ                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | `packages/tinita-react/src/utils/autoInjectStyles.ts`                                                                                                                                                                                                 |
| 17  | CSS ship rò rỉ ra global scope của host app - **sự cố production đã xảy ra thật (ràng buộc mới #2 của owner), không phải giả định**: reset tự viết trên `*`/`body` (`globals.css:116-127`), 22 token không prefix vừa ghi đè namespace `--color-*`/`--radius*`/`--spacing-*`/`--font-*` của Tailwind v4 vừa trùng tên bộ token chuẩn shadcn (`globals.css:81-111`), 27 class không prefix (`animations.css:114-318`), selector `.dark` không prefix (nhiều file), universal + `!important` không scope trong khối reduced-motion (`animations.css:530-539`), CSS component (`FileTree.css`, `CarouselTicker.css`) nằm ngoài mọi `@layer` nên luôn thắng CSS trong layer của client, biến nội bộ Radix `--radix-accordion-content-height` lọt vào CSS công khai (`FileTree.css:230,237`), và Tailwind class thô trong JSX của `Ping`/`CarouselTicker` mà `dist/styles.css` không ship kèm nên chỉ hiển thị đúng nếu client tình cờ có đúng Tailwind config. Chi tiết đầy đủ và cách xử lý ở mốc M1 | `packages/tinita-react/src/styles/globals.css`, `src/styles/animations.css`, `src/ui/file-tree/FileTree.css`, `src/ui/carousel-ticker/CarouselTicker.css`, `src/ui/ping/Ping.tsx`, `src/ui/carousel-ticker/CarouselTicker.tsx`, `tailwind.config.cjs` |

Ghi chú bổ sung: `CLAUDE.md` mô tả script `generate-package-exports.mjs` tự sinh exports/tsup
entry/barrel - script này không tồn tại ở bất kỳ đâu trong repo; exports trong `package.json`
hiện được maintain thủ công, tsup tự khám phá entry bằng glob.

## Định hướng kiến trúc (target state, chưa triển khai)

Nguồn: brief "Thiết kế UI library" do owner mang vào 2026-09-24. Phần này mô tả đích hướng tới,
không phải hiện trạng.

### Nguyên tắc trung tâm: own the contract, borrow the machinery

Tự sở hữu 100%: design tokens, component API, styling/visual language, composition, business
component, accessibility contract, documentation.
Mượn (không tự viết lại): ARIA implementation, focus management, keyboard navigation,
positioning, portal, dismissable layer.

### Primitive foundation: Base UI

Chọn **Base UI** (`@base-ui/react`, headless, MIT) làm nền accessibility/positioning cho
component mới, thay vì tự implement. shadcn đã chuyển Base UI thành default cho project mới từ
07/2026; Base UI v1.8.0 phát hành 09/2026. Radix vẫn chấp nhận được cho phần code sẵn có
(FileTree đang dùng `@radix-ui/react-accordion` trực tiếp) nhưng cần một lớp chống ăn mòn
(anti-corruption layer) bọc quanh: consumer gọi `import { Dialog } from "tinita-react"` không
được biết bên dưới là Base UI hay Radix, để sau này đổi implementation không phá public API.
Không fork shadcn ở tầng component - dùng shadcn như reference implementation + convention +
distribution model, không phải dependency.

### Kiến trúc phân tầng dài hạn

```
tokens -> core/primitives -> react (components) -> blocks -> registry -> applications
```

- tokens: color, spacing, radius, font, shadow, motion, breakpoint, z-index
- core: `cn()`, `Slot`, `Portal`, `mergeProps`, motion, utility function
- react: Button, Input, Field, Select, Combobox, Dialog, Popover, Dropdown, Tabs, Toast, Tooltip, Table
- blocks: DataTable, FilterBar, CommandPalette, Form, Sidebar, Navbar, Dashboard
- registry: phân phối source code kiểu shadcn (`registry.json` + `registry/<component>/`),
  consumer chạy `pnpm dlx shadcn@latest add @tinita/button`

### Phạm vi khởi đầu cho bộ component

Không nhảy thẳng lên 30-50 component. 8-12 component chất lượng rất cao trước: Button, Input,
Select, Checkbox, Radio, Switch, Dialog, Popover, Tooltip, Dropdown, Tabs, Table. API tệ ở
Button/Input sẽ lan ra toàn library nên phải làm đúng ngay từ đầu.

### CSS isolation cho library (4 lớp bảo vệ, hiện mới có prefix quy ước bằng tay)

1. Không ship Preflight - không `@import "tailwindcss"` đầy đủ (kéo global reset lên
   img/video/h1/button/input); chỉ dùng phần theme + utilities cần thiết
2. Prefix toàn bộ utility qua engine Tailwind v4 (`@import "tailwindcss" prefix(tinita)`), không
   chỉ đặt tên class thủ công như hiện tại
3. Token là CSS variable, không hard-code giá trị (đã làm đúng phần lớn - 140+ token dùng
   biến, còn vài chỗ cần rà lại)
4. Scope token dưới `[data-ui]` thay vì `:root` trần, để coexist an toàn với design system khác
   của host app

Không dùng Shadow DOM mặc định - isolation mạnh nhưng phá theming/portal/SSR/a11y tooling.

### 3 mức customization cho consumer

Level 1 (đa số): override CSS variable trong `[data-ui]`, không chạm component. Level 2:
variant + size prop (`<Button variant="primary" size="lg" />`) + `className`. Level 3: full
override qua `className` / `slotProps` / CSS riêng. Dấu hiệu kiến trúc sai: consumer phải đấu
specificity (`.my-app .ui-button`, rồi `!important`).

## Các mốc (thứ tự phụ thuộc, không có deadline - owner chưa đưa ra thời hạn)

Không dùng lịch cụ thể. Thứ tự dưới đây là điều kiện tiên quyết: mốc sau phụ thuộc mốc trước
trừ khi ghi rõ "có thể song song". Ước lượng quy mô theo T-shirt size (S/M/L/XL) chỉ mang tính
tham khảo.

### M0 - Ổn định nền tảng & dọn nợ kỹ thuật

**Tiên quyết:** không có, làm trước tiên.
**Mục tiêu:** mọi lệnh trong `CLAUDE.md`/`package.json` chạy đúng như mô tả, không còn tài liệu
hay script trỏ tới thứ không tồn tại.
**Việc cụ thể:**

- Gỡ hoặc triển khai thật `generate:exports` (nợ #2) - nếu giữ, phải có script + turbo task thật
- Sửa filter storybook về đúng `@tinita/storybook` (nợ #3), thêm script `storybook` alias `dev`
  trong `apps/storybook/package.json` (nợ #4)
- Xoá path alias chết `@tinita-internal/*` trong `config/typescript-config/base.json` (nợ #5)
- Sửa `config/eslint-config/next.js` cho khớp export thật của `base.js`, hoặc export named
  `config` từ `base.js` (nợ #6)
- Quyết định rõ ràng cho xung đột barrel export (nợ #7): hoặc xoá barrel trong
  `tinita-react/src/index.ts` để khớp rule, hoặc sửa rule trong `CLAUDE.md` để khớp code - không
  được để cả hai mâu thuẫn
- Dọn `ARCHITECTURE.md` và `DOCUMENT_REQUIRED.md` khỏi scope `@tinita/*` ảo và package Vue/Node
  chưa từng tồn tại (nợ #8)
- **Gỡ `motion` khỏi `dependencies`** - không file nào import nó (hit duy nhất là comment
  `prefers-reduced-motion` tại `src/ui/file-tree/types.ts:93`). Nó bắt mọi consumer tải thêm ~4 gói
  mà không đổi lại gì. Chi phí sửa gần bằng 0, lợi ích tức thì.
- **Hạ `clsx` và `tailwind-merge` xuống `devDependencies`** - cả hai không nằm trong `external` của
  tsup nên đã bị inline vào `dist/`, không cần có mặt trong `node_modules` của consumer.
- Gỡ file mồ côi `src/styles/index.css` (có `@import "tailwindcss"` nhưng không nằm trong build
  pipeline lẫn `exports`) hoặc ghi rõ mục đích của nó
- Quyết định cho `src/utils/cn.ts`: hoặc thêm subpath export, hoặc loại khỏi entry tsup - hiện nó
  build ra `dist/utils/cn.*` nhưng không import được qua entry chính thức
- Sửa `apps/storybook/stories/Ping/Ping.stories.tsx:3` dùng subpath thay vì barrel, cho khớp 7
  story còn lại
  **Tiêu chí hoàn thành:** `pnpm build`, `pnpm lint`, `pnpm check-types` chạy sạch toàn repo;
  `pnpm storybook` thực sự mở được Storybook; không còn reference tới file/task/package không tồn
  tại trong toàn bộ docs gốc.
  **Quy mô:** S.

### M1 - Bịt rò rỉ CSS ra global scope **[SỰ CỐ PRODUCTION]**

**Tiên quyết:** M0.
**Vì sao ưu tiên cao:** đây **không phải phòng xa**. Owner đã deploy library vào web của client và
CSS global + Tailwind của library xung đột với CSS của client. Mỗi ngày chưa sửa là mỗi consumer
mới gặp lại đúng lỗi đó. Ràng buộc RB-2.
**Mục tiêu:** library chỉ sở hữu CSS của component và token trong scope của mình; không chạm global
CSS của consumer.
**Việc cụ thể (theo thứ tự tác động giảm dần):**

- Gỡ reset tự viết `@layer base { * { @apply border-border } body { @apply bg-background
text-foreground } }` tại `src/styles/globals.css:116-127`. `*` và `body` thuộc về consumer.
- Đưa 22 token trong `@theme inline` (`globals.css:81-111`) ra khỏi namespace `--color-*`,
  `--radius*`, `--spacing-*`, `--font-*`. Đây là namespace **Tailwind v4 dành riêng**, đồng thời
  trùng khít bộ token chuẩn **shadcn/ui** - client dùng shadcn là va chạm chắc chắn.
- Prefix 27 class đang trần tại `animations.css:114-318` (18 `.animate-*`, 8 `.transition-*`,
  `.interactive`). `.animate-*` đụng thẳng utility `animate-*` của Tailwind bên client.
- Bọc `FileTree.css` và `CarouselTicker.css` vào `@layer` - hiện chúng ngoài mọi layer nên **luôn
  thắng** CSS trong layer của client, buộc client phải đấu specificity.
- Scope selector `.dark` dưới prefix của tinita, không để nó bắt dark-mode toggle của client.
- Scope khối reduced-motion `*, *::before, *::after { ... !important }`
  (`animations.css:530-539`) - hiện nó đè mọi xử lý reduced-motion của client trên toàn trang.
- Gỡ Tailwind class thô khỏi JSX của `Ping.tsx:45-50` và `CarouselTicker.tsx:211-291`. Bundle
  không ship utility nên 2 component này đang ngầm bắt host phải có Tailwind đúng version/theme.
  `bg-green-500` còn hard-code màu dù `--tinita-ping` đã tồn tại.
- Bọc `var(--radix-accordion-content-height)` (`FileTree.css:230,237`) sau token của tinita -
  biến nội bộ Radix không được nằm trong contract CSS công khai.
  **Tiêu chí hoàn thành (kiểm được):**
- `dist/styles.css` không chứa selector nào ngoài class có prefix `tinita-` (không `*`, không
  `body`, không `html`, không element trần)
- grep `dist/styles.css` tìm class không prefix -> 0 kết quả
- grep tìm token không bắt đầu bằng `--tinita-` -> 0 kết quả
- Dựng một trang thử có sẵn Tailwind + shadcn, nhúng cả 3 component, xác nhận không có style nào
  của trang bị đổi
  **Quy mô:** M.

### M2 - Chiến lược dependency: cài lẻ theo component

**Tiên quyết:** M0. Có thể song song M1.
**Mục tiêu:** ràng buộc RB-1 - user dùng 1-2 component không phải cài toàn bộ dependency.
**Điều kiện thuận lợi:** tập dependency của 3 component hiện **rời nhau hoàn toàn** -
`Ping`={}, `CarouselTicker`={clsx, tailwind-merge}, `FileTree`={@radix-ui/react-accordion,
lucide-react}. Không dep nào bị chia sẻ nên tách được sạch, làm sớm sẽ rẻ hơn nhiều so với làm
sau khi có 12 component.
**Bốn hướng, KHÔNG chốt hộ owner - đây là lựa chọn cần quyết:**

- **A. `peerDependencies` + `peerDependenciesMeta.optional: true`.** User chỉ cài lib mà component
  họ dùng cần. Đổi lại: thiếu lib thì lỗi lúc runtime chứ không lúc install, nên **bắt buộc** phải
  có bảng component -> dependency trong README.
- **B. Subpath + bỏ barrel `src/index.ts`.** Barrel hiện re-export mọi component, nên
  `import { Ping } from 'tinita-react'` kéo theo đồ thị của cả `file-tree` lẫn `carousel-ticker`.
  Đây là lý do **kỹ thuật** để bỏ barrel, mạnh hơn lý do "quy ước" mà docs vẫn nêu (liên quan nợ #7).
- **C. Tách nhiều package theo cụm dependency** (`tinita-react` core zero-dep +
  `tinita-react-antd` + `tinita-react-base`...). Cô lập triệt để nhất; đổi lại chi phí
  version/publish/đồng bộ tăng theo số cụm.
- **D. Registry distribution** - xem M9, giải quyết triệt để nhất.

**A + B làm được ngay và bổ sung cho nhau**: A cắt được thứ phải `npm install`, B cắt được bytes
gửi tới browser. C và D là quyết định lớn hơn, nên quyết sau khi có thêm component thật.
**Việc cụ thể:**

- Quyết chọn hướng, ghi quyết định vào `docs/system-architecture.md`
- Duy trì bảng component -> dependency trong README và `docs/codebase-summary.md`, cập nhật mỗi
  lần thêm component
- Dựng kiểm tự động: xác minh `import 'tinita-react/ui/<x>'` không kéo lib mà `<x>` không dùng
  (hiện chưa có cơ chế nào)
  **Tiêu chí hoàn thành:** cài `tinita-react` vào một project sạch rồi chỉ dùng `Ping`, đếm số gói
  thực sự vào `node_modules` - phải giảm rõ rệt so với ~20 gói hiện tại.
  **Quy mô:** M.

### M3 - Test baseline

**Tiên quyết:** M0 (tránh viết test cho code sắp đổi cấu hình).
**Mục tiêu:** xoá nợ #1 - có test thật cho toàn bộ surface API hiện có.
**Việc cụ thể:** test cho 4 utility của `tinita`; test cho 2 hook và 3 UI component của
`tinita-react` (dùng `@testing-library/react` đã có sẵn trong devDependencies).
**Tiêu chí hoàn thành:** `pnpm test` chạy ra số test > 0 ở cả 2 package, coverage report v8 sinh
ra được, mọi export public có ít nhất 1 test.
**Quy mô:** M.

### M4 - CI tối thiểu

**Tiên quyết:** M0, M3 (CI phải chạy build/lint/test đã sạch và có ý nghĩa).
**Mục tiêu:** xoá nợ #9 - có kiểm tra tự động trên mỗi PR.
**Việc cụ thể:** GitHub Actions workflow chạy `pnpm build`, `pnpm lint`, `pnpm check-types`,
`pnpm test` trên PR và trên push vào `main`.
**Tiêu chí hoàn thành:** workflow xanh trên một PR thử nghiệm; badge/status hiển thị trong repo.
**Quy mô:** S.

### M5 - Anti-corruption layer & Base UI adoption

**Tiên quyết:** M0.
**Mục tiêu:** tách public API của `tinita-react` khỏi implementation detail Radix/Base UI.
**Việc cụ thể:** bọc `@radix-ui/react-accordion` hiện đang dùng trực tiếp trong `FileTree` sau
một module nội bộ (ví dụ `src/primitives/`); đánh giá và thử nghiệm Base UI
(`@base-ui/react`) làm nền cho component mới ở M7.
**Tiêu chí hoàn thành:** không còn `import` trực tiếp từ `@radix-ui/*` hay `@base-ui/*` bên
ngoài thư mục primitive nội bộ; `FileTree` build và test vẫn pass sau khi bọc.
**Quy mô:** M.

### M6 - CSS isolation hoàn chỉnh (phần dài hạn)

**Tiên quyết:** M1 (phần bịt rò rỉ khẩn cấp phải xong trước). Có thể làm song song M5.
**Mục tiêu:** đạt đủ 4 lớp bảo vệ CSS mô tả ở phần định hướng.
**Việc cụ thể:** chuyển sang `@import "tailwindcss" prefix(tinita)` để prefix cả utility engine
(không chỉ quy ước đặt tên thủ công như hiện tại); loại Preflight khỏi output build; scope token
dưới `[data-ui]` thay vì `:root` trần; giữ nguyên các token CSS variable đã đúng.
**Tiêu chí hoàn thành:** `dist/styles.css` không chứa reset global trên thẻ HTML chuẩn (img,
button, input, h1...); mọi utility class trong output có prefix `tinita-`; token đọc được dưới
`[data-ui]`, không leak ra `:root` của host app.
**Quy mô:** M.

### M7 - Bộ component lõi (8-12 component)

**Tiên quyết:** M5, M6 (cần cả anti-corruption layer lẫn CSS isolation trước khi nhân bản pattern
ra nhiều component).
**Mục tiêu:** Button, Input, Select, Checkbox, Radio, Switch, Dialog, Popover, Tooltip, Dropdown,
Tabs, Table - mỗi component dùng Base UI qua lớp primitive của M5, CSS theo chuẩn M6.
**Việc cụ thể:** mỗi component theo đúng colocation pattern đã dùng cho FileTree/Ping/
CarouselTicker (main file riêng + `index.ts` + CSS riêng), kèm test (nối tiếp M3) và story
(nối tiếp bộ Storybook hiện có).
**Tiêu chí hoàn thành:** đủ 8-12 component ship trong `tinita-react`, mỗi component có test pass,
story trong Storybook, và tuân thủ 3 mức customization mô tả ở phần định hướng.
**Quy mô:** XL (chia nhỏ theo từng component, có thể release tăng dần).

### M8 - Phân tầng package dài hạn

**Tiên quyết:** M7 (cần đủ component thật để biết ranh giới tokens/core nằm ở đâu, tránh tách
sớm sai chỗ).
**Mục tiêu:** tách `tokens` và `core` (`cn()`, `Slot`, `Portal`, `mergeProps`, motion utility)
thành package riêng trong workspace, `tinita-react` phụ thuộc vào chúng thay vì tự chứa.
**Tiêu chí hoàn thành:** workspace có thêm package tokens/core độc lập, publish/test được riêng;
`tinita-react` không còn định nghĩa trùng token hay utility đã chuyển ra ngoài.
**Quy mô:** L.

### M9 - Registry distribution kiểu shadcn

**Tiên quyết:** M8.
**Mục tiêu:** cho phép consumer cài component qua `pnpm dlx shadcn@latest add @tinita/<component>`
song song với cài package npm thông thường.
**Việc cụ thể:** `registry.json` ở root, thư mục `registry/<component>/` chứa source có thể copy
trực tiếp vào project consumer.
**Tiêu chí hoàn thành:** ít nhất 1 component (ví dụ Button) cài được qua registry command trên
một project thử nghiệm sạch.
**Quy mô:** M.

## Rủi ro cần theo dõi

- Nợ #7 (xung đột barrel export) phải được quyết định ở M0 trước khi thêm bất kỳ export mới nào,
  nếu không số lượng vi phạm rule sẽ tăng theo mỗi component mới.
- `bundle: true` trong `tinita-react/tsup.config.ts` khác nguyên tắc "no bundling" áp dụng cho
  `tinita` - cần ghi nhận đây là ngoại lệ có chủ đích (do cần external hoá dependency) chứ không
  phải sai sót, tránh bị "sửa" nhầm khi dọn nợ ở M0.
- Base UI mới release v1.8.0 (09/2026) - cần theo dõi độ ổn định API trước khi cam kết dùng cho
  M7.

## Tài liệu liên quan

- [Tổng quan sản phẩm & PDR](./project-overview-pdr.md)
- [Kiến trúc hệ thống](./system-architecture.md)
- [Tóm tắt codebase](./codebase-summary.md)
- [Chuẩn code](./code-standards.md)
