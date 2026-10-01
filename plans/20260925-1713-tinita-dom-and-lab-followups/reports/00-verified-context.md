# Context đã kiểm chứng - đầu vào cho plan (2026-09-25)

Số đo thật trên repo, không suy luận. Planner dùng luôn.

## Quyết định owner đã chốt (KHÔNG hỏi lại)

| # | Quyết định |
|---|---|
| Plan | Tạo plan MỚI (plan lab cũ đã Done 6/6, giữ làm hồ sơ) |
| QĐ-1 | **Bump + publish bản vá + `npm deprecate` bản cũ.** Đề nghị `tinita@0.1.0`, `tinita-react@0.1.0` |
| QĐ-2 | **SUPPORT TS cũ - thêm `typesVersions`** (owner chọn khác khuyến nghị của tôi; tôn trọng) |
| Tier 2 | Áp **cả 4** cách cắt, gồm cả #2 (mount `node_modules`) là cách rủi ro nhất |

**`npm publish` và `npm deprecate` là hành động RA NGOÀI, không hoàn tác được.** Plan phải tách
chúng thành cổng riêng cần owner xác nhận lúc chạy, không được để script tự chạy.

## Việc 1: port `installSmoothScroll` sang `tinita-dom`

Nguồn (đã snapshot vào `reports/source-*.txt` của plan này):

| File | Dòng | Phụ thuộc |
|---|---|---|
| `smooth-scroll.ts` | 422 | CHỈ `./wheel-source` |
| `wheel-source.ts` | 168 | **zero import** - không phụ thuộc gì |
| `wheel-source.test.ts` | 112 | **đã có sẵn**, port kèm |

Đường dẫn gốc:
`/Users/dungnc10/Documents/CODE/deepstream-v2/deepstream/apps/iva-service/web/src/lib/`

`main.tsx:11` import `{ installSmoothScroll } from './lib/smooth-scroll'`, gọi ở dòng 31.
`installSmoothScroll` KHÔNG định nghĩa trong `main.tsx` - đừng tìm ở đó.

Export của `wheel-source.ts` (11): `WHEEL_SAMPLE_COUNT`, `WHEEL_CONTINUOUS_GAP_MS`,
`WHEEL_STEP_MIN_PIXELS`, `WHEEL_REPEAT_SHARE`, `WHEEL_REPEAT_MIN_PIXELS`, `WHEEL_GESTURE_IDLE_MS`,
`type WheelSource`, `interface WheelSample`, `classifyWheelSource`, `decisiveWheelSource`,
`provisionalWheelSource`.

`smooth-scroll.ts` export duy nhất: `installSmoothScroll(): () => void`.

**Đặc tính quan trọng:** code chạm `document`, `window.matchMedia`, `requestAnimationFrame`,
`getComputedStyle`, `WeakMap`. Nó **browser-only về bản chất**. JSDoc của nó nói rõ "Call once,
outside React". Nên:
- `tinita-dom` cần `vitest` với `environment: jsdom` (như `tinita-react`), không phải `node`.
- Ca SSR của L2 trong lab sẽ bắt nếu import nó ở môi trường không có `document` mà không guard.
  Plan phải quyết: có SSR guard hay khai rõ là browser-only và ca L2 bỏ qua nó.

`tinita-dom` **chưa tồn tại**. `packages/` hiện chỉ có `tinita`, `tinita-react`.

## Bài học đóng gói - đã trả giá, đừng lặp lại

Package mới PHẢI có ngay từ đầu, nếu không sẽ lặp đúng 2 bug đã publish:

1. **`outExtension`** trong `tsup.config.ts`: `cjs -> .cjs`, `esm -> .mjs`. Thiếu nó thì tsup emit
   `.js` trong khi `exports.require` khai `.cjs` -> mọi `require()` gãy. Đây là bug B1, đã publish.
2. **`bundle: true`**. Với `bundle: false`, esbuild giữ specifier tương đối KHÔNG đuôi
   (`from './wheel-source'`) và tsup không viết lại -> Node ESM `ERR_MODULE_NOT_FOUND`. Bug B2.
   `smooth-scroll` import `wheel-source` nên nó rơi CHÍNH XÁC vào bẫy này.
3. **`types` tách theo condition**: `import.types -> .d.mts`, `require.types -> .d.ts`.
   Không tách thì `attw` báo `FalseCJS` trên mọi subpath.
