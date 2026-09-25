# Pha 02 - L1 Package / Distribution

## Context links

- Plan cha: [plan.md](./plan.md)
- Dependency: **pha 01** (cần `manifest.json`, `consumer.mjs`, hợp đồng exit code của `run.mjs`)
- Context đã đo: [reports/00-verified-context.md](./reports/00-verified-context.md) mục B1, B2, B4
  và mục "Thực nghiệm tool L1" (bảng phân vai publint / attw / thực thi thật)
- Research: [researcher-01-packaging-tooling.md](./research/researcher-01-packaging-tooling.md)
- Docs: `docs/system-architecture.md` mục "Chiến Lược Đóng Gói Dependency";
  `docs/code-standards.md` mục "Quy Tắc Dependency" (recipe `npm pack`)

## Overview

- **Date:** 2026-09-25
- **Description:** Tầng bắt lỗi "works in repo, broken after npm publish". Ba chân bổ sung nhau trên
  tarball đã install vào project sạch: `publint` (manifest đối chiếu file), `attw` (type
  resolution), và smoke runner tự viết thực thi `require()` + `import()` từng subpath. Kèm ma trận
  optional peer và ca đối chiếu tarball từ registry thật.
- **Priority:** P0 - đây là pha có tỷ lệ bắt bug trên công sức cao nhất của toàn plan
- **Implementation status:** Done
- **Review status:** Not reviewed

## Key Insights

1. **Static tool là CẦN nhưng KHÔNG ĐỦ - đã đo, không phải phỏng đoán.** Dựng lại B1 (bỏ
   `outExtension`) và B2 (`bundle: false`) rồi chạy tool:

   | Bug | publint | attw | thực thi `require`/`import` |
   | --- | --- | --- | --- |
   | B1 exports trỏ file không tồn tại | **bắt, chính xác cả 7 đường dẫn** | không nhắm | bắt |
   | B2 import ESM thiếu đuôi | **KHÔNG bắt** | **KHÔNG bắt** | **DUY NHẤT bắt được** |

   Nếu pha này chỉ dùng publint + attw thì B2 sẽ tái diễn và không ai biết.

2. **Cùng một bug lộ ở chiều khác nhau tuỳ subpath.** `tinita/file/fileSize` (không có internal
   import) chạy được ESM nhưng gãy CJS. `tinita/file/truncateFileName` gãy CẢ HAI. Nên không được
   lấy mẫu một subpath rồi suy ra cả package - phải phủ **từng** subpath × **hai** chiều.

3. **Có 4 khiếm khuyết đang tồn tại ngay lúc này** mà gate hiện tại (4 task EXIT 0) không thấy.
   Pha này sẽ phát hiện chúng ngay lần chạy đầu, nên phải quyết trước là xử lý thế nào, kẻo lab vừa
   dựng xong đã đỏ và bị bỏ:
   - `attw` báo `FalseCJS` trên **6/6** subpath của `tinita`: `exports[x].types` trỏ `.d.ts` trong
     khi `import` trỏ `.mjs`; tsup CÓ emit `.d.mts` nhưng `exports` không dùng.
   - `tinita` thiếu `sideEffects` trong khi tree-shaking là mục tiêu được nêu của nó
     (`tinita-react` thì có, cho CSS).
   - `attw` báo `node10: Resolution failed` trên **5/6** subpath - TS cũ không resolve subpath exports.
   - `tinita-react/hooks` và `tinita-react/ui` được `CLAUDE.md` mô tả là đường nhập **bắt buộc**,
     nhưng **không có** trong `exports` lẫn `dist`. Tức tài liệu đang chỉ người dùng vào đường không
     tồn tại.

4. **`contract.json` là nguồn sự thật của ca test, không phải `exports`.** Nếu sinh danh sách ca từ
   `package.json.exports` thì khi ai xoá một export, ca test cũng biến mất theo và test vẫn xanh.
   Danh sách phải được khai độc lập, đối chiếu **hai chiều** với `exports`: thiếu là fail, thừa là fail.

5. **Optional peer chỉ kiểm được bằng cách thực thi.** Không có tool chuyên dụng. npm không cảnh báo
   khi optional peer vắng - đã đo. Nên ca test phải chạy thật trong hai trạng thái: chưa cài peer và
   đã cài peer.

## Requirements

- Mọi ca chạy trên project được dựng bởi `consumer.mjs` của pha 01, install từ tarball trong
  `manifest.json`. Không ca nào đọc `packages/*/dist` trực tiếp.
