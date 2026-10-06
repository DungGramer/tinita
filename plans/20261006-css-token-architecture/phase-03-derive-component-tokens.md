# Phase 03 - Token component dẫn xuất từ palette semantic

## Context links

- Plan cha: [`plan.md`](plan.md)
- Kiến trúc: [`architecture-plan.md`](architecture-plan.md) D6, mục 4.3, I7
- Số đo: [`reports/00-measured-state.md`](reports/00-measured-state.md) mục 2, 6
- Phụ thuộc: ~~baseline L4~~ - **KHÔNG cần**, xem mục "Baseline ảnh không phải điều kiện chặn" ở cuối
- Độc lập với P1/P2/P4/P5

## Overview

- **Ngày** 2026-10-06
- **Mô tả** Token màu của component tham chiếu palette semantic bằng `var()` /
  `color-mix()` thay vì literal. 38/40 token icon của FileTree **giữ literal**.
- **Ưu tiên** Trung bình. Đây là phase làm design system thành design system,
  không phải phase sửa lỗi.
- **Implementation status** **DONE (hẹp hơn plan)** 2026-10-06
- **Review status** gate 0, L2 0, L4 0; chưa có người review

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

---

## Kết quả, 2026-10-06

```
pnpm gate                      GATE_EXIT=0  10/10 (l1 89.8s)
node compatibility/run.mjs l2  L2_EXIT=0    31 ca, 0 fail, 1 skip
node compatibility/run.mjs l4  L4_EXIT=0    30 ca, 0 fail, 6 skip

PASS  token-derivation   6 cặp token: ghi đè token semantic thì token component đổi theo
PASS  theme-matrix       7 vị trí dark/light đều đúng, kể cả .dark trên <html>
```

## Baseline ảnh KHÔNG phải điều kiện chặn - plan đóng khung sai

Plan ghi phase này bị chặn bởi baseline L4 (0 `.png`, 6 ca SKIP). Sai: invariant
I7 là **giá trị computed**, không phải pixel. So màu đã resolve trước/sau trong
Chromium là dụng cụ **đúng hơn** PNG byte-compare - cái đó còn báo cả nhiễu
antialiasing và đòi container để tái lập được.

Docker có chạy trên máy này, nhưng **không có** Dockerfile hay script nào sinh
baseline - chỉ có `IN_PLAYWRIGHT_CONTAINER` được đọc trong `l4/index.mjs`. Sinh
baseline vẫn là nợ thật, nhưng nó **độc lập** với phase này.

Cách đo đã dùng: mỗi token một div `color: var(--token)`, đọc computed color. Phải
làm vậy vì giá trị computed của custom property là **TEXT**:
`rgb(0 0 0 / 0.06)` và `rgba(0, 0, 0, 0.06)` khác chuỗi mà cùng màu, nên so chuỗi
token sẽ báo khác oan.

**14/14 màu đã resolve giữ nguyên byte-for-byte** sau khi dẫn xuất, ở cả hai theme.

## Phạm vi THẬT: 6 token, không phải 91

| Nhóm                                                                | Số         | Quyết định                                                                                                                   |
| ------------------------------------------------------------------- | ---------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Tree, trùng tuyệt đối cả hai theme                                  | 6          | **DẪN XUẤT**                                                                                                                 |
| Semantic pha alpha (`tree-selected-bg`, `fw-border-idle`, 2 shadow) | 4          | để lại - cần `color-mix()` hoặc `rgb(from ...)`, tức quyết định sàn browser                                                  |
| Màu nhận dạng loại file của FileTree                                | 38         | để lại - `icon-html: #dc2626` tình cờ bằng `--tnt-destructive`, dẫn xuất là ghép màu lỗi của brand vào icon HTML             |
| 4 icon trung tính của FileTree                                      | 8 khai báo | để lại - giá trị LỆCH giữa hai theme: `icon-file` dark là `#6b7280`, tức muted của **light**. Dẫn xuất sẽ ĐỔI rendering dark |
| `fw-header-bg`                                                      | 2          | để lại - `#f9fafb`/`#141414` không có trong palette                                                                          |

