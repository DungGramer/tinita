# Pha 02 - V1: package thứ ba `tinita-dom`

## Context links

- Plan cha: [plan.md](./plan.md)
- Dependency: **pha 01** (không bắt buộc về mặt code, nhưng pha này chạy lab nhiều lần nên tier
  nhanh hơn là lợi ích thật)
- Code nguồn đã snapshot: [reports/source-smooth-scroll.ts.txt](./reports/source-smooth-scroll.ts.txt)
  (422 dòng), [source-wheel-source.ts.txt](./reports/source-wheel-source.ts.txt) (168),
  [source-wheel-source.test.ts.txt](./reports/source-wheel-source.test.ts.txt) (112)
- Số đo + bài học đóng gói: [reports/00-verified-context.md](./reports/00-verified-context.md)
  mục "Việc 1" và "Bài học đóng gói - đã trả giá, đừng lặp lại"
- Khuôn: `packages/tinita/package.json`, `packages/tinita/tsup.config.ts`
- Quy tắc: `docs/code-standards.md` mục "Quy Tắc Dependency", "Quy Tắc API: Một Hàm, Một Kiểu Trả Về"

## Overview

- **Date:** 2026-09-25
- **Description:** Port `installSmoothScroll` (422 dòng) và `wheel-source` (168 dòng, zero-dep) từ
  `deepstream-v2/apps/iva-service/web/src/lib/` thành package thứ ba `tinita-dom`, kèm bộ test đã có
  sẵn (112 dòng). Package browser-only, zero runtime dependency.
- **Priority:** P0 - đây là việc owner nêu đầu tiên
- **Implementation status:** Done
- **Review status:** Not reviewed

## Key Insights

1. **`smooth-scroll` import `wheel-source`, nên nó rơi CHÍNH XÁC vào bẫy B2.** Với `bundle: false`,
   esbuild giữ `from './wheel-source'` không đuôi và tsup không viết lại -> Node ESM
   `ERR_MODULE_NOT_FOUND`. Đây đúng là bug đã publish trong `tinita@0.0.1` với cặp
   `truncateFileName`/`getFileNameParts`. `bundle: true` + `outExtension` là bắt buộc từ dòng đầu.
2. **Code browser-only về bản chất, không phải do viết cẩu thả.** Nó chạm `document`,
   `window.matchMedia`, `requestAnimationFrame`, `getComputedStyle`, `WeakMap`. JSDoc của nó nói rõ
   "Call once, outside React - this is a document-level concern with no component to own it, and
   StrictMode's double-invoked effects would otherwise install it twice." Đây là thiết kế có chủ ý.
3. **Quyết định `wheel-source`: public subpath.** Lý do: nó zero-dep, có 11 export trong đó 6 là
   constant đã được đo và tài liệu hoá kỹ (`WHEEL_STEP_MIN_PIXELS = 48`, `WHEEL_REPEAT_SHARE = 0.75`
   ...), và `classifyWheelSource` là một hàm phân loại độc lập dùng được ngoài ngữ cảnh smooth
   scroll. Giữ nội bộ sẽ lặp lại đúng vấn đề `src/utils/cn.ts` của `tinita-react`: tsup build ra
   `dist/` nhưng `exports` không khai nên không import được qua entry chính thức.
   Đánh đổi: bề mặt công khai rộng hơn, mọi đổi constant thành breaking change. Chấp nhận được vì
   chúng là hằng số đã đo, không phải chi tiết cài đặt tạm.
4. **Bộ test đã có sẵn, port chứ đừng viết lại.** `wheel-source.test.ts` 112 dòng. Viết lại từ đầu
   sẽ mất các ca mà tác giả đã nghĩ ra từ hành vi thật của thiết bị.
5. **`installSmoothScroll` chưa có test.** Nó cần DOM thật (listener, rAF, computed style) nên
   `vitest` phải chạy `environment: jsdom` như `tinita-react`, không phải `node` như `tinita`.
6. **Thêm package thứ ba làm 3 file của lab lệch nếu quên.** `paths.mjs` (`PACKAGES`), `pack.mjs`
   (`REQUIRED_DIST`), `contract.json`. Ca `05-contract-drift` đối chiếu hai chiều nên nó sẽ fail -
   đó là thiết kế đúng, nhưng phải sửa trong cùng commit.

## Requirements

- `packages/tinita-dom/` với `package.json`, `tsup.config.ts`, `src/`, `README.md`, `.npmignore`,
  `eslint.config.mjs`, `tsconfig.json`, `vitest.config.ts`.