- `publint` chạy cho cả 2 package, mức severity fail được khai rõ trong `contract.json` (phân biệt
  `error` phải fail và `suggestion` chỉ báo).
- `attw` chạy cho cả 2 package; danh sách vấn đề được **chấp nhận tạm** phải khai tường minh trong
  `contract.json` kèm lý do và ngày, không im lặng bỏ qua.
- Smoke runner phủ **từng** specifier trong `contract.json` × **hai** chiều (`require`, `import`).
- Ma trận optional peer: 2 trạng thái (vắng / có) × 5 đường nhập của `tinita-react`.
- Một ca đối chiếu tarball từ **registry thật** với tarball local, để biết bản đã publish có gãy không.
- Toàn bộ pha chạy **local, Node 24, npm** - không cần Docker.

## Architecture

```
compatibility/
├── contract.json          <- đường nhập CAM KẾT + allowlist vấn đề attw/publint đang chấp nhận
└── cases/
    └── l1/
        ├── 01-publint.mjs            <- publint trên 2 tarball
        ├── 02-attw.mjs               <- attw trên 2 tarball, đối chiếu allowlist
        ├── 03-smoke-cjs-esm.mjs      <- từng specifier × require + import
        ├── 04-optional-peer.mjs      <- ma trận vắng/có peer
        ├── 05-contract-drift.mjs     <- contract.json <-> exports, hai chiều
        ├── 06-artifact-shape.mjs     <- nội dung tarball: có dist, không src/node_modules
        └── 07-registry-vs-local.mjs  <- tarball registry vs tarball local
```

`contract.json` hình dạng:

```json
{
  "tinita": {
    "specifiers": [".", "./file/fileSize", "./file/getFileNameParts",
                   "./file/truncateFileName", "./file/truncateFileNameParts", "./uuid/generateUUID"],
    "namedExports": { "./file/truncateFileName": ["truncateFileName"] },
    "accepted": [
      { "tool": "attw", "problem": "FalseCJS", "scope": "all", "since": "2026-09-25",
        "reason": "exports.types trỏ .d.ts trong khi import trỏ .mjs; sửa ở pha 06" }
    ]
  },
  "tinita-react": { "specifiers": ["...", "./ui/file-tree"], "optionalPeers": { "./ui/file-tree": ["@radix-ui/react-accordion", "lucide-react"] } }
}
```

Ma trận optional peer (ca 04):

| Đường nhập | peer VẮNG | peer CÓ |
| --- | --- | --- |
| `tinita-react/ui/ping` | load được | load được |
| `tinita-react/ui/carousel-ticker` | load được | load được |
| `tinita-react/hooks/useToggle` | load được | load được |
| `tinita-react/utils/autoInjectStyles` | load được | load được |
| `tinita-react/ui/file-tree` | **fail, nêu tên module thiếu** | load được |

## Related code files

| File | Vai trò |
| --- | --- |
| `packages/tinita/package.json` | 6 subpath × 3 condition + `main`/`module`/`types`; thiếu `sideEffects` và `type` |
| `packages/tinita-react/package.json` | 9 subpath + 3 CSS; `peerDependenciesMeta` optional cho 2 lib |
| `packages/tinita/tsup.config.ts` | `bundle: true` + `outExtension` - hai thứ đã vá B1/B2, ca 03 chứng minh chúng cần thiết |
| `packages/tinita-react/tsup.config.ts` | `external` 4 lib; `clsx`/`tailwind-merge` bị inline |
| `CLAUDE.md` | nguồn của claim `tinita-react/hooks` + `/ui` bắt buộc - claim này SAI, ca 05 sẽ bắt |
| `compatibility/scripts/consumer.mjs` | cổng duy nhất dựng project (pha 01) |

## Implementation Steps

1. Viết `contract.json`. Danh sách specifier **khai tay** từ tài liệu, không sinh từ `exports`.
   Gồm cả 2 specifier đang được `CLAUDE.md` cam kết mà thực tế không có (`tinita-react/hooks`,
   `tinita-react/ui`) - đánh dấu `"documentedButMissing": true` để ca 05 báo đúng bản chất: đây là
   lệch giữa tài liệu và code, cần quyết ở pha 06 là thêm export hay sửa tài liệu.
2. Ca 01 `publint`: chạy trên từng tarball. Fail khi có `Errors`. `Warnings`/`Suggestions` in ra
   nhưng không fail, TRỪ những mục đã khai trong `accepted` thì im lặng.
