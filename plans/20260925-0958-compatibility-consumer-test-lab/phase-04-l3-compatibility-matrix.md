# Pha 04 - L3 Compatibility matrix (Docker)

## Context links

- Plan cha: [plan.md](./plan.md)
- Dependency: **pha 01** (artifact + runner), **pha 02** (ca L1), **pha 03** (consumer L2 phải đã
  không phụ thuộc máy dev)
- Context đã đo: [reports/00-verified-context.md](./reports/00-verified-context.md) mục "Môi trường máy"
- Research: [researcher-01-packaging-tooling.md](./research/researcher-01-packaging-tooling.md) -
  Yarn PnP là phép thử mạnh nhất cho phantom dependency; dùng `node:*-slim` không dùng alpine
- Nguồn thiết kế: tài liệu gốc mục "Không nên Dockerize mọi combination" (tính ra 720 environment)

## Overview

- **Date:** 2026-09-25
- **Description:** Chạy lại ca của pha 02 và 03 trong Docker dưới nhiều Node version và package
  manager. Pha này KHÔNG thêm ca test mới - nó thêm **môi trường**. Giá trị nằm ở chỗ bắt được lỗi
  chỉ xuất hiện dưới resolver khác (Yarn PnP) hoặc Node cũ hơn.
- **Priority:** P1 - cần trước lần publish tới, không cần mỗi commit
- **Implementation status:** Not started
- **Review status:** Not reviewed

## Key Insights

1. **Cartesian đầy đủ là 720 environment và không cần thiết.** Tài liệu nguồn tự tính con số đó và
   bác bỏ nó. Nguyên tắc chọn cell: mỗi cell phải trả lời một câu hỏi mà không cell nào khác trả lời
   được. Cell nào chỉ lặp lại câu trả lời của cell khác thì bỏ.
2. **Yarn PnP là cell đáng giá nhất trong toàn matrix.** Nó không hoist, không có `node_modules`, và
   resolver kiểm từng import theo khai báo. Một package dùng dependency mà không khai (phantom
   dependency) sẽ pass npm và pnpm nhưng fail PnP. Với `tinita-react` vừa chuyển sang optional peer,
   đây đúng là chỗ lộ ra nếu có lib nào bị dùng mà chưa khai.
3. **Node cũ trả lời một câu hỏi khác Node mới.** `engines` khai `>=18` nhưng chưa ai chạy thử trên
   18. Nếu `dist` dùng syntax hoặc API chỉ có từ 20 trở lên thì hiện không có gì phát hiện.
4. **Không dùng alpine.** musl libc gây rủi ro với native dep và esbuild. `node:*-slim` là Debian
   glibc, an toàn cho chuỗi build hiện tại (tsup/esbuild + postcss).
5. **yarn bị chặn ở local nên Docker không phải lựa chọn mà là điều kiện.** Root `package.json` có
   `packageManager: pnpm@9.0.0`, Corepack sẽ từ chối yarn. Trong container thì consumer nằm ngoài
   cây repo nên không bị field đó chi phối.
6. **`bun` chưa cài ở local.** Nên cell bun chỉ tồn tại trong Docker, và nó thuộc tier 3 vì bun là
   runtime khác hẳn, lỗi ở đó chưa chắc là lỗi của package.

## Requirements

- Mỗi cell là một container chạy được độc lập, nhận tarball từ `manifest.json` qua bind mount hoặc
  `COPY`, và **không** nhận `node_modules` của máy dev vào.
- Cell chỉ chạy lại ca đã có; không định nghĩa ca riêng cho Docker.
- Matrix được khai trong một file dữ liệu, không hardcode trong script, để pha 06 chọn tier.
- Cache npm/pnpm/yarn trong container phải là cache của container, không mount cache của host.
- Một cell fail phải không dừng các cell còn lại; report gom kết quả từng cell.
- `run.mjs l3` phải exit 2 (hạ tầng) nếu Docker daemon không chạy, **không** exit 1.

## Architecture

