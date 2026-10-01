# Pha 01 - V2: tier 2 từ 38 phút xuống dưới 20

## Context links

- Plan cha: [plan.md](./plan.md)
- Dependency: không có. Đi đầu vì nó rút ngắn mọi lần chạy lab của các pha sau.
- Số đo: [reports/00-verified-context.md](./reports/00-verified-context.md) mục "Việc 2" và mục
  "Đối chiếu: researcher nói mount BẤT KHẢ THI, tôi đo được là KHẢ THI"
- Research: [researcher-02-docker-speed.md](./research/researcher-02-docker-speed.md)
- Lab: `compatibility/README.md` mục "Tier 2 vượt ngân sách - nguyên nhân và cách cắt"

## Overview

- **Date:** 2026-09-25
- **Description:** Tier 2 đo được 2284s (38 phút) với ngân sách 20. Chi phí ở hạ tầng, không ở ca
  test. Pha này áp các cách cắt theo thứ tự lợi ích giảm dần và **dừng ngay khi đạt mục tiêu**, để
  không nhận rủi ro của cách cắt #2 nếu không cần.
- **Priority:** P0 - mọi pha sau đều chạy lab, tier 2 nhanh hơn là lợi ích kép
- **Implementation status:** Done
- **Review status:** Not reviewed

## Key Insights

1. **Chi phí KHÔNG ở `docker build`.** Đo được ~570s mỗi cell, phần lớn là `npm install` chạy lúc
   runtime trong `entry.sh` - mỗi `docker run` cài lại `publint`, `attw`, `playwright` từ đầu.
   Chuyển sang `RUN npm ci` trong Dockerfile thì nó thành layer được cache, chỉ chạy lại khi
   lockfile đổi.
2. **Cách cắt #1 như owner hình dung sẽ thất vọng.** Base image khác nhau (`node:24-slim` vs
   `node:22-slim`) nên không có layer nào chia sẻ được. Phần "chia sẻ layer" thật sự khả thi là
   layer `npm ci` bên trên mỗi base - vẫn phải chạy 4 lần nhưng được cache giữa các lần build lại.
3. **Cách cắt #2 khả thi hôm nay nhưng mong manh.** Đo trực tiếp: `compatibility/node_modules` có 61
   gói, **0** file `.node`/`.dylib`/`.so`, **0** gói platform-specific, **0** field `cpu`/`os` trong
   lockfile. Nên mount vào container Linux chạy được. Nhưng nó gãy im lặng ngày ai thêm một
   dependency có native binary. researcher-02 kết luận "bất khả thi" là đúng ở phạm vi tổng quát,
   sai ở bộ dependency cụ thể này - hai kết luận không mâu thuẫn.
4. **Vì vậy #2 là bước CÓ ĐIỀU KIỆN.** Nó là cách duy nhất trong 4 cách đụng vào chính thứ
   `assert-isolation` tồn tại để bảo vệ. Nhận rủi ro đó mà không đổi lại gì là không đáng, nên đo
   lại sau 3 cách kia và dừng nếu đã đạt.
5. **Ca browser trong container vốn đã skip sạch.** Đo được container báo `13 ca, 0 fail, 5 skip`.
   Nên `playwright` trong container chỉ cần cài được, không cần browser - đó là lý do `npm ci` trong
   Dockerfile không phải kéo theo `playwright install`.

## Requirements

- Tier 2 đo lại dưới **1200s** trên cùng máy (macOS 15, Apple Silicon, Docker 29.7.2, Node 24.18.0).
- Tier 1 đo lại dưới **60s**.
- Không cách cắt nào được làm giảm số ca L1 đang chạy trong container (hiện 12 ca/cell).
- Nếu áp cách cắt #2: phải có **2 assertion mới** (mount không chứa `tinita*`; mount
  platform-independent) và **2 ca tự phá** chứng minh chúng bắt được.
