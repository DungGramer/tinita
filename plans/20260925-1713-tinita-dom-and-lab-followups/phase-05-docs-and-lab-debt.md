# Pha 05 - Docs cho 4 việc, và 2 vấn đề lab còn treo

## Context links

- Plan cha: [plan.md](./plan.md)
- Dependency: **pha 01-04** (cần số đo và kết quả thật để ghi, không ghi trước)
- Vấn đề còn treo: `compatibility/README.md` mục "Tier 3 - kết quả đo 2026-09-25 và 3 vấn đề chưa xử"
- Docs sẽ sửa: `README.md`, `CLAUDE.md`, `docs/codebase-summary.md`, `docs/code-standards.md`,
  `docs/project-roadmap.md`, `docs/system-architecture.md`, `compatibility/README.md`

## Overview

- **Date:** 2026-09-25
- **Description:** Đóng vòng. Docs phản ánh package thứ ba, số đo tier mới, QĐ-1 và QĐ-2 đã đóng. Và
  quyết định dứt điểm 2 vấn đề lab còn treo thay vì để chúng nằm mãi trong README.
- **Priority:** P1 - không chặn việc dùng, nhưng thiếu nó thì `/plan:hard` sau này đọc docs sai
- **Implementation status:** Done
- **Review status:** Not reviewed

## Key Insights

1. **`docs/codebase-summary.md` được đọc như sự thật.** `/plan:hard` và `/plan:parallel` **bỏ qua
   scouting** khi file đó mới hơn 3 ngày. Thêm package thứ ba mà không cập nhật file này thì plan sau
   sẽ lập kế hoạch cho một repo 2 package.
2. **`CLAUDE.md` là instruction file luôn được nạp.** Nó liệt kê package và quy tắc import. Đã sai
   một lần (nêu `tinita-react/hooks` và `/ui` là đường nhập bắt buộc trong khi không tồn tại) và lab
   bắt được. Thêm `tinita-dom` phải vào đây, kèm 2 subpath thật.
3. **Không verify được `CLAUDE.md` trong session đang chạy.** Instruction snapshot nạp lúc khởi
   session. Muốn chắc thì phải spawn `claude -p` mới. Ghi vào Implementation Steps.
4. **Hai vấn đề lab treo có mức ưu tiên rất khác nhau.** `node22-yarn-classic` fail do mạng là lỗi
   phân loại, sửa trong pha 01. `node22-yarn-pnp` fail ở `corepack prepare` là cell **đáng giá nhất**
   của matrix - nó bắt phantom dependency mà npm và pnpm hoist qua. Bỏ nó là bỏ khả năng phát hiện
   một lớp lỗi.
5. **Quyết định về `yarn-pnp`: trong phạm vi, nhưng là việc cuối.** Nó không chặn gì và có thể mất
   thời gian dò (corepack trong image cần mạng, hoặc cần version corepack mới hơn image mang). Nếu
   không xong trong một lần thử hợp lý thì hạ xuống thành việc riêng, ghi rõ đã thử gì.

## Requirements

- `docs/codebase-summary.md`: `tinita-dom` trong cây thư mục, thống kê, bảng package.
- `CLAUDE.md`: `tinita-dom` trong mục package, quy tắc import với 2 subpath thật.
- `README.md`: `tinita-dom` trong danh sách package + ví dụ dùng + ghi rõ browser-only.
- `docs/code-standards.md`: quy tắc `typesVersions` đồng bộ `exports` (từ pha 03).
- `docs/project-roadmap.md`: đóng QĐ-1, QĐ-2; cập nhật M4 (lệnh CI); ghi lại nợ nào đã xong.
- `docs/system-architecture.md`: `tinita-dom` trong dependency graph và mục đóng gói.
- `compatibility/README.md`: bảng tier số đo mới, QĐ-1/QĐ-2 đổi từ "cần chốt" sang "đã thực hiện",
  trạng thái 3 vấn đề tier 3.