4. **`sideEffects: false`** nếu package không có side effect. Lưu ý: `installSmoothScroll` CÓ side
   effect khi GỌI, nhưng module thì không - `sideEffects: false` vẫn đúng.
5. `.npmignore` + `files: ["dist"]`.

## Lab phải cập nhật khi thêm package thứ ba

Nếu bỏ qua, lab sẽ không kiểm `tinita-dom` và ca 05 sẽ fail:

| File | Sửa gì |
|---|---|
| `compatibility/scripts/paths.mjs` | `PACKAGES` thêm `tinita-dom` |
| `compatibility/scripts/pack.mjs` | `REQUIRED_DIST` thêm entry cho `tinita-dom` |
| `compatibility/contract.json` | thêm khối `tinita-dom`: `specifiers`, `namedExports`, `requiredFiles`, `forbiddenFiles`, `accepted` |
| `compatibility/cases/l2/index.mjs` | ca SSR: quyết định `tinita-dom` có nằm trong đó không |
| `docs/codebase-summary.md`, `README.md`, `docs/code-standards.md` | bảng package, bảng component->dependency |

Quy tắc đã ghi trong `docs/code-standards.md`: **export mới phải có ca L1**. Ca
`05-contract-drift` đối chiếu HAI CHIỀU nên thêm export mà quên contract sẽ fail, và ngược lại.

## Việc 2: tối ưu tier 2 - số đo thật

Đo 2026-09-25, macOS 15 Apple Silicon, Docker 29.7.2, Node 24.18.0:

| Tier | Mục tiêu | Đo thật |
|---|---|---|
| 1 (L1+L2 local) | < 4 phút | **174s** (L1 21s + L2 153s) |
| 2 (+ L3 cell tier<=2) | < 20 phút | **2284s = 38 phút** |
| 3 (toàn bộ + L4) | < 45 phút | 5504s = 92 phút; L4 riêng 329s |

Chi phí KHÔNG ở ca test mà ở hạ tầng: mỗi cell `docker build` riêng + `npm install` lại trong
container. 4 cell × (build + install + ca).

Bốn cách cắt owner đã chọn ÁP HẾT:

1. **Chia sẻ layer Docker** - một base image chung, chỉ đổi PM ở layer cuối. Rủi ro thấp nhất,
   lợi nhất.
2. **Mount `node_modules` của lab vào container** - nhanh nhất, **rủi ro nhất**. Nó đụng đúng thứ
   `assert-isolation` tồn tại để chặn. **BẮT BUỘC** có assertion mới chứng minh mount KHÔNG chứa
   `tinita*`, và ca chứng minh kiểu "cố tình để `tinita-react` vào mount thì phải bị bắt".
3. **Hạ `node20-npm` xuống tier 3** - `node22-npm` đã trả lời câu hỏi LTS.
4. **Chuyển ca Next của L2 xuống tier 2** - `next build` × 3 biến thể là phần chậm nhất của L2.
   Đổi lại: ca `'use client'` không còn chạy mỗi PR. Plan phải nêu đánh đổi này rõ.

Mục tiêu kiểm được: tier 2 **dưới 20 phút** đo lại trên cùng máy, và tier 1 dưới 1 phút sau cắt #4.

## Việc 3: QĐ-1 - hai bản đã publish gãy

Đo bằng cách tải tarball thật từ registry rồi đối chiếu từng đường dẫn:

```
tinita@0.0.1                6/18 đường dẫn trỏ file KHÔNG có trong tarball
                            tarball có 0 file .cjs, 5 file .js
tinita-react@0.0.2-alpha.1  7/25 tương tự
```

Ca `07-registry-vs-local` của L1 tự động phát hiện lại điều này.

Có sẵn: `scripts/update-package-versions.mjs` (nhận version arg, ghi `version` cho 2 package -
**sẽ cần sửa để biết `tinita-dom`**), và `scripts/publish.mjs` (hardcode PACKAGES 2 phần tử,
`npm whoami`, `npm view` cảnh báo version trùng, build, `npm publish --dry-run`, hỏi xác nhận,
rồi `npm publish`). **Cả hai script phải biết package thứ ba.**

`truncateFileName` đã đổi breaking (bỏ cờ `output`, tách thành 2 hàm) nên bump là bắt buộc.