- `assert-isolation` phải tiếp tục EXIT 0 sau mọi thay đổi, và các assertion cũ không được yếu đi.
- Phân loại lại build-fail do mạng thành hạ tầng (exit 2), không phải fail package (exit 1).

## Architecture

Thứ tự áp và điều kiện dừng:

| Bước | Cách cắt                                       | Rủi ro                 | Dừng được ở đây?            |
| ---- | ---------------------------------------------- | ---------------------- | --------------------------- |
| 1    | `npm ci` vào Dockerfile + BuildKit cache mount | thấp                   | đo lại                      |
| 2    | #3 hạ `node20-npm` xuống tier 3                | thấp                   | đo lại                      |
| 3    | #4 chuyển ca Next của L2 xuống tier 2          | thấp, đánh đổi đã biết | **đo lại - đạt thì DỪNG**   |
| 4    | #2 mount `node_modules`                        | **cao**                | chỉ làm nếu bước 3 chưa đạt |

`node.Dockerfile` sau bước 1:

```
ARG NODE_VERSION=22
FROM node:${NODE_VERSION}-slim
ARG PM=npm
ARG PM_VERSION=latest
RUN if [ "$PM" != "npm" ]; then corepack enable && corepack prepare "${PM}@${PM_VERSION}" --activate; fi

# Layer này được cache: chỉ chạy lại khi 2 file dưới đổi.
WORKDIR /lab-deps
COPY lab-package.json package.json
COPY lab-package-lock.json package-lock.json
RUN --mount=type=cache,id=tinita-npm,target=/root/.npm npm ci --no-audit --no-fund
```

`entry.sh` sau bước 1: **không** `npm install` nữa, chỉ symlink `/lab-deps/node_modules` vào
`/work/lab/node_modules`.

Đánh đổi của cách cắt #4, phải ghi vào docs: ca `next:rsc-filetree-no-directive` và
`next:rsc-filetree-app-directive` không còn chạy mỗi PR. Chúng là ca chốt câu hỏi `'use client'`.
Đổi lại tier 1 xuống dưới 1 phút nên người ta thực sự chạy nó.

## Related code files

| File                                         | Sửa gì                                                                  |
| -------------------------------------------- | ----------------------------------------------------------------------- |
| `compatibility/docker/node.Dockerfile`       | thêm layer `npm ci` + BuildKit cache mount                              |
| `compatibility/docker/bun.Dockerfile`        | tương tự, hoặc giữ nguyên vì cell advisory                              |
| `compatibility/docker/entry.sh`              | bỏ `npm install`, symlink `/lab-deps/node_modules`                      |
| `compatibility/docker/matrix.json`           | `node20-npm` tier 2 -> 3; thêm `levels` cho cell nếu cắt #4 đổi phân bổ |
| `compatibility/cases/l2/index.mjs`           | tách ca Next thành nhóm gắn tier, để `--tier` lọc được                  |
| `compatibility/cases/l3/index.mjs`           | phân loại build-fail do mạng thành exit 2                               |
| `compatibility/scripts/assert-isolation.mjs` | 2 assertion mới, CHỈ nếu áp cắt #2                                      |
| `compatibility/README.md`                    | điền số đo mới, ghi đánh đổi của cắt #4                                 |

## Implementation Steps

1. **Đo phân tách trước khi sửa gì.** Chạy một cell với `time docker build --progress=plain` và
   `time docker run` riêng, ghi lại 3 số: build, run, và `npm install` trong run. Không có số này
   thì không biết cách cắt nào có lợi, và không so được sau khi sửa.
2. Copy `compatibility/package.json` và `package-lock.json` vào `compatibility/docker/` dưới tên
   `lab-package.json`/`lab-package-lock.json` (Docker build context chỉ thấy thư mục `docker/`).
   Hoặc đổi build context lên `compatibility/` - chọn cách nào thì ghi rõ lý do.
3. Thêm layer `npm ci` + `--mount=type=cache` vào `node.Dockerfile`. Bật BuildKit
   (`DOCKER_BUILDKIT=1`) nếu chưa mặc định.
