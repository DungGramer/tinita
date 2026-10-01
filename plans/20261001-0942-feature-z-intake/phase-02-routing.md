# Pha 02 - Định tuyến package và xoá trùng lặp

**Phụ thuộc:** pha 01 xong (gate xanh, 66 file nằm trong `incoming/`).

Pha này **chỉ di chuyển file và xoá file**. Không sửa logic. Lý do: trộn "đổi chỗ"
với "đổi hành vi" trong một bước làm không ai biết lỗi đến từ đâu.

## Luật

| Package        | Mức tối thiểu | Nghĩa là                                       |
| -------------- | ------------- | ---------------------------------------------- |
| `tinita`       | mọi nơi       | chạy được trên Node thuần **và** trong browser |
| `tinita-dom`   | browser       | được phép chạm `document`/`window`/`navigator` |
| `tinita-react` | có React      | được phép dùng hook, phải sống sót SSR         |

Bảng từng file: [`reports/01-phan-loai.md`](./reports/01-phan-loai.md).

## Kết quả đo

- **51 file** ở yên vị trí hiện tại.
- **14 file** chuyển từ `tinita` sang `tinita-dom`.
- **2 file** xoá (đã làm ở pha 01).

### 14 file sang `tinita-dom`

| Nhóm             | File                                                             |
| ---------------- | ---------------------------------------------------------------- |
| converter (4/26) | `htmlToJSON` · `JSONToHTML` · `elementToJSON` · `unit-converter` |
| detect           | `checkBrowser` · `checkMobile` · `checkOS` · `isBlockTag`        |
| storage          | `cookieStorage` · `localStorage` · `sessionStorage`              |
| khác             | `DownloadFile` · `resizeImage` · `CSSVariable`                   |

**Chỉ 4 trong 26 converter phải chuyển.** Cả bốn đều parse hoặc sinh ra DOM node -
`DOMParser`, `HTMLElement`, nhận `Element`, đo px bằng `document`. Đây không phải
"tách converter làm hai"; 22 converter còn lại ở nguyên `tinita`.

### 4 file KHÔNG chuyển - viết lại là thành "mọi nơi"

Đây là phát hiện đáng giá nhất của pha này. Đo 2026-10-01:
`Blob.prototype.arrayBuffer()` và `.text()` **có từ Node 18**, còn `FileReader`
không có ở bất kỳ bản Node nào.

| File               | Hiện tại                                           | Sửa                                     | Sau khi sửa |
| ------------------ | -------------------------------------------------- | --------------------------------------- | ----------- |
| `blobToBase64`     | `FileReader`                                       | `await blob.arrayBuffer()`              | mọi nơi     |
| `fileToBase64`     | `FileReader`                                       | nhận `Blob`, `arrayBuffer()`            | mọi nơi     |
| `fileToUint8Array` | `FileReader`                                       | nhận `Blob`, `arrayBuffer()`            | mọi nơi     |
| `objectToFormData` | `instanceof FileList` ném ReferenceError trên Node | guard `typeof FileList !== 'undefined'` | mọi nơi     |
| `base64Decoder`    | `window.atob`                                      | đã xoá, trùng `base64ToBlob`            | -           |

Ba hàm đầu đổi tham số từ `File` sang `Blob`. `File extends Blob` nên mọi code
đang truyền `File` vẫn chạy - mở rộng chứ không phá.

Việc sửa thuộc pha 03, pha này chỉ **không chuyển** chúng đi.

## Nhóm `File` chờ QĐ-A

`blobToFile`, `base64ToFile`, `uint8ArrayToFile` cần `File` global. Đo được: Node
18 **không có**, Node 20+ có. `engines` đang khai `>=18`.

Ba lựa chọn, cần owner chốt trước khi pha 03 đụng vào:

|                                                 | Được                            | Mất                                                    |
| ----------------------------------------------- | ------------------------------- | ------------------------------------------------------ |
| **A1. Nâng `engines` lên `>=20`** (khuyến nghị) | ba hàm ở `tinita`, API tự nhiên | bỏ người dùng Node 18                                  |
| A2. Chuyển sang `tinita-dom`                    | không đổi `engines`             | người dùng Node 20 mất hàm mà runtime của họ chạy được |
| A3. Trả `Blob` thay vì `File`                   | mọi nơi, Node 18 chạy           | mất `name`, tức mất đúng lý do `File` tồn tại          |

Node 18 đã EOL từ 2025-04-30. Giữ `>=18` nghĩa là `engines` đang nói dối về một
runtime không còn nhận bản vá bảo mật.

## Việc

1. Chốt QĐ-A.
2. `git mv` 14 file sang `packages/tinita-dom/incoming/`.
3. `tinita-dom` chưa có thư mục theo nhóm - dựng `detect/`, `storage/`, `style/`,
   `download/`, `image/`, `converter/` theo đúng quy ước của hai package kia.
4. Cập nhật `docs/codebase-summary.md` bảng package -> nội dung.

## Tiêu chí xong

- `grep -rE '\b(document|window|navigator|FileReader|FileList|DOMParser|localStorage|sessionStorage)\b'`
  trên `packages/tinita/incoming` và `packages/tinita/src`, bỏ comment và chuỗi,
  trả về **rỗng**. Đây là guard chạy được, nên nó thành một ca test ở pha 03.
- `pnpm gate` vẫn xanh (file vẫn nằm ngoài glob nên không ảnh hưởng build).
- Số file trong `packages/tinita/incoming` giảm đúng 14.

## Rủi ro

**`tinita-dom` đang là zero-dependency, zero-peer và browser-only không SSR guard.**
14 file này phải giữ đúng tính chất đó. `checkMobile` hiện đụng `navigator` trực
tiếp - trong `tinita-dom` thì đó là hành vi đúng theo thiết kế, không phải lỗi.
Nhưng `README` của `tinita-dom` phải liệt kê chúng, nếu không người dùng gọi trên
server rồi báo bug.

## Tiếp theo

Pha 03 - sáu hàm owner nêu đích danh.