```
compatibility/docker/
├── node.Dockerfile        <- ARG NODE_VERSION, ARG PM; cài PM qua corepack
├── bun.Dockerfile         <- oven/bun, tier 3
├── matrix.json            <- danh sách cell + tier + lý do chọn
└── entry.sh               <- copy tarball, install, chạy run.mjs <level> trong container
```

Matrix đã chọn, kèm lý do. **Bỏ** mọi cell không trả lời câu hỏi mới:

| # | Node | PM | Level chạy | Tier | Câu hỏi cell này trả lời |
| --- | --- | --- | --- | --- | --- |
| 1 | 24-slim | npm | L1+L2 | 2 | baseline khớp local, phát hiện lệch giữa host và container |
| 2 | 22-slim | npm | L1+L2 | 2 | LTS hiện tại của phần lớn người dùng |
| 3 | 20-slim | npm | L1 | 2 | LTS cũ còn support |
| 4 | 18-slim | npm | L1 | 3 | sàn của `engines: >=18`; chưa ai từng chạy thử |
| 5 | 22-slim | pnpm | L1 | 2 | resolver strict, không hoist - bắt dependency khai thiếu |
| 6 | 22-slim | yarn classic | L1 | 3 | resolution khác npm/pnpm; không chạy được ở local |
| 7 | 22-slim | **yarn PnP** | L1 | 3 | **phantom dependency - cell đáng giá nhất** |
| 8 | bun latest | bun | L1 | 3 | runtime khác; chưa cài ở local |

**Đã cân nhắc và BỎ:**

| Cell bỏ | Lý do bỏ |
| --- | --- |
| Node 20/18 × pnpm | Cell 5 đã trả lời câu hỏi "resolver strict"; đổi Node không đổi câu trả lời |
| Node 24 × yarn/bun | Cell 6-8 đã phủ PM; đổi Node không thêm thông tin về PM |
| L2 trên mọi Node | `next build`/`vite build` tốn phút, mà lỗi bundler không phụ thuộc Node patch. Chỉ cell 1-2 chạy L2 |
| L3 × 3 React version | React version là trục của consumer, không phải của môi trường - thuộc pha 05 |
| npm version cũ | `engines` không khai npm; lockfile v3 đã ổn định. Thêm cell này không trả lời câu hỏi nào đang mở |
| macOS/Windows runner | Không có hạ tầng; `.gitattributes` đã ép `eol=lf`. Ghi là rủi ro chưa phủ, không giả vờ phủ |

`verdaccio`: **không dùng ở pha này.** Nó trả lời câu hỏi về registry metadata (dist-tag, version
resolution), mà ca 07 của pha 02 (`npm pack tinita@0.0.1`) đã phủ phần quan trọng nhất là "bản đã
publish có gãy không". Thêm verdaccio là thêm một service phải chạy và đồng bộ, đổi lại rất ít thông
tin mới. Ghi vào Next steps như việc cân nhắc lại nếu sau này có dist-tag hoặc kênh beta.

## Related code files

| File | Vai trò |
| --- | --- |
| `packages/*/package.json` | `engines: >=18` - cell 4 kiểm đúng claim này |
| `packages/tinita-react/package.json` | `peerDependenciesMeta` optional - cell 5, 7 kiểm cách resolver khác nhau xử lý |
| `package.json` (root) | `packageManager: pnpm@9.0.0` - nguyên nhân yarn không chạy được ở local |
| `.gitattributes` | `eol=lf` mặc định - lý do rủi ro CRLF thấp, nhưng vẫn chưa phủ Windows |
| `compatibility/docker/matrix.json` | nguồn duy nhất của danh sách cell; pha 06 đọc để chia tier |

## Implementation Steps

1. Viết `node.Dockerfile` với `ARG NODE_VERSION`, `ARG PM`, `ARG PM_VERSION`. Bật `corepack` để cài
   pnpm/yarn đúng version. Base `node:${NODE_VERSION}-slim`. Không cài gì thừa - mục tiêu là container
   **không có gì ngoài Node và PM**, đúng tinh thần tài liệu nguồn.
