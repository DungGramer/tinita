# Phase 03 - Token component dẫn xuất từ palette semantic

## Context links

- Plan cha: [`plan.md`](plan.md)
- Kiến trúc: [`architecture-plan.md`](architecture-plan.md) D6, mục 4.3, I7
- Số đo: [`reports/00-measured-state.md`](reports/00-measured-state.md) mục 2, 6
- Phụ thuộc: **baseline L4 phải tồn tại** (hiện 0 `.png`, 6 ca SKIP)
- Độc lập với P1/P2/P4/P5

## Overview

- **Ngày** 2026-10-06
- **Mô tả** Token màu của component tham chiếu palette semantic bằng `var()` /
  `color-mix()` thay vì literal. 38/40 token icon của FileTree **giữ literal**.
- **Ưu tiên** Trung bình. Đây là phase làm design system thành design system,
  không phải phase sửa lỗi.
- **Implementation status** Not started
- **Review status** Chưa review

## Key Insights

- 91/91 giá trị token component là literal, 0 `var()`. Nên hôm nay consumer đổi
  `--tnt-primary` thì **không component nào đổi**. Palette semantic đang chỉ là
  một bảng màu để đọc.
- Giá trị đã được dẫn xuất bằng tay rồi đóng băng: `--tnt-tree-bg: #ffffff`
  bằng đúng `--tnt-background`; `--tnt-tree-selected-bg: rgb(37 99 235 / 0.12)`
  là `--tnt-primary` (`#2563eb` = `rgb(37 99 235)`) ở 12%.
- **38/40 token của FileTree KHÔNG được dẫn xuất.**
  `--tnt-filetree-icon-javascript: #eab308` là màu nhận dạng loại file - dữ
  liệu, không phải quyết định design. Dẫn xuất nó làm mọi icon đổi màu khi
  consumer đổi brand. Hai cái trung tính thì dẫn xuất được:
  `--tnt-filetree-icon-file: #6b7280` bằng đúng `--tnt-muted`.
- Phase này **đổi rendered value**. `color-mix(in oklab, ...)` không cho ra đúng
  byte của `rgb(37 99 235 / 0.12)`. Nên không có baseline thì không xác minh
  được, và đó là lý do nó phụ thuộc L4.
- Lợi ích phụ: khối dark của component bớt đi những token chỉ đổi vì palette
  đổi. Đây là kết quả, không phải lý do.

## Requirements

1. Mỗi token màu của component mà giá trị **bằng đúng** một token semantic thì
   đổi thành `var(--tnt-<semantic>)`.
2. Mỗi token màu là biến thể alpha của một token semantic thì đổi thành
   `color-mix(in oklab, var(--tnt-<semantic>) <N>%, transparent)`.
3. 38 token icon nhận dạng của FileTree giữ literal, và phải có comment nói rõ
   **vì sao** chúng là ngoại lệ.
4. Token không-màu (kích thước, font-size, duration riêng của component) không
   thuộc phạm vi phase này.
5. Quyết định sàn browser cho `color-mix` **trước** khi dùng nó.

## Architecture

```
trước:  --tnt-tree-bg: #ffffff
sau:    --tnt-tree-bg: var(--tnt-background)

trước:  --tnt-tree-selected-bg: rgb(37 99 235 / 0.12)
sau:    --tnt-tree-selected-bg: color-mix(in oklab, var(--tnt-primary) 12%, transparent)
```

Consumer vẫn override được **cả hai tầng**: đổi `--tnt-primary` thì mọi thứ dẫn
xuất đổi theo; đổi `--tnt-tree-selected-bg` thì chỉ Tree đổi. Đây là lớp chỉ
hướng mà shadcn dùng, và nó không lấy đi lựa chọn nào.

## Related code files

