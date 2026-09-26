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

Đo 2026-09-26 trên macOS 15 (Darwin 24.6.0), Apple Silicon, Docker 29.7.2, Node 24.18.0.

| Tier | Gồm                      | Mục tiêu  | Trước               | **Sau**             |
| ---- | ------------------------ | --------- | ------------------- | ------------------- |
| 1    | L1 + L2 local            | < 4 phút  | 174s                | **63s**             |
| 2    | Tier 1 + L3 cell tier<=2 | < 20 phút | **2284s (38 phút)** | **509s (8.5 phút)** |
| 3    | Tier 2 + L3 tier 3 + L4  | < 45 phút | 5504s               | chưa đo lại         |

Giảm 78% ở tier 2. Nguyên nhân hoá ra **không phải** thứ mọi người đoán.

### Chi phí nằm ở đâu - đo phân tách, không suy luận

Cả README này (bản trước) và báo cáo nghiên cứu đều kết luận chi phí ở `npm install` trong container.
**Sai.** Đo tách từng bước trên một cell:

| Bước                                     | Thời gian               |
| ---------------------------------------- | ----------------------- |
| `docker build`                           | **2s** (image đã cache) |
| `cp -r /lab/. /work/lab` trong container | **195s**                |
| `npm install` trong container            | **5s**                  |
| Chạy 12 ca L1                            | 32s                     |

`cp -r /lab` copy **87.815 file (~3GB)** qua bind mount macOS<->Linux mỗi lần `docker run`. Phần lớn
là thứ container không cần:

| Thư mục                                                         | Kích thước   |
| --------------------------------------------------------------- | ------------ |
| `cases/` (chủ yếu `.work` của consumer, mỗi project Next ~500M) | **2.7G**     |
| `.npm-cache/`                                                   | 353M         |
| `node_modules/`                                                 | 50M          |
| Phần lab thật sự cần                                            | **732 file** |

`entry.sh` nay dùng `tar` với `--exclude` cho `node_modules`, `.work`, `.npm-cache`, `.reports`,
`.artifacts`. Một cell từ **501s xuống 36s**.

### Bốn cách cắt: đã áp 3, cách thứ tư KHÔNG CẦN

| Cách                                                  | Trạng thái                                                                                              |
| ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| Loại `node_modules`/`.work` khỏi copy trong container | **ĐÃ ÁP** - đây là cách cắt thật, và nó không nằm trong 4 cách ban đầu vì lúc viết chưa ai đo phân tách |
| #3 hạ `node20-npm` xuống tier 3                       | **ĐÃ ÁP**                                                                                               |
| #4 chuyển ca Next của L2 xuống tier 2                 | **ĐÃ ÁP** - tier 1 L2 từ 153s xuống 58s                                                                 |
| #1 chia sẻ layer Docker giữa các cell                 | **KHÔNG CẦN** - `docker build` chỉ 2s, không có gì để cắt                                               |
| #2 mount `node_modules` của host vào container        | **KHÔNG ÁP, và không nên áp**                                                                           |

**Vì sao không áp #2.** Tier 2 đã 509s, dưới mục tiêu 1200s rất xa. `npm install` trong container chỉ
5s nên mount tiết kiệm được tối đa 5s/cell = 15s tổng - khoảng 3%. Đổi lại nó là cách duy nhất đụng
vào chính thứ `assert-isolation` tồn tại để bảo vệ: nếu mount lọt `tinita*` thì mọi ca vẫn xanh trong
khi không còn kiểm gì. Nhận rủi ro đó cho 3% là không đáng.

Điều kiện khiến #2 cần lại: nếu `npm install` trong container tăng lên hàng phút (thêm nhiều
devDependency), hoặc nếu số cell tăng nhiều lần. Lúc đó cần **2 assertion** - mount không chứa
`tinita*`, và mount platform-independent (`compatibility/node_modules` hiện có 0 file
`.node`/`.dylib`/`.so` và 0 field `cpu`/`os`, nhưng điều đó sẽ đổi khi ai thêm dependency có native
binary).

### Đánh đổi của cách cắt #4

Ba ca Next (`next:rsc-*`) chốt câu hỏi `'use client'` nay thuộc **tier 2**, không chạy mỗi PR nữa.
Chúng vẫn chạy trước publish. Đổi lại tier 1 từ 174s xuống 63s nên người ta thực sự chạy nó.