3. Ca 02 `attw`: chạy `--pack` trên từng tarball, parse kết quả, đối chiếu `accepted`. Vấn đề mới
   ngoài allowlist thì fail. **Mục `FalseCJS` hiện có trên 6/6 subpath phải vào allowlist kèm lý do
   và ngày**, nếu không lab đỏ ngay ngày đầu.
4. Ca 03 smoke: với mỗi specifier, chạy hai process con riêng biệt:
   `node -e "require('<spec>')"` và `node --input-type=module -e "await import('<spec>')"`.
   Chạy process con riêng cho từng specifier, không gộp, để một lỗi không che các specifier sau.
   Với specifier có `namedExports`, kiểm export tồn tại và **không** `undefined`.
5. Ca 04 optional peer: dựng 2 consumer riêng cho `tinita-react` - một chỉ `react` + tarball, một
   thêm 2 peer. Chạy ma trận ở bảng trên. **Đo chuỗi lỗi thật trước khi viết assertion**: chuỗi đã
   xác nhận dùng được là `Cannot find module 'lucide-react'`. Assertion viết dạng "exit khác 0 VÀ
   stderr chứa `lucide-react`", không so khớp cả câu.
6. Ca 05 contract drift: đối chiếu `contract.json` với `exports` **hai chiều**. Specifier trong
   contract mà không có trong exports -> fail (trừ `documentedButMissing`, chỉ cảnh báo). Specifier
   trong exports mà không có trong contract -> fail (bắt trường hợp thêm export mà quên thêm ca).
7. Ca 06 artifact shape: giải nén tarball, xác nhận có `dist/`, và **không** có `src/`,
   `node_modules/`, `tsconfig.json`, `*.test.*`. Với `tinita-react` thêm: `dist/styles.css`,
   `dist/styles/globals.css`, `dist/styles/animations.css`, `dist/ui/*/index.{mjs,cjs}`.
8. Ca 07 registry vs local: `npm pack tinita@0.0.1 --pack-destination <cache>` (tải bản đã publish)
   rồi chạy ca 01+03 trên nó. **Kỳ vọng: nó FAIL** vì publish trước khi vá B1/B2. Ca này ghi kết quả
   vào report như một *finding*, không làm đỏ toàn bộ run - đánh dấu `expectedFailure: true` kèm lý
   do, và pha 06 dùng kết quả này để owner quyết bump/deprecate. Cần mạng; khi offline thì skip với
   exit 0 và ghi `skipped: no-network`, không fail.
9. **Ca chứng minh lab thật sự bắt được** (bắt buộc, theo pattern tiêu chí 5-6 của pha 01): dựng
   bản gãy có chủ ý trong `.work/broken/` bằng cách copy `packages/tinita`, bỏ `outExtension` (B1)
   và đặt `bundle: false` (B2), build, pack, rồi chạy ca 01 và 03 trên nó. Ca 01 phải fail với đúng
   7 đường dẫn; ca 03 phải fail với `ERR_MODULE_NOT_FOUND`. Nếu chúng PASS thì lab đang nói dối.

## Todo list

- [ ] `contract.json` khai tay + allowlist `accepted` cho attw FalseCJS
- [ ] Ca 01 publint (2 package)
- [ ] Ca 02 attw + đối chiếu allowlist
- [ ] Ca 03 smoke `require` + `import` từng specifier, process con riêng
- [ ] Ca 04 ma trận optional peer (2 trạng thái × 5 đường nhập)
- [ ] Đo chuỗi lỗi thật trước khi viết assertion text
- [ ] Ca 05 contract drift hai chiều
- [ ] Ca 06 artifact shape
- [ ] Ca 07 registry vs local (skip sạch khi offline)
- [ ] Ca chứng minh: bản gãy có chủ ý phải bị bắt
- [ ] Ghi 4 khiếm khuyết đang tồn tại vào report dạng finding, gán pha xử lý

## Success Criteria

1. `node compatibility/run.mjs l1` exit 0 trên repo hiện tại, và report JSON liệt kê đúng 7 ca đã
   chạy, không ca nào `skipped` ngoài ca 07 khi offline.
2. Ca 03 chạy đúng **2 × số specifier** process con. Với `tinita` (6 specifier) và `tinita-react`
   (9 specifier) là 30 lần thực thi. Report ghi rõ từng cặp `(specifier, chiều, exit)`.
3. Trong consumer chỉ có `react` và `tinita-react` (xác minh bằng cách liệt kê `node_modules`, đúng
   2 entry): `node -e "require('tinita-react/ui/ping')"` exit 0;
   `node -e "require('tinita-react/ui/file-tree')"` exit khác 0 và stderr chứa `lucide-react`.
