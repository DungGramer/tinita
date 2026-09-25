# Pha 06 - Tiering, docs, và quyết định cho owner

## Context links

- Plan cha: [plan.md](./plan.md)
- Dependency: **pha 02, 03, 04, 05** - pha này cần số đo wall-clock thật của cả bốn, không đoán
- Context đã đo: [reports/00-verified-context.md](./reports/00-verified-context.md) mục "Trạng thái
  publish", mục "Thực nghiệm tool L1" (4 khiếm khuyết đang tồn tại), mục "Nợ liên quan trong roadmap"
- Docs sẽ sửa: `docs/project-roadmap.md`, `docs/code-standards.md`, `docs/codebase-summary.md`,
  `pnpm-workspace.yaml`, `.gitignore`
- Nguồn thiết kế: tài liệu gốc mục "Và tôi sẽ định nghĩa CI như sau" (3 tier)

## Overview

- **Date:** 2026-09-25
- **Description:** Đóng vòng. Điền bảng 3 tier bằng số đo thật, cập nhật docs để lab không bị bỏ rơi,
  gán xử lý cho 4 khiếm khuyết mà lab phát hiện, và trình cho owner 2 quyết định mà plan cố ý không
  tự quyết. Không viết ca test mới ở pha này.
- **Priority:** P1 - không chặn việc dùng lab, nhưng thiếu nó thì lab sẽ mục trong 3 tháng
- **Implementation status:** Not started
- **Review status:** Not reviewed

## Key Insights

1. **Lab không có CI sẽ bị quên.** Repo hiện không có `.github/`. Owner đã chốt lần này chỉ script
   local. Nên thứ duy nhất giữ lab sống là **quy tắc trong docs** cộng với việc mọi script đã sẵn
   sàng để M4 gọi lại. Nếu pha này làm hời hợt thì 5 pha trước thành vô ích.
2. **Bảng tier phải điền bằng số đo, không bằng ước lượng.** Bảng trong `plan.md` hiện là mục tiêu
   (< 4 phút / < 20 phút / < 45 phút). Sau pha 03-05 sẽ có số thật. Nếu số thật vượt mục tiêu thì
   phải chia lại tier, không phải nới mục tiêu.
3. **Lab sẽ phát hiện 4 khiếm khuyết ngay ngày đầu.** Chúng không phải lỗi của lab. Nếu không gán ai
   xử lý và khi nào, chúng sẽ nằm mãi trong allowlist và allowlist thành thùng rác.
4. **Hai quyết định thuộc owner, không thuộc plan.** (a) `tinita@0.0.1` và `tinita-react@0.0.2` đã
   publish trước khi vá B1/B2 - bump, deprecate, hay publish bản vá là quyết định sản phẩm.
   (b) Có cam kết support TS cũ (`moduleResolution: node`) hay không quyết định liệu `node10`
   resolution failed 5/6 là lỗi hay là ngoài phạm vi. Plan nêu lựa chọn và đánh đổi, owner chốt.
5. **`docs/codebase-summary.md` là thứ `/plan:hard` và `/plan:parallel` đọc như sự thật** và chúng
   **bỏ qua scouting** khi file đó mới hơn 3 ngày. Nên thêm `compatibility/` vào đó không phải việc
   trang trí - thiếu nó thì plan sau sẽ không biết lab tồn tại.

## Requirements

- Bảng 3 tier trong `plan.md` và trong `compatibility/README.md` được điền bằng số đo thật, kèm ngày đo.
- `docs/project-roadmap.md`: đóng phần "kiểm tự động" còn thiếu của M2; ghi rõ M4 (CI) sẽ gọi lại
  script nào; cập nhật M1 để ghi rằng khi bịt rò rỉ CSS thì `leak-surfaces.json` phải đảo `expected`.
- `docs/code-standards.md`: thêm quy tắc "mọi export mới phải có ca L1" kèm lý do.
- `docs/codebase-summary.md`: thêm `compatibility/` vào cây thư mục và vào phần thống kê.
- `pnpm-workspace.yaml`: thêm comment cảnh báo không được thêm `compatibility/*`.
- `.gitignore`: đã sửa ở pha 01; pha này chỉ xác minh lại và ghi vào docs vì sao có ngoại lệ.
- 4 khiếm khuyết được gán pha/mốc xử lý cụ thể, không để trống.
- 2 quyết định của owner được trình dạng lựa chọn + đánh đổi, **không** tự chốt.

## Architecture

Không có cấu trúc mới. Pha này sửa file sẵn có và điền số.

Ánh xạ tier sau khi có số đo:

| Tier | Gồm | Lệnh | Mục tiêu | Số đo thật |
| --- | --- | --- | --- | --- |
| 1 | `turbo test` + L1 + L2 | `run.mjs all --tier=1` | < 4 phút | điền sau pha 03 |
| 2 | Tier 1 + L3 cell tier 2 | `run.mjs all --tier=2` | < 20 phút | điền sau pha 04 |
| 3 | Tier 2 + L3 tier 3 + L4 | `run.mjs all --tier=3` | < 45 phút | điền sau pha 05 |

Nếu tier 1 vượt 4 phút, thứ tự cắt: ca Next của pha 03 xuống tier 2 trước (nó là ca chậm nhất của
L2), rồi mới tới ca `tsc-matrix`. Không cắt ca L1 - nó là tầng có tỷ lệ bắt bug cao nhất.

Gán xử lý cho 4 khiếm khuyết:

| Khiếm khuyết | Bằng chứng | Gán |
| --- | --- | --- |
| `attw` FalseCJS 6/6 subpath của `tinita` | `exports[x].types` trỏ `.d.ts` còn `import` trỏ `.mjs`; tsup có emit `.d.mts` | Sửa trong pha này: tách `types` theo condition `import`/`require`. Nhỏ, rủi ro thấp, và nó đang ảnh hưởng mọi consumer TS dùng ESM |
| `tinita` thiếu `sideEffects` | publint suggestion; `tinita-react` có, `tinita` không | Sửa trong pha này: thêm `"sideEffects": false` cho `tinita`. Nó zero-dep và không có side effect |
| `node10` resolution failed 5/6 | `attw`; TS cũ không resolve subpath exports | **Quyết định của owner** - xem mục Next steps. Nếu không support TS cũ thì đưa vào allowlist với lý do, không sửa |
| `tinita-react/hooks` + `/ui` documented-but-missing | `CLAUDE.md` nói bắt buộc; không có trong `exports` lẫn `dist` | Sửa trong pha này, nhưng chỉ sửa **tài liệu**: `CLAUDE.md` đang sai. Thêm export là mở rộng API, thuộc quyết định khác |

## Related code files

| File | Sửa gì |
| --- | --- |
| `docs/project-roadmap.md` | đóng phần kiểm tự động của M2; ghi M1 phải đảo `leak-surfaces.json`; ghi M4 gọi lại `run.mjs` |
| `docs/code-standards.md` | thêm quy tắc "export mới phải có ca L1" |
| `docs/codebase-summary.md` | thêm `compatibility/` vào cây + thống kê |
| `pnpm-workspace.yaml` | comment cảnh báo |
| `.gitignore` | xác minh lại ngoại lệ của pha 01 |
| `CLAUDE.md` | sửa claim sai về `tinita-react/hooks` và `/ui` |
| `packages/tinita/package.json` | thêm `sideEffects: false`; tách `types` theo condition |
| `compatibility/README.md` | điền bảng tier bằng số đo thật |
| `compatibility/contract.json` | cập nhật allowlist sau khi sửa FalseCJS |

## Implementation Steps

1. Chạy `run.mjs all --tier=1`, `--tier=2`, `--tier=3` và ghi wall-clock thật của từng tier. Ghi cả
   ngày đo và máy đo (số này vô nghĩa nếu không biết đo ở đâu).
2. Điền bảng tier trong `plan.md` và `compatibility/README.md`. Nếu tier nào vượt mục tiêu, áp thứ tự
   cắt trong mục Architecture và ghi lại đã cắt gì, vì sao.
3. Sửa `packages/tinita/package.json`: thêm `"sideEffects": false`; tách `types` thành
   `exports[x].import.types` trỏ `.d.mts` và `exports[x].require.types` trỏ `.d.ts`. Sau đó chạy lại
   pha 02 và xác nhận `attw` không còn báo `FalseCJS`, rồi **xoá** entry đó khỏi allowlist trong
   `contract.json`. Đây là ví dụ mẫu cho quy trình "sửa rồi thu hẹp allowlist".
4. Sửa `CLAUDE.md`: gỡ claim `tinita-react/hooks` và `tinita-react/ui` là đường nhập bắt buộc, vì
   chúng không tồn tại. Thay bằng danh sách subpath thật. Ghi chú: đây là claim đã tồn tại từ trước và
   từng được các pass docs trước bỏ sót vì không ai thực thi thử đường nhập đó - chính là lớp lỗi lab
   này ra đời để bắt.
5. Thêm vào `docs/code-standards.md` một mục ngắn: **"Export mới phải có ca L1"**. Nội dung: mỗi khi
   thêm subpath vào `exports`, phải thêm specifier vào `compatibility/contract.json` trong cùng
   commit; ca 05 của L1 fail nếu thiếu (đối chiếu hai chiều). Lý do phải viết ra: `exports` mà không
   có ca thì lỗi chỉ lộ sau khi publish - đã xảy ra 2 lần với B1 và B2.
