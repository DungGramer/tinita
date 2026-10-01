# Rà soát tên file, tên hàm, tên folder, vị trí

Đo 2026-10-01 trên 50 file chưa export của `feature/z`.

## Cửa sổ đổi tên đang MỞ, và nó sắp đóng

```
tinita        npm: 0.0.1                      local: 0.1.0
tinita-react  npm: 0.0.1 .. 0.0.2             local: 0.1.0
tinita-dom    npm: KHÔNG CÓ (E404)            local: 0.1.0
```

Bề mặt API `0.1.0` **chưa publish**. Mọi tên đổi bây giờ là miễn phí; đổi sau lần
publish đầu là breaking change. Đây là lý do pha đổi tên phải chạy TRƯỚC mọi pha
viết test và khai `exports` - không phải vì gọn, mà vì làm sau là làm hai lần.

## Lỗi 1: tên file khác tên export (6 ca)

| File                            | Export thật                 |
| ------------------------------- | --------------------------- |
| `converter/JSONToHTML.ts`       | `jsonToHTML`                |
| `converter/text.ts`             | 5 hàm, không hàm nào `text` |
| `typescript/enumKey.ts`         | `enumKeys`                  |
| `style/CSSVariable.ts`          | `setObjectAsCSSVariables`   |
| `converter/unit-converter.ts`   | `class Converter`           |
| `dimension/getScrollbarSize.ts` | default, không tên          |

Lớp lỗi này đã trả giá một lần ở pha 03: `stringToHTMLEntities.ts` export
`encodeToHTMLEntities` và owner gọi nó `encodeHtmlEntities` - **ba tên cho một hàm**.
Quy tắc: tên file == tên export, một export công khai một file.

## Lỗi 2: không có một quy ước viết hoa acronym

Tên đã ship lẫn cả hai lối:

```
blobToDataUrl   dataUrlToBlob          -> Url
generateUUID                           -> UUID
```

Tên trong draft lẫn thêm:

```
blobToURL  JSONToHTML  htmlToJSON  fileExtensionToMIME  MIMEToFileExtension
setObjectAsCSSVariables  jsonToHTML
```

Nền tảng web dùng CHỮ HOA (`URL`, `URLSearchParams`, `toDataURL`, `JSON`,
`crypto.randomUUID`). Nhưng `blobToDataUrl` đã viết `Url` và nó là anh em trực tiếp
của `dataUrlToBlob`. Hai lối không thể cùng tồn tại trong một package.

**Khuyến nghị: acronym viết hoa hết, trừ khi nằm giữa camelCase thì theo chuẩn
Google TS Style - `Url` ở giữa, `URL` ở đầu/cuối.** Google JavaScript/TypeScript
Style Guide nói đúng điều này: coi acronym như một từ thường (`loadHttpUrl`), nên
lối nhất quán duy nhất là `Url` khắp nơi, và `generateUUID` thành `generateUuid`.
Đây là một trong hai lựa chọn, owner chốt - nhưng phải chốt MỘT.

## Lỗi 3: folder không mang thông tin

| Folder                     | Vấn đề                                                    |
| -------------------------- | --------------------------------------------------------- |
| `tinita/src/typescript/`   | cả repo là TypeScript. Tên này không phân loại được gì    |
| `tinita-dom/src/download/` | 1 file. Folder cho một file là tiếng ồn                   |
| `tinita/src/validation/`   | predicate                                                 |
| `tinita-dom/src/detect/`   | **cũng là** predicate, tên khác                           |
| `tinita/src/converter/`    | 27 file, gồm cả đổi chữ hoa thường - không phải "convert" |

`converter/text.ts` là ví dụ rõ nhất: `titleCase` không chuyển biểu diễn, nó đổi
chữ. Nó thuộc `string/`, không thuộc `converter/`.

## Lỗi 4: tên nói sai việc hàm làm

| Tên                  | Làm thật                                                      |
| -------------------- | ------------------------------------------------------------- |
| `removeEmptySpace`   | **gộp** khoảng trắng về một, không xoá                        |
| `blobToURL`          | **cấp phát** object URL, người gọi phải `revokeObjectURL`     |
| `filterValidValue`   | "valid" theo định nghĩa của ai? thật ra là "bỏ rỗng"          |
| `localStorageAction` | hậu tố `Action` không mang nghĩa                              |
| `DownloadFile`       | PascalCase cho hàm thường; repo dành PascalCase cho component |
| `getArrayVal`        | `Val` là viết tắt tự nghĩ (AGENTS.md cấm)                     |
| `conditionObj`       | `Obj` viết tắt                                                |
| `uniquePushArray`    | động từ nằm giữa                                              |

`blobToURL` nặng nhất: nó rò bộ nhớ nếu người gọi không biết phải revoke, và tên
không hề báo. Tên đúng phải chứa `create` để nói ra rằng có thứ cần dọn.

## Lỗi 5: `export default` không nhất quán (8 ca)

```
tinita-dom: getScrollbarSize, class Converter
tinita-react: usePagination, useDoubleTap, useRefreshComponent,
              useWindowSize, jsxJoin, CreateContextHook
```

Toàn bộ API đã ship là named export. Lẫn default vào gây hai hệ quả đo được:
`attw` báo sai hình dạng interop CJS/ESM, và `require('tinita-dom/...')` trả
`{ default: fn }` thay vì hàm. Quy tắc: **named export, không default**, ở cả 3
package.

`CreateContextHook` còn sai cả casing: PascalCase cho một factory trả hook.

## Lỗi 6: JSDoc

| Trạng thái                              | Số file |
| --------------------------------------- | ------: |
| Không có JSDoc nào                      |      31 |
| Có `@example` nhưng không khai contract |      13 |
| Có contract đầy đủ (ném gì, bảo đảm gì) |       6 |

6 file đạt chuẩn đều là file đã đi qua pha 02/03 (`conditionObj`,
`uniquePushArray`, `checkMobile`...). Chúng là khuôn mẫu cho 44 file còn lại.

Lỗi JSDoc nặng nhất: `snakeToTitleCase` gọi `console.error` rồi **trả về nguyên
input** khi gặp non-string. Vừa side effect vào global, vừa silent failure, vừa
không khai ở đâu.

## Lỗi 7: vị trí sai

| File                                  | Nên ở                                              |
| ------------------------------------- | -------------------------------------------------- |
| `tinita/src/converter/text.ts`        | `tinita/src/string/` (5 file riêng)                |
| `tinita/src/converter/blobToURL.ts`   | **ở yên** `tinita/` - xem số đo bên dưới           |
| `tinita-dom/src/detect/isBlockTag.ts` | cùng nhóm với html-JSON trio, không phải `detect/` |
| `tinita/src/constant/print_*.ts`      | `tinita/src/print/` nếu giữ                        |

Về `blobToURL`: tôi đã đoán nó sai package vì `URL.createObjectURL`. Đo bằng
`docker run node:{18,20,22}-alpine` ngày 2026-10-01 cho thấy **đoán sai** - cả ba
bản đều có `URL.createObjectURL` là `function` và đều tạo được `blob:` URL thật.
Node thêm nó từ v16.7.0. Vậy `blobToURL` ở yên `tinita`; khuyết điểm của nó chỉ là
tên và contract revoke, không phải vị trí.

Nghĩa là **không còn file nào sai package** sau pha 02.

## Bảng đổi tên đề xuất

Pha 04 chốt bảng này rồi thực hiện một lần. Xem `phase-04-naming-and-placement.md`.

**Sources:**

- [Google TypeScript Style Guide, Identifiers](https://google.github.io/styleguide/tsguide.html#identifiers)
