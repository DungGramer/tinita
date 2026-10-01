# Pha 08 - Docs, guard, và cổng publish của owner

## Context links

- Plan cha: [`plan.md`](./plan.md) · Phụ thuộc: **pha 05, 06, 07 xong**
- `compatibility/README.md` - lab và các vấn đề còn treo
- `scripts/publish.mjs` - dừng ở `npm whoami`, **không bypass**
- `CLAUDE.md` - liệt kê package và quy tắc import, phải khớp sau pha này

## Overview

**Ngày:** 2026-10-01 · **Ưu tiên:** P1 · **Trạng thái:** chưa làm · **Review:** chưa

Đóng nhánh: docs khớp số thật, guard canh được những gì vừa thêm, rồi cổng publish
mà **chỉ owner mở được**.

## Key Insights

**Bề mặt API tăng gấp đôi, nên docs sai sẽ sai ở quy mô mới.** Trước nhánh: 34
export công khai (18 + 6 + 10). Sau pha 07: **83** (47 + 20 + 16). `README.md`,
`docs/codebase-summary.md` và `CLAUDE.md` đều liệt kê đường nhập bằng tay.
`CLAUDE.md` đã từng ghi `tinita-react/hooks` và `tinita-react/ui` là đường nhập bắt
buộc trong khi **hai đường đó không tồn tại** - nó chỉ người dùng vào đường chết.
Với 83 subpath, lớp lỗi đó không còn phát hiện bằng mắt.

**Nên guard phải là script, không phải rà soát.** Một script đọc `exports` của ba
`package.json` rồi kiểm mọi đường nhập xuất hiện trong markdown của repo có thật.
Lý do nó thuộc pha này: nó chỉ đáng viết khi số lượng đã lớn, và nó là thứ duy nhất
chặn được lớp lỗi `CLAUDE.md` đã mắc.

**`npm publish` không thu hồi được.** `npm unpublish` chỉ cho phép trong 72 giờ và
chỉ khi không ai phụ thuộc. Một version sai là vĩnh viễn trên registry. Đây là lý
do `scripts/publish.mjs` dừng ở `npm whoami` và tại sao bước đó không bao giờ là
việc của agent.

**Ba vấn đề lab còn treo - nằm NGOÀI phạm vi lần này.** `yarn-classic` network
flake, `yarn-pnp` corepack fail, và tier-2 chưa đo lại sau khi thêm package thứ ba.
Nói rõ ở đây để không để lửng: chúng không chặn publish `0.1.0`, và việc gộp chúng
vào pha này sẽ làm pha này không bao giờ xong.

## Requirements

1. Docs khớp số đo thật, và có script chứng minh điều đó.
2. Mọi export mới có ca L1; `contract.json` không còn entry `accepted` nào che lỗi
   đã vá.
3. `CHANGELOG.md` ghi breaking change của QĐ-E (`generateUUID` đổi tên).
4. `pnpm gate --full` 9/9 PASS trên nhánh sạch.
5. Cổng publish: owner chạy tay, agent không chạy.

## Architecture

### Script mới: `scripts/check-doc-links.mjs`

Đọc `exports` của ba package -> tập specifier hợp lệ. Quét mọi `.md` trong repo
(trừ `plans/`, `node_modules/`) tìm chuỗi khớp `tinita(-dom|-react)?/[\w./-]+`.
Mỗi chuỗi không nằm trong tập -> đỏ, in ra file và dòng.

Thêm vào `pnpm gate` như một bước. Rẻ (chỉ đọc file), nên nó thuộc vòng lặp chứ
không thuộc `--full`.

### Bảng số phải khớp sau pha này

| Số                     | Trước nhánh | Sau pha 07 | Nơi phải khớp                      |
| ---------------------- | ----------: | ---------: | ---------------------------------- |
| `tinita` subpath       |          18 |     **47** | `README.md`, `codebase-summary.md` |
| `tinita-dom` subpath   |           6 |     **20** | `README.md`, `CLAUDE.md`           |
| `tinita-react` subpath |          10 |     **16** | `README.md`, `CLAUDE.md`           |
| Tổng export công khai  |          34 |     **83** | `codebase-summary.md`              |
| Ca L1                  |          25 |    **83+** | `compatibility/README.md`          |
| Test toàn repo         |         156 |   **370+** | `codebase-summary.md`              |