| File                                                      | Thay đổi                                  |
| --------------------------------------------------------- | ----------------------------------------- |
| `packages/tinita-react/src/ui/tree/tokens.css`            | 7 màu light + 7 màu dark                  |
| `packages/tinita-react/src/ui/file-tree/tokens.css`       | 2/40 (phần còn lại giữ literal + comment) |
| `packages/tinita-react/src/ui/floating-window/tokens.css` | 2 màu + 2 border/shadow                   |
| `packages/tinita-react/src/ui/ping/tokens.css`            | 1-2 màu                                   |
| `compatibility/cases/l4/index.mjs`                        | ca `token-derivation`                     |

## Implementation Steps

1. Sinh baseline L4 trong container (nợ đang mở). **Chặn** đến khi có.
2. Lập bảng: mỗi token màu component -> token semantic tương ứng, hoặc "không
   dẫn xuất" kèm lý do. Bảng này là nguồn review, không phải diff.
3. Đổi những cái **bằng đúng** trước (không đổi rendered value) và chạy L4: ảnh
   phải **không đổi**. Đây là bước có thể xác minh tuyệt đối.
4. Đổi những cái dùng `color-mix` sau, chạy L4, **xem ảnh bằng mắt** và chấp
   nhận hoặc tinh chỉnh %.
5. Thêm ca L4 `token-derivation`.
6. `pnpm gate:full`.

## Todo list

- [ ] Sinh baseline L4 (chặn)
- [ ] Bảng mapping token component -> semantic, kèm cột "không dẫn xuất + lý do"
- [ ] Quyết định sàn browser cho `color-mix`
- [ ] Nhóm 1: token bằng đúng semantic, L4 ảnh KHÔNG đổi
- [ ] Nhóm 2: token alpha qua `color-mix`, duyệt ảnh bằng mắt
- [ ] Comment ngoại lệ trong `file-tree/tokens.css`
- [ ] Ca L4 `token-derivation`
- [ ] `pnpm gate:full` exit 0

## Success Criteria

1. Ca L4 `token-derivation`: mount `Tree` với một row selected, đặt
   `--tnt-primary: #ff0000` trên `<html>`, đọc
   `getComputedStyle(row).backgroundColor`. Giá trị **phải chứa** thành phần đỏ
   (`r > 200` sau khi mix 12% trên nền trắng không đạt, nên phán quyết cụ thể
   là: giá trị **khác** giá trị đo được khi không đặt `--tnt-primary`).
2. Cùng ca đó với `--tnt-primary` **không** đặt: giá trị bằng baseline.
3. Số token component có `var(` trong giá trị: từ **0** lên **>= 12**
   (`grep -c 'var(' src/ui/*/tokens.css`).
4. `src/ui/file-tree/tokens.css` vẫn có **38** giá trị literal, và có comment
   giải thích ngoại lệ.
5. Ảnh L4 của nhóm 1 (token bằng đúng) **không đổi** so với baseline - 0 pixel
   khác.
6. 5 ca `css-graph:*` của L2 vẫn PASS: dẫn xuất không thêm cạnh CSS nào, vì
   `styles/tokens.css` đã nằm trong mọi graph.
7. Ca L2 `theme-matrix` vẫn PASS ở cả light và dark.
8. `pnpm gate:full` exit **0**.

## Risk Assessment

| Rủi ro                                                            | Giảm thiểu                                                                                                                                 |
| ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| Đổi màu rendered mà không ai thấy                                 | Bước 3 tách riêng nhóm không-đổi-giá-trị và đòi 0 pixel khác                                                                               |
| `color-mix(in oklab)` không support ở sàn browser đã hứa          | Bước "quyết định sàn browser" là chặn, không phải ghi chú                                                                                  |
| Dẫn xuất màu icon nhận dạng                                       | 38 token giữ literal là requirement 3, và SC4 đếm                                                                                          |
| Khối dark vỡ vì token dark của component trỏ token semantic light | `styles/tokens.css` đã khai dark riêng, nên `var(--tnt-background)` tự đổi theo theme. Phải kiểm bằng `theme-matrix` (SC7), không suy luận |
| L4 không có baseline nên phase xanh giả                           | Bước 1 là chặn cứng                                                                                                                        |

## Security Considerations

Không.

## Next steps

`phase-04-token-prefix.md` nếu owner chọn làm, và nó phải xong **trước lần
publish đầu**.
