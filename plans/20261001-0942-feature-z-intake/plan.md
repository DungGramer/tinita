# Tiếp nhận `feature/z`: 67 file, 3224 dòng

**Ngày:** 2026-10-01 · **Nhánh nguồn:** `feature/z` (`2bb08f4`, một commit tên "Add")
**Trạng thái:** chưa merge, và **không được merge như hiện tại**.

## Trạng thái đo được

| Chỉ số                          | Giá trị                                  | Cách đo                                    |
| ------------------------------- | ---------------------------------------- | ------------------------------------------ |
| File mới                        | 67                                       | `git diff --name-only main...feature/z`    |
| Dòng mới                        | 3224                                     | `--shortstat`                              |
| Trong đó `HTML_entities_map.ts` | 1514 dòng (47%)                          | `wc -l`                                    |
| Lỗi TypeScript                  | **38**, toàn bộ ở `tinita`               | `pnpm check-types`                         |
| Build `tinita`                  | **ĐỎ**, `dist/` bị xoá và không dựng lại | `pnpm --filter=tinita run build`           |
| Test mới                        | **0**                                    | không file nào khớp `*.test.*`             |
| Story mới                       | **0**                                    | `pnpm check-stories`                       |
| File có JSDoc                   | **12/66**                                | grep `/**`                                 |
| Dòng `package.json` đổi         | **0**                                    | không export nào được khai                 |
| Dependency ngầm                 | `lodash-es` × 3                          | không có trong `dependencies` của `tinita` |
| File rỗng 0 byte                | 1 (`converter/fileToBlob.ts`)            | `[ -s ]`                                   |

**Điều nghiêm trọng nhất:** `tinita/tsup.config.ts` tự quét entry bằng glob
`src/*/**/*.ts`. Mọi file thả vào `src/` đều thành entry build. Nên 66 file này
không phải "code chết nằm im" - chúng làm **vỡ build của cả package**. Hiện
`packages/tinita/dist/` không tồn tại.

Hệ quả: `pnpm gate` đỏ ở bước `types` và `build`. Không publish được gì.

## Nguyên tắc chia package (chốt 2026-10-01)

Chia theo **runtime cần có**, không chia theo "util dùng chung". Lý do: "dùng
chung" không kiểm được bằng test, "chạy được ở đâu" thì kiểm được - và repo đã có
máy đo (L1 Node thuần, L2 SSR, L4 Chromium).

| Package        | Mức tối thiểu                      | Guard                    |
| -------------- | ---------------------------------- | ------------------------ |
| `tinita`       | chạy ở **mọi nơi**: Node + browser | L1 smoke + ca SSR của L2 |
| `tinita-dom`   | chạy được ở **browser**            | L4 Chromium              |
| `tinita-react` | chạy được với **React**, kể cả SSR | L2 `next:rsc-*`          |

`tinita` vẫn là tầng chung trên thực tế (`tinita-react` đang bundle
`getFileNameParts` từ nó). Khác biệt: "dùng chung" là _hệ quả_, không phải _luật_.

## Node floor: số đo quyết định việc phân loại

Đo 2026-10-01 bằng `docker run node:{18,20,22,24}-alpine`:

| Global                                                                 | Node 18 | Node 20 | Node 22 | Browser |
| ---------------------------------------------------------------------- | ------- | ------- | ------- | ------- |
| `Blob` `FormData` `URL` `atob` `btoa` `TextEncoder/Decoder`            | ✓       | ✓       | ✓       | ✓       |
| `Blob.prototype.arrayBuffer()` / `.text()`                             | ✓       | ✓       | ✓       | ✓       |
| `File`                                                                 | **✗**   | ✓       | ✓       | ✓       |
| `navigator`                                                            | ✗       | ✗       | ✓       | ✓       |
| `FileReader` `FileList` `document` `window` `DOMParser` `localStorage` | ✗       | ✗       | ✗       | ✓       |

Hai hệ quả trực tiếp:

1. **`FileReader` không có ở bất kỳ Node nào.** Nhưng `blob.arrayBuffer()` có từ
   Node 18. Nghĩa là `blobToBase64`, `fileToBase64`, `fileToUint8Array` đang
   browser-only **chỉ vì cách viết**, không phải vì bản chất. Viết lại là chúng
   thành "mọi nơi".
2. **`File` cần Node 20**, trong khi `engines` khai `>=18`. Ba file dùng `File`
   đang vi phạm chính hợp đồng của package. Xem QĐ-A.

## Phân loại 66 file

| Nhóm                                      | Số file | Đi đâu                 |
| ----------------------------------------- | ------: | ---------------------- |
| Thuần JS, không global nào                |      38 | giữ ở package hiện tại |
| Web standard (`Blob`/`atob`/`btoa`/`URL`) |       4 | `tinita` ✓             |
| Viết lại được thành "mọi nơi"             |       4 | `tinita` sau khi sửa   |
| Cần `File` global                         |       3 | chờ QĐ-A               |
| DOM thật sự, đang nằm sai chỗ             |  **14** | `tinita-dom`           |
| DOM, đã đúng package                      |       2 | ở yên                  |
| Xoá                                       |       2 | -                      |

Trong 14 file phải chuyển chỉ có **4 là converter** (`htmlToJSON`, `JSONToHTML`,
`elementToJSON`, `unit-converter`) trên tổng **26** converter. Đây không phải "tách
converter làm hai" - đây là 4 ngoại lệ parse hoặc sinh ra DOM node, và chúng thuộc
về `tinita-dom` bất kể Node có bao nhiêu người dùng.