Con số L1 và test là sàn, không phải đích.

### Docs phải sửa

| File                          | Việc                                                                                     |
| ----------------------------- | ---------------------------------------------------------------------------------------- |
| `README.md`                   | bảng export mới; bảng component -> peer giữ nguyên                                       |
| `docs/codebase-summary.md`    | số export, số test, cấu trúc folder mới (`string/`, `mime/`, `print/`, `html/`, `unit/`) |
| `docs/code-standards.md`      | mục "Quy Tắc Đặt Tên" từ pha 04                                                          |
| `docs/system-architecture.md` | `tinita-dom` giờ có `engines`                                                            |
| `docs/project-roadmap.md`     | đóng nợ "66 file chưa chuẩn"                                                             |
| `compatibility/README.md`     | số ca L1 mới, và ba vấn đề còn treo ghi rõ là ngoài phạm vi                              |
| `CLAUDE.md`                   | ba package, đường nhập, quy tắc đặt tên mới, cấm `export default`                        |
| `CHANGELOG.md`                | breaking: `generateUUID`; mới: 49 export                                                 |

### Cổng publish - owner chạy

```
1. pnpm gate --full                 -> 9/9 PASS      (agent chạy được)
2. pnpm publish:dry-run             -> xem tarball   (agent chạy được)
3. npm login                        -> OWNER
4. pnpm publish (3 package @0.1.0)  -> OWNER
5. npm deprecate tinita@0.0.1 ...   -> OWNER
6. chạy lại L1, ca 07 XFAIL -> PASS -> agent chạy được
```

Bước 3-5 không có trong todo list của agent. `scripts/publish.mjs` dừng ở
`npm whoami` và đó là thiết kế, không phải thiếu sót.

### Kiểm tarball trước khi publish

Đo được ở pha 03: `tinita` build **49 entry** nhưng chỉ export 18 - 31 entry không
ai gọi tới được vẫn nằm trong tarball. Sau pha 05 con số export là 47, nên khoảng
cách phải gần 0. Kiểm bằng `npm pack --dry-run` và so số file `.mjs` trong tarball
với số entry trong `exports`.

## Related code files

- `scripts/check-doc-links.mjs` - **mới**
- `scripts/gate.mjs` - thêm bước
- `scripts/publish.mjs`, `scripts/update-package-versions.mjs` - đã biết 3 package
- `compatibility/contract.json` - 83 specifier
- 8 file docs ở bảng trên

## Implementation Steps

1. `scripts/check-doc-links.mjs` + thêm vào `pnpm gate`.
2. Sửa 8 file docs theo bảng số.
3. `CHANGELOG.md` cho `0.1.0`, nêu breaking change của QĐ-E.
4. Rà `contract.json`: mọi entry `accepted` còn lại phải có lý do còn đúng. Entry
   nào ứng với lỗi đã vá thì **đảo `expected`**, không xoá ca.
5. `npm pack --dry-run` ba package, so số file với số export.
6. `pnpm gate --full`.
7. Giao cổng publish cho owner kèm đúng 3 lệnh ở bước 3-5.

## Todo list

- [ ] `scripts/check-doc-links.mjs` + bước trong `pnpm gate`
- [ ] Ca tự phá: thêm `tinita-react/hooks` vào một `.md` -> gate phải đỏ
- [ ] `README.md` bảng export
- [ ] `docs/codebase-summary.md` số + cấu trúc folder
- [ ] `docs/code-standards.md` mục "Quy Tắc Đặt Tên"
- [ ] `docs/system-architecture.md` `engines`
- [ ] `docs/project-roadmap.md` đóng nợ
- [ ] `compatibility/README.md` số ca + ba vấn đề treo
- [ ] `CLAUDE.md` cập nhật
- [ ] `CHANGELOG.md` `0.1.0`
- [ ] Rà `contract.json` `accepted`
- [ ] `npm pack --dry-run` so số file
- [ ] `pnpm gate --full` 9/9
- [ ] **OWNER:** `npm login`, publish, `npm deprecate`