2. Viết `entry.sh`: nhận tarball đã mount ở `/artifacts`, copy `compatibility/` vào `/lab`, chạy
   `node /lab/run.mjs <level>` với `--no-pack` (artifact đã có sẵn, container không build lại).
3. Xác minh điều quan trọng nhất **trước khi viết cell nào**: container **không** thấy
   `node_modules` của host. Đo bằng cách chạy `ls /lab/node_modules` trong container và xác nhận nó
   chỉ chứa devDependency của lab, không chứa `tinita*`.
4. Viết `matrix.json` theo bảng trên, mỗi cell có `{ id, node, pm, pmVersion, levels[], tier, why }`.
   Trường `why` là bắt buộc - cell không giải thích được vì sao tồn tại thì xoá.
5. Cell 7 (Yarn PnP) cần thêm bước: `yarn set version berry`, `yarn config set nodeLinker pnp`. Ca
   L1 chạy qua `yarn node -e` thay vì `node -e` để đi qua resolver PnP. **Đây là khác biệt duy nhất
   về cách gọi trong toàn matrix**, phải ghi rõ trong `entry.sh`.
6. `run.mjs l3` lặp cell, mỗi cell `docker build` + `docker run`, gom exit code. Cell fail không dừng
   vòng lặp. Nếu `docker info` fail thì exit 2 ngay, không thử cell nào.
7. **Ca chứng minh matrix bắt được** (theo pattern pha 01): thêm vào bản `.work/` gãy có chủ ý một
   import tới package **không khai** trong `package.json` (phantom dependency), ví dụ `import 'chalk'`
   trong một utility. Pack, chạy cell 1 (npm) và cell 7 (PnP). Kỳ vọng: cell 1 có thể pass nếu
   `chalk` tình cờ có trong cây; cell 7 **phải** fail. Nếu cả hai pass thì cell 7 chưa đi qua resolver
   PnP và bước 5 làm sai.
8. Đo wall-clock từng cell, ghi vào report. Số này là đầu vào cho bảng tier ở pha 06.

## Todo list

- [ ] `node.Dockerfile` (ARG NODE_VERSION/PM, corepack, slim)
- [ ] `bun.Dockerfile` (tier 3)
- [ ] `entry.sh` (mount artifact, `--no-pack`, PnP gọi qua `yarn node`)
- [ ] **Xác minh container không thấy `node_modules` của host**
- [ ] `matrix.json` 8 cell, mỗi cell có `why`
- [ ] `run.mjs l3` gom cell, exit 2 khi Docker không chạy
- [ ] Ca chứng minh phantom dependency: cell PnP phải fail
- [ ] Đo và ghi wall-clock từng cell

## Success Criteria

1. `docker info` fail (tắt daemon) thì `node compatibility/run.mjs l3` exit **2**, và stderr nêu
   Docker, không phải nêu ca test nào fail.
2. `node compatibility/run.mjs l3 --tier=2` chạy đúng các cell có `tier: 2` trong `matrix.json`
   (cell 1, 2, 3, 5) và không cell nào khác. Đổi `tier` của một cell trong `matrix.json` thì tập cell
   chạy đổi theo - matrix là dữ liệu, không phải code.
3. Trong container cell 1: `ls /lab/node_modules` **không** chứa entry nào tên `tinita` hoặc
   `tinita-react`; và `node -e "console.log(require.resolve('tinita'))"` trong consumer trả về đường
   dẫn nằm dưới consumer đó, không nằm dưới `/lab`.
4. Cell 4 (Node 18): `node --version` in ra `v18.` và ca L1 exit 0. Nếu fail thì claim
   `engines: >=18` là sai và report phải nêu rõ specifier nào gãy trên Node 18.
5. Cell 5 (pnpm): ca optional peer cho kết quả **giống** cell 1 (npm) về việc `ui/ping` load được và
   `ui/file-tree` fail khi vắng peer. Nếu khác thì report ghi rõ khác ở đâu - pnpm strict hơn npm nên
   đây là thông tin cần biết, không phải lỗi.
