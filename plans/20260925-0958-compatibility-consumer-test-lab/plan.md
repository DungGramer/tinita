# Compatibility / Consumer Test Lab

**Ngày:** 2026-09-25 · **Phạm vi:** FULL L0-L4 + Playwright · **Vị trí:** `compatibility/` trong repo
· **CI:** chỉ script local lần này (M4 dựng workflow sau, gọi lại nguyên trạng)

## Vấn đề

Gate hiện tại (`turbo check-types` / `lint` / `build` / `test`) EXIT 0 cả 4, nhưng không lớp nào
kiểm package từ góc nhìn consumer. Hai bug thật đã lọt qua gate đó (B1 exports trỏ file không tồn
tại, B2 import ESM thiếu đuôi), và `tinita@0.0.1` + `tinita-react@0.0.2` đã publish TRƯỚC khi vá.
Thêm 4 khiếm khuyết đang tồn tại ngay lúc này mà không ai thấy (attw FalseCJS 6/6 subpath, thiếu
`sideEffects`, node10 failed 5/6, và `tinita-react/hooks` + `tinita-react/ui` mà CLAUDE.md bắt buộc
dùng thì KHÔNG có trong `exports` lẫn `dist`).

## Nguyên tắc bất di bất dịch

1. Không test package bằng chính monorepo. Mọi ca L1+ qua `npm pack` + install tarball.
   CẤM symlink / `file:` tới thư mục package / `workspace:*` - đã chứng minh symlink làm `FileTree`
   load thành công dù thiếu optional peer.
2. `compatibility/` nằm NGOÀI pnpm workspace, và có ca test CHỦ ĐỘNG xác minh điều đó.
3. `node_modules` của consumer phải được liệt kê và xác minh nội dung, không chỉ tin là đúng.
4. L1 có 3 chân bổ sung nhau: `publint` (bắt B1) + `attw` (type resolution) + smoke runner tự viết
   (chân DUY NHẤT bắt B2 và lỗi optional peer). Static tool là CẦN nhưng KHÔNG ĐỦ.
5. Không dựng máy móc quanh việc tool đã làm. Tự viết đúng 3 thứ: pack/manifest, assert-isolation,
   smoke runner. Còn lại dùng `publint`, `attw`, `vite`, `next`, `playwright` nguyên bản.

## Phân pha - theo mức isolation TĂNG DẦN

| # | Pha | Isolation | Docker | Status | Progress |
| --- | --- | --- | --- | --- | --- |
| 01 | [Nền lab + guardrail cô lập](./phase-01-lab-foundation.md) | tarball + project sạch | không | **Done** | 100% |
| 02 | [L1 Package / Distribution](./phase-02-l1-package-distribution.md) | clean install, Node 24 | không | **Done** | 100% |
| 03 | [L2 Consumer app](./phase-03-l2-consumer-apps.md) | Vite / Next / Node / tsc | không | **Done** | 100% |
| 04 | [L3 Compatibility matrix](./phase-04-l3-compatibility-matrix.md) | Docker, Node 18-24, 4 PM | CÓ | **Done** | 100% |
| 05 | [L4 Real-world: CSS leak, hydration, visual](./phase-05-l4-realworld-browser.md) | Docker + Chromium | CÓ | Not started | 0% |
| 06 | [Tiering, docs, quyết định cho owner](./phase-06-tiering-docs-decisions.md) | - | không | Not started | 0% |

Mỗi pha có giá trị độc lập: xong 01 là đã có guardrail chống mất giá trị lab trong im lặng; xong 02
là đã bắt được bug thật, không phải chờ 05.

**L0 NGOÀI phạm vi lần này.** `tinita` đã có 35 test; `tinita-react` 0 test và việc đó là M3 trong
roadmap. Lab chỉ *gọi lại* `turbo test` như tier-1 gate, không viết test đơn vị mới. Xem pha 06.

## Ranh giới local vs Docker

- **Local chạy được:** L1 toàn bộ, L2 toàn bộ. Máy chỉ có Node 24.18.0 + npm 11.16.0 + pnpm 9.0.0.
- **BUỘC Docker:** mọi ca Node != 24 (matrix 18/20/22), yarn classic, yarn PnP (yarn bị chặn bởi
  `packageManager: pnpm@9.0.0` ở root), bun (chưa cài), Playwright, và mọi baseline ảnh.

## Chi phí ước tính (điền số đo thật ở pha 06)

| Tier | Gồm | Mục tiêu wall-clock | Chạy khi |
| --- | --- | --- | --- |
| 1 | L0 + L1 + L2 (Node 24, npm) | < 4 phút | mỗi commit / PR |
| 2 | L3 cells đã chọn | < 20 phút | trước publish |
| 3 | L4 + yarn PnP + bun + Node 18 | < 45 phút | nightly / pre-release |

## Docs phải cập nhật (pha 06, không phải việc phụ)

`docs/project-roadmap.md` (đóng phần "kiểm tự động" còn thiếu của M2) ·
`docs/code-standards.md` (quy tắc mới: mọi export mới phải có ca L1) ·
`docs/codebase-summary.md` (thư mục `compatibility/`) ·
`pnpm-workspace.yaml` (comment: KHÔNG được thêm `compatibility/*`) ·
`.gitignore` (hiện `*.md` bị ignore -> README và baseline của lab sẽ không commit được)

## Tài liệu nguồn

`./reports/00-verified-context.md` (số liệu đo thật - nguồn ưu tiên cao nhất) ·
`./research/researcher-01-packaging-tooling.md` · `./research/researcher-02-consumer-css-ssr.md`
(hữu ích về pattern, nhưng chuỗi lỗi trong đó KHÔNG được dùng làm acceptance criteria) ·
`docs/system-architecture.md` · `docs/code-standards.md` · `docs/project-roadmap.md`
