# Compatibility / Consumer Test Lab

Kiểm 2 package (`tinita`, `tinita-react`) **từ góc nhìn người dùng npm**, không từ trong monorepo.

## Vì sao lab này tồn tại

Gate của repo (`turbo check-types` / `lint` / `build` / `test`) xanh cả 4 nhưng không lớp nào kiểm
package sau khi publish. Hai bug đã lọt qua gate đó:

- **B1** - `exports` khai `require: "./dist/x.cjs"` nhưng tsup emit `dist/x.js`. 6/18 đường dẫn của
  `tinita` trỏ file không tồn tại. Mọi `require()` gãy.
- **B2** - `bundle: false` khiến `.mjs` giữ import tương đối không đuôi (`from "./getFileNameParts"`).
  Node ESM báo `ERR_MODULE_NOT_FOUND`.

Cả hai **vô hình** khi test trong repo, và cả hai đã được publish lên npm.

## Quy tắc cô lập - đọc trước khi sửa gì

**Không test package bằng chính monorepo.** Workspace/hoisting/symlink sẽ cứu package bị lỗi.

Đã đo ngày 2026-09-25: symlink `packages/tinita-react` vào `node_modules` của project thử làm
`FileTree` load **thành công** dù optional peer chưa cài, vì Node resolve ngược lên `node_modules`
của monorepo qua symlink. Chỉ `npm pack` + `npm install <tarball>` mới lộ
`Cannot find module 'lucide-react'`.

Hệ quả:

1. Mọi ca L1 trở lên đi qua `npm pack` + install tarball. **Cấm** symlink, **cấm** `file:` tới thư
   mục package, **cấm** `workspace:*`.
2. **KHÔNG được thêm `compatibility/*` vào `pnpm-workspace.yaml`.** Làm vậy thì pnpm link
   `tinita-react` vào consumer và toàn bộ lab tiếp tục xanh trong khi không còn kiểm gì. Đây là chế
   độ hỏng nguy hiểm nhất của thiết kế này - `assert-isolation` chặn nó.
3. Mọi consumer dựng qua `scripts/consumer.mjs`. Đó là chỗ duy nhất đảm bảo fresh install + cache
   cô lập + không symlink.

## Chạy

```bash
node compatibility/run.mjs <l1|l2|l3|l4|all> [--case=<name>] [--tier=1|2|3] [--json] [--no-pack]
```

| Exit | Nghĩa |
| --- | --- |
| 0 | mọi ca pass |
| 1 | có ca fail - **package sai** |
| 2 | lỗi hạ tầng - **runner/môi trường sai** (không build được, Docker không chạy, thiếu tarball) |

Phân biệt 1 và 2 là cố ý: CI xử lý "package sai" khác "runner sai".

`run.mjs` luôn chạy `assert-isolation` trước. Nếu nó fail thì exit 2 ngay, không chạy ca nào - kết
quả của một lab không còn cô lập là vô nghĩa.

Lệnh lẻ:

```bash
node compatibility/scripts/pack.mjs             # build + npm pack -> .artifacts/ + manifest.json
node compatibility/scripts/assert-isolation.mjs # 6 assertion cô lập
```

## Vì sao không nằm trong `turbo.json`

Turbo cache + Docker + tarball là ba nguồn trạng thái. Gộp lab vào turbo sẽ sinh cache giả: turbo
thấy input không đổi và skip, trong khi tarball hoặc image đã khác. Lab tự quản trạng thái qua
`manifest.json` với sha256.

## Vì sao dùng `npm` chứ không `pnpm` trong lab

`compatibility/` cố ý ngoài workspace nên `pnpm install` ở đây không có ý nghĩa workspace. Dùng
`npm` cũng đúng hơn với consumer phổ biến nhất. `compatibility/package-lock.json` được commit có
chủ ý.

## Thư mục

| Đường dẫn | Commit? | Vai trò |
| --- | --- | --- |
| `run.mjs`, `scripts/`, `cases/`, `docker/` | có | code lab |
| `contract.json` | có | đường nhập được CAM KẾT (nguồn sự thật của ca, **không** sinh từ `exports`) |
| `cases/l4/__screenshots__/` | **có** | baseline ảnh - chỉ sinh trong container |
| `.artifacts/`, `.npm-cache/`, `.reports/`, `**/.work/` | không | sản phẩm phụ |

## Tầng test

| Level | Kiểm gì | Docker |
| --- | --- | --- |
| L1 | package artifact: `exports`, ESM/CJS, optional peer | không |
| L2 | consumer thật: Vite, Next, Node, `tsc` | không |
| L3 | ecosystem: Node 18-24 × npm/pnpm/yarn/bun | có |
| L4 | production: CSS leak, hydration, visual regression | có |

L1 có **3 chân bổ sung nhau**, đã thực nghiệm để chốt:

| Bug | `publint` | `attw` | smoke runner |
| --- | --- | --- | --- |
| B1 exports trỏ file không tồn tại | bắt, đúng 7 đường dẫn | không nhắm | bắt |
| B2 import ESM thiếu đuôi | **không bắt** | **không bắt** | **duy nhất bắt được** |

Static tool là **cần nhưng không đủ**.

## Ngân sách thời gian

Điền bằng số đo thật ở pha 06 của plan, kèm ngày và máy đo. Số không có ngày là số vô nghĩa.

| Tier | Gồm | Mục tiêu | Đo thật |
| --- | --- | --- | --- |
| 1 | `turbo test` + L1 + L2 | < 4 phút | chưa đo |
| 2 | Tier 1 + L3 (cell tier 2) | < 20 phút | chưa đo |
| 3 | Tier 2 + L3 tier 3 + L4 | < 45 phút | chưa đo |

## Kế hoạch

`plans/20260925-0958-compatibility-consumer-test-lab/` - `plan.md` và 6 file phase.