4. Sửa `entry.sh`: bỏ `npm install`, symlink `/lab-deps/node_modules` -> `/work/lab/node_modules`.
   **Cẩn thận:** symlink này là symlink của `node_modules` LAB, không phải của `tinita*`. Assertion
   `no-symlinked-tinita` phải vẫn PASS - kiểm lại chứ đừng giả định.
5. **Đo lại tier 2.** Ghi số.
6. `matrix.json`: `node20-npm` từ tier 2 xuống tier 3. **Đo lại.**
7. Tách ca Next của L2 thành nhóm có tier, cho `--tier` lọc được. **Đo lại tier 1 và tier 2.**
8. **Điểm quyết định:** nếu tier 2 dưới 1200s thì **DỪNG**, không làm bước 9-11. Ghi vào
   `compatibility/README.md` rằng cắt #2 không cần thiết và vì sao - đây là thông tin cho owner, vì
   owner đã chọn cả 4 khi chưa có số đo.
9. (Chỉ nếu chưa đạt) Assertion mới `mount-has-no-tinita`: quét `node_modules` sẽ mount, fail nếu có
   entry nào tên `tinita*`.
10. (Chỉ nếu chưa đạt) Assertion mới `mount-is-platform-independent`: quét `*.node`/`*.dylib`/`*.so`
    và field `cpu`/`os` trong lockfile, fail nếu có. Thiếu assertion này thì lần thêm dependency sau
    làm matrix sai mà không ai biết vì sao.
11. (Chỉ nếu chưa đạt) Mount, rồi **2 ca tự phá**: đặt `tinita-react` vào thư mục mount -> assertion
    9 phải bắt; thêm file `fake.node` vào `node_modules` -> assertion 10 phải bắt. Gỡ ra thì PASS lại.
12. `cases/l3/index.mjs`: build-fail có chuỗi mạng (`timeout awaiting response headers`,
    `failed to resolve source metadata`, `DeadlineExceeded`) -> exit 2 thay vì đếm là fail package.
13. Điền số đo mới vào `compatibility/README.md` và `plan.md`, kèm ngày và máy đo.

## Todo list

- [ ] Đo phân tách build / run / npm install của một cell
- [ ] `npm ci` vào `node.Dockerfile` + BuildKit cache mount
- [ ] `entry.sh` bỏ `npm install`, symlink `/lab-deps/node_modules`
- [ ] Kiểm `assert-isolation` vẫn EXIT 0, assertion `no-symlinked-tinita` vẫn PASS
- [ ] Đo lại tier 2
- [ ] `node20-npm` xuống tier 3, đo lại
- [ ] Tách ca Next theo tier, đo lại tier 1 và 2
- [ ] **Điểm quyết định: đạt dưới 1200s thì dừng, ghi lý do vào README**
- [ ] (Nếu cần) assertion `mount-has-no-tinita` + ca tự phá
- [ ] (Nếu cần) assertion `mount-is-platform-independent` + ca tự phá
- [ ] Phân loại build-fail do mạng thành exit 2
- [ ] Điền số đo mới, kèm ngày và máy

## Success Criteria

1. `time node compatibility/cases/l3/index.mjs --tier=2` cho wall-clock **dưới 1200s**, đo trên cùng
   máy đã cho 2284s. Report JSON có trường `wallClockMs` để so được.
