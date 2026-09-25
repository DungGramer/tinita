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

| Exit | Nghĩa                                                                                        |
| ---- | -------------------------------------------------------------------------------------------- |
| 0    | mọi ca pass                                                                                  |
| 1    | có ca fail - **package sai**                                                                 |
| 2    | lỗi hạ tầng - **runner/môi trường sai** (không build được, Docker không chạy, thiếu tarball) |

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

| Đường dẫn                                              | Commit? | Vai trò                                                                     |
| ------------------------------------------------------ | ------- | --------------------------------------------------------------------------- |
| `run.mjs`, `scripts/`, `cases/`, `docker/`             | có      | code lab                                                                    |
| `contract.json`                                        | có      | đường nhập được CAM KẾT (nguồn sự thật của ca, **không** sinh từ `exports`) |
| `cases/l4/__screenshots__/`                            | **có**  | baseline ảnh - chỉ sinh trong container                                     |
| `.artifacts/`, `.npm-cache/`, `.reports/`, `**/.work/` | không   | sản phẩm phụ                                                                |

## Tầng test

| Level | Kiểm gì                                             | Docker |
| ----- | --------------------------------------------------- | ------ |
| L1    | package artifact: `exports`, ESM/CJS, optional peer | không  |
| L2    | consumer thật: Vite, Next, Node, `tsc`              | không  |
| L3    | ecosystem: Node 18-24 × npm/pnpm/yarn/bun           | có     |
| L4    | production: CSS leak, hydration, visual regression  | có     |

L1 có **3 chân bổ sung nhau**, đã thực nghiệm để chốt:

| Bug                               | `publint`             | `attw`        | smoke runner          |
| --------------------------------- | --------------------- | ------------- | --------------------- |
| B1 exports trỏ file không tồn tại | bắt, đúng 7 đường dẫn | không nhắm    | bắt                   |
| B2 import ESM thiếu đuôi          | **không bắt**         | **không bắt** | **duy nhất bắt được** |

Static tool là **cần nhưng không đủ**.

## Ngân sách thời gian - ĐO THẬT

Đo 2026-09-25 trên macOS 15 (Darwin 24.6.0), Apple Silicon, Docker 29.7.2, Node 24.18.0.
Số không có ngày và máy đo là số vô nghĩa.

| Tier | Gồm                      | Mục tiêu  | **Đo thật**                      | Kết luận            |
| ---- | ------------------------ | --------- | -------------------------------- | ------------------- |
| 1    | L1 + L2 (local, Node 24) | < 4 phút  | **~2.9 phút** (L1 21s + L2 153s) | ĐẠT, nhưng sát trần |
| 2    | Tier 1 + L3 cell tier<=2 | < 20 phút | **~41 phút** (L3 2284s)          | **VƯỢT GẤP ĐÔI**    |
| 3    | Tier 2 + L3 tier 3 + L4  | < 45 phút | L4 329s; L3 tier 3 chưa đo xong  | chưa chốt           |

### Tier 2 vượt ngân sách - nguyên nhân và cách cắt

Chi phí KHÔNG nằm ở ca test mà ở hạ tầng: mỗi cell `docker build` riêng rồi `npm install` lại bên
trong container. 4 cell × (build + install + ca) = 2284s.

Thứ tự cắt, theo đúng nguyên tắc "không cắt L1 vì nó có tỷ lệ bắt bug cao nhất":

1. **Chia sẻ layer giữa các cell.** Hiện mỗi cell build một image. Dùng một base image chung rồi chỉ
   đổi PM ở layer cuối sẽ bỏ được phần lớn thời gian build.
2. **Bỏ `npm install` trong container** bằng cách mount `node_modules` của lab đã cài sẵn - nhưng
   CHỈ devDependency của lab, tuyệt đối không mount `tinita*`. Cần cẩn thận, vì đây đúng là thứ
   `assert-isolation` tồn tại để chặn.
3. **Hạ cell `node20-npm` xuống tier 3.** Cell `node22-npm` đã trả lời câu hỏi LTS; Node 20 chỉ
   thêm một điểm dữ liệu.
4. **Chuyển ca Next của L2 xuống tier 2.** Nó là phần chậm nhất của L2 (`next build` × 3 biến thể).
   Làm vậy tier 1 xuống dưới 1 phút.

Chưa áp cách nào - đây là lựa chọn cho lần tối ưu sau, ghi lại để không phải đo lại.

## Kế hoạch

`plans/20260925-0958-compatibility-consumer-test-lab/` - `plan.md` và 6 file phase.

---

## Quyết định cần owner chốt

Lab báo cáo, lab không quyết. Hai việc dưới đây cần owner chọn.

### QĐ-1: hai bản đã publish trên npm đều gãy

Đo được (ca `07-registry-vs-local`, tải tarball thật từ registry rồi đối chiếu từng đường dẫn):

```
tinita@0.0.1                6/18 đường dẫn trỏ file KHÔNG có trong tarball
tinita-react@0.0.2-alpha.1  7/25 tương tự
```

Tarball `tinita@0.0.1` có **0 file `.cjs`** và 5 file `.js`, trong khi `main` và mọi
`exports[...].require` đều trỏ `.cjs`. Mọi `require()` từ npm hiện đang lỗi.