## Việc 4: QĐ-2 - support TS cũ bằng `typesVersions`

Hiện trạng đo được: `moduleResolution: node` fail **10 import** (ca `tsc:node` của L2);
`bundler` và `nodenext` sạch. `attw` báo `node10: Resolution failed` 5/6 subpath.

Owner chọn **SUPPORT**. Hệ quả plan phải xử:
- Thêm `typesVersions` vào `package.json` của cả 3 package.
- `typesVersions` phải **đồng bộ với `exports`** mỗi lần thêm subpath. Đây là nguồn lệch mới -
  plan nên thêm ca L1 kiểm đồng bộ hai chiều giữa `typesVersions` và `exports`, giống ca 05.
- Sau khi sửa: ca `tsc:node` phải chuyển từ `expectedFailure` sang PASS thật, và entry
  `NoResolution` phải bị **XOÁ** khỏi `contract.json` `accepted` (quy trình: sửa xong thì thu hẹp
  allowlist, không để nó phình).
- `attw` `node10` phải hết báo.

## Ba vấn đề lab còn treo (ghi trong `compatibility/README.md`)

1. ~~`pack.mjs` xoá `.artifacts` đang có người đọc~~ **ĐÃ SỬA** (staging + `renameSync`).
2. `node22-yarn-classic:build` fail do Docker Hub timeout. Runner nên phân loại build-fail do mạng
   thành hạ tầng (exit 2) thay vì fail package.
3. `node22-yarn-pnp:build` fail ở `corepack prepare yarn@4.5.0`. **Chưa xử.** Đây là cell đáng giá
   nhất của matrix (bắt phantom dependency mà npm/pnpm hoist qua) nên đáng làm cho chạy được.

Plan nên quyết #2 và #3 nằm trong hay ngoài phạm vi lần này.

## Trạng thái hiện tại
Branch `docs/verified-rewrite-and-arch-constraints`, HEAD `be2281a`, đã push.
Gate repo `check-types`/`lint`/`build`/`test` đều EXIT 0. Lab `l1` và `l2` đều EXIT 0.

---

# Đo thêm 2026-09-25: cách cắt #2 có khả thi không

Tôi nghi mount `node_modules` của host (macOS arm64) vào container Linux là bất khả thi vì native
binary. **Đo lại thì KHÔNG phải vậy** - nhưng có điều kiện.

`compatibility/node_modules`: 61 gói, 3 devDependency (`publint`, `@arethetypeswrong/cli`,
`playwright`).

| Kiểm | Kết quả |
|---|---|
| `*.node`, `*.dylib`, `*.so` | **0 file** |
| Gói platform-specific (`@esbuild/darwin-arm64`, `@rollup/rollup-darwin-*`) | **không có** |
| File thực thi không phải JS | 15, và `file` cho thấy **tất cả** là shell script hoặc `#!/usr/bin/env node` |
| Field `cpu`/`os` trong `package-lock.json` | **không có** |

=> Bộ dependency này **platform-independent**, mount được vào container Linux.

**Nhưng nó mong manh, và plan phải xử:**
- Nếu sau này ai thêm dependency có native binary (esbuild, swc, sharp, better-sqlite3...) thì mount
  sẽ gãy **âm thầm** hoặc tệ hơn là chạy sai.
- `playwright` browser KHÔNG nằm trong `node_modules`, nó ở `~/Library/Caches/ms-playwright` và là
  build cho macOS. Container không dùng được. Không sao: ca browser của L2 đã skip sạch khi chromium
  không launch được (đã kiểm: container báo `13 ca, 0 fail, 5 skip`).

**Vậy cách cắt #2 cần HAI guardrail, không phải một:**
1. Assertion mount KHÔNG chứa `tinita*` (owner và tôi đã nêu) - nếu lọt thì lab xanh giả.
2. **Assertion mount platform-independent**: quét `*.node`/`*.dylib`/`*.so` và field `cpu`/`os`
   trong lockfile, fail nếu có. Nếu thiếu assertion này thì lần thêm dependency sau sẽ làm matrix
   sai mà không ai biết vì sao.

Mỗi assertion phải có ca TỰ PHÁ chứng minh nó bắt được (đặt `tinita-react` vào mount; thêm một file
`.node` giả vào `node_modules`).