- `bundle: true` + `outExtension` (cjs -> `.cjs`, esm -> `.mjs`) + `dts: true` + `minify: true`.
- `types` tách theo condition: `import.types` -> `.d.mts`, `require.types` -> `.d.ts`.
- `sideEffects: false` (module không có side effect; `installSmoothScroll` có side effect khi GỌI,
  đó là chuyện khác).
- Zero `dependencies`. Zero `peerDependencies` - nó không cần React.
- 2 subpath: `tinita-dom/smooth-scroll` và `tinita-dom/wheel-source`, cộng barrel `.`.
- `vitest` với `environment: jsdom`; bộ test của `wheel-source` port nguyên và pass.
- Lab biết package thứ ba: `paths.mjs`, `pack.mjs`, `contract.json`.
- **Quyết định SSR phải chốt trước khi viết ca L2**: khai browser-only và ca SSR không import nó.

## Architecture

```
packages/tinita-dom/
├── package.json          <- 3 subpath, types tách condition, sideEffects false, zero deps
├── tsup.config.ts        <- bundle:true + outExtension (B1/B2)
├── tsconfig.json
├── vitest.config.ts      <- environment: jsdom
├── eslint.config.mjs
├── .npmignore
├── README.md             <- nêu RÕ browser-only + cách dùng ngoài React
├── src/
│   ├── index.ts          <- barrel: re-export cả 2
│   ├── smooth-scroll.ts  <- port nguyên, 422 dòng
│   └── wheel-source.ts   <- port nguyên, 168 dòng
└── tests/
    ├── wheel-source.test.ts   <- PORT từ nguồn, 112 dòng
    └── smooth-scroll.test.ts  <- MỚI, jsdom
```

`exports` (khuôn từ `packages/tinita`):

```json
{
  "./smooth-scroll": {
    "import": { "types": "./dist/smooth-scroll.d.mts", "default": "./dist/smooth-scroll.mjs" },
    "require": { "types": "./dist/smooth-scroll.d.ts", "default": "./dist/smooth-scroll.cjs" }
  }
}
```

**Quyết định SSR: khai browser-only, KHÔNG thêm guard.**

Lý do: hàm này cài listener trên `document` - trên server không có gì để cài và gọi nó là lỗi của
người dùng, không phải trường hợp cần đỡ. Thêm guard im lặng sẽ biến một lỗi rõ ràng thành một lỗi
âm thầm ("sao smooth scroll không hoạt động"). Đối chiếu: `autoInjectStyles` của `tinita-react` CÓ
guard, và kết quả là một API không ai gọi và không ai biết nó có hoạt động hay không.

Hệ quả cho lab: ca SSR của L2 (`ssr:node-esm`, `ssr:node-cjs`) **không** import `tinita-dom`.
`contract.json` khối `tinita-dom` mang cờ `browserOnly: true` để ca SSR biết mà bỏ qua, và để người
đọc contract thấy đây là quyết định chứ không phải sơ suất.

## Related code files

| File | Vai trò |
| --- | --- |
| `reports/source-*.ts.txt` | nguồn để port, đã snapshot nên không phụ thuộc repo khác còn nguyên |
| `packages/tinita/package.json` | khuôn `exports`, `sideEffects`, `files`, `scripts` |
| `packages/tinita/tsup.config.ts` | khuôn `bundle:true` + `outExtension` - copy đúng |
| `packages/tinita-react/vitest.config.ts` | khuôn `environment: jsdom` |
| `compatibility/scripts/paths.mjs` | `PACKAGES` thêm `tinita-dom` |
| `compatibility/scripts/pack.mjs` | `REQUIRED_DIST` thêm entry |
| `compatibility/contract.json` | khối `tinita-dom` + cờ `browserOnly` |
| `compatibility/cases/l2/index.mjs` | ca SSR bỏ qua package `browserOnly` |
| `pnpm-workspace.yaml` | `packages/*` đã glob sẵn, không cần sửa - nhưng phải xác minh |

## Implementation Steps

1. Tạo `packages/tinita-dom/` và copy `tsup.config.ts` từ `packages/tinita`, đổi `entry` glob cho
   phù hợp (`src/index.ts` + `src/*.ts`, loại test). **Giữ nguyên `bundle: true` và `outExtension`.**