6. Thêm `compatibility/` vào `docs/codebase-summary.md`: cây thư mục, số ca theo level, và một dòng
   nói nó **ngoài** pnpm workspace kèm lý do. Cập nhật phần thống kê workspace member nếu có nêu con số.
7. Cập nhật `docs/project-roadmap.md`:
   - M2: đóng phần "kiểm tự động rằng `import 'tinita-react/ui/<x>'` không đòi lib mà `<x>` không
     dùng" - nay là ca 04 của L1. M2 hoàn tất.
   - M1: thêm một dòng rằng khi bịt rò rỉ CSS xong thì phải đảo `expected` trong
     `compatibility/cases/l4/leak-surfaces.json` từ `leaks` sang `clean`, nếu không 11 ca sẽ đỏ và bị
     hiểu sai là lab hỏng.
   - M4: ghi rõ CI chỉ cần gọi `node compatibility/run.mjs all --tier=<n>` theo 3 tier, không cần
     viết lại gì.
8. Thêm comment vào `pnpm-workspace.yaml` ngay dưới danh sách glob: không được thêm
   `compatibility/*`, kèm một câu lý do và trỏ tới `compatibility/README.md`.
9. Xác minh lại `.gitignore` bằng `git check-ignore -v` cho `compatibility/**/*.md`,
   `__screenshots__/*.png`, `.artifacts/`, `.work/` - đo, không suy luận.
10. Viết mục "Quyết định cần owner chốt" vào `compatibility/README.md` với 2 quyết định ở Next steps,
    kèm lựa chọn và đánh đổi, để nó không nằm mãi trong plan mà không ai thấy.
11. Chạy lại toàn bộ gate của repo (`turbo check-types`, `lint`, `build`, `test`) sau mọi sửa đổi
    `package.json` ở bước 3 - đổi `exports` là việc dễ làm vỡ type của consumer.

## Todo list

- [ ] Đo wall-clock 3 tier thật, ghi ngày + máy đo
- [ ] Điền bảng tier vào `plan.md` và `compatibility/README.md`
- [ ] `tinita`: thêm `sideEffects: false`, tách `types` theo condition
- [ ] Chạy lại L1, xác nhận `FalseCJS` mất, xoá khỏi allowlist
- [ ] Sửa `CLAUDE.md` claim `hooks`/`ui`
- [ ] `docs/code-standards.md`: quy tắc "export mới phải có ca L1"
- [ ] `docs/codebase-summary.md`: thêm `compatibility/`
- [ ] `docs/project-roadmap.md`: đóng M2, ghi chú M1, ghi M4 gọi gì
- [ ] `pnpm-workspace.yaml`: comment cảnh báo
- [ ] Xác minh `.gitignore` bằng `git check-ignore -v`
- [ ] Mục "Quyết định cần owner chốt" trong README
- [ ] Chạy lại gate sau khi sửa `exports`

## Success Criteria

1. `plan.md` và `compatibility/README.md` có bảng 3 tier với **số cụ thể** (không phải "< 4 phút" mà
   là giá trị đo được), kèm ngày đo và tên máy/OS.
2. Sau bước 3: `npx attw --pack packages/tinita` **không** còn dòng `Masquerading as CJS` nào. Đếm
   được: từ 6/6 xuống 0/6.
3. Sau bước 3: `npx publint packages/tinita` không còn suggestion về `sideEffects`. Số suggestion
   giảm đúng 1 so với trước.
4. `contract.json` **không** còn entry `accepted` nào cho `FalseCJS`. Allowlist thu hẹp, không phình.
5. `grep -n "tinita-react/hooks\|tinita-react/ui" CLAUDE.md` không còn dòng nào mô tả chúng là đường
   nhập bắt buộc. Và mọi specifier còn được nêu trong `CLAUDE.md` đều có trong
   `packages/tinita-react/package.json` `exports` - đối chiếu được bằng ca 05 của L1.
6. `docs/code-standards.md` có mục "Export mới phải có ca L1" nêu cả **lý do** (B1/B2 đã lọt 2 lần),
   không chỉ nêu quy tắc.
7. `docs/codebase-summary.md` có `compatibility/` trong cây thư mục và có một dòng nói nó ngoài pnpm
   workspace kèm lý do.
8. `pnpm-workspace.yaml` có comment cảnh báo. Xác minh nó không làm pnpm lỗi: `pnpm -r list --depth -1`
   vẫn in ra đúng 6 member.
9. `docs/project-roadmap.md`: M2 được đánh dấu hoàn tất; M1 có dòng về đảo `leak-surfaces.json`; M4 có
   đúng lệnh mà CI sẽ gọi.
10. `git check-ignore -v compatibility/cases/l1/NOTES.md` exit khác 0 (không bị ignore);
    `git check-ignore -v compatibility/.artifacts/x.tgz` exit 0 (bị ignore);
    `git check-ignore -v compatibility/cases/l4/__screenshots__/a.png` exit khác 0 (commit được).
