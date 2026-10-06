# Số đo trạng thái CSS/token, 2026-10-06

Mọi số dưới đây đo trên commit `f73de05` (nhánh `feature/snap-corner`), bằng
`grep`/`python3` trên `src/` và `dist/` của `packages/tinita-react`, cộng một
consumer `vite build` thật. Không suy đoán.

## 1. Cấu trúc đang có

```
src/styles/     animations.css  build-entry.css  globals.css  tokens.css
src/ui/ping/           index.css index.ts Ping.module.css tokens.css
src/ui/tree/           index.css index.ts Tree.module.css tokens.css store.ts types.ts README.md
src/ui/file-tree/      index.css index.ts FileTree.module.css tokens.css types.ts components/ utils/ README.md
src/ui/floating-window/index.css index.ts FloatingWindow.module.css tokens.css + 4 .ts/.tsx
src/ui/carousel-ticker/index.css index.ts CarouselTicker.module.css  (KHÔNG có tokens.css)
```

`@import` thật trong từng bridge:

| bridge            | shared tokens | component tokens         | styles                   | ghi chú                   |
| ----------------- | ------------- | ------------------------ | ------------------------ | ------------------------- |
| `ping`            | có            | có                       | có                       |                           |
| `tree`            | có            | có                       | có                       |                           |
| `file-tree`       | có            | có (+ `tree/tokens.css`) | có (+ `tree/styles.css`) | phụ thuộc Tree tường minh |
| `floating-window` | có            | có                       | có                       |                           |
| `carousel-ticker` | có            | KHÔNG CÓ FILE            | có                       |                           |

Không bridge nào `@import` `globals.css` hay `animations.css`.

## 2. Token: 37 chung + 91 riêng

| file                            | khai báo |
| ------------------------------- | -------- |
| `styles/tokens.css`             | 37       |
| `ui/file-tree/tokens.css`       | 40       |
| `ui/tree/tokens.css`            | 22       |
| `ui/floating-window/tokens.css` | 21       |
| `ui/ping/tokens.css`            | 8        |

**Token chung được component dùng: 8/37.** Và chỉ 2 component dùng:

```
--tnt-accent        floating-window
--tnt-background    floating-window
--tnt-border        floating-window
--tnt-font-sans     floating-window
--tnt-foreground    floating-window
--tnt-radius-lg     floating-window
--tnt-radius-sm     floating-window
--tnt-ring          floating-window, tree
```

`ping`, `file-tree`, `carousel-ticker` dùng **0** token chung, nhưng vẫn
`@import` cả 37 cái.

**14/37 token chung chỉ `globals.css` dùng**, tức chỉ phục vụ khối
`@theme inline` của Tailwind, không component nào tham chiếu:
`--tnt-primary`, `--tnt-primary-foreground`, `--tnt-secondary`,
`--tnt-secondary-foreground`, `--tnt-muted`, `--tnt-muted-foreground`,
`--tnt-accent-foreground`, `--tnt-destructive`, `--tnt-destructive-foreground`,
`--tnt-input`, `--tnt-radius`, `--tnt-radius-md`, `--tnt-font-mono`,
`--tnt-spacing-tree-indent`.

**91/91 giá trị token component là literal, 0 dùng `var()`.**

```
src/ui/file-tree/tokens.css:       literal=40  var()=0
src/ui/floating-window/tokens.css: literal=21  var()=0
src/ui/tree/tokens.css:            literal=22  var()=0
src/ui/ping/tokens.css:            literal=8   var()=0
```

Hệ quả: consumer đổi `--tnt-primary` thì Tree, FileTree, Ping, FloatingWindow
**không đổi gì**. Bằng chứng giá trị đã bị đóng băng bằng tay từ palette:
`--tnt-tree-bg: #ffffff` bằng đúng `--tnt-background: #ffffff`;
`--tnt-tree-selected-bg: rgb(37 99 235 / 0.12)` là `--tnt-primary` (`#2563eb` =
`rgb(37 99 235)`) ở 12%.

## 3. LỖI: component CSS dùng token nằm ngoài CSS graph của nó

8 khai báo trong 3 component tham chiếu token **chỉ** khai trong
`styles/animations.css`, mà không bridge nào import:

```
src/ui/tree/Tree.module.css:93    transition: rotate var(--tnt-duration-fast) var(--tnt-ease-standard);
src/ui/tree/Tree.module.css:199   --tnt-tree-collapse-ease: var(--tnt-ease-in-out);
src/ui/tree/Tree.module.css:348   opacity: var(--tnt-opacity-disabled);
src/ui/ping/Ping.module.css:47    animation: pulse var(--tnt-duration-slow) cubic-bezier(0,0,.2,1) infinite;
src/ui/floating-window/FloatingWindow.module.css:59,154,238,242
                                  transition: ... var(--tnt-duration-fast) ...
```

Đo trên artifact đã publish:

```
dist/ui/tree/styles.css      dùng var(--tnt-duration-fast) x1, khai x0
dist/ui/tree/tokens.css      khai x0
dist/styles/tokens.css       khai x0
dist/styles.css              khai x1   <- chỗ duy nhất khai
```