- `node22-yarn-classic`: phân loại mạng thành hạ tầng (đã làm ở pha 01, ở đây chỉ xác minh + ghi).
- `node22-yarn-pnp`: thử làm cho chạy; nếu không xong thì ghi rõ đã thử gì và vì sao dừng.

## Architecture

Không cấu trúc mới. Bảng ánh xạ việc -> docs cần sửa:

| Việc            | Docs phải đổi                                                                                                               |
| --------------- | --------------------------------------------------------------------------------------------------------------------------- |
| V1 `tinita-dom` | `README.md`, `CLAUDE.md`, `codebase-summary.md`, `system-architecture.md`, `code-standards.md` (bảng package -> dependency) |
| V2 tier 2       | `compatibility/README.md` (bảng tier), `plan.md` của plan lab cũ, `project-roadmap.md` M4                                   |
| V3 QĐ-1         | `compatibility/README.md`, `project-roadmap.md`                                                                             |
| V4 QĐ-2         | `code-standards.md` (quy tắc mới), `compatibility/README.md`, `project-roadmap.md`                                          |

Quyết định phạm vi 2 vấn đề treo:

| Vấn đề                                                 | Trong phạm vi?          | Lý do                                                            |
| ------------------------------------------------------ | ----------------------- | ---------------------------------------------------------------- |
| `node22-yarn-classic` fail do Docker Hub timeout       | **CÓ**, đã sửa ở pha 01 | Chỉ là phân loại exit code, rẻ                                   |
| `node22-yarn-pnp` fail ở `corepack prepare yarn@4.5.0` | **CÓ, nhưng việc cuối** | Cell đáng giá nhất; nếu dò quá lâu thì tách ra, ghi rõ đã thử gì |

## Related code files

| File                                   | Sửa gì                                                                           |
| -------------------------------------- | -------------------------------------------------------------------------------- |
| `docs/codebase-summary.md`             | cây thư mục + thống kê + bảng 3 package                                          |
| `CLAUDE.md`                            | mục package + quy tắc import `tinita-dom`                                        |
| `README.md`                            | 3 package + ví dụ `installSmoothScroll` + cảnh báo browser-only                  |
| `docs/code-standards.md`               | quy tắc `typesVersions`; bảng package -> dependency thêm `tinita-dom` (zero dep) |
| `docs/project-roadmap.md`              | đóng QĐ-1, QĐ-2; M4 lệnh CI; nợ đã xong                                          |
| `docs/system-architecture.md`          | dependency graph + mục đóng gói                                                  |
| `compatibility/README.md`              | bảng tier, QĐ-1/QĐ-2, trạng thái 3 vấn đề                                        |
| `compatibility/docker/node.Dockerfile` | thử sửa corepack cho cell PnP                                                    |
| `compatibility/docker/matrix.json`     | ghi trạng thái cell PnP nếu vẫn không chạy                                       |

## Implementation Steps

1. Chạy lại `run.mjs all --tier=1`, `--tier=2`, `--tier=3` và ghi wall-clock thật, kèm ngày và máy.
   Đây là số để điền vào mọi bảng tier - đừng dùng số cũ.
2. `docs/codebase-summary.md`: thêm `tinita-dom` vào cây, đổi thống kê (7 workspace member), thêm vào
   bảng package. Ghi rõ nó zero-dependency và browser-only.
3. `CLAUDE.md`: thêm `tinita-dom` vào mục package; quy tắc import nêu đúng 2 subpath
   (`tinita-dom/smooth-scroll`, `tinita-dom/wheel-source`) và barrel. **Nêu rõ browser-only.**
4. `README.md`: thêm `tinita-dom` với ví dụ ngắn - `installSmoothScroll()` gọi một lần ngoài React,
   trả về hàm cleanup, và cảnh báo nó chạm `document` nên không gọi được lúc SSR.
5. `docs/code-standards.md`: thêm quy tắc `typesVersions` (nếu pha 03 chưa thêm); bảng package ->
   dependency thêm dòng `tinita-dom` = không cần gì.
