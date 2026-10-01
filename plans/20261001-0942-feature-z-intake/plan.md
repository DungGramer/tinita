# Tiếp nhận `feature/z`: 67 file draft lên chuẩn production

**Ngày:** 2026-10-01 · **Nhánh:** `feature/z` · **Số đo chi tiết:**
[`reports/00`](./reports/00-plan-chi-tiet-cu.md)

## Trạng thái

Nhánh nhận về với 38 lỗi TS, build đỏ, 0 test, 0 export khai báo. Pha 01-03 đã xong:
`pnpm gate --full` **9/9 PASS**, 156 test (đo `pnpm test` 2026-10-01: tinita 90,
tinita-dom 17+1 todo, tinita-react 49), **35** export công khai (18 + 6 + 11; CLAUDE.md đếm `tinita-react` là 10 vì bỏ barrel `.`).

Còn **50 file** có hàm chưa export: `tinita` 29, `tinita-dom` 15, `tinita-react` 6.

## Owner chốt 2026-10-01: giữ hết, nâng chuẩn

Bản plan trước đề xuất xoá 13 hàm quá mỏng. Owner chốt giữ. Hệ quả: bề mặt API đi
từ 35 lên khoảng **85** export, mỗi cái là cam kết không đổi signature được nữa.
Số chính xác do từng pha chốt khi khai `exports`.

Yêu cầu sinh ra từ đó: **hàm mỏng phải có contract mỏng tương ứng.** `createRange(n)`
cần ba câu - nhận gì, trả gì, ném khi nào. 40 dòng JSDoc cho 4 dòng code là hạ chuẩn
theo chiều ngược lại.

## Ba trục rà soát owner nêu thêm

Ngoài test và JSDoc: **tên file, tên hàm, tên folder, vị trí, edge case.** Đo được
([`reports/03`](./reports/03-ra-soat-ten-va-vi-tri.md)):

| Lớp lỗi                            | Số ca |
| ---------------------------------- | ----: |
| Tên file khác tên export           |     6 |
| `export default` (repo dùng named) |     8 |
| Folder không phân loại được gì     |     5 |
| Tên nói sai việc hàm làm           |     8 |
| Không có JSDoc nào                 |    31 |
| Không có quy ước acronym nhất quán |    13 |

**Cửa sổ đổi tên sắp đóng.** `npm view`: `tinita` chỉ có `0.0.1`, `tinita-react` tới
`0.0.2`, `tinita-dom` **chưa tồn tại** (E404). Local cả ba `0.1.0`, chưa publish.
Đổi tên hôm nay miễn phí; sau lần publish đầu là breaking. Vì vậy pha đổi tên đứng
**trước** pha viết test - làm sau là làm hai lần.

## Chờ owner chốt

**QĐ-D - ba bảng hằng số** ([`reports/02`](./reports/02-nguon-goc-bang-hang-so.md)).
Owner nhớ "thông số chuẩn từ Chromium"; đo ra đúng một nửa. `PAGE_SIZES` **là** chuẩn
(ISO 216/217, 51 khổ, 0 sai số). Bảng MIME **không**: bản sao `conf/web.xml` của
Apache Tomcat ~2003, có `image/x-jg` đã chết, thiếu `webp`/`avif`/`woff2`/`wasm`.
`PRINT_TYPE` tính `ratio` trên **ba cơ sở khác nhau** trong một bảng 12 dòng.
Khuyến nghị: giữ `pageSizes`; sinh lại bảng MIME từ `mime-db` lúc build rồi commit;
`ratio` một cơ sở.

**QĐ-E - quy ước acronym.** Phải chọn trước khi pha 04 chạy `git mv` nào:

| Đường                                   | `blobToDataUrl` | `generateUUID` | `JSONToHTML` | Đổi |
| --------------------------------------- | --------------- | -------------- | ------------ | --: |
| **E1** acronym là từ thường (Google TS) | giữ             | `generateUuid` | `jsonToHtml` |  13 |
| **E2** acronym CHỮ HOA (nền tảng web)   | `blobToDataURL` | giữ            | `jsonToHTML` |  11 |

Khuyến nghị **E1**: không cần luật phụ cho acronym đứng đầu tên, và giữ cặp
`blobToDataUrl`/`dataUrlToBlob` đã có test. Giá: `generateUUID` đã publish trong
`0.0.1`, nên breaking - nhưng `0.0.1` bị deprecate ở pha 08 nên khuyến nghị breaking
thẳng, không alias. QĐ-A/B/C đã chốt và đã làm (xem reports/00).

## Các pha

| Pha | Việc                                | Trạng thái                   | Link                                           |
| --- | ----------------------------------- | ---------------------------- | ---------------------------------------------- |
| 01  | Chặn chảy máu: build xanh trở lại   | **XONG**                     | [phase-01](./phase-01-stop-the-bleeding.md)    |
| 02  | Định tuyến package + xoá trùng lặp  | **XONG**                     | [phase-02](./phase-02-routing.md)              |
| 03  | 6 hàm owner nêu đích danh lên chuẩn | **XONG**                     | [phase-03](./phase-03-six-functions.md)        |
| 04  | Chốt tên, vị trí, hình dạng export  | **XONG**                     | [phase-04](./phase-04-naming-and-placement.md) |
| 05  | 29 file của `tinita`                | **XONG**                     | [phase-05](./phase-05-tinita-pure.md)          |
| 06  | 15 file của `tinita-dom`            | **XONG**                     | [phase-06](./phase-06-tinita-dom.md)           |
| 07  | 6 file của `tinita-react`           | **XONG**                     | [phase-07](./phase-07-tinita-react.md)         |
| 08  | Docs, guard, cổng publish của owner | **XONG** (publish chờ owner) | [phase-08](./phase-08-publish-readiness.md)    |

Pha 04 chặn 05/06/07. Ba pha đó **song song được** (khác package, khác file). Pha 08
cần cả ba xong. Mỗi pha kết thúc bằng `pnpm gate --full` 9/9.

## Nguyên tắc xuyên suốt

> Đừng optimize utility cho "mọi edge case"; hãy optimize cho một contract có thể
> chứng minh được.

Cổng vào cho **mỗi** hàm: JSDoc mô tả contract (nhận gì, trả gì, **ném khi nào**,
invariant nào bảo đảm), không mô tả implementation; không silent failure; có ca L1
trong `contract.json`; test boundary (rỗng, ngoài BMP, surrogate đơn lẻ, cực trị);
property test ở nơi có invariant round-trip.

Và quy tắc của repo, áp nguyên: **guard mới phải được chứng minh bằng cách phá đúng
thứ nó canh**, không phải bằng việc nó xanh.