Bảng chi tiết từng file: [`reports/01-phan-loai.md`](./reports/01-phan-loai.md).

## "Có cần support Node không?" - đã trả lời 2026-10-01

Không có dữ liệu người dùng để quyết: `tinita` 40 lượt tải/tháng, `tinita-react`
42, trên bản đang gãy. Đó là traffic của mirror, không phải người dùng.

Nhưng câu hỏi đặt sai trục. Với thư viện frontend, "support Node" **chính là
support SSR**, và người dùng SSR _là_ người dùng browser - app Next.js là app
browser mà code chạy trong Node lúc render, và App Router render trên server theo
mặc định. Với đúng tệp người dùng của `tinita-react`, tỉ lệ code chạy trong Node ở
lần render đầu gần 100%.

Bằng chứng trong chính repo: `FileTree` gọi `getFileNameParts` của `tinita` ngay
trong thân render, tức trong SSR. Cho `tinita` thành browser-only là làm gãy ca
`next:rsc-filetree-*` đang xanh.

**Tiêu chí thay thế, rẻ hơn và không cần dữ liệu:** _hàm này có nghĩa gì không khi
không có DOM?_ `stringToBase64` trên server: có. `objectToFormData` trong một
server action: có. `getScrollbarSize`: không - server không có thanh cuộn.

**Chi phí giữ universal là âm.** `fileToUint8Array` 21 dòng với `FileReader` thành
3 dòng với `blob.arrayBuffer()`. `blobToBase64` 23 dòng thành ~6.
`objectToFormData` cần đúng một guard. Cặp base64 đã universal sẵn.

## Lỗ hổng phải vá dù chọn đường nào

Fixture SSR của L2 (`SSR_ESM` / `SSR_CJS`) hiện **chỉ import `tinita-react`**,
không chạm converter nào của `tinita`. Nghĩa là hợp đồng "chạy mọi nơi" của
`tinita` đang chỉ nằm trong README chứ **không có guard**. Vá ở pha 01.

## Quyết định cần owner chốt

**QĐ-A - Node floor.** Node 18 đã EOL từ 2025-04. Ba lựa chọn cho nhóm dùng `File`:
nâng `engines` lên `>=20` (đơn giản nhất, mất người dùng Node 18); hoặc chuyển ba
file sang `tinita-dom`; hoặc đổi API trả `Blob` thay vì `File`. **Khuyến nghị: nâng
lên `>=20`** - Node 18 hết hỗ trợ bảo mật, và giữ nó đang làm `engines` nói dối.

**QĐ-B - `HTML_entities_map` 1514 dòng.** Chiếm 47% code mới cho một bảng tra. Giữ
nguyên, hay tách thành subpath riêng để người không cần không phải tải? Đo kích
thước sau build rồi quyết.

**QĐ-C - 7 file base64 chồng nhau.** `base64ToBlob`, `base64ToFile`,
`base64ToString`, `blobToBase64`, `fileToBase64`, `stringToBase64`,
`decoder/base64Decoder`. Cái cuối trùng logic với `base64ToBlob`. Cần gom thành
một bộ tối thiểu có invariant round-trip rõ ràng.

## Các pha

| Pha | Việc                                     | Trạng thái | Link                                                  |
| --- | ---------------------------------------- | ---------- | ----------------------------------------------------- |
| 01  | Chặn chảy máu: build xanh trở lại        | **XONG**   | [phase-01](./phase-01-stop-the-bleeding.md)           |
| 02  | Định tuyến package + xoá trùng lặp       | **XONG**   | [phase-02](./phase-02-routing.md)                     |
| 03  | Đưa 6 hàm owner nêu lên chuẩn Production | một phần   | [phase-03-six-functions](./phase-03-six-functions.md) |
| 04  | Phần còn lại, theo lô                    | chưa làm   | [phase-04](./phase-04-remainder.md)                   |

Mỗi pha kết thúc bằng `pnpm gate` xanh. Pha 03 và 04 thêm `pnpm gate --full`.

Pha 01 làm khác plan: thay vì cách ly vào `incoming/`, 32 lỗi TS được sửa thẳng,
nên không có vùng chờ nào phải dọn về sau. `pnpm gate` 7/7 PASS từ 2026-10-01, và
`pnpm build` 3/3 - lần đầu kể từ khi nhận nhánh.

Pha 03 đã xong `html` (encode/decode + plugin entities) và nhóm blob/base64. Còn
lại: khai `exports` + `typesVersions` + `contract.json` cho các converter mới, và
test cho chúng.

## Nguyên tắc xuyên suốt

> Đừng optimize utility cho "mọi edge case"; hãy optimize cho một contract có thể
> chứng minh được.

Cụ thể hoá thành cổng vào cho **mỗi** hàm được giữ lại:

1. JSDoc mô tả **contract**, không mô tả implementation: nhận gì, trả gì, **ném
   khi nào**, và invariant nào được bảo đảm.
2. Không silent failure. Đầu vào sai thì ném có kiểu, hoặc trả `null` có khai báo
   - chọn một và ghi vào JSDoc. Không được "nuốt rồi trả giá trị trông-như-đúng".
3. Có ca L1 trong `contract.json` (quy tắc sẵn có: export mới phải có ca L1).
4. Có test boundary: rỗng, Unicode ngoài BMP, surrogate pair, giá trị cực trị.
5. Có invariant round-trip khi áp dụng được, và nó được test bằng property.