6. `docs/system-architecture.md`: dependency graph thêm `tinita-dom` (zero dep, không peer); mục
   "Chiến Lược Đóng Gói Dependency" ghi package thứ ba theo cùng khuôn.
7. `docs/project-roadmap.md`: đóng QĐ-1 và QĐ-2 kèm ngày và version; M4 ghi lệnh CI với số đo tier
   mới; đánh dấu nợ nào đã xong.
8. `compatibility/README.md`: bảng tier số mới; QĐ-1/QĐ-2 chuyển sang "đã thực hiện"; mục 3 vấn đề
   tier 3 cập nhật trạng thái từng cái.
9. **Xác minh `CLAUDE.md` bằng session mới**: `claude -p` với một câu hỏi về đường nhập của
   `tinita-dom`, xem instruction mới có được nạp và trả lời đúng không. Không verify được trong
   session đang chạy.
10. Thử sửa cell `node22-yarn-pnp`: bắt đầu bằng đọc log lỗi `corepack prepare` đầy đủ (hiện chỉ có
    "exit code 1"). Hướng nghi: corepack trong `node:22-slim` cũ hơn yarn 4.5.0 yêu cầu, hoặc cần
    mạng lúc build. Thử `corepack install -g yarn@4.5.0` hoặc `COREPACK_ENABLE_DOWNLOAD_PROMPT=0`.
    **Giới hạn: nếu 2-3 lần thử không xong thì dừng**, ghi vào `matrix.json` `why` rằng cell đang
    không chạy được và đã thử gì, và tách thành việc riêng.
11. Chạy gate repo + toàn bộ lab lần cuối.

## Todo list

- [ ] Đo lại 3 tier, ghi ngày + máy
- [ ] `docs/codebase-summary.md` (cây + thống kê + bảng)
- [ ] `CLAUDE.md` (package + quy tắc import + browser-only)
- [ ] `README.md` (ví dụ + cảnh báo SSR)
- [ ] `docs/code-standards.md` (`typesVersions` + bảng dependency)
- [ ] `docs/system-architecture.md` (graph + đóng gói)
- [ ] `docs/project-roadmap.md` (đóng QĐ-1, QĐ-2, M4)
- [ ] `compatibility/README.md` (tier, QĐ, 3 vấn đề)
- [ ] Xác minh `CLAUDE.md` bằng `claude -p` session mới
- [ ] Thử sửa cell `yarn-pnp`, giới hạn 2-3 lần thử
- [ ] Gate + toàn bộ lab

## Success Criteria

1. `grep -c 'tinita-dom' docs/codebase-summary.md CLAUDE.md README.md docs/system-architecture.md`
   mỗi file >= 1. Và `docs/codebase-summary.md` ghi **7** workspace member, không phải 6.
2. `grep -n "tinita-dom/" CLAUDE.md` chỉ ra đúng 2 subpath thật (`smooth-scroll`, `wheel-source`).
   Không có subpath nào được nêu mà không có trong `packages/tinita-dom/package.json` `exports` -
   đối chiếu được bằng ca `05-contract-drift`, đúng lỗi đã gặp với `tinita-react/hooks`.
3. `README.md` có ví dụ `installSmoothScroll()` kèm một câu nói nó chạm `document` nên không gọi
   được lúc SSR.
4. `compatibility/README.md` bảng tier có **số đo mới** kèm ngày và tên máy/OS, và tier 2 dưới
   1200s (nếu pha 01 đạt) hoặc ghi rõ số thật nếu chưa đạt.
5. `compatibility/README.md` mục QĐ-1 và QĐ-2 **không còn** ở dạng câu hỏi "cần owner chốt"; cả hai
   ghi quyết định đã chọn, ngày, và kết quả.