Sáu cặp đã dẫn xuất:

```
--tnt-tree-bg            <- --tnt-background   #ffffff / #0a0a0a
--tnt-tree-text          <- --tnt-foreground   #1a1a1a / #e5e7eb
--tnt-tree-selected-text <- --tnt-foreground   #1a1a1a / #e5e7eb
--tnt-tree-text-dim      <- --tnt-muted        #6b7280 / #9ca3af
--tnt-tree-icon          <- --tnt-muted        #6b7280 / #9ca3af
--tnt-tree-hover         <- --tnt-accent       đen/trắng 6%
```

FileTree thừa hưởng cả sáu vì phần cây do Tree render.

Hệ quả phụ đo được: khối dark của `ui/tree/tokens.css` co từ **7 khai báo còn 1**
(chỉ `selected-bg`, vì alpha của nó khác theo theme). Sáu chỗ bớt phải sửa.

## Matcher đầu của tôi sinh false positive

Phiên bản đầu so **giá trị** chứ không so **nghĩa**, nên nó đề nghị:

```
--tnt-ping-dot-size: 0.5rem    == --tnt-radius       <- trùng ĐỘ DÀI, không trùng nghĩa
--tnt-ping-gap: 0.25rem        == --tnt-radius-sm
--tnt-floating-window-header-gap: 0.5rem == --tnt-radius
--tnt-file-tree-icon-html: #dc2626 == --tnt-destructive  <- màu nhận dạng
```

Bản thứ hai chỉ xét token màu, nhưng vẫn không chọn được **token semantic nào**
trong các token trùng giá trị: `#ffffff` là cả `--tnt-background`, `--tnt-input` và
`--tnt-primary-foreground`, nên nó báo `--tnt-tree-bg == --tnt-input`. Số đo nói
cái nào **an toàn**; nghĩa thì người phải chọn.

## Ba khẳng định sai trong docs, tìm ra khi dựng ca

1. **`--tnt-file-tree-{bg,text,text-dim,hover,active,spacing,indent}` không tồn
   tại** - khai ở 0 chỗ, dùng ở 0 chỗ. Cả 20 token của file-tree đều là `icon-*`.
   `docs/design-guidelines.md` và `docs/code-standards.md` dạy consumer override
   chúng; tên đúng là `--tnt-tree-*`. Lượt rename ở pha 04 đã đổi tên chúng từ
   `--tnt-filetree-*` sang `--tnt-file-tree-*` - hư cấu cả trước lẫn sau.
2. **`css-probe.mjs` đọc `--tnt-file-tree-bg`** làm trường diagnostic, nên trường
   đó luôn rỗng. Đổi sang `--tnt-tree-bg`, và giờ nó có nghĩa: token đó dẫn xuất từ
   `--tnt-background` nên phải đổi theo theme cùng lúc.
3. **"Mỗi biến icon dùng fallback"** - đo trên `dist`: **20 lần dùng
   `var(--tnt-file-tree-icon-*)`, 0 lần có dấu phẩy**. Bỏ trống một biến icon thì
   declaration thành invalid at computed-value time và `color` về giá trị kế thừa,
   không phải "màu hợp lý".

## Ca đã chứng minh phá được

```
PHÁ: trả 6 token về literal
  FAIL  token-derivation
    --tnt-tree-bg <- --tnt-background: mặc định=rgb(255, 255, 255),
                     sau ghi đè=rgb(255, 255, 255), chờ=rgb(1, 2, 3)
    ...
GỠ: L2_TIER1_EXIT=0, 31 ca, 0 fail
```

Ca đo **hai chiều**: ghi đè thì phải ra marker, VÀ không ghi đè thì phải KHÁC
marker. Chỉ kiểm chiều đầu thì một token hardcode thẳng marker cũng cho xanh.

## Chưa làm

Nhóm alpha (4 token) chờ owner chốt sàn browser cho `color-mix()` /
`rgb(from ...)`. Sinh baseline ảnh L4 vẫn là nợ độc lập.
