# Phase 04 - Đồng bộ tiền tố token với tên folder

## Context links

- Plan cha: [`plan.md`](plan.md)
- Kiến trúc: [`architecture-plan.md`](architecture-plan.md) D13, I4
- Số đo: [`reports/00-measured-state.md`](reports/00-measured-state.md) mục 5
- Phụ thuộc: P1 (guard I4 phải tồn tại và đang đỏ)
- **Owner đã chốt LÀM, 2026-10-06**

## Overview

- **Ngày** 2026-10-06
- **Mô tả** Rename **43 tên riêng biệt** cho khớp tên folder và tiền tố class:
  `--tnt-filetree-*` -> `--tnt-file-tree-*` (20 tên) và `--tnt-fw-*` ->
  `--tnt-floating-window-*` (23 tên). Xuất hiện ở **136 dòng trên 10 file**.
  `carousel-ticker` không nằm trong phase này - P2 đã tạo `tokens.css` của nó
  với tiền tố đúng ngay từ đầu.
- **Ưu tiên** Thấp về chức năng, **cao về thời điểm**: rename token là breaking,
  và `0.1.0` chưa publish nên chi phí bằng 0 **lúc này**.
- **Implementation status** Not started - đã được chốt làm
- **Review status** Chưa review

## Key Insights

- Tên token là **public API**: consumer override chúng. Sau lần publish đầu,
  rename là breaking change thật.
- `generateScopedName: 'tnt-[folder]-[local]'` đã sinh class theo tên folder, nên
  class là `tnt-file-tree-root` trong khi token là `--tnt-filetree-*`. Lệch này
  làm người đọc phải nhớ hai quy ước cho cùng một component.
- Quy tắc tiền tố (`^--tnt-<folder>(-|$)`) là điều kiện để guard I4 kiểm được
  bằng máy. `ping` và `tree` đã khớp sẵn, nên phase này chỉ chạm 2 component.
  Không có nó thì guard cần bảng alias, mà bảng alias là chỗ để thêm ngoại lệ
  mãi mãi.
- `--tnt-fw-*` ngắn hơn đáng kể (`--tnt-fw-bubble-size` vs
  `--tnt-floating-window-bubble-size`). Chấp nhận dài: một component **một**
  tiền tố.
- **Kể cả 6 biến runtime do JS set** (`--tnt-fw-x/y/width/height/scale-x/scale-y`)
  cũng đổi, dù chúng là tầng 3 và guard I4 không đọc tới. Lý do: giữ hai tiền tố
  trong cùng một component là mời người sau "sửa cho nhất quán", đúng loại churn
  mà D13 sinh ra để chặn. Giá là 6 chuỗi dài hơn trong inline style của
  `FloatingWindow.tsx`.

## Requirements

1. 20 tên của `file-tree` đổi tiền tố thành `--tnt-file-tree-` (40 khai báo,
   vì màu icon khai cả ở khối light và dark). `FileTree.tsx:62` ghép tên động
   (`vars[`--tnt-filetree-icon-${type}`]`) nên dòng đó phải đổi theo - guard I4
   không thấy được chỗ ghép động.
2. 23 tên của `floating-window` đổi thành `--tnt-floating-window-`, gồm cả các
   biến runtime (`--tnt-fw-x/y/width/height/scale-x/scale-y`) khai local trong
   `.module.css` và set từ `FloatingWindow.tsx` + `geometry.ts`. Không miễn trừ
   cái nào.
3. Mọi chỗ dùng trong `.module.css`, `.tsx` (inline style của FloatingWindow) và
   `globals.css` phải đổi theo.
4. Mỗi lần thay thế phải **assert đã thay đổi**, không được để `str.replace`
   no-op im lặng.

## Architecture

Không đổi kiến trúc. Rename trong tầng 2, cộng tầng 3 nếu owner chọn.

Guard I4 chỉ đọc `tokens.css`, nên 6 biến runtime nằm ngoài tầm nó. Chúng được
đổi vì lý do đọc hiểu, không vì guard - và điều đó phải ghi trong comment, nếu
không người sau sẽ thấy một rename "không ai kiểm" và đảo lại.

## Related code files

Đo 2026-10-06 bằng `grep -rc`, **10 file**, 136 dòng. Bốn file cuối là những
chỗ tôi bỏ sót ở bản plan đầu - đó là lý do bước 1 phải liệt kê trước khi sửa:

| File                                               | Số dòng |
| -------------------------------------------------- | ------- |
| `src/ui/file-tree/tokens.css`                      | 40      |
| `src/ui/file-tree/FileTree.module.css`             | 21      |
| `src/ui/file-tree/FileTree.tsx`                    | 1       |
| `src/ui/file-tree/types.ts`                        | 1       |
| `src/ui/file-tree/components/FileIcon.tsx`         | 1       |
| `src/ui/file-tree/README.md`                       | 2       |
| `src/ui/floating-window/tokens.css`                | 21      |
| `src/ui/floating-window/FloatingWindow.module.css` | 40      |
| `src/ui/floating-window/FloatingWindow.tsx`        | 9       |
| `src/ui/floating-window/geometry.ts`               | 1       |

`src/styles/globals.css` **không** nằm trong danh sách: 0 dòng. Đã đo, không
đoán.

## Implementation Steps

1. Liệt kê **mọi** chỗ dùng bằng `grep -rn` trước khi sửa và đối chiếu với bảng
   trên: 43 tên riêng biệt, 136 dòng, 10 file. Số lệch bảng là dấu hiệu có file
   mới từ lúc viết plan. Guard I4 chỉ thấy 37 trong số đó (20 + 17, vì nó đọc
   `tokens.css`), 6 còn lại là biến runtime khai local trong `.module.css`.
2. Rename bằng script, mỗi thay thế assert số lần thay đổi khớp danh sách bước 1.
3. `check-css-tokens.mjs` phần I4 phải xanh.
4. L4: ảnh **không đổi** - rename không đổi giá trị nào.
5. `pnpm gate:full`.

## Todo list

- [ ] Danh sách mọi chỗ dùng, lưu lại để đối chiếu
- [ ] Rename 43 tên riêng biệt, mỗi thay thế có assert
- [ ] Biến runtime trong `FloatingWindow.tsx` + `geometry.ts` đổi theo, comment nêu lý do
- [ ] `types.ts`, `FileIcon.tsx`, `README.md` của file-tree đổi theo
- [ ] `check-css-tokens.mjs` I4 xanh (0 component sai tiền tố)
- [ ] L4 ảnh không đổi
- [ ] Cập nhật bảng token trong docs nếu có
- [ ] `pnpm gate:full` exit 0

## Success Criteria

1. `check-css-tokens.mjs` in **0** component sai tiền tố (từ 2, với 20 và 17
   token), và tổng `ĐỎ: 0` nếu P2 đã xong.
2. `grep -rn -- '--tnt-filetree-' src/` trả về **0** dòng, và
   `grep -rn -- '--tnt-fw-' src/` trả về **0** dòng (kể cả trong
   `FloatingWindow.tsx`).
3. Ảnh L4 **0 pixel khác** so với trước phase - rename không đổi giá trị.
4. `pnpm gate:full` exit **0**.
5. Số token trong `dist/styles.css` **không đổi**.
6. `src/ui/file-tree/README.md` không còn tên cũ, và `pnpm check-doc-links` exit
   **0**.

## Risk Assessment

| Rủi ro                                                        | Giảm thiểu                                                                                                                                       |
| ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `str.replace` no-op im lặng (đã xảy ra 2 lần trong repo)      | Bước 3 assert số lần thay thế                                                                                                                    |
| Bỏ sót chỗ dùng ngoài CSS                                     | Đã xảy ra ở bản plan đầu: tôi bỏ sót `geometry.ts`, `types.ts`, `FileIcon.tsx`, `README.md`. Bảng 10 file ở trên là kết quả đo lại; SC2 grep sau |
| Rename sau khi publish                                        | Phase này **chỉ** chạy trước lần publish đầu. `0.1.0` chưa publish (nằm trong việc owner-only còn treo), nên phải xong TRƯỚC lần publish đó      |
| `--tnt-floating-window-*` quá dài, code khó đọc               | Đánh đổi đã chốt: một component một tiền tố. 6 chuỗi dài hơn trong `FloatingWindow.tsx` là toàn bộ chi phí                                       |
| Rename 6 biến runtime bị người sau đảo lại vì "không ai kiểm" | Comment tại chỗ nêu lý do, và nó nằm trong Key Insights của phase này                                                                            |

## Security Considerations

Không.

## Next steps

`phase-05-export-contract.md`.
