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
- **Implementation status** Not started
- **Review status** Chưa review

## Key Insights

- 5 token, không phải 13. Guard I6 báo đỏ đúng lúc token thứ 6 được dùng, nên
  trả trước 8 token cho mọi component là trả cho trường hợp chưa xảy ra.
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

1. `styles/tokens.css` khai thêm `--tnt-duration-fast`, `--tnt-duration-slow`,
   `--tnt-ease-standard`, `--tnt-ease-in-out`, `--tnt-opacity-disabled`, giá
   trị **giữ nguyên** từ `animations.css`.
2. `animations.css` không còn khai 5 token đó.
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