## Success Criteria

1. `pnpm gate` có bước `doc-links` và nó PASS.
2. **Ca tự phá:** thêm dòng `import x from 'tinita-react/hooks'` vào bất kỳ `.md`
   nào ngoài `plans/` -> `pnpm gate` exit khác 0 và in ra file + dòng đó. Gỡ ra,
   xanh lại. Đây đúng là lớp lỗi `CLAUDE.md` đã mắc, nên không chứng minh được bước
   này thì script là trang trí.
3. `grep -c "tinita" README.md` và bảng export trong đó liệt kê đúng **83** subpath,
   khớp `Object.keys(exports).length` của ba `package.json` cộng lại.
4. `compatibility/contract.json` có **83** specifier; ca L1 chạy 83+ ca, 0 fail.
5. `npm pack --dry-run` cho `tinita`: số file `dist/*.mjs` trong tarball **<=** số
   key `exports` + 2 (barrel + chunk dùng chung). Hiện tỉ lệ là 49 file / 18 export.
6. Mọi entry `accepted` trong `contract.json` có trường lý do, và không entry nào
   ứng với một lỗi đã vá. Kiểm bằng mắt, ghi kết luận vào `compatibility/README.md`.
7. `pnpm gate --full` 9/9 PASS, ghi lại thời lượng từng stage.
8. `CHANGELOG.md` nêu `generateUUID` -> `generateUuid` là breaking.
9. Sau khi **owner** publish: trong project cô lập, `npm install tinita@0.1.0
tinita-dom@0.1.0 tinita-react@0.1.0` rồi import mọi specifier - 83/83 exit 0. Ca
   L1 số 07 chuyển XFAIL -> PASS.
10. `npm view tinita@0.0.1` hiện `deprecated`.

## Risk Assessment

| Rủi ro                                                                | Mức     | Chặn bằng                                                      |
| --------------------------------------------------------------------- | ------- | -------------------------------------------------------------- |
| Publish version sai, không thu hồi được                               | **Cao** | `publish:dry-run` + owner xác nhận tay; `unpublish` chỉ có 72h |
| Docs vẫn lệch sau pha này                                             | TB      | tiêu chí 2 là ca tự phá, không phải rà soát bằng mắt           |
| `check-doc-links` false positive trên ví dụ cố ý sai trong docs       | TB      | cho phép `<!-- doc-links-ignore -->` ngay trên khối đó         |
| Tarball phình vì entry không export                                   | TB      | tiêu chí 5                                                     |
| `generateUUID` breaking làm người dùng `0.0.1` gãy khi nâng           | TB      | `0.0.1` bị deprecate cùng lúc; CHANGELOG nêu rõ                |
| Ba vấn đề lab treo bị lẫn vào pha này làm nó không bao giờ xong       | TB      | nói rõ ở Key Insights: **ngoài phạm vi**                       |
| `pnpm gate --full` flake (đã gặp: máy ngủ giữa run, build báo 29577s) | TB      | chạy lại khi thấy thời lượng vô lý, đừng tin lần đầu           |

## Security Considerations

- **`npm publish` là hành động ra ngoài, không hoàn tác.** Nó phát hành code cho mọi
  người. Đây là lý do nó là cổng của owner, và lý do agent không được chạy nó kể cả
  khi mọi test xanh.
- **Kiểm tarball trước khi publish** không chỉ vì kích thước: `npm pack --dry-run`
  là cách duy nhất thấy được mình đang phát hành **đúng những file nào**. Một file
  lạc vào `dist/` sẽ lên registry vĩnh viễn.
- **Repo này là public.** Transcript session trong `~/.claude/projects/` (18MB)
  không được commit. `.gitignore` đã chặn, nhưng pha này thêm nhiều file nên kiểm
  lại `git status` trước commit cuối.
- `npm deprecate` sửa được (deprecate bằng chuỗi rỗng để gỡ), nên nó rủi ro thấp
  hơn `publish` - nhưng vẫn là owner chạy.

## Next steps

Nhánh `feature/z` merge vào `main`. Vùng `incoming/` đã rỗng từ pha 02 nên không
còn gì phải dọn.