6. `docs/project-roadmap.md`: QĐ-1 và QĐ-2 đánh dấu đóng. M4 có lệnh CI kèm số đo tier mới.
7. Mục "3 vấn đề tier 3" trong `compatibility/README.md`: cả 3 có trạng thái dứt khoát - đã sửa, đã
   thử và dừng (kèm đã thử gì), hoặc tách thành việc riêng. **Không dòng nào để trống hoặc "chưa xử"
   mà không nói vì sao.**
8. Nếu cell `yarn-pnp` chạy được: `node compatibility/cases/l3/index.mjs --case=node22-yarn-pnp` EXIT
   0, `yarn config get nodeLinker` in `pnp`, và **không** tồn tại `node_modules` trong consumer cell
   đó. Nếu không chạy được: `matrix.json` trường `why` của cell ghi rõ đang không chạy và đã thử gì.
9. Session `claude -p` mới trả lời đúng đường nhập của `tinita-dom` khi được hỏi - chứng minh
   `CLAUDE.md` đã nạp đúng.
10. Gate repo 4/4 EXIT 0; `run.mjs l1` và `l2` EXIT 0.
11. Không file nào chứa ký tự em dash (U+2014). Kiểm bằng
    `grep -c $'\u2014' README.md docs/*.md CLAUDE.md compatibility/README.md` -> 0 ở mọi file.
    (Đừng grep dấu gạch thường: nó khớp mọi thứ và tiêu chí thành vô nghĩa.)

## Risk Assessment

| Rủi ro                                                                                            | Xác suất   | Ảnh hưởng  | Giảm thiểu                                                           |
| ------------------------------------------------------------------------------------------------- | ---------- | ---------- | -------------------------------------------------------------------- |
| `docs/codebase-summary.md` không cập nhật -> `/plan:hard` sau này lập kế hoạch cho repo 2 package | Trung bình | Cao        | Tiêu chí 1; file này được đọc như sự thật và bỏ qua scouting khi mới |
| `CLAUDE.md` nêu subpath không tồn tại, lặp lại lỗi `tinita-react/hooks`                           | Trung bình | Cao        | Tiêu chí 2 đối chiếu với `exports` qua ca `05-contract-drift`        |
| Điền số tier cũ vào bảng vì tiện                                                                  | Trung bình | Trung bình | Bước 1 bắt buộc đo lại; tiêu chí 4 đòi ngày và máy                   |
| Dò `yarn-pnp` không có giới hạn, ngốn hết thời gian pha                                           | Cao        | Trung bình | Bước 10 giới hạn 2-3 lần thử rồi dừng, ghi lại                       |
| Sửa `CLAUDE.md` mà không verify được trong session đang chạy                                      | Chắc chắn  | Thấp       | Bước 9 spawn session mới                                             |
| Ba vấn đề tier 3 lại để lửng sang lần sau                                                         | Trung bình | Trung bình | Tiêu chí 7 đòi trạng thái dứt khoát cho cả 3                         |

## Security Considerations

- `CLAUDE.md` là instruction file. Chỉ thêm mô tả package và đường nhập; không thêm chỉ dẫn nào cấp
  thêm quyền hay nới permission.
- Ví dụ trong `README.md` không được chứa đường dẫn máy dev hay tên người.
- Nếu sửa `node.Dockerfile` cho corepack: không tắt kiểm tra tính toàn vẹn của corepack
  (`COREPACK_INTEGRITY_KEYS` phải giữ mặc định). Tắt nó là mở đường cài package manager không xác thực.
- Không commit log lỗi corepack nếu nó chứa token hay URL registry riêng tư.

## Next steps

Sau pha này, 4 việc owner nêu đã xong và `docs/project-roadmap.md` còn M1 (bịt rò rỉ CSS, nay đã có
số đo và bảng `expected` đảo được), M3 (test cho `tinita-react`, hiện 0 test) và M4 (CI, chỉ cần gọi
`run.mjs` theo tier). `tinita-dom` cũng cần test cho `installSmoothScroll` sâu hơn mức smoke - thuộc
M3 mở rộng.