4. Sau `npm install @radix-ui/react-accordion lucide-react` trong cùng consumer đó:
   `node -e "require('tinita-react/ui/file-tree')"` exit 0. Assertion **không** dùng
   `typeof === 'function'` - component bị bọc nên `typeof` là `'object'`.
5. Bản gãy có chủ ý ở bước 9: ca 01 exit khác 0 và output chứa đúng 7 dòng dạng
   `... but the file does not exist`; ca 03 exit khác 0 và output chứa `ERR_MODULE_NOT_FOUND`.
   Đây là tiêu chí chứng minh lab không nói dối - thiếu nó thì mọi tiêu chí khác vô nghĩa.
6. Thêm một subpath mới vào `packages/tinita/package.json` mà không thêm vào `contract.json`:
   ca 05 exit khác 0 và nêu tên subpath đó. Gỡ ra thì lại exit 0.
7. Xoá một entry khỏi `contract.json`: ca 05 exit khác 0 (không được im lặng pass vì ít ca hơn).
8. Ca 06: giải nén `tinita-react` tarball có `dist/styles.css` và **không** có `src/`. Với `tinita`
   tarball: không có `tests/`.
9. Ca 07 trên `tinita@0.0.1` từ registry: exit khác 0 hoặc được đánh dấu `expectedFailure`, và
   report nêu rõ đường dẫn nào gãy - đây là đầu vào cho quyết định của owner ở pha 06.
10. Report JSON có mục `findings` liệt kê đủ 4 khiếm khuyết đang tồn tại (attw FalseCJS 6/6,
    `tinita` thiếu `sideEffects`, node10 failed 5/6, `hooks`+`ui` documented-but-missing), mỗi mục
    kèm pha được gán để xử lý.

## Risk Assessment

| Rủi ro | Xác suất | Ảnh hưởng | Giảm thiểu |
| --- | --- | --- | --- |
| Lab đỏ ngay ngày đầu vì 4 khiếm khuyết sẵn có, rồi bị bỏ không dùng | Cao nếu không xử lý | Nghiêm trọng | `accepted` allowlist tường minh kèm lý do + ngày; `findings` tách khỏi `failures` |
| Allowlist thành thùng rác, vấn đề thật bị chôn trong đó | Trung bình theo thời gian | Cao | Mỗi entry bắt buộc có `since` và `reason`; pha 06 thêm quy tắc review allowlist khi bump version |
| Sinh ca từ `exports` thay vì `contract.json`, xoá export là mất ca | Trung bình | Cao | Ca 05 đối chiếu hai chiều; tiêu chí 7 chứng minh |
| Ca 07 cần mạng, làm run không tái lập | Cao | Trung bình | Skip sạch khi offline, exit 0, ghi `skipped: no-network`; ca 07 chỉ thuộc tier 2 |
| `attw` và `publint` đổi format output giữa các version, parse vỡ | Trung bình | Trung bình | Pin version chính xác trong `compatibility/package.json`; ca 02 fail exit 2 (hạ tầng) nếu parse thất bại, không exit 1 |
| Gộp nhiều specifier vào một process, lỗi đầu che phần sau | Trung bình | Cao | Bước 4 bắt buộc process con riêng từng specifier |

## Security Considerations

- Ca 07 tải package từ registry public. Chỉ tải đúng `tinita` và `tinita-react` theo tên và version
  khai trong `contract.json`, không chạy code từ tarball đó ngoài `require`/`import` trong process
  con có timeout.
- Không dùng `--ignore-scripts` (đang mô phỏng consumer thật) nên tarball có thể chạy script cài.
  Đổi lại: chỉ install tarball do lab tạo hoặc do registry chính thức trả về.
- Không hardcode token. Ca 07 chỉ đọc public registry.
- Bản gãy có chủ ý ở bước 9 phải nằm trong `.work/broken/` (gitignore) và **không** được `npm publish`
  bằng bất kỳ đường nào; `compatibility/package.json` đặt `private: true` để chặn.
- Process con của ca 03 phải có timeout, tránh treo run nếu module có top-level await không kết thúc.

## Next steps

Pha 03 dùng cùng `contract.json` nhưng đổi môi trường: thay vì `node -e` thì là Vite, Next, và `tsc`
thật. Pha 03 KHÔNG lặp lại ca L1 - nó giả định L1 đã xanh và chuyển sang lớp lỗi mà chỉ bundler và
framework mới thấy.
