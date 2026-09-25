# Pha 01 - Nền lab + guardrail cô lập

## Context links

- Plan cha: [plan.md](./plan.md)
- Dependency: không có. Đây là pha đầu, mọi pha sau phụ thuộc nó.
- Context đã đo: [reports/00-verified-context.md](./reports/00-verified-context.md) mục
  "Workspace - điều kiện sống còn của lab", mục B3 (symlink vô nghĩa)
- Docs: `docs/system-architecture.md` mục "Chiến Lược Đóng Gói Dependency",
  `docs/code-standards.md` mục "Quy Tắc Dependency" (recipe `npm pack` + cảnh báo symlink)
- Nguồn thiết kế: `ChatGPT-Liệt kê trường hợp test npm-20260925-0951.md` - trục "Isolation"
  (Local -> Monorepo -> Workspace -> npm pack -> Clean project -> Docker -> Real browser)

## Overview

- **Date:** 2026-09-25
- **Description:** Dựng thư mục `compatibility/` ngoài pnpm workspace, cùng 3 thứ tự viết duy nhất
  của lab: script `pack` (build + `npm pack` + manifest), script `assert-isolation` (chống lab mất
  giá trị trong im lặng), và runner `run.mjs` chuẩn hoá exit code + báo cáo JSON. Chưa có ca test
  nội dung nào ở pha này - pha này làm cho mọi pha sau *tin được*.
- **Priority:** P0 - chặn mọi pha khác
- **Implementation status:** Done
- **Review status:** Not reviewed

## Key Insights

1. **Symlink làm test nói dối.** Đã đo: symlink `packages/tinita-react` vào `node_modules` của
   project thử thì `FileTree` load THÀNH CÔNG dù optional peer chưa cài, vì Node resolve ngược lên
   `node_modules` của monorepo qua symlink. Chỉ `npm pack` + `npm install <tarball>` mới lộ
   `Cannot find module 'lucide-react'`. Cô lập không phải tuỳ chọn, nó là điều kiện đúng đắn.
2. **Lab có thể mất giá trị mà không ai biết.** `pnpm-workspace.yaml` hiện glob `packages/*`,
   `apps/*`, `config/*` nên `compatibility/*` tự động ngoài workspace. Nhưng nếu một ngày ai thêm
   `compatibility/*` vào đó, pnpm sẽ link `tinita-react` vào consumer và toàn bộ lab tiếp tục xanh
   trong khi không còn kiểm gì. Đây là chế độ hỏng nguy hiểm nhất của thiết kế này, nên nó phải là
   ca test CHỦ ĐỘNG, chạy trước mọi ca khác.
3. **Cache của máy dev che lỗi.** `~/.npm` có thể đang giữ bản `tinita` cũ từ registry hoặc từ
   tarball lần trước. Mọi `npm install` trong lab phải trỏ `--cache` vào thư mục riêng của lab.
4. **Manifest thay cho glob tarball.** Nhiều pha sau cần biết tarball nào ứng với package nào và
   version nào. Ghi ra `manifest.json` (đường dẫn + version + sha256) một lần, các pha sau đọc, thay
   vì mỗi pha tự đoán tên file `tinita-react-0.0.2-alpha.1.tgz`.
5. **`.gitignore` hiện ignore `*.md`** (`!README.md`, `!docs/*.md` là ngoại lệ duy nhất). Nghĩa là
   `compatibility/README.md` commit được nhưng mọi `.md` khác trong lab thì không. Phải xử lý ở pha
   này vì nó ảnh hưởng tới việc commit baseline và tài liệu ca test.

## Requirements

- `compatibility/` tồn tại trong repo, ngoài pnpm workspace, và **không** có `pnpm-lock.yaml` riêng
  bị workspace nhận.
- Một lệnh duy nhất dựng được artifact: build cả 2 package rồi `npm pack` ra
  `compatibility/.artifacts/`, kèm `manifest.json`.
- Một lệnh duy nhất kiểm cô lập, chạy được độc lập, exit khác 0 khi bất kỳ điều kiện cô lập bị phá.
- Runner nhận tham số level và case, không phụ thuộc cwd, không phụ thuộc biến môi trường của máy
  dev, ghi báo cáo JSON, và trả exit code 0/1 rõ ràng để M4 gọi lại nguyên trạng.
