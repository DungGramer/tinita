# Pha 04 - V3 (QĐ-1): bump + publish bản vá + deprecate bản cũ

## Context links

- Plan cha: [plan.md](./plan.md)
- Dependency: **pha 03 BẮT BUỘC** (publish phải publish bản đã có `typesVersions`), và **pha 02**
  (publish cả 3 package)
- Số đo: [reports/00-verified-context.md](./reports/00-verified-context.md) mục "Việc 3"
- Ca phát hiện: `compatibility/cases/l1/index.mjs` ca `07-registry-vs-local`
- Script hiện có: `scripts/publish.mjs`, `scripts/update-package-versions.mjs`

## Overview

- **Date:** 2026-09-25
- **Description:** Hai bản đang live trên npm có `exports` trỏ file không tồn tại trong tarball, nên
  mọi `require()` từ npm đang lỗi. Owner chốt: bump + publish bản vá + `npm deprecate` bản cũ. Pha
  này chuẩn bị mọi thứ để publish, và **để hành động publish thành cổng riêng cần owner xác nhận**.
- **Priority:** P1 - người dùng đang gặp lỗi, nhưng phải sau pha 03 để không phải bump hai lần
- **Implementation status:** Chuẩn bị xong; publish và deprecate chờ owner (hành động ra ngoài, không hoàn tác)
- **Review status:** Not reviewed

## Key Insights

1. **Mức độ đã đo chính xác, không phải phỏng đoán.** Tải tarball thật từ registry rồi đối chiếu
   từng đường dẫn: `tinita@0.0.1` gãy **6/18**, `tinita-react@0.0.2-alpha.1` gãy **7/25**. Tarball
   `tinita@0.0.1` có **0 file `.cjs`** và 5 file `.js`, trong khi `main` và mọi `exports.require`
   trỏ `.cjs`.
2. **`npm publish` và `npm deprecate` ra ngoài và không hoàn tác.** `unpublish` chỉ được trong 72
   giờ và đã quá từ lâu. Nên publish sai version là vĩnh viễn. Đây là lý do pha này tách bước chuẩn
   bị khỏi bước thực thi, và bước thực thi cần owner xác nhận từng package.
3. **Bump là bắt buộc dù không có bug này.** `truncateFileName` đã đổi breaking (bỏ cờ `output`,
   tách thành 2 hàm), và pha 03 thêm `typesVersions`. Version đề nghị: `tinita@0.1.0`,
   `tinita-react@0.1.0`, `tinita-dom@0.1.0`. Minor bump ở pre-1.0 là quy ước báo breaking.
4. **Hai script hardcode 2 package.** `scripts/publish.mjs` có `PACKAGES` 2 phần tử;
   `scripts/update-package-versions.mjs` ghi version cho đúng 2 file. Cả hai phải biết
   `tinita-dom`, nếu không package thứ ba sẽ bị bỏ quên đúng lúc publish.
5. **Lab đã có cửa chặn sẵn.** Ca `07-registry-vs-local` tự động tải bản đã publish và đối chiếu.
   Sau khi publish bản vá, ca này phải chuyển từ `XFAIL` sang PASS - đó là bằng chứng bản vá đúng,
   không phải lời khẳng định.
6. **`publish.mjs` đã có phần lớn cửa chặn cần thiết**: `npm whoami`, `npm view` cảnh báo version
   trùng, build trước khi pack, `npm publish --dry-run`, rồi hỏi xác nhận. Việc cần thêm là gắn L1
   vào trước khi cho publish.

## Requirements

- `scripts/update-package-versions.mjs` biết cả 3 package.
- `scripts/publish.mjs` biết cả 3 package, và **chạy L1 trên tarball trước khi cho publish**, fail
  thì dừng.
- Version bump: 3 package lên `0.1.0` (hoặc số owner chọn lúc chạy).
- Bước `npm publish` và `npm deprecate` là **cổng riêng**, không script nào tự chạy.
- Có một lệnh `--dry-run` chạy hết mọi bước trừ publish thật, để owner xem trước.
- Sau publish: ca `07-registry-vs-local` phải PASS.
- Nội dung `npm deprecate` phải nêu rõ vấn đề và version nên dùng.

## Architecture

Luồng, tách rõ chuẩn bị và thực thi:

```
CHUẨN BỊ (script chạy được, không ra ngoài)
  1. update-package-versions.mjs 0.1.0        -> ghi version cho 3 package
  2. run.mjs l1                               -> phải EXIT 0
  3. publish.mjs --all --dry-run              -> npm publish --dry-run cho 3 package
  4. in ra bảng: package, version cũ, version mới, số file trong tarball

CỔNG - owner xác nhận, từng package một
  5. publish.mjs tinita                       -> hỏi "Publish tinita@0.1.0? (yes/no)"
  6. publish.mjs tinita-react
  7. publish.mjs tinita-dom

SAU PUBLISH (script chạy được)
  8. run.mjs l1                               -> ca 07 phải chuyển XFAIL -> PASS
  9. in lệnh deprecate ĐỀ XUẤT, KHÔNG tự chạy

CỔNG - owner tự chạy deprecate
  npm deprecate tinita@0.0.1 "<thông điệp>"
  npm deprecate tinita-react@0.0.2-alpha.1 "<thông điệp>"
```

Thông điệp deprecate đề nghị (nêu vấn đề + đường ra, không chỉ "deprecated"):

```
Broken CJS: exports.require and main point at .cjs files absent from the tarball,
so require() fails. Fixed in 0.1.0.
```

`publish.mjs` thêm cửa chặn L1: sau `npm pack`, chạy
`node compatibility/run.mjs l1 --no-pack` trên tarball vừa tạo. EXIT khác 0 -> dừng, không hỏi
xác nhận. Lý do: bản gãy lần trước qua được vì không có gì kiểm tarball trước khi publish.

## Related code files

| File                                  | Sửa gì                                                          |
| ------------------------------------- | --------------------------------------------------------------- |
| `scripts/update-package-versions.mjs` | biết 3 package; hiện hardcode 2                                 |
| `scripts/publish.mjs`                 | biết 3 package; thêm cửa chặn L1 trước khi hỏi xác nhận         |
| `packages/*/package.json`             | `version` lên `0.1.0`                                           |
| `compatibility/cases/l1/index.mjs`    | ca `07` sau publish phải PASS, không đổi code - chỉ đổi kết quả |
| `compatibility/README.md`             | mục QĐ-1: ghi đã thực hiện, kèm version và ngày                 |
| `docs/project-roadmap.md`             | đóng QĐ-1                                                       |

## Implementation Steps

1. Sửa `scripts/update-package-versions.mjs`: đọc danh sách package từ `pnpm-workspace.yaml` hoặc từ
   `packages/*/package.json` thay vì hardcode - để package thứ tư sau này không phải sửa lại.
2. Sửa `scripts/publish.mjs` tương tự, và thêm bước chạy `node compatibility/run.mjs l1 --no-pack`
   sau khi build + pack. EXIT khác 0 -> in lỗi và `process.exit(1)`, **không** hỏi xác nhận.
3. Chạy `node scripts/update-package-versions.mjs 0.1.0`. Xác minh 3 file `package.json` đổi đúng.
4. Chạy gate repo + `run.mjs l1` + `run.mjs l2`. Phải xanh trước khi đi tiếp.
5. Chạy `pnpm publish:dry-run`. Đọc output: số file trong mỗi tarball, và xác nhận không có `src/`.
6. **DỪNG. Trình owner bảng tóm tắt** và chờ xác nhận. Bảng gồm: 3 package, version cũ -> mới, số
   file tarball, kết quả L1, và nhắc rằng publish không hoàn tác được.
7. (Sau khi owner đồng ý) publish từng package một, không dùng `--all` lần đầu, để nếu package đầu
   có vấn đề thì 2 package sau chưa bị publish.
8. Chạy lại `run.mjs l1`. Ca `07-registry-vs-local` phải PASS. Nếu vẫn XFAIL thì bản vừa publish
   **vẫn gãy** - dừng lại và điều tra, đừng publish tiếp.
9. In ra 2 lệnh `npm deprecate` với thông điệp đã soạn. **Không tự chạy.** Owner chạy.
10. Cập nhật `compatibility/README.md` mục QĐ-1: đổi từ "cần owner chốt" sang "đã thực hiện", kèm
    version và ngày. Đóng QĐ-1 trong `docs/project-roadmap.md`.

## Todo list

- [ ] `update-package-versions.mjs` đọc danh sách package động
- [ ] `publish.mjs` đọc động + cửa chặn L1 trước khi hỏi xác nhận
- [ ] Bump 3 package lên `0.1.0`
- [ ] Gate + l1 + l2 xanh
- [ ] `publish:dry-run`, đọc số file tarball
- [ ] **DỪNG - trình owner bảng tóm tắt, chờ xác nhận**
- [ ] (Sau xác nhận) publish từng package một
- [ ] `run.mjs l1` - ca 07 phải PASS
- [ ] In lệnh deprecate, KHÔNG tự chạy
- [ ] Cập nhật README lab + đóng QĐ-1 trong roadmap

## Success Criteria

1. `node scripts/update-package-versions.mjs 0.1.0` đổi `version` trong **3** file
   `packages/*/package.json`. Thêm một package thứ tư giả vào `packages/` rồi chạy lại: nó cũng được
   đổi - chứng minh script đọc động, không hardcode.
