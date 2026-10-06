# Phase 02 - Đóng 11 lỗ token

## Context links

- Plan cha: [`plan.md`](plan.md)
- Kiến trúc: [`architecture-plan.md`](architecture-plan.md) D5, D14, mục 4.1
- Phụ thuộc: **P1 phải xong và đang ĐỎ**
- Chặn: `phase-05-export-contract.md` (subpath mới ra đời ở đây)

## Overview

- **Ngày** 2026-10-06
- **Mô tả** Chuyển 5 token motion từ `styles/animations.css` sang
  `styles/tokens.css`; tạo `ui/carousel-ticker/tokens.css`; xoá
  `--tnt-spacing-tree-indent` khỏi file chung.
- **Ưu tiên** Cao. Đây là phase sửa lỗi.
- **Implementation status** **DONE** 2026-10-06
- **Review status** `GATE_FULL_EXIT=0`, 11/11 PASS; chưa có người review

## Key Insights

- 5 token, không phải 13. Guard I6 báo đỏ đúng lúc token thứ 6 được dùng, nên
  trả trước 8 token cho mọi component là trả cho trường hợp chưa xảy ra.
- **Đích đến KHÁC plan: `styles/motion-tokens.css`, không phải `styles/tokens.css`.**
  Hai dữ kiện đo được lúc implement đảo quyết định D5: (i) **16 rule của chính
  `animations.css`** dùng 5 token đó, nên nó không thể nhường chúng đi; (ii)
  `docs/design-guidelines.md` ghi `tinita-react/styles/animations.css` là đường
  nhập công khai "chỉ motion", nên nó phải tự đủ. Gộp vào `tokens.css` rồi cho
  `animations.css` import lại thì postcss inline `tokens.css` hai lần:
  `dist/styles.css` 190 -> **230** khai báo, `--tnt-duration-fast` khai x2.
- **`globals.css` thiếu tokens.css của carousel.** Đo: `dist/styles.css` khai 139
  token thay vì 140, tức đường `styles.css` cũng mất token mới. Bốn component kia
  đã có trong `globals.css` từ trước, carousel chưa vì nó chưa có `tokens.css`.
- `--tnt-spacing-tree-indent` trùng giá trị với `--tnt-tree-indent` của chính
  Tree (`16px`) và chỉ `globals.css` dùng. Xoá, không chuyển.
- `animations.css` giữ 51 token còn lại vì chúng phục vụ 18 `@keyframes` mà
  không component nào tham chiếu.
- Giá trị `--tnt-carousel-ticker-min-block-size` là **`100px`**, và nó không
  phải phán quyết: commit `0037f8f` chuyển Tailwind trong JSX thành CSS thật và
  tokenize đúng dòng `isVertical && 'h-full min-h-[100px]'` thành
  `min-block-size: var(--tnt-carousel-min-block-size)`, nhưng quên khai token.
  Giá trị gốc còn trong git, nên đây là phục hồi chứ không phải chọn.
- Vì sao rule này cần tồn tại: ticker dọc đặt `block-size: 100%`, mà `100%`
  trong parent chiều cao `auto` giải về `auto`, nên cửa sổ cuộn co về đúng chiều
  cao nội dung và marquee không còn gì để cuộn. `100px` là sàn cho ca đó.

## Requirements

1. `styles/motion-tokens.css` (MỚI) khai `--tnt-duration-fast`,
   `--tnt-duration-slow`, `--tnt-ease-standard`, `--tnt-ease-in-out`,
   `--tnt-opacity-disabled`, giá trị **giữ nguyên** từ `animations.css`.
2. `animations.css` không còn khai 5 token đó, và `@import './motion-tokens.css'`
   để đường nhập độc lập của nó vẫn tự đủ.
   2b. 4 bridge (`tree`, `ping`, `floating-window`, `file-tree`) `@import`
   `tinita-react/styles/motion-tokens.css`. `carousel-ticker` không cần.
   2c. `globals.css` `@import '../ui/carousel-ticker/tokens.css'`.
3. `ui/carousel-ticker/tokens.css` mới, khai
   `--tnt-carousel-ticker-min-block-size: 100px` trong
   `:where(:root, [data-theme='light'])`, kèm comment nêu nguồn giá trị
   (`min-h-[100px]` của commit `0037f8f`) và lý do rule tồn tại.
4. `CarouselTicker.module.css` đổi sang tên token mới.
5. `ui/carousel-ticker/index.css` thêm `@import
'tinita-react/ui/carousel-ticker/tokens.css'`.
6. `exports` + `typesVersions` thêm `./ui/carousel-ticker/tokens.css`.
7. `build-css.mjs` `copyPublishedCSSSources()` phải copy file mới (glob
   `ui/*/tokens.css` đã bao - xác minh, đừng giả định).