- Mọi `npm install` trong lab dùng cache cô lập trong `compatibility/.npm-cache/`.
- `compatibility/` không được thêm vào `turbo.json` tasks ở pha này (turbo cache + Docker + tarball
  là ba nguồn trạng thái, gộp vào sẽ sinh cache giả). Ghi rõ lý do trong `compatibility/README.md`.

## Architecture

```
compatibility/                       <- NGOÀI pnpm workspace
├── README.md                        <- cách chạy, vì sao không vào turbo, vì sao cấm symlink
├── run.mjs                          <- entry duy nhất: node compatibility/run.mjs <level> [flags]
├── contract.json                    <- danh sách import specifier mà docs CAM KẾT (pha 02 dùng)
├── package.json                     <- private:true, "type":"module", không dependency tinita*
├── scripts/
│   ├── pack.mjs                     <- build + npm pack -> .artifacts/ + manifest.json
│   ├── assert-isolation.mjs         <- 6 assertion cô lập
│   ├── consumer.mjs                 <- helper: dựng project sạch, npm install tarball, trả cwd
│   └── report.mjs                   <- gom kết quả -> .reports/<level>-<timestamp>.json + stdout
├── cases/                           <- pha 02-05 điền
├── docker/                          <- pha 04-05 điền
├── .artifacts/                      <- gitignore
├── .npm-cache/                      <- gitignore
└── .reports/                        <- gitignore
```

Hợp đồng `run.mjs` (cố định từ pha này, mọi pha sau tuân theo):

```
node compatibility/run.mjs <l1|l2|l3|l4|all> [--case=<name>] [--tier=1|2|3] [--json] [--no-pack]
exit 0  = mọi ca pass
exit 1  = có ca fail
exit 2  = lỗi hạ tầng (không build được, Docker không chạy, tarball thiếu)
```

Phân biệt exit 1 và exit 2 là cần thiết: CI xử lý "package sai" khác "runner sai".

`assert-isolation.mjs` kiểm 6 điều:

| # | Assertion | Vì sao |
| --- | --- | --- |
| 1 | `pnpm-workspace.yaml` không có glob nào khớp `compatibility/...` | chế độ hỏng im lặng #1 |
| 2 | Không tồn tại `compatibility/**/node_modules/tinita*` là symlink | B3 |
| 3 | Không `package.json` nào trong `compatibility/` có `workspace:` hoặc `file:` trỏ `packages/` | B3 |
| 4 | Không tồn tại `compatibility/**/pnpm-workspace.yaml` | tránh workspace lồng |
| 5 | Mỗi consumer có `node_modules` thì `tinita*` trong đó phải là thư mục thật, chứa `dist/` | xác minh nội dung, không chỉ tin |
| 6 | `manifest.json` có sha256 khớp tarball trên đĩa | tránh dùng tarball cũ |

Assertion 1 kiểm bằng cách khớp glob thật (dùng `glob` đã có trong devDependencies root), không
grep chuỗi `compatibility` - vì `packages/*` không chứa chuỗi đó mà vẫn có thể bị đổi thành `*/`.

## Related code files

| File | Vai trò |
| --- | --- |
| `pnpm-workspace.yaml` | nguồn của assertion 1. Pha 06 thêm comment cảnh báo, pha này chỉ đọc |
| `.gitignore` | đang `*.md` + `!README.md` + `!docs/*.md`; cần ngoại lệ cho `compatibility/` |
| `packages/tinita/package.json` | `version`, `files: ["dist"]`, `prepublishOnly` - đầu vào của `pack.mjs` |
| `packages/tinita-react/package.json` | như trên; thêm `build:css` nên `pack` phải chạy `build` đầy đủ |
| `packages/tinita-react/scripts/build-css.mjs` | pack phải xác minh 4 chặng CSS chạy xong (Step 1, 1.5, 2, 3, 4) |
| `turbo.json` | 7 task hiện có; pha này KHÔNG thêm task |
| `scripts/publish.mjs` | tham chiếu: lab phải dựng artifact giống đường publish thật |

## Implementation Steps

1. Tạo `compatibility/package.json` với `private: true`, `"type": "module"`, không dependency nào
   tên `tinita*`. Thêm `devDependencies` chỉ những gì lab cần và pha sau dùng lại
   (`publint`, `@arethetypeswrong/cli`) - cài bằng `npm install` trong `compatibility/`, KHÔNG bằng
   pnpm, để không sinh liên kết workspace.
2. Xác minh `compatibility/` thật sự ngoài workspace bằng cách đo, không suy luận:
   `pnpm -r list --depth -1` không được liệt kê member nào ở `compatibility/`.