Không cái nào có fallback trong `var()`. Theo spec, `var()` không giải được làm
declaration **invalid at computed-value time**, nên property nhận giá trị
initial: `transition` thành `all 0s`, `animation-duration` thành `0s`,
`opacity` thành `1`.

Hậu quả dự kiến (chưa đo trong browser, cần ca L4):

- Ping mất animation `pulse` - đúng chức năng duy nhất của component.
- Tree: mũi tên không transition; row disabled trông như enabled.
- Tree collapse: `transition: height 220ms var(--tnt-tree-collapse-ease)` cũng
  invalid, nên `transition-duration` thành `0s`, và theo mục Base UI trong
  `CLAUDE.md` thì `getAnimationType` sẽ kết luận không có animation và bỏ luôn
  animation đóng/mở.
- FloatingWindow: 4 transition không chạy.

Đường `styles.css` **không** bị: `dist/styles.css` khai đủ cả 5 token motion.
Lỗ chỉ nằm ở đường per-component, tức đúng đường vừa mở.

## 4. `--tnt-carousel-min-block-size` không khai ở đâu cả

`CarouselTicker.module.css` dùng, không fallback. `dist/styles.css` khai x0.
Hỏng trên **cả hai** đường, không chỉ per-component. Đây là món đang treo từ
trước, không do thay đổi vừa rồi.

## 5. Tiền tố token lệch tiền tố class ở 3/5 component

| folder            | class (từ `generateScopedName: 'tnt-[folder]-[local]'`) | token              |
| ----------------- | ------------------------------------------------------- | ------------------ |
| `ping`            | `tnt-ping-*`                                            | `--tnt-ping-*`     |
| `tree`            | `tnt-tree-*`                                            | `--tnt-tree-*`     |
| `file-tree`       | `tnt-file-tree-*`                                       | `--tnt-filetree-*` |
| `floating-window` | `tnt-floating-window-*`                                 | `--tnt-fw-*`       |
| `carousel-ticker` | `tnt-carousel-ticker-*`                                 | `--tnt-carousel-*` |

Quan trọng vì "token trong `ui/<name>/tokens.css` phải mang tiền tố
`--tnt-<name>-`" là invariant kiểm được bằng máy, và nó sẽ bắt được
`--tnt-spacing-tree-indent` đang nằm sai chỗ trong file chung. Hôm nay 3/5 vi
phạm.

## 6. 40 token icon của FileTree là DỮ LIỆU, không phải design decision

```
--tnt-filetree-icon-javascript: #eab308   (vàng JS)
--tnt-filetree-icon-html: #dc2626         (đỏ HTML)
--tnt-filetree-icon-vue: #10b981          (xanh Vue)
```

Màu nhận dạng loại file, không dẫn xuất được từ palette semantic. Hai cái
trung tính thì dẫn xuất được: `--tnt-filetree-icon-file: #6b7280` bằng đúng
`--tnt-muted`.

## 7. Export

36 entry trong `exports`, 16 pattern `typesVersions`.
`sideEffects: ["./dist/**/*.css", "./dist/ui/*/index.mjs"]`.

**7 subpath thiếu condition `types`** trong khi các subpath khác có:
`hooks/useDoubleTap`, `hooks/usePagination`, `hooks/useRefreshComponent`,
`hooks/useRequiredContext`, `hooks/useWindowSize`, `hooks/useIsomorphicLayoutEffect`,
`utils/jsxJoin`. Đây là nợ #18.

`utils/autoInjectStyles` vẫn export (nợ #16: chết, có ca L2
`autoInjectStyles-unused-at-runtime`).

`ui/carousel-ticker/tokens.css` không có trong `exports` vì file không tồn tại.

## 8. Build: vite làm JS, tsup CHỈ làm types

```
build:js    TNT_FORMAT=es vite build && TNT_FORMAT=cjs vite build
build:types tsup
build:css   node scripts/build-css.mjs
```

`CLAUDE.md` viết "tsup cho cả 3 package" - với `tinita-react` thì tsup chỉ sinh
declaration, JS do vite lo. Câu đó cần sửa.

## 9. Hai version cùng cây: đo được bản CŨ thắng cascade

App vite thật, `tinita-react@0.1.1` ở top-level và `@0.1.0` lồng dưới
`wrapper-lib`, bản lồng được đánh dấu đè cùng property `display`:

```
.tnt-ping-root định nghĩa x3, theo thứ tự trong bundle:
  offset  5717  {align-items:center;display:inline-flex}   0.1.1 top-level
  offset 12316  {align-items:center;display:inline-flex}   0.1.0 lồng
  offset 13199  {display:block;outline:3px solid magenta}  0.1.0 lồng, dòng đánh dấu
```

Specificity bằng nhau nên cái cuối thắng: bản **0.1.0 thắng cho cả** `<Ping>`
của 0.1.1. Khi hai bản CSS giống nhau thì bundler gộp còn x1 (2396 byte);
khác nhau thì giữ cả hai và chỉ cộng phần delta (2473 byte, chênh 77 byte đúng
bằng hai dòng thêm vào).

Một version, nhiều component: không lặp. `.tnt-tree-item{` x1 khi import cả
`ui/tree` và `ui/file-tree` (ca `css-graph:tree-plus-file-tree`).