8. `--tnt-spacing-tree-indent` xoá khỏi `styles/tokens.css` và khỏi mọi chỗ
   dùng trong `globals.css`.

## Architecture

Không đổi kiến trúc. Chỉ di chuyển declaration giữa các file đã có trong graph,
cộng một file mới đúng theo khuôn 4-file của component.

```
trước:  Tree.module.css --var--> --tnt-duration-fast --khai--> animations.css
                                                               (NGOÀI graph)
sau:    Tree.module.css --var--> --tnt-duration-fast --khai--> styles/tokens.css
                                                               (TRONG graph)
```

## Related code files

| File                                                                     | Thay đổi                                |
| ------------------------------------------------------------------------ | --------------------------------------- |
| `packages/tinita-react/src/styles/tokens.css`                            | +5 token motion, -1 token tree          |
| `packages/tinita-react/src/styles/animations.css`                        | -5 token                                |
| `packages/tinita-react/src/styles/globals.css`                           | bỏ chỗ dùng `--tnt-spacing-tree-indent` |
| `packages/tinita-react/src/ui/carousel-ticker/tokens.css`                | MỚI                                     |
| `packages/tinita-react/src/ui/carousel-ticker/index.css`                 | +1 `@import`                            |
| `packages/tinita-react/src/ui/carousel-ticker/CarouselTicker.module.css` | đổi tên token                           |
| `packages/tinita-react/package.json`                                     | +1 subpath CSS, +1 `typesVersions`      |
| `packages/tinita-react/scripts/build-css.mjs`                            | xác minh glob đã bao                    |

## Implementation Steps

1. Chuyển 5 token motion. Giá trị copy nguyên văn, kiểm bằng `diff`.
2. Xoá `--tnt-spacing-tree-indent`, sửa `globals.css`.
3. Tạo `ui/carousel-ticker/tokens.css` với `100px`, sửa `.module.css`, sửa bridge.
4. Thêm subpath vào `exports` + `typesVersions`.
5. Build, chạy `check-css-tokens.mjs`.
6. Chạy ca L4 `motion-present`.
7. Đưa `check-css-tokens` vào `pnpm gate`.
8. `pnpm gate:full`.

## Todo list

- [ ] 5 token motion sang `styles/tokens.css`, giá trị không đổi
- [ ] `animations.css` bỏ 5 token
- [ ] Xoá `--tnt-spacing-tree-indent`, sửa `globals.css`
- [ ] `ui/carousel-ticker/tokens.css` + bridge + `.module.css`
- [ ] `exports` + `typesVersions`
- [ ] `check-css-tokens.mjs` xanh
- [ ] L4 `motion-present` xanh
- [ ] `check-css-tokens` vào `pnpm gate`
- [ ] `pnpm gate:full` exit 0

## Success Criteria

1. `node packages/tinita-react/scripts/check-css-tokens.mjs` exit **0**, in
   **0** use thiếu declaration (từ 11). Phần tiền tố vẫn còn 2 - đó là P4, nên
   `ĐỎ: 2` vẫn là kết quả mong đợi ở cuối P2 và guard chỉ vào `pnpm gate` sau
   khi P4 xong. Nếu muốn vào gate ngay cuối P2 thì phải chạy P4 trước.
2. Ca L2 `motion-present` **PASS**: trên `Ping` nhập từ `ui/ping` mà **không**
   import `styles.css`, `animationName` **không** phải `none` và
   `animationDuration` **không** phải `0s`. Giá trị đo trước khi sửa:
   `animationName=none animationDuration=0s`.
3. `dist/styles.css` vẫn khai `--tnt-duration-fast` đúng **1** lần và tổng số
   token trong `dist/styles.css` **không giảm** so với trước phase (token chỉ
   đổi file nguồn, trừ 1 cái bị xoá có chủ ý: kỳ vọng `140 -> 139`).
4. `.root[data-orientation='vertical']` trong `dist/ui/carousel-ticker/styles.css`
   giải `min-block-size` ra **`100px`** khi chỉ nhập `tinita-react/ui/carousel-ticker`:
   đo bằng `getComputedStyle` trong Chromium với parent chiều cao `auto`, giá trị
   `minHeight` phải là `100px` chứ không phải `0px`.
5. `dist/ui/carousel-ticker/tokens.css` tồn tại và
   `node -e "require.resolve('tinita-react/ui/carousel-ticker/tokens.css')"`
   giải được trong project cô lập của L1.
6. 5 ca `css-graph:*` của L2 vẫn PASS, và `css-graph:ping` vẫn **không** chứa
   token của FileTree.
7. `pnpm gate:full` exit **0**.

## Risk Assessment