| Lựa chọn                                | Được                                                                                      | Mất                                  |
| --------------------------------------- | ----------------------------------------------------------------------------------------- | ------------------------------------ |
| **Bump + publish bản vá**               | người dùng mới nhận bản đúng; dù sao cũng phải bump vì `truncateFileName` đã đổi breaking | bản cũ vẫn gãy trên registry         |
| **Thêm `npm deprecate` cho version cũ** | người cài bản cũ thấy cảnh báo                                                            | thêm một bước                        |
| **Unpublish**                           | xoá hẳn                                                                                   | chỉ được trong 72 giờ - đã quá, loại |

Nghiêng về bump + deprecate. Owner chốt.

### QĐ-2: có cam kết support TypeScript cũ (`moduleResolution: node`)?

Đo được: `attw` báo `node10: Resolution failed` 5/6 subpath, và consumer `tsc-matrix` của L2 xác nhận
`moduleResolution: node` fail **10 import**. `bundler` và `nodenext` thì sạch.

| Lựa chọn          | Được                                                                     | Mất                                                                           |
| ----------------- | ------------------------------------------------------------------------ | ----------------------------------------------------------------------------- |
| **Không support** | không phải sửa gì; khai rõ trong README là cần `bundler` hoặc `nodenext` | người dùng TS cũ không compile được                                           |
| **Support**       | phủ được TS cũ                                                           | phải thêm `typesVersions` hoặc đổi layout `dist`, làm `package.json` phức tạp |

Quyết định này đổi ca `tsc:node` từ `expectedFailure` thành failure thật, hoặc giữ nguyên.
Hiện `NoResolution` đang nằm trong `contract.json` `accepted` kèm lý do trỏ về đây.

## Đã sửa nhờ lab (2026-09-25)

| Khiếm khuyết                                                             | Cách sửa                                                                | Bằng chứng                             |
| ------------------------------------------------------------------------ | ----------------------------------------------------------------------- | -------------------------------------- |
| `attw` `FalseCJS` 6/6 subpath của `tinita`                               | tách `types` theo condition: `import` -> `.d.mts`, `require` -> `.d.ts` | `Masquerading as CJS` từ 6 xuống **0** |
| `tinita` thiếu `sideEffects`                                             | thêm `"sideEffects": false`                                             | publint không còn suggestion đó        |
| `CLAUDE.md` ghi `tinita-react/hooks` và `/ui` là đường nhập **bắt buộc** | sửa: hai đường đó **không tồn tại**; thay bằng 9 subpath thật           | ca `05-contract-drift`                 |

Allowlist `contract.json` của `tinita` thu hẹp từ 3 entry xuống 1 - sửa xong thì **xoá** entry, không
để allowlist phình thành thùng rác.

## Tier 3 - kết quả đo 2026-09-25 và 3 vấn đề chưa xử

Chạy `--tier=3` (gồm cả cell tier 2). 5504s. Kết quả đáng giá nhất:

**`node18-npm:l1` PASS** - lần đầu tiên claim `engines: ">=18"` được kiểm thật. 12 ca L1 xanh trên
Node 18.20.8. Trước đây không có gì xác nhận điều đó.

Ba vấn đề:

| #   | Vấn đề                                                                                           | Nguyên nhân                                                                                                                                                                                                                   | Trạng thái                                                                                                                                |
| --- | ------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | `node24-npm:l2` fail `ENOENT /work/artifacts/manifest.json`, dù cùng cell PASS ở lần chạy tier 2 | **Tôi chạy `pack.mjs` trong lúc matrix đang đọc `.artifacts/`.** `pack.mjs` `rmSync(ARTIFACTS)` rồi tạo lại, nên có một khoảng thư mục không tồn tại và container `cp -r /artifacts/.` không thấy gì. Không phải lỗi package. | **ĐÃ SỬA:** `pack.mjs` nay ghi vào `.artifacts.staging-<pid>` rồi swap bằng `renameSync`, nên cửa sổ thư mục không tồn tại gần như bằng 0 |
| 2   | `node22-yarn-classic:build` fail                                                                 | Docker Hub timeout khi pull `node:22-slim` - lỗi mạng tạm thời                                                                                                                                                                | Chạy lại là hết. Nhưng `run.mjs` nên phân biệt build-fail do mạng (hạ tầng, exit 2) với fail thật                                         |
| 3   | `node22-yarn-pnp:build` fail                                                                     | `corepack prepare yarn@4.5.0 --activate` exit 1 trong image                                                                                                                                                                   | **CHƯA XỬ.** Đây là cell đáng giá nhất của matrix (bắt phantom dependency mà npm/pnpm bỏ qua) nên đáng làm cho chạy được                  |

Và một lỗi trong chính runner, đã sửa: cell `bun-latest` được đánh `advisory` nên fail của nó
không làm đỏ tier - nhưng runner báo nó là **PASS** trong khi detail ghi
`Missing script to execute` (image bun không có `node`, nên `node /work/lab/run.mjs` không chạy).
Advisory nghĩa là "fail không làm đỏ tier", KHÔNG phải "coi như pass". Nay báo là SKIP kèm lý do.
Đây đúng loại xanh giả mà lab tồn tại để chặn, lần này trong runner của lab.
