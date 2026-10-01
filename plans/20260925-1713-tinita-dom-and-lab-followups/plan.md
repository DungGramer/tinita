# tinita-dom + dứt điểm 4 việc còn treo

**Ngày:** 2026-09-25 · **Base:** `be2281a` trên `docs/verified-rewrite-and-arch-constraints`
· Gate repo 4/4 EXIT 0, lab `l1`/`l2` EXIT 0

## Bốn việc owner đã chốt

| | Việc | Quyết định |
| --- | --- | --- |
| V1 | Port `installSmoothScroll` thành package thứ ba `tinita-dom` | subpath `tinita-dom/smooth-scroll` |
| V2 | Tier 2 từ **38 phút** xuống dưới 20 | áp 4 cách cắt, #2 có điều kiện |
| V3 | QĐ-1 hai bản publish gãy | bump + publish bản vá + `npm deprecate` |
| V4 | QĐ-2 support TS cũ | thêm `typesVersions` cho cả 3 package |

## Ba điều số đo nói, khác với dự đoán ban đầu

1. **Chi phí tier 2 ở `npm install` runtime (~570s/cell), KHÔNG ở `docker build`.** Cách cắt mạnh
   nhất là chuyển `npm ci` vào Dockerfile để cache theo layer - ước ~16 phút, **đạt mục tiêu mà
   không đụng tới cô lập**. Cách cắt #1 (chia sẻ layer) cho rất ít vì base image khác nhau.
2. **Cách cắt #2 (mount `node_modules`) có thể không cần.** Owner chọn cả 4 khi chưa có số đo phân
   tách chi phí. Nó là cách DUY NHẤT đụng vào chính thứ `assert-isolation` bảo vệ. Plan đặt nó thành
   bước có điều kiện: đo lại sau 3 cách kia, đạt thì DỪNG.
3. **`typesVersions` chỉ sửa type resolution, không đụng runtime.** Runtime đã chạy vì Node dùng
   `exports`. Với `node16`/`nodenext`/`bundler`, TS ưu tiên `exports` và bỏ qua `typesVersions` nên
   thêm nó an toàn với consumer mới.

## Phân pha - theo phụ thuộc

| # | Pha | Phụ thuộc | Status | Progress |
| --- | --- | --- | --- | --- |
| 01 | [V2 tối ưu tier 2](./phase-01-tier2-optimization.md) | không | **Done** - 2284s -> 509s | 100% |
| 02 | [V1 package `tinita-dom`](./phase-02-tinita-dom-package.md) | 01 | **Done** | 100% |
| 03 | [V4 `typesVersions` cho 3 package](./phase-03-typesversions.md) | 02 | **Done** | 100% |
| 04 | [V3 bump + publish + deprecate](./phase-04-publish-and-deprecate.md) | **03** | **Chuẩn bị xong, chờ owner** - cần `npm login` + xác nhận | 80% |
| 05 | [Docs + 2 vấn đề lab còn treo](./phase-05-docs-and-lab-debt.md) | 01-04 | **Done** | 100% |

Pha 01 đi trước vì nó rút ngắn mọi lần chạy lab sau đó. Pha 04 **phải** sau 03: publish bản chưa có
`typesVersions` là publish sai và không thu hồi được.

## Nguyên tắc giữ nguyên từ lab

- Mọi ca L1+ đi qua `npm pack` + install tarball. Cấm symlink, cấm `file:` tới `packages/`, cấm
  `workspace:*`. Lý do đã đo: symlink làm Node resolve ngược lên monorepo và test pass giả.
- `compatibility/` nằm ngoài pnpm workspace. `assert-isolation` chạy trước mọi ca, fail thì exit 2.
- **Mọi guardrail phải có ca tự phá chứng minh nó bắt được.** Đây là chuẩn xuyên suốt: thêm
  `compatibility/*` vào workspace phải bị bắt, symlink phải bị bắt, bản gãy có chủ ý phải làm L1 đỏ.
- Sửa xong khiếm khuyết thì **xoá** entry khỏi `contract.json` `accepted`. Allowlist thu hẹp, không phình.
- Export mới phải có ca L1 (`docs/code-standards.md`). Ca `05-contract-drift` đối chiếu hai chiều.

## Hai bẫy V1 phải tránh - đều là bug đã publish

`tinita-dom/smooth-scroll` import `wheel-source`, nên nó rơi **chính xác** vào:

- **B2** nếu `bundle: false`: `.mjs` giữ specifier không đuôi -> `ERR_MODULE_NOT_FOUND`.
- **B1** nếu thiếu `outExtension`: tsup emit `.js` trong khi `exports.require` khai `.cjs`.

Khuôn để copy: `packages/tinita/package.json` và `packages/tinita/tsup.config.ts` đã đúng cả hai.

## Hành động không hoàn tác

`npm publish` và `npm deprecate` ở pha 04 là **cổng riêng cần owner xác nhận lúc chạy**. Không script
nào được tự chạy chúng.

## Số đo mục tiêu

| Tier | Trước | Mục tiêu | **Đo lại 2026-09-26** |
| --- | --- | --- | --- |
| 1 (L1+L2 local) | 174s | dưới 60s | **63s** - sát trần, đạt về thực chất |
| 2 (+ L3 tier<=2) | 2284s = 38 phút | dưới 1200s | **509s = 8.5 phút** |

**Tiền đề của plan SAI và đã được sửa.** Plan (và báo cáo nghiên cứu) nói chi phí ở `npm install`.
Đo phân tách: `docker build` 2s, `npm install` **5s**, còn `cp -r /lab` trong container **195s** vì
nó copy 87.815 file (~3GB) qua bind mount - gần hết là `.work` của consumer (`cases/` = 2.7G) và
`node_modules` của lab. Loại chúng khỏi copy: một cell từ 501s xuống 36s. Cách cắt #2 (mount
`node_modules`) do đó **không áp** - nó tiết kiệm tối đa 3% mà đổi lại rủi ro mất cô lập.

Đo lại trên cùng máy (macOS 15, Apple Silicon, Docker 29.7.2, Node 24.18.0) để so được.

## Tài liệu nguồn

`./reports/00-verified-context.md` (234 dòng, ưu tiên cao nhất) ·
`./reports/source-{smooth-scroll,wheel-source,wheel-source.test}.ts.txt` ·
`./research/researcher-01-typesversions.md` · `./research/researcher-02-docker-speed.md` ·
`compatibility/README.md` · `docs/code-standards.md` · `docs/project-roadmap.md`