6. Cell 7 (Yarn PnP): `yarn --version` in ra major >= 4, `yarn config get nodeLinker` in ra `pnp`, và
   **không** tồn tại `node_modules` trong consumer của cell đó.
7. Ca chứng minh ở bước 7: bản có phantom dependency `chalk` làm cell 7 exit khác 0 với thông báo nêu
   `chalk`. Nếu cell 7 pass thì tiêu chí này fail - đó là dấu hiệu resolver PnP chưa được dùng thật.
8. Report có bảng 8 cell × exit code × wall-clock. Tổng wall-clock của `--tier=2` được ghi ra số cụ
   thể để pha 06 đối chiếu ngân sách 20 phút.
9. Một cell fail không làm cell sau bị skip: cố ý làm cell 3 fail (ví dụ đặt `node: '0-slim'` không
   tồn tại) thì cell 4-8 vẫn chạy, và exit cuối là 1 với report nêu đúng cell 3.
10. Mỗi cell trong `matrix.json` có trường `why` không rỗng. Thêm cell không có `why` thì
    `run.mjs l3` exit 2 - buộc người thêm cell phải giải thích.

## Risk Assessment

| Rủi ro | Xác suất | Ảnh hưởng | Giảm thiểu |
| --- | --- | --- | --- |
| Matrix phình dần tới Cartesian, tier 2 vượt ngân sách | Cao theo thời gian | Cao | Trường `why` bắt buộc + tiêu chí 10; bảng "đã cân nhắc và BỎ" trong pha này là tiền lệ |
| `docker build` chậm, tier 2 không dùng nổi | Cao lần đầu | Trung bình | Một Dockerfile dùng chung với ARG, layer cài PM được cache; đo ở tiêu chí 8 rồi quyết ở pha 06 |
| Cell PnP không thật đi qua resolver PnP, pass giả | Trung bình | Nghiêm trọng | Tiêu chí 6 (kiểm `nodeLinker` và không có `node_modules`) + tiêu chí 7 (ca chứng minh) |
| Mount cache của host vào container để cho nhanh, làm mất cô lập | Trung bình | Nghiêm trọng | `entry.sh` không nhận mount cache; chỉ mount `/artifacts` read-only |
| Node 18 fail và không rõ nên hạ `engines` hay sửa build | Trung bình | Trung bình | Tiêu chí 4 buộc report nêu specifier cụ thể; quyết định để pha 06 |
| bun fail vì bun, không vì package, gây nhiễu | Cao | Thấp | Cell 8 ở tier 3 và được đánh dấu `advisory: true` - fail của nó không làm đỏ tier 2 |
| Windows/macOS chưa phủ, lỗi path/case không ai thấy | Trung bình | Trung bình | Ghi tường minh là rủi ro chưa phủ trong report và ở pha 06; `.gitattributes` `eol=lf` giảm một phần |

## Security Considerations

- Container chạy với user không phải root nếu image cho phép (`node` image có user `node`). Ghi rõ
  nếu cell nào buộc phải root và vì sao.
- Chỉ mount `/artifacts` **read-only**. Không mount repo, không mount `~/.npm`, không mount Docker socket.
- Không truyền biến môi trường của host vào container (không `--env-file`, không `-e NPM_TOKEN`).
  Ca registry của pha 02 chỉ đọc public registry nên không cần token ở đâu.
- `corepack` tải PM từ registry chính thức. Pin `pmVersion` chính xác trong `matrix.json` để không
  bị đổi âm thầm giữa các lần chạy.
- Image tự build, không dùng image của bên thứ ba ngoài `node:*-slim` và `oven/bun` chính thức.
- Container phải chạy với `--network` mặc định nhưng ca nào cần mạng phải khai rõ; cell nào không cần
  mạng thì chạy `--network=none` để chứng minh install hoạt động từ cache/tarball.

## Next steps

Pha 05 dùng lại hạ tầng Docker của pha này nhưng đổi image sang Playwright, và thêm trục React
version + CSS environment mà pha này cố tình không phủ. Nếu pha này đo ra `docker build` quá chậm thì
pha 05 phải tái dùng layer, không build từ đầu.