2. Port `wheel-source.ts` nguyên văn từ snapshot. Không sửa logic, không sửa comment - các comment
   chứa số đo và ngày ("Measured 2026-09-10", `WHEEL_STEP_MIN_PIXELS = 48`) là thông tin phải giữ.
3. Port `smooth-scroll.ts` nguyên văn. Đổi duy nhất: đường dẫn import `./wheel-source` giữ nguyên vì
   cấu trúc thư mục giống.
4. Port `tests/wheel-source.test.ts` từ snapshot, sửa đường dẫn import sang `../src/wheel-source`.
5. `vitest.config.ts` với `environment: jsdom`. Chạy `npx vitest run` và xác nhận bộ test port vào
   **pass hết** - nếu fail thì port sai, không phải test sai.
6. Viết `tests/smooth-scroll.test.ts` mới: `installSmoothScroll()` trả về hàm cleanup, gọi cleanup
   thì listener bị gỡ. Kiểm bằng cách đếm listener hoặc dispatch `wheel` và xem có bị xử lý không.
   Giữ ở mức smoke - test sâu về easing cần rAF thật và thuộc phạm vi khác.
7. `package.json`: 3 subpath (`.`, `./smooth-scroll`, `./wheel-source`), `types` tách condition,
   `sideEffects: false`, `files: ["dist"]`, `main`/`module`/`types`, scripts khớp 2 package kia.
8. `.npmignore` copy từ `packages/tinita`.
9. Cập nhật lab: `paths.mjs` `PACKAGES`, `pack.mjs` `REQUIRED_DIST`, `contract.json` khối
   `tinita-dom` với 3 specifier + `namedExports` + `requiredFiles` + `forbiddenFiles` +
   `browserOnly: true` + `accepted: []`.
10. `cases/l2/index.mjs`: ca SSR đọc cờ `browserOnly` và bỏ qua package đó, in ra lý do chứ không
    im lặng.
11. **Ca chứng minh bẫy B1/B2**: copy `packages/tinita-dom` sang `.work/broken-dom/`, đặt
    `bundle: false` và bỏ `outExtension`, build, pack, chạy L1 trên nó. `publint` phải báo đường dẫn
    `.cjs` không tồn tại; `import()` của `tinita-dom/smooth-scroll` phải `ERR_MODULE_NOT_FOUND` vì
    nó import `wheel-source`. Không có ca này thì không biết cấu hình đúng có thật cần thiết.
12. Chạy gate repo + `run.mjs l1` + `run.mjs l2`.

## Todo list

- [ ] `packages/tinita-dom/` + `tsup.config.ts` (bundle:true, outExtension)
- [ ] Port `wheel-source.ts` nguyên văn, giữ mọi comment có số đo
- [ ] Port `smooth-scroll.ts` nguyên văn
- [ ] Port `tests/wheel-source.test.ts`, chạy pass
- [ ] `vitest.config.ts` environment jsdom
- [ ] `tests/smooth-scroll.test.ts` mới (install/cleanup)
- [ ] `package.json` 3 subpath, types tách condition, sideEffects, zero deps
- [ ] `.npmignore`, `README.md` nêu rõ browser-only
- [ ] Lab: `paths.mjs`, `pack.mjs`, `contract.json` (+ `browserOnly`)
- [ ] `cases/l2/index.mjs` ca SSR bỏ qua `browserOnly`, in lý do
- [ ] Ca chứng minh B1/B2 trên bản gãy có chủ ý
- [ ] Gate repo + l1 + l2

## Success Criteria

1. `pnpm -r list --depth -1` liệt kê `tinita-dom` là workspace member; tổng member từ 6 lên 7.
2. Trong project cô lập install từ tarball, `node_modules` chỉ có `tinita-dom` (xác minh bằng
   `ls node_modules`, đúng 1 entry):
   - `node -e "require('tinita-dom/smooth-scroll')"` EXIT 0
   - `node --input-type=module -e "await import('tinita-dom/smooth-scroll')"` EXIT 0
   - tương tự cho `tinita-dom/wheel-source` và barrel `tinita-dom`
   Sáu lần thực thi, tất cả EXIT 0. Đây là ca bắt B1 và B2.
3. `require('tinita-dom/wheel-source').WHEEL_STEP_MIN_PIXELS === 48` và
   `typeof require('tinita-dom/smooth-scroll').installSmoothScroll === 'function'`.
4. `npx vitest run` trong `packages/tinita-dom` EXIT 0, và số test **bằng hoặc lớn hơn** số test
   trong `wheel-source.test.ts` nguồn (112 dòng) - nếu ít hơn thì đã mất ca khi port.