### Cách đo lại

```bash
time node compatibility/cases/l3/index.mjs --tier=2     # tier 2
time node compatibility/run.mjs all --tier=1 --no-pack  # tier 1
```

Report JSON có `wallClockMs` để so giữa các lần.

## Kế hoạch

`plans/20260925-0958-compatibility-consumer-test-lab/` - `plan.md` và 6 file phase.

---

## Quyết định cần owner chốt

Lab báo cáo, lab không quyết. Hai việc dưới đây cần owner chọn.

### QĐ-1: hai bản đã publish trên npm đều gãy - ĐÃ CHUẨN BỊ, CHỜ OWNER

**Quyết định của owner (2026-09-25):** bump + publish bản vá + `npm deprecate` bản cũ.

Mức độ, đo bằng cách tải tarball thật từ registry:

```
tinita@0.0.1                6/18 đường dẫn trỏ file KHÔNG có trong tarball (0 file .cjs, 5 file .js)
tinita-react@0.0.2-alpha.1  7/25 tương tự
```

**Đã làm:**

- 3 package bump lên `0.1.0` (`tinita`, `tinita-react`, `tinita-dom`). Bump là bắt buộc dù không có
  bug này: `truncateFileName` đã đổi breaking và QĐ-2 thêm `typesVersions`.
- `scripts/update-package-versions.mjs` và `scripts/publish.mjs` **đọc `packages/` động**, không còn
  hardcode 2 package. Kiểm được: script thấy đủ 3.
- `publish.mjs` có **cửa chặn L1**: sau build+pack, nó chạy `compatibility/run.mjs l1` và dừng nếu
  fail, **trước** khi hỏi xác nhận. Hai bug đã publish lọt qua vì không có gì kiểm tarball trước
  publish. Kiểm được: đặt `bundle: false` cho `tinita-dom` thì L1 EXIT 1 và publish bị chặn.
- Ca 07 nay kiểm **cả** version local **và** các version đã publish mà biết là gãy
  (`_knownBrokenPublished` trong `contract.json`). Nếu chỉ kiểm local thì sau khi bump ta mất khả
  năng phát hiện bản cũ vẫn gãy trên registry.

**CHỜ OWNER - publish và deprecate là hành động ra ngoài, không hoàn tác:**

```bash
npm login                          # publish.mjs dừng ở npm whoami, hiện chưa login

pnpm publish:dry-run               # xem trước, không publish gì

# Publish từng package một, KHÔNG dùng --all lần đầu: nếu package đầu có vấn đề thì
# 2 package sau chưa bị publish.
pnpm publish:tinita
pnpm publish:tinita-react
node scripts/publish.mjs tinita-dom

# Sau khi publish xong, chạy lại L1: ca 07 phải chuyển từ XFAIL sang PASS.
node compatibility/run.mjs l1

# Rồi deprecate bản cũ:
npm deprecate tinita@0.0.1 "Broken CJS: exports.require and main point at .cjs files absent from the tarball, so require() fails. Fixed in 0.1.0."
npm deprecate tinita-react@0.0.2-alpha.1 "Broken CJS: exports.require and main point at .cjs files absent from the tarball, so require() fails. Fixed in 0.1.0."
```

Lưu ý `tinita-dom` là tên mới: kiểm `npm view tinita-dom` trước, nếu đã có chủ thì cần tên khác.

### QĐ-2: support TypeScript cũ - ĐÃ LÀM

**Quyết định của owner (2026-09-25):** support, thêm `typesVersions`.

**Đã làm 2026-09-26.** `tsc:node` từ 12 lỗi xuống **14 specifier compile sạch**; `attw` hết báo
`node10` trên cả 3 package; entry `NoResolution` đã xoá khỏi allowlist (`tinita` còn 0 entry).

Hình dạng `typesVersions` quan trọng, và 3 trong 4 hình dạng là sai. Chi tiết + bảng đo ở
`docs/code-standards.md` mục "Quy Tắc `typesVersions`". Tóm lại: **key tường minh từng subpath,
KHÔNG wildcard**. Hình dạng có fallback `dist/index.d.ts` trông như đã sửa nhưng khiến
`import x from 'tinita/file/doesNotExistAtAll'` typecheck sạch và nhận type của root.

Cửa chặn cho việc đồng bộ `typesVersions` <-> `exports`: ca L1 `08-typesversions-sync`, hai chiều.

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
