# Phase 06 - Tài liệu

## Context links

- Plan cha: [`plan.md`](plan.md)
- Kiến trúc: [`architecture-plan.md`](architecture-plan.md) D10, mục 6.2
- Số đo: [`reports/00-measured-state.md`](reports/00-measured-state.md) mục 8, 9
- Phụ thuộc: nên làm sau P2 để tài liệu nói về trạng thái đã sửa

## Overview

- **Ngày** 2026-10-06
- **Mô tả** Ba việc: khai hai version cùng cây là unsupported; sửa câu "tsup cho
  cả 3 package"; ghi quy tắc đặt token mới vào `CLAUDE.md`.
- **Ưu tiên** Thấp, nhưng rẻ và nó là chỗ duy nhất D10 tồn tại.
- **Implementation status** **DONE** 2026-10-06
- **Review status** `GATE_EXIT=0`, `check-doc-links` 105 đường nhập; chưa có người review

## Key Insights

- D10 **không** thêm invariant nào, nên tài liệu là thứ duy nhất ghi lại quyết
  định. Nếu không viết, session sau sẽ đề xuất lại version token.
- Số đo phải vào tài liệu, không chỉ kết luận: bản cũ thắng cascade vì nó bundle
  sau, và CSS giống nhau thì bundler gộp còn x1. Không có số thì câu
  "unsupported" đọc như một lời bào chữa.
- `CLAUDE.md` viết "tsup cho cả 3 package". Với `tinita-react` thì
  `build:js` là **vite** x2 (`TNT_FORMAT=es`/`cjs`), tsup chỉ `build:types`.
  Câu sai này dẫn người đọc sửa sai file config.
- Quy tắc đặt token mới (5 câu ở mục 4.2) phải nằm trong `CLAUDE.md` chứ không
  chỉ trong plan: plan là thứ đọc một lần, `CLAUDE.md` là thứ đọc mỗi session.

## Requirements

1. `README.md`: một mục ngắn nói hai bản `tinita-react` trong một cây là không
   support, cách phát hiện (`npm ls tinita-react`), và cách sửa (`overrides` /
   `resolutions`).
2. `docs/system-architecture.md`: số đo cascade đầy đủ, và lý do **không** thêm
   runtime warning / version token / versioned class.
3. `CLAUDE.md`: sửa câu tsup; thêm quy tắc 5 câu đặt token mới; thêm I6 vào danh
   sách guard.
4. `docs/project-roadmap.md`: đóng nợ #18 nếu P5 xong; ghi nợ mới nếu P3/P4 bị
   hoãn.

## Architecture

Không có. Phase tài liệu.

## Related code files

| File                          | Thay đổi                          |
| ----------------------------- | --------------------------------- |
| `README.md`                   | mục duplicate version             |
| `docs/system-architecture.md` | số đo cascade + D10               |
| `CLAUDE.md`                   | sửa tsup, quy tắc token, guard I6 |
| `docs/project-roadmap.md`     | trạng thái nợ                     |

## Implementation Steps

1. Viết mục duplicate version vào `README.md`, kèm lệnh phát hiện.
2. Thêm số đo cascade vào `docs/system-architecture.md`.
3. Sửa `CLAUDE.md`: tsup -> vite cho JS, tsup cho types.
4. Thêm quy tắc đặt token mới vào `CLAUDE.md`.
5. `pnpm check-doc-links`.
6. `pnpm gate`.

## Todo list

- [ ] `README.md` mục duplicate version
- [ ] `docs/system-architecture.md` số đo cascade + lý do không thêm machinery
- [ ] `CLAUDE.md` sửa câu tsup
- [ ] `CLAUDE.md` quy tắc 5 câu đặt token mới
- [ ] `CLAUDE.md` thêm I6 vào danh sách guard
- [ ] `docs/project-roadmap.md` cập nhật nợ
- [ ] `pnpm check-doc-links` exit 0
- [ ] `pnpm gate` exit 0

## Success Criteria

1. `grep -c 'npm ls tinita-react' README.md` >= **1**.
2. `docs/system-architecture.md` chứa cả ba số: `x3` định nghĩa
   `.tnt-ping-root`, offset của bản thắng, và `77` byte delta.
3. `grep -n 'tsup' CLAUDE.md` không còn câu nào nói tsup sinh JS cho
   `tinita-react`.
4. `CLAUDE.md` chứa quy tắc 5 câu đặt token mới.
5. `pnpm check-doc-links` exit **0** - mọi đường nhập viết trong `.md` tồn tại
   trong `exports`.
6. `pnpm gate` exit **0**.

## Risk Assessment

