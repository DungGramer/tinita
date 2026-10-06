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
- **Implementation status** Not started
- **Review status** Chưa review

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