3. Viết `scripts/pack.mjs`: chạy `pnpm --filter tinita build` và
   `pnpm --filter tinita-react build`, rồi `npm pack --pack-destination <abs>/.artifacts` cho từng
   package. Ghi `manifest.json`: `{ name, version, tarball, sha256, packedAt }`. Fail exit 2 nếu
   build fail hoặc `dist/styles.css` không tồn tại sau khi build `tinita-react`.
4. Viết `scripts/consumer.mjs`: hàm nhận `{ name, deps[], tarballs[], files{} }`, dựng thư mục dưới
   `cases/<name>/.work/`, `npm init -y`, ghi file, rồi
   `npm install --cache <abs>/.npm-cache --no-audit --no-fund <deps> <tarballs>`.
   Luôn xoá `.work/` trước khi dựng (fresh install là mặc định, không phải tuỳ chọn).
5. Viết `scripts/assert-isolation.mjs` với 6 assertion trong bảng Architecture. Mỗi assertion in
   một dòng `PASS`/`FAIL` kèm giá trị thật đo được (đường dẫn, kết quả `lstat`), không chỉ tên
   assertion.
6. Viết `scripts/report.mjs` + `run.mjs` theo hợp đồng exit code ở trên. `run.mjs` luôn chạy
   `assert-isolation` trước, và nếu nó fail thì exit 2 ngay, không chạy ca nào.
7. **Đo chuỗi thật trước khi viết assertion nào so khớp text.** Chạy tay
   `pnpm -r list --depth -1` và `node -e "require.resolve('tinita')"` trong consumer để lấy đúng
   định dạng output/lỗi hiện tại, rồi mới viết so khớp.
8. Sửa `.gitignore`: thêm `!compatibility/**/*.md` sau khối `*.md`, và thêm
   `compatibility/.artifacts/`, `compatibility/.npm-cache/`, `compatibility/.reports/`,
   `compatibility/**/.work/`. Xác minh bằng `git check-ignore -v <đường dẫn>` cho từng mẫu, không
   suy luận. Lưu ý `dist` và `build` đang bị ignore không có dấu `/` nên khớp ở mọi tầng - kiểm xem
   consumer build output có bị ignore ngoài ý muốn hay không (mong muốn: có, để không commit).
9. Viết `compatibility/README.md`: cách chạy, hợp đồng exit code, vì sao cấm symlink (dẫn số đo
   B3), vì sao không vào `turbo.json`, và một câu cấm thêm `compatibility/*` vào
   `pnpm-workspace.yaml`.

## Todo list

- [ ] `compatibility/package.json` (private, type module, không dep `tinita*`)
- [ ] Đo và ghi lại rằng `compatibility/` ngoài workspace (`pnpm -r list --depth -1`)
- [ ] `scripts/pack.mjs` + `manifest.json`
- [ ] `scripts/consumer.mjs` (fresh install, cache cô lập)
- [ ] `scripts/assert-isolation.mjs` (6 assertion)
- [ ] `scripts/report.mjs` + `run.mjs` (exit 0/1/2)
- [ ] Đo chuỗi output thật của các lệnh trước khi viết so khớp
- [ ] `.gitignore` + xác minh bằng `git check-ignore -v`
- [ ] `compatibility/README.md`

## Success Criteria

1. `pnpm -r list --depth -1` in ra đúng 6 workspace member hiện có và **không** dòng nào có đường
   dẫn chứa `compatibility`.
2. `node compatibility/scripts/pack.mjs` exit 0, và sau đó `compatibility/.artifacts/` chứa đúng 2
   file `.tgz` cùng `manifest.json`; `manifest.json` có 2 entry với `name` là `tinita` và
   `tinita-react`, `version` khớp `packages/*/package.json`, và sha256 của mỗi entry khớp
   `shasum -a 256` chạy lại trên file.
3. Giải nén tarball `tinita-react` thì có `dist/styles.css`, `dist/ui/file-tree/index.mjs`,
   `dist/ui/file-tree/index.cjs`; và **không** có `src/`, không có `node_modules/`
   (vì `files: ["dist"]`).
4. `node compatibility/scripts/assert-isolation.mjs` exit 0 trên repo hiện tại, in 6 dòng `PASS`.
5. Thêm tạm dòng `- "compatibility/*"` vào `pnpm-workspace.yaml` rồi chạy lại: exit khác 0, và
   stderr/stdout chứa tên assertion 1 kèm chính glob vừa thêm. Gỡ dòng đó ra thì lại exit 0.