11. `turbo check-types`, `lint`, `build`, `test` đều exit 0 sau mọi sửa đổi ở bước 3. Nếu đổi `exports`
    làm vỡ gì thì phải sửa xong trước khi coi pha này hoàn tất.
12. `compatibility/README.md` có mục "Quyết định cần owner chốt" với đúng 2 quyết định, mỗi quyết định
    có ít nhất 2 lựa chọn kèm đánh đổi, và **không** có lựa chọn nào được đánh dấu là đã chốt.

## Risk Assessment

| Rủi ro | Xác suất | Ảnh hưởng | Giảm thiểu |
| --- | --- | --- | --- |
| Sửa `exports` để hết FalseCJS lại làm vỡ consumer khác | Trung bình | Cao | Tiêu chí 11 (gate) + chạy lại L1 và L2 đầy đủ, đặc biệt `tsc-matrix` 3 `moduleResolution` |
| Bảng tier điền bằng ước lượng thay vì số đo | Trung bình | Trung bình | Tiêu chí 1 buộc ghi ngày + máy đo; số không có ngày là số vô nghĩa |
| Allowlist phình thay vì thu hẹp | Cao theo thời gian | Cao | Tiêu chí 4 làm tiền lệ: sửa xong thì xoá entry. Quy tắc review allowlist khi bump version vào `code-standards.md` |
| Lab dựng xong rồi không ai chạy vì chưa có CI | Cao | Nghiêm trọng | Bước 5, 7 (quy tắc + M4 ghi rõ lệnh); đây là lý do pha này là P1 chứ không phải P3 |
| `docs/codebase-summary.md` không cập nhật, `/plan:hard` sau này không biết lab tồn tại | Trung bình | Cao | Bước 6 + tiêu chí 7; file này được đọc như sự thật và bỏ qua scouting khi mới hơn 3 ngày |
| Sửa `CLAUDE.md` mà quên rằng nó là instruction file luôn nạp | Thấp | Trung bình | `CLAUDE.md` chỉ sửa phần claim sai về subpath; thay đổi instruction file không verify được trong session đang chạy - phải kiểm bằng session mới |

## Security Considerations

- Sửa `packages/tinita/package.json` `exports` là đổi bề mặt công khai. Không thêm condition nào mở
  đường vào `dist` ngoài những gì đã khai - không thêm `"./dist/*"` hay wildcard.
- Không thêm token, registry URL, hay `.npmrc` nào vào `compatibility/`.
- Comment trong `pnpm-workspace.yaml` không được chứa đường dẫn tuyệt đối của máy dev.
- Baseline ảnh commit ở pha 05 phải được xem lại một lần ở pha này: xác nhận không lọt tên người,
  đường dẫn máy, hay dữ liệu thật nào vào ảnh.
- `compatibility/package-lock.json` commit có chủ ý; kiểm nó không chứa URL registry riêng tư.

## Next steps

Hai quyết định trình owner, plan **không** tự chốt:

**QĐ-1: `tinita@0.0.1` và `tinita-react@0.0.2` đã publish với exports gãy.**
Ca 07 của pha 02 sẽ cho số liệu chính xác bản published gãy ở đâu.
- *Bump version và publish bản vá:* người dùng mới nhận bản đúng; bản cũ vẫn gãy trên registry nhưng
  không ai bị buộc dùng. Rẻ nhất. `truncateFileName` vừa đổi breaking nên dù sao cũng phải bump.
- *Thêm `npm deprecate` cho version cũ:* người cài bản cũ thấy cảnh báo. Thêm một bước, không phá gì.
- *Unpublish:* trong cửa sổ 72 giờ thì được, quá thì npm không cho. Đã quá lâu nên loại.
Khuyến nghị nghiêng về bump + deprecate, nhưng owner chốt.

**QĐ-2: có cam kết support TypeScript cũ (`moduleResolution: node`) hay không.**
`attw` báo `node10: Resolution failed` 5/6 subpath; consumer `tsc-matrix` của pha 03 sẽ xác nhận
người dùng TS cũ không compile được.
- *Không support:* đưa vào allowlist kèm lý do, khai `engines`/README rõ là cần
  `moduleResolution: bundler` hoặc `nodenext`. Không phải sửa gì.
- *Support:* thêm `typesVersions` hoặc đổi layout `dist`. Việc thật, và làm phức tạp `package.json`.
Quyết định này ảnh hưởng ca `tsc-matrix` là `expectedFailure` hay là failure thật.

Sau pha này, việc còn lại thuộc M4 (dựng CI) và M1 (bịt rò rỉ CSS) trong `docs/project-roadmap.md`.
Lab không cần thay đổi gì để M4 dùng được - chỉ cần gọi `run.mjs` theo tier.
