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

## Quyết định của owner

**QĐ-A - Node floor. CHỐT: giữ `engines >=18`.** Theo tài liệu owner dán
2026-10-01: với common utility library, `engines.node` là compatibility metadata,
không phải tuyên bố runtime. Ba file dùng `File` chuyển sang `tinita-dom` thay vì
nâng floor. Đã làm ở pha 02.

**QĐ-B - `HTML_entities_map` 1514 dòng. CHỐT: tách subpath**
(`tinita/html/plugin/entities`), viết theo kiểu `.extend()` của dayjs. Đã làm ở
pha 03.

**QĐ-C - 7 file base64 chồng nhau. CHỐT: gom về cặp lõi công khai**
`bytesToBase64`/`base64ToBytes`, 4 hàm kia compose lên đó. Đã làm ở pha 03.

**QĐ-D - ba bảng hằng số.** Owner nhớ là "thông số chuẩn từ Chromium". Đo
2026-10-01 ([`reports/02`](./reports/02-nguon-goc-bang-hang-so.md)): đúng một nửa.
`PAGE_SIZES` **là** chuẩn - ISO 216/217 + 5 khổ Bắc Mỹ, 51 khổ, 0 sai số. Bảng MIME
**không** phải Chromium - nó là bản sao `conf/web.xml` của Apache Tomcat (~2003),
có `image/x-jg` đã chết, thiếu `image/webp`/`avif`/`woff2`/`wasm`/`webm`.
`PRINT_TYPE` không thuộc chuẩn nào và `ratio` tính trên **ba cơ sở khác nhau** trong
một bảng 12 dòng. Khuyến nghị: giữ `pageSizes` nguyên số, sinh lại bảng MIME từ
`mime-db` lúc build rồi commit, tính lại `ratio` một cơ sở. **Chờ owner xác nhận.**

**QĐ-E - quy ước viết hoa acronym. CHỜ OWNER.** Hai đường, phải chọn một trước khi
pha 04 chạy `git mv` nào:

| Đường                                   | `blobToDataUrl` | `generateUUID` | `JSONToHTML` | Phải đổi |
| --------------------------------------- | --------------- | -------------- | ------------ | -------: |
| **E1** acronym là từ thường (Google TS) | giữ             | `generateUuid` | `jsonToHtml` |       13 |
| **E2** acronym CHỮ HOA (nền tảng web)   | `blobToDataURL` | giữ            | `jsonToHTML` |       11 |

Khuyến nghị **E1**: không cần luật phụ cho acronym đứng đầu tên, và giữ được cặp
`blobToDataUrl`/`dataUrlToBlob` đã có test ở pha 03. Giá: `generateUUID` đã publish
trong `tinita@0.0.1`, nên đây là breaking - nhưng `0.0.1` sẽ bị `npm deprecate` ở
pha 08 nên khuyến nghị breaking thẳng, không alias.

## Các pha

| Pha | Việc                                           | Trạng thái | Link                                           |
| --- | ---------------------------------------------- | ---------- | ---------------------------------------------- |
| 01  | Chặn chảy máu: build xanh trở lại              | **XONG**   | [phase-01](./phase-01-stop-the-bleeding.md)    |
| 02  | Định tuyến package + xoá trùng lặp             | **XONG**   | [phase-02](./phase-02-routing.md)              |
| 03  | 6 hàm owner nêu đích danh lên chuẩn Production | **XONG**   | [phase-03](./phase-03-six-functions.md)        |
| 04  | Chốt tên, vị trí, hình dạng export             | chưa làm   | [phase-04](./phase-04-naming-and-placement.md) |
| 05  | 29 file của `tinita`                           | chưa làm   | [phase-05](./phase-05-tinita-pure.md)          |
| 06  | 15 file của `tinita-dom`                       | chưa làm   | [phase-06](./phase-06-tinita-dom.md)           |
| 07  | 6 file của `tinita-react`                      | chưa làm   | [phase-07](./phase-07-tinita-react.md)         |
| 08  | Docs, guard, cổng publish của owner            | chưa làm   | [phase-08](./phase-08-publish-readiness.md)    |

Pha 04 chặn 05/06/07. Ba pha đó **song song được** (khác package, khác file). Pha 08
cần cả ba xong.

Mỗi pha kết thúc bằng `pnpm gate` xanh. Pha 03-08 thêm `pnpm gate --full`.

Pha 01 làm khác plan: thay vì cách ly vào `incoming/`, 32 lỗi TS được sửa thẳng,
nên không có vùng chờ nào phải dọn về sau.

Pha 03 xong 2026-10-01: `html` (encode/decode + plugin entities), nhóm blob/base64
(thêm cặp `bytesToBase64`/`base64ToBytes` làm lõi công khai), `objectToFormData`.
`pnpm gate --full` **9/9 PASS**. 35 ca test mới, `tinita` tổng 90.

## Phạm vi còn lại: 50 file, và owner đã chốt "giữ hết"

Đo 2026-10-01: 50 file trong `packages/*/src/` có hàm **chưa export**.

| Package        | File chưa export | Pha |
| -------------- | ---------------: | --- |
| `tinita`       |               29 | 05  |
| `tinita-dom`   |               15 | 06  |
| `tinita-react` |                6 | 07  |

Bản plan trước đề xuất xoá 13 hàm quá mỏng (`pick`, `omit`, `uniqueArray`...).
**Owner chốt 2026-10-01: giữ hết, nâng chuẩn.** Hệ quả: bề mặt API đi từ 34 export
công khai lên **83**, và mỗi cái là một cam kết không đổi được signature nữa.

Yêu cầu mới sinh ra từ quyết định đó: **hàm mỏng phải có contract mỏng tương ứng.**
`createRange(n)` cần ba câu - nhận gì, trả gì, ném khi nào. Viết 40 dòng JSDoc cho 4
dòng code là hạ chuẩn theo chiều ngược lại.

## Thêm ba trục rà soát (owner nêu 2026-10-01)

Ngoài test và JSDoc, phải rà: **tên file, tên hàm, tên folder, vị trí file, quy ước
đặt tên, edge case, JSDoc.** Kết quả đo ở
[`reports/03-ra-soat-ten-va-vi-tri.md`](./reports/03-ra-soat-ten-va-vi-tri.md):

| Lớp lỗi                                 | Số ca |
| --------------------------------------- | ----: |
| Tên file khác tên export                |     6 |
| `export default` (toàn repo dùng named) |     8 |
| Folder không phân loại được gì          |     5 |
| Tên nói sai việc hàm làm                |     8 |
| Không có JSDoc nào                      |    31 |
| Không có quy ước acronym nhất quán      |    13 |

**Cửa sổ đổi tên đang mở và sắp đóng.** `npm view`: `tinita` chỉ có `0.0.1`,
`tinita-react` tới `0.0.2`, `tinita-dom` **chưa tồn tại** (E404). Local cả ba là
`0.1.0`, chưa publish. Đổi tên hôm nay miễn phí; đổi sau lần publish `0.1.0` đầu
tiên là breaking change. Đó là lý do pha 04 (đổi tên) đứng trước pha 05-07 (test +
`exports`) - làm sau là làm hai lần.

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