2. `time node compatibility/run.mjs all --tier=1` dưới **60s**.
3. Số ca L1 trong mỗi container **không giảm**: mỗi cell vẫn báo `12 ca, 0 fail, 0 skip` như trước.
4. `node compatibility/scripts/assert-isolation.mjs` EXIT 0, in đủ 6 dòng PASS (hoặc 8 nếu áp cắt
   #2). Assertion `no-symlinked-tinita` PASS dù `entry.sh` nay có symlink - vì symlink đó là
   `node_modules` của lab, không phải `tinita*`.
5. Lần `docker build` thứ hai cho cùng cell mà không đổi lockfile: layer `npm ci` báo `CACHED` trong
   output `--progress=plain`.
6. Build một cell với lockfile đã đổi một byte: layer `npm ci` **không** CACHED - chứng minh cache
   key đúng, không phải cache mù.
7. Nếu áp cắt #2: đặt `tinita-react` vào thư mục mount rồi chạy `assert-isolation` -> EXIT khác 0 và
   thông báo chứa `tinita-react`. Gỡ ra -> EXIT 0.
8. Nếu áp cắt #2: `touch <mount>/fake/index.node` rồi chạy -> EXIT khác 0 và thông báo chứa
   `index.node`. Xoá -> EXIT 0.
9. Nếu **không** áp cắt #2: `compatibility/README.md` có một đoạn nói rõ cắt #2 không cần thiết, kèm
   số đo chứng minh, và kèm điều kiện sẽ khiến nó cần lại.
10. Cell `node22-yarn-classic` fail do mạng: `node compatibility/cases/l3/index.mjs --case=node22-yarn-classic`
    EXIT **2** (hạ tầng), không phải 1. Giả lập bằng cách chặn mạng của docker hoặc đổi tên image
    thành image không tồn tại.
11. `compatibility/README.md` và `plan.md` có bảng tier với số đo mới, kèm ngày và tên máy/OS.

## Risk Assessment

| Rủi ro                                                                                  | Xác suất           | Ảnh hưởng                                  | Giảm thiểu                                                  |
| --------------------------------------------------------------------------------------- | ------------------ | ------------------------------------------ | ----------------------------------------------------------- |
| Cắt #2 làm lab xanh giả nếu mount lọt `tinita*`                                         | Trung bình         | **Nghiêm trọng** - mất toàn bộ giá trị lab | Tiêu chí 7 + bước dừng sớm ở 8 để có thể không cần áp       |
| Mount gãy im lặng khi ai thêm dependency có native binary                               | Cao theo thời gian | Cao                                        | Assertion platform-independence + tiêu chí 8                |
| Symlink `node_modules` trong `entry.sh` làm assertion cũ yếu đi                         | Trung bình         | Cao                                        | Tiêu chí 4 kiểm tường minh, không giả định                  |
| BuildKit cache mount không chia sẻ giữa base image khác nhau -> lợi ích ít hơn ước tính | Trung bình         | Trung bình                                 | Bước 1 đo phân tách trước; nếu lợi ít thì bước 6-7 vẫn còn  |
| Cắt #4 làm ca `'use client'` không chạy mỗi PR, hồi quy lọt qua                         | Trung bình         | Trung bình                                 | Ghi đánh đổi vào README; ca vẫn chạy ở tier 2 trước publish |
| Cache layer khiến dependency cũ được dùng mãi                                           | Thấp               | Cao                                        | Tiêu chí 6 chứng minh cache key theo lockfile               |

## Security Considerations

- `--mount=type=cache` chỉ cache `/root/.npm` (tarball đã tải), không cache credential. Không đặt
  `.npmrc` có token vào build context.
- Build context đổi lên `compatibility/` (nếu chọn cách đó) sẽ kéo theo `.artifacts/`,
  `.npm-cache/`, `.reports/`, `node_modules/`. **Bắt buộc** có `compatibility/docker/.dockerignore`
  loại chúng, nếu không image phình và có thể lọt tarball vào image.
- Nếu áp cắt #2, mount phải là **read-only** (`:ro`). Container ghi vào `node_modules` của host là
  đường làm bẩn máy dev.
- Không mount `~/.npm` của host, không mount Docker socket, không truyền biến môi trường của host.

## Next steps

Pha 02 dựng package thứ ba và sẽ chạy lab nhiều lần - đó là lý do pha này đi trước. Số đo phân tách
ở bước 1 cũng là đầu vào để pha 05 điền lại bảng 3 tier trong docs.