6. Tạo tạm symlink `compatibility/cases/tmp/node_modules/tinita-react` -> `packages/tinita-react`
   rồi chạy lại: exit khác 0, thông báo chứa đường dẫn symlink đó. Xoá thì lại exit 0.
7. `node compatibility/run.mjs l1` khi `.artifacts/` trống thì exit 2 (lỗi hạ tầng), **không** exit 1.
8. Chạy `node compatibility/run.mjs l1` từ 3 cwd khác nhau (repo root, `compatibility/`, `/tmp`)
   cho cùng exit code và cùng danh sách ca - runner không phụ thuộc cwd.
9. `git check-ignore -v compatibility/cases/foo/NOTES.md` exit khác 0 (tức KHÔNG bị ignore), còn
   `git check-ignore -v compatibility/.artifacts/tinita-0.0.1.tgz` exit 0 (bị ignore).
10. `git status --porcelain` sau khi chạy đủ `pack` + `assert-isolation` không hiện file rác nào
    ngoài những thứ được ignore có chủ ý.

## Risk Assessment

| Rủi ro | Xác suất | Ảnh hưởng | Giảm thiểu |
| --- | --- | --- | --- |
| Ai thêm `compatibility/*` vào `pnpm-workspace.yaml`, lab xanh nhưng vô giá trị | Thấp, hậu quả im lặng | Nghiêm trọng | Assertion 1 + comment trong `pnpm-workspace.yaml` (pha 06) + tiêu chí 5 chứng minh nó bắt được |
| `npm install` trong `compatibility/` sinh `package-lock.json` xung đột với pnpm ở root | Trung bình | Thấp | `compatibility/` có `package.json` riêng, pnpm không glob tới; commit `package-lock.json` của lab là có chủ ý, ghi rõ trong README |
| Cache `~/.npm` giữ bản `tinita` cũ từ registry, che lỗi | Cao nếu không xử lý | Nghiêm trọng | `--cache compatibility/.npm-cache` bắt buộc trong `consumer.mjs`; không có đường nào khác để install |
| `pack.mjs` lấy `dist/` cũ vì build cache của turbo | Trung bình | Cao | `pack.mjs` gọi `pnpm --filter <pkg> build` (script package đã có `clean` trước `tsup`), và xác minh mtime của `dist/styles.css` mới hơn lúc bắt đầu chạy |
| `postcss-cli` thiếu trong `node_modules/.bin` khiến `build:css` fail | Thấp tại local, Cao trong container sạch | Cao | `pack.mjs` fail exit 2 với thông báo nêu rõ `build:css` chặng nào gãy; pha 04 xử lý bản container |
| `.gitignore` `*.md` khiến tài liệu ca test không commit được, người sau không hiểu ca | Cao nếu bỏ qua | Trung bình | Bước 8 + tiêu chí 9 |

## Security Considerations

- `pack.mjs` chạy `prepublishOnly` gián tiếp? **Không** - `npm pack` KHÔNG chạy `prepublishOnly`
  (chỉ `prepack`/`postpack`/`prepare`). Xác minh điều này bằng cách đo log, vì nếu `prepare` có
  side effect thì mỗi lần pack sẽ build lại ngoài ý muốn.
- `consumer.mjs` chạy `npm install` với `--ignore-scripts`? **Không dùng** - phải để script chạy vì
  ta đang mô phỏng consumer thật. Đổi lại: chỉ install tarball do chính lab tạo và peer từ registry
  npm chính thức; không install package từ nguồn tuỳ ý.
- `.npm-cache/` và `.artifacts/` gitignore để không lỡ commit tarball (có thể chứa đường dẫn tuyệt
  đối của máy dev trong sourcemap).
- Không hardcode token npm ở đâu trong `compatibility/`. Ca tarball-từ-registry ở pha 02 chỉ đọc
  public registry, không cần auth.
- `assert-isolation.mjs` chỉ đọc và `lstat`, không xoá gì ngoài `.work/` do chính nó quản lý; đường
  dẫn xoá phải được kiểm là nằm trong `compatibility/` trước khi `rm -rf`.

## Next steps

Pha 02 dùng `manifest.json`, `consumer.mjs` và hợp đồng `run.mjs` của pha này để dựng 3 chân L1.
Không pha nào được dựng consumer theo cách riêng - mọi ca đi qua `consumer.mjs`, vì đó là chỗ duy
nhất đảm bảo fresh install + cache cô lập + không symlink.