| Rủi ro                                                            | Giảm thiểu                                                                  |
| ----------------------------------------------------------------- | --------------------------------------------------------------------------- |
| Tài liệu nói kết luận mà không có số, nên session sau đề xuất lại | SC2 đòi đúng ba con số                                                      |
| `check-doc-links` đỏ vì nhắc subpath chưa tồn tại                 | SC5; nếu nhắc `./ui/carousel-ticker/tokens.css` thì P2 phải xong trước      |
| Sửa `CLAUDE.md` nhưng không verify được trong session đang sửa    | `CLAUDE.md` của repo load theo session; verify bằng `claude -p` mới nếu cần |

## Security Considerations

Repo là public. Không dán đường dẫn tuyệt đối trong máy hay nội dung transcript
vào tài liệu.

## Next steps

Hết plan. Việc còn lại ngoài phạm vi: sinh baseline L4 (chặn P3), nợ #20 (L1/L2
chỉ `react@19`), nợ #21 (`tinita-dom` import-cleanliness).

---

## Kết quả, 2026-10-06

`GATE_EXIT=0` (10/10, l1 103.3s). `check-doc-links`: 105 đường nhập trong markdown
đều có trong `exports`, 122 subpath hợp lệ.

### Đã làm, bốn việc theo plan

1. **`README.md` mục "Known issues" item 3**: hai version cùng cây là không support,
   kèm số đo cascade, cách phát hiện (`npm ls tinita-react`) và cách sửa
   (`overrides` / `resolutions`).
2. **`docs/system-architecture.md` mục 6c MỚI**: số đo đầy đủ (3 định nghĩa
   `.tnt-ping-root`, offset của bản thắng, 77 byte delta, hành vi gộp khi CSS giống
   nhau) và bảng ba phương án bị loại kèm lý do.
3. **`CLAUDE.md`** bốn chỗ: câu tsup (với `tinita-react` thì tsup CHỈ sinh
   declaration, JS do vite chạy hai lần); bất biến 3 giờ có số đo thật thay cho câu
   "không tái lập được"; khối file component thêm `styles/motion-tokens.css` và
   `37 -> 36` token chung; **năm -> sáu lần** ca xanh-oan, kèm hai bài học từ lần thứ
   sáu. Thêm mục "Token mới đặt ở đâu" (5 câu, 2 câu đầu máy kiểm được) và mục guard
   `check-css-tokens` với cả bốn invariant.
4. **`docs/project-roadmap.md`**: nợ #18 -> **ĐÃ VÁ**, và nó đáng ghi riêng vì nợ đó
   đã hỏi đúng câu hỏi - "hoặc dạng phẳng thật sự ổn và bất biến 3 nói quá, hoặc
   `attw` không soi tới đây. Phải đo trước khi backfill" - và câu trả lời là **nhánh
   thứ hai**. Nợ #16 thêm ghi chú: bỏ export là breaking nên phải quyết trước lần
   publish đầu.

### Việc thứ năm, ngoài plan: drift class BEM

P4 tìm ra 4 file docs mô tả class theo BEM (`.tnt-filetree__label--folder`,
`.tnt-ping__pulse`), trong khi class thật là kebab phẳng `tnt-<folder>-<local>` do
`generateScopedName` sinh. Đây **không** phải hệ quả của P4 - nó sai từ trước, và
`check-doc-links` không bắt được vì nó chỉ kiểm đường nhập, không kiểm tên class.

Sửa theo class đo được trong `dist`, không đổi mù: `.tnt-filetree__label` thành
`.tnt-tree-label` chứ không thành `.tnt-file-tree__label`, vì **`FileTree` là
adapter** - phần cây do `Tree` render nên class là `tnt-tree-*`. `FileTree` chỉ có
hai class của riêng nó (`.tnt-file-tree-root`, `.tnt-file-tree-icon`).

`docs/design-guidelines.md` còn stale sâu hơn, sửa luôn ba chỗ:

- nhắc một file `FileTree.css` không tồn tại (thật là `FileTree.module.css`);
- nói dấu vết vendor là `[data-state='open']` và
  `var(--radix-accordion-content-height)` - cả hai **không** có trong `data-*` đo
  được. Thật là `[data-starting-style]` / `[data-ending-style]` và
  `--collapsible-panel-height` của Base UI;
- `.tnt-ping` và `.tnt-carousel-ticker__content` -> `.tnt-ping-root` và
  `.tnt-carousel-ticker-content`.

Danh sách class đầy đủ của cả 5 component giờ nằm trong `design-guidelines.md`,
lấy từ `dist` chứ không viết tay.

### Chưa làm

`utils/autoInjectStyles` (nợ #16) vẫn export. Bỏ nó là breaking nên nó cùng cửa sổ
với P4 - **trước lần publish đầu**. Quyết định của owner.