| Rủi ro                                                        | Giảm thiểu                                                                                             |
| ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| Copy sai giá trị token lúc chuyển file                        | `diff` hai giá trị, và SC3 đếm token trong `dist/styles.css`                                           |
| `animations.css` còn rule nào dùng 5 token vừa chuyển         | `animations.css` vẫn trong `styles.css` nên nó vẫn giải được ở đó; nhưng phải grep để biết, không đoán |
| Glob `ui/*/tokens.css` của `build-css.mjs` không bao file mới | SC5 kiểm bằng resolve thật, không bằng đọc code                                                        |
| Chọn một con số trông hợp lý thay vì giá trị gốc              | Đã lấy từ `0037f8f`: `min-h-[100px]`. SC4 đo lại trong browser, không tin diff                         |
| `--tnt-spacing-tree-indent` còn chỗ dùng ngoài `globals.css`  | Đã đo: chỉ `globals.css`. Grep lại trước khi xoá                                                       |

## Security Considerations

Không.

## Next steps

`phase-05-export-contract.md` (đóng nốt `exports`) hoặc
`phase-03-derive-component-tokens.md` (độc lập, nhưng cần baseline L4).

---

## Kết quả đo, 2026-10-06

```
$ node packages/tinita-react/scripts/check-css-tokens.mjs
I6 - var() thiếu declaration và thiếu fallback: 0        (từ 11)
I4 - token sai tiền tố: 2 component                      (P4 lo)
I8 - bridge import file global: 0
@import không giải được qua exports: 0
I2 - graph KHÔNG kéo CSS của chính component: 0
ĐỎ: 2 vấn đề

$ dist/styles.css
riêng biệt:    140   (baseline 140)
tổng khai báo: 190   (baseline 190; 230 = tokens.css inline 2 lần)
--tnt-duration-fast khai x1
--tnt-carousel-ticker-min-block-size khai x1

$ node compatibility/run.mjs l2 --tier=1 ; echo $?
PASS  motion-present  position=absolute borderRadius=9999px opacity=0.502874
                      animationName=tnt-ping-pulse animationDuration=0.4s
                      | CSS tới=true, token giải được=true
29 ca, 0 fail, 7 skip
0

$ pnpm gate:full ; echo $?
11/11 PASS (l1 80.7s, l2 411.8s, l4 213.5s)
0
```

## Hai lỗi trong test của tôi, không phải trong code

**1. Guard đọc comment như code.** Sau khi sửa, I6 còn 1 dòng:
`--tnt-carousel-min-block-size` trong `dist/ui/carousel-ticker/tokens.css` - tên
CŨ, nằm trong comment tôi vừa viết để ghi lại lịch sử. Guard không strip comment
CSS. Đã thêm `stripComments()`. Kiểm lại baseline: trước P2 có **0**
`var(--tnt-` trong comment của mọi `tokens.css`, nên số 11 không bị ảnh hưởng.

**2. Ca lab assert một property mà chính thứ nó test làm đổi.** Sau khi sửa,
`motion-present` vẫn FAIL với `opacity=0.503264` trong khi tôi assert `'0.75'`.
Lý do: keyframes `tnt-ping-pulse` animate chính `opacity`, nên khi fix THÀNH
CÔNG và animation chạy thì giá trị đọc được là một điểm giữa hai keyframe. Đổi
tín hiệu "CSS đã tới" sang `borderRadius: 9999px` - không qua token và không bị
animate.

Lần thứ hai cùng một lớp lỗi trong phase này (lần đầu: `animationName` +
`animationDuration` do cùng một shorthand đặt nên hỏng cùng nhau). Bài học ghi
trong comment của ca.

File đã thêm hoặc sửa:

```
packages/tinita-react/src/styles/motion-tokens.css        MỚI, 5 token
packages/tinita-react/src/styles/tokens.css               -1 token của Tree
packages/tinita-react/src/styles/animations.css           -5 khai báo, +@import
packages/tinita-react/src/styles/globals.css              +carousel tokens, mapping trỏ --tnt-tree-indent
packages/tinita-react/src/ui/carousel-ticker/tokens.css   MỚI, 100px
packages/tinita-react/src/ui/carousel-ticker/index.css    +@import tokens
packages/tinita-react/src/ui/carousel-ticker/CarouselTicker.module.css  đổi tên token
packages/tinita-react/src/ui/{tree,ping,floating-window,file-tree}/index.css  +@import motion-tokens
packages/tinita-react/scripts/build-css.mjs               copy motion-tokens.css
packages/tinita-react/scripts/check-css-tokens.mjs        stripComments()
packages/tinita-react/package.json                        +2 CSS subpath (38)
compatibility/contract.json                               cssSpecifiers 19 -> 21
compatibility/cases/l2/index.mjs                          probe dùng borderRadius
```

## Việc còn lại của P2, chuyển sang P4

`check-css-tokens` **chưa vào `pnpm gate`**: guard còn exit 1 vì I4 (2 component
sai tiền tố), và đó là việc của P4. Đưa vào gate là bước cuối của P4.