5. `npx publint` trên tarball `tinita-dom`: **không Errors**. `npx attw --pack`: không
   `Masquerading as CJS` (vì `types` đã tách condition ngay từ đầu).
6. Bản gãy có chủ ý ở bước 11: `publint` báo đúng số đường dẫn `.cjs` không tồn tại, và
   `import('tinita-dom/smooth-scroll')` cho `ERR_MODULE_NOT_FOUND`. **Đây là tiêu chí chứng minh
   `bundle:true` + `outExtension` thật cần thiết**, không phải copy theo quán tính.
7. `node compatibility/run.mjs l1 --no-pack` EXIT 0, và report liệt kê ca cho **cả 3** package. Ca
   `03-smoke-cjs-esm` có số lần thực thi tăng đúng bằng 2 × số specifier mới.
8. Xoá `tinita-dom` khỏi `contract.json` nhưng giữ trong `package.json` `exports`: ca
   `05-contract-drift` EXIT khác 0 và nêu tên specifier thiếu. Thêm lại -> EXIT 0.
9. `node compatibility/run.mjs l2 --no-pack` EXIT 0, và ca SSR in ra lý do bỏ qua `tinita-dom`
   (chuỗi chứa `browserOnly`), **không** im lặng bỏ qua.
10. `packages/tinita-dom/package.json` không có khối `dependencies` lẫn `peerDependencies`.
11. Gate repo `check-types`/`lint`/`build`/`test` đều EXIT 0.
12. `git diff` của file port cho thấy **không dòng comment nào bị mất** so với snapshot - so bằng
    số dòng và bằng grep các chuỗi mốc (`Measured 2026-09-10`, `WHEEL_STEP_MIN_PIXELS`).

## Risk Assessment

| Rủi ro | Xác suất | Ảnh hưởng | Giảm thiểu |
| --- | --- | --- | --- |
| `bundle: false` hoặc thiếu `outExtension` -> lặp lại B1/B2 trên package thứ ba | Trung bình (dễ quên) | **Nghiêm trọng** - publish ra là gãy | Tiêu chí 2 và 6; copy khuôn từ `packages/tinita` chứ đừng viết mới |
| Port làm mất comment chứa số đo và ngày | Trung bình | Cao - thông tin không tái tạo được | Tiêu chí 12; snapshot trong `reports/` để đối chiếu |
| Quên cập nhật 3 file của lab -> `05-contract-drift` đỏ và bị tưởng là lỗi lab | Cao | Trung bình | Bước 9 trong cùng commit; tiêu chí 8 chứng minh drift check hoạt động |
| Quyết định SSR không chốt -> ca SSR của L2 đỏ | Cao nếu bỏ qua | Trung bình | Đã chốt trong Architecture: browser-only, không guard, cờ `browserOnly` |
| Test port vào fail và bị "sửa test cho pass" | Trung bình | Cao | Tiêu chí 4 nói rõ: fail nghĩa là port sai, không phải test sai |
| `wheel-source` public làm mọi đổi constant thành breaking | Trung bình theo thời gian | Trung bình | Chấp nhận có chủ ý, ghi lý do trong `README.md` của package |

## Security Considerations

- Code port vào chạy trên `document` của consumer và gọi `preventDefault` trên `wheel`. Nó **không**
  gửi dữ liệu đi đâu, không đọc input của người dùng, không dùng `eval`. Xác nhận lại sau khi port
  bằng cách grep `fetch`, `XMLHttpRequest`, `eval`, `new Function` - phải ra 0.
- Listener gắn trên `document` ở bubble phase và trả về hàm cleanup. Không cleanup là memory leak ở
  phía consumer - `README.md` phải nêu rõ.
- `WeakMap` giữ animation theo element nên không giữ reference ngăn GC. Giữ nguyên, đừng đổi sang
  `Map`.
- Package zero-dependency nên không có bề mặt supply chain mới.
- Snapshot nguồn trong `reports/*.txt` là code của repo khác; kiểm nó không chứa secret hay đường dẫn
  nội bộ trước khi commit vào repo này.

## Next steps

Pha 03 thêm `typesVersions` cho **cả 3** package, nên nó phải chạy sau pha này. Pha 04 publish cả 3
nên cũng phụ thuộc. `scripts/publish.mjs` và `scripts/update-package-versions.mjs` hardcode 2
package - pha 04 sửa, nhưng nếu pha này muốn publish thử thì phải sửa trước.