**Lưu ý cho planner:** researcher đang kiểm xem chi phí thật nằm ở `docker build` hay ở
`npm install` trong container. Nếu ở `npm install`, thì cách cắt lớn nhất có thể KHÔNG phải mount mà
là chuyển `npm ci` vào Dockerfile (được cache theo layer, chỉ chạy lại khi lockfile đổi) - rẻ hơn và
không đụng gì tới cô lập. Plan nên đọc báo cáo researcher trước khi chốt thứ tự áp 4 cách cắt.

---

# Đối chiếu: researcher nói mount BẤT KHẢ THI, tôi đo được là KHẢ THI

Cả hai không mâu thuẫn, chúng nói về hai phạm vi khác nhau. Planner phải đọc mục này trước khi chốt.

| | Kết luận | Phạm vi |
|---|---|---|
| researcher-02 Q1 | mount **bất khả thi**, binary darwin-arm64 gãy trên linux/arm64; liệt kê `esbuild`, `playwright`, `bcrypt`, `sqlite3` | **Trường hợp tổng quát.** Đúng như một nguyên tắc. Nhưng `bcrypt` và `sqlite3` KHÔNG có trong lab, và `esbuild` cũng không |
| Tôi đo trực tiếp | **khả thi** cho bộ dep hiện tại: 61 gói, 0 file `.node`/`.dylib`/`.so`, 0 gói platform-specific, 0 field `cpu`/`os` | **Bộ dependency cụ thể hôm nay**: `publint`, `@arethetypeswrong/cli`, `playwright` |

Kết luận đúng: mount chạy được **hôm nay**, và sẽ gãy im lặng vào ngày ai thêm một dependency có
native binary. Đó chính là lý do assertion platform-independence là bắt buộc nếu áp cách cắt #2.

## Nhưng phát hiện Q4 làm cách cắt #2 gần như KHÔNG CẦN THIẾT

researcher-02 Q2 và Q4 (khớp với giả thuyết của tôi trong mục trước):

- Chi phí thật **không** ở `docker build` mà ở **`npm install` chạy lúc runtime** trong `entry.sh`,
  ~570s mỗi cell.
- Base image khác nhau (`node:24-slim` vs `node:22-slim`) nên **không chia sẻ layer được** - cách
  cắt #1 như owner hình dung sẽ không cho lợi ích như mong đợi.
- **Cách cắt lớn nhất là chuyển `npm install` từ `entry.sh` vào Dockerfile** (`COPY package.json
  package-lock.json` rồi `RUN npm ci`). Nó được cache theo layer, chỉ chạy lại khi lockfile đổi.
  Ước ~250s/cell -> tổng ~16 phút. **Đạt mục tiêu dưới 20 phút mà không đụng gì tới cô lập.**
- BuildKit cache mount hỗ trợ được: `RUN --mount=type=cache,id=tinita-npm,target=/root/.npm npm ci`.

## Đề nghị cho planner về thứ tự áp 4 cách cắt

Owner đã chốt áp cả 4. Nhưng thứ tự và điều kiện nên là:

1. **`npm ci` vào Dockerfile + BuildKit cache mount** (đây thực chất là cách cắt mạnh nhất, không
   nằm trong 4 cách ban đầu vì lúc viết README tôi chưa biết chi phí nằm ở đâu). Đo lại.
2. **Cắt #3** (hạ `node20-npm` xuống tier 3) - rẻ, không rủi ro.
3. **Cắt #4** (chuyển ca Next của L2 xuống tier 2) - rẻ, đánh đổi đã biết: ca `'use client'` không
   còn chạy mỗi PR.
4. **Đo lại tier 2.** Nếu đã dưới 20 phút thì **DỪNG** - không áp cắt #2.
5. Chỉ áp **cắt #2** (mount `node_modules`) nếu vẫn chưa đạt, và khi đó bắt buộc 2 assertion +
   2 ca tự phá.

Lý do đề nghị dừng sớm: cắt #2 là cách duy nhất trong 4 cách đụng vào chính thứ `assert-isolation`
tồn tại để bảo vệ. Nếu 3 cách kia đã đạt mục tiêu thì nhận thêm rủi ro đó không đổi lại gì.
Plan nên nêu điều này cho owner, vì owner đã chọn cả 4 khi chưa có số đo phân tách chi phí.