2. `pnpm publish:dry-run` EXIT 0 và in ra 3 package. Output không có `src/` trong danh sách file của
   tarball nào.
3. **Cửa chặn L1 hoạt động:** cố tình làm `tinita` gãy (bỏ `outExtension`, build), rồi chạy
   `publish.mjs tinita`. Nó phải EXIT khác 0 **trước khi** hiện câu hỏi xác nhận, và thông báo nêu L1
   fail. Phục hồi thì `publish.mjs` lại tới được bước hỏi.
4. Trước bước publish, owner nhận một bảng có: 3 package, version cũ -> mới, số file tarball, kết quả
   L1, và câu nhắc publish không hoàn tác được.
5. Sau publish: `node compatibility/run.mjs l1 --no-pack`, ca `07-registry-vs-local` báo
   `tinita@0.1.0: 0/N gãy` và **không** còn cờ `expectedFailure`. Trước đó nó báo `tinita@0.0.1: 6/18 gãy`.
6. Trong project sạch ngoài repo: `npm install tinita@0.1.0` rồi
   `node -e "require('tinita/file/fileSize')"` EXIT 0. Đây là kiểm cuối từ góc nhìn người dùng thật,
   trên registry thật, không phải trên tarball local.
7. `npm view tinita@0.0.1 deprecated` trả về chuỗi chứa `require()` và `0.1.0` (sau khi owner chạy
   deprecate).
8. `compatibility/README.md` mục QĐ-1 ghi "đã thực hiện" kèm version và ngày, không còn ở dạng câu hỏi.
9. `docs/project-roadmap.md` đánh dấu QĐ-1 đóng.
10. Gate repo 4/4 EXIT 0 sau khi bump version.

## Risk Assessment

| Rủi ro                                                                   | Xác suất                         | Ảnh hưởng        | Giảm thiểu                                                           |
| ------------------------------------------------------------------------ | -------------------------------- | ---------------- | -------------------------------------------------------------------- |
| Publish version sai, không thu hồi được                                  | Thấp nhưng vĩnh viễn             | **Nghiêm trọng** | Bước 6 dừng chờ owner; publish từng package một; `--dry-run` trước   |
| Publish bản vẫn gãy (lặp lại đúng sự cố)                                 | Trung bình nếu không có cửa chặn | **Nghiêm trọng** | Cửa chặn L1 trong `publish.mjs` + tiêu chí 3 chứng minh nó chặn được |
| Publish trước pha 03 -> bản mới thiếu `typesVersions`, phải bump lần nữa | Trung bình                       | Cao              | Phụ thuộc pha 03 ghi rõ trong Context links và plan.md               |
| Script bỏ quên `tinita-dom`                                              | Cao nếu giữ hardcode             | Cao              | Đọc động + tiêu chí 1 kiểm bằng package thứ tư giả                   |
| `npm deprecate` với thông điệp vô ích ("deprecated")                     | Trung bình                       | Thấp             | Thông điệp đã soạn sẵn nêu vấn đề + đường ra                         |
| Owner không có quyền publish / chưa `npm login`                          | Trung bình                       | Thấp             | `publish.mjs` đã có `npm whoami` chặn sẵn                            |

## Security Considerations

- `npm publish` cần credential. Không đặt token vào repo, không vào `compatibility/`, không vào
  Dockerfile. `publish.mjs` dựa vào `npm whoami` của máy owner.
- `publish.mjs` chạy `--no-provenance` khi không có biến `CI` - giữ nguyên hành vi đó, đừng bật
  provenance ngẫu nhiên vì nó cần cấu hình OIDC.
- Tarball có thể chứa đường dẫn tuyệt đối của máy dev trong sourcemap. Kiểm `dist/` không có
  `.map` trước khi publish, hoặc xác nhận sourcemap không nhúng đường dẫn nhà.
- `npm deprecate` là thay đổi metadata công khai vĩnh viễn. Soạn thông điệp xong đọc lại trước khi
  chạy - nó sẽ hiện với mọi người cài package.
- Không publish package thứ ba nếu tên `tinita-dom` đã có chủ trên npm: kiểm `npm view tinita-dom`
  trước bước 5, và nếu đã có chủ thì dừng lại hỏi owner về tên khác.

## Next steps

Pha 05 cập nhật docs cho cả 4 việc và xử 2 vấn đề lab còn treo. Sau pha 05, QĐ-1 và QĐ-2 đều đóng,
`docs/project-roadmap.md` chỉ còn M1 (bịt rò rỉ CSS), M3 (test cho `tinita-react`) và M4 (CI).
