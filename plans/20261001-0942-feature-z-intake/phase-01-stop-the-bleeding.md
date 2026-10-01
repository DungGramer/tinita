# Pha 01 - Chặn chảy máu

**Mục tiêu duy nhất:** `pnpm gate` xanh trở lại. Chưa cải thiện hàm nào.

## Vì sao pha này tồn tại riêng

`tinita/tsup.config.ts` quét entry bằng glob `src/*/**/*.ts`. 66 file mới đều
thành entry, một file không compile là cả build đỏ, và `clean: true` chạy **trước**
tsup nên `dist/` bị xoá rồi không dựng lại. Hiện `packages/tinita/dist/` không tồn
tại.

Nghĩa là nhánh này không "thêm code chết nằm im" - nó làm package không build được.
Mọi việc khác phải đứng sau việc này.

## Cách làm: cách ly, không sửa vội

Không sửa 38 lỗi TS ngay. Sửa vội 38 lỗi trong code chưa quyết định giữ hay bỏ là
làm việc hai lần.

Chuyển toàn bộ 66 file vào vùng chờ `incoming/` **nằm ngoài** tầm quét của glob:

```
packages/tinita/incoming/        <- glob chỉ quét src/*/**/*.ts
packages/tinita-react/incoming/
packages/tinita-dom/incoming/
```

Thêm `incoming/` vào `.gitignore`? **Không.** Nó phải được version control, nếu
không nhánh `feature/z` bị xoá là mất code. Thay vào đó thêm vào:

- `tsconfig` `exclude` để `check-types` không đọc
- `eslint` ignores
- `files` của `package.json` vốn đã chỉ có `["dist"]` nên tarball không dính

Từng file rời `incoming/` khi và chỉ khi nó qua được cổng ở pha 03.

## Việc

1. `git merge --no-commit feature/z` vào một nhánh làm việc mới
   (`chore/feature-z-intake`), **không** vào `main`.
2. `git mv` 66 file sang `incoming/` tương ứng, giữ nguyên cấu trúc thư mục.
3. Xoá ngay hai file đã chắc chắn không giữ: `converter/fileToBlob.ts` (0 byte) và
   `decoder/base64Decoder.ts` (trùng `base64ToBlob`, dùng `window.atob`).
4. Thêm `incoming` vào `exclude` của `packages/*/tsconfig.json` và vào
   `config/eslint-config` ignores.
5. Chạy `pnpm --filter=tinita run build` - `dist/` phải dựng lại.

## Việc thứ hai: vá lỗ guard SSR của `tinita`

Tách riêng vì nó không phụ thuộc 66 file kia, và phải có **trước** khi pha 02 bắt
đầu di chuyển file - nếu không thì không có gì chứng minh việc di chuyển là đúng.

**Lỗ:** fixture `SSR_ESM` / `SSR_CJS` ở `compatibility/cases/l2/lib/fixtures.mjs`
chỉ import `tinita-react/ui/ping`, `ui/carousel-ticker`, `utils/autoInjectStyles`.
Không dòng nào chạm `tinita`. Nên luật "`tinita` chạy ở mọi nơi" hiện **không có
guard** - nó chỉ là một câu trong README.

Đây đúng dạng lỗi đã lặp bốn lần trong repo: một ca báo xanh mà không kiểm thứ nó
nói đang kiểm.

**Vá:** thêm vào cả hai fixture phần import và gọi thật các export của `tinita`
hiện có:

```js
import { fileSize } from 'tinita/file/fileSize';
import { getFileNameParts } from 'tinita/file/getFileNameParts';
import { truncateFileName } from 'tinita/file/truncateFileName';
import { truncateFileNameParts } from 'tinita/file/truncateFileNameParts';
import { generateUUID } from 'tinita/uuid/generateUUID';
// gọi thật, không chỉ import: import suôn vẫn có thể gãy lúc chạy
```

Mỗi export mới của `tinita` sau này phải được thêm vào đây. Ràng buộc đó nên tự
động hoá: fixture đọc `contract.json` thay vì liệt kê tay - cùng cách ca 04 của L1
đã sửa, và cùng lý do (hai nguồn sự thật thì sẽ lệch).

**Chứng minh guard bằng cách phá:** thêm tạm một dòng `document.title` vào một
export của `tinita`, chạy L2 - ca `ssr:node-esm` và `ssr:node-cjs` phải ĐỎ với
`ReferenceError: document is not defined`. Gỡ dòng đó, phải xanh lại. Nếu không đỏ
thì fixture chưa thật sự chạy code.

## Tiêu chí xong (quan sát được)

- `pnpm gate` exit 0, 7/7 PASS.
- `pnpm gate --full` exit 0: L2 có ca SSR thật sự chạy code của `tinita`.
- Phá thử bằng `document.title` -> `ssr:node-esm` + `ssr:node-cjs` đỏ; gỡ -> xanh.
- `packages/tinita/dist/index.mjs` tồn tại trở lại.
- `node -e "require('tinita/file/fileSize')"` trong consumer cô lập exit 0 (ca
  `03-smoke` của L1 đã làm việc này).
- `git ls-files packages/tinita/incoming | wc -l` = số file đang chờ, khác 0.
- Tarball không chứa `incoming/`: `tar -tzf tinita-0.1.0.tgz | grep incoming` rỗng.

## Rủi ro

**Vùng chờ thành nghĩa địa.** `incoming/` có thể nằm đó mãi. Chặn bằng cách ghi số
file còn lại vào `docs/project-roadmap.md` như một món nợ có con số, và pha 04 phải
đưa nó về 0 hoặc xoá phần còn lại. Vùng chờ không có hạn là cách đặt tên khác cho
việc giữ rác.

## Tiếp theo

Pha 02 - định tuyến package.
