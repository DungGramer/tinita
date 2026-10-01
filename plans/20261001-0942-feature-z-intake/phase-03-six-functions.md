# Pha 03 - Sáu hàm owner nêu đích danh, lên chuẩn Production

**Phụ thuộc:** pha 02 xong, QĐ-A đã chốt.

Owner nêu: `fileToBlob`, `blobToFile`, `stringToBase64`, `base64ToString`,
`encodeHtmlEntities`, `objectToFormData`.

Hai cái không khớp thực tế:

- `fileToBlob.ts` là **file rỗng 0 byte**. Không có gì để sửa - phải viết mới, và
  trước đó phải trả lời: nó dùng để làm gì? `File` **đã là** `Blob`
  (`File extends Blob`), nên `fileToBlob(f)` hoặc là no-op, hoặc là "tước metadata
  để lấy Blob thuần". Nếu là vế sau thì tên phải nói ra điều đó.
- `encodeHtmlEntities` không tồn tại. Thứ gần nhất là `stringToHTMLEntities.ts`,
  export tên `encodeToHTMLEntities`. **Ba tên cho một hàm** - tên file, tên export,
  tên owner gọi.

## Cổng vào, áp cho từng hàm

| Tiêu chí              | Chứng minh bằng                                                                            |
| --------------------- | ------------------------------------------------------------------------------------------ |
| Type-safe             | `pnpm check-types` 0 lỗi, không `any` ngầm                                                 |
| Single responsibility | một hàm một việc, không cờ đổi kiểu trả về (quy tắc sẵn có trong `docs/code-standards.md`) |
| Deterministic         | cùng input ra cùng output, **kể cả thời gian**                                             |
| Không side effect     | không chạm global, không mutate tham số                                                    |
| Error semantics rõ    | JSDoc nói **ném khi nào** và ném cái gì                                                    |
| Unicode/boundary      | test: rỗng, ngoài BMP, surrogate đơn lẻ, chuỗi dài                                         |
| Round-trip invariant  | property test, không phải ví dụ lẻ                                                         |
| Browser/SSR           | ca L1 (Node) + ca L2 SSR                                                                   |
| JSDoc                 | mô tả contract, không mô tả implementation                                                 |
| API stability         | có mặt trong `contract.json`, ca L1 bắt khi đổi                                            |
| Dependency tối thiểu  | `tinita` vẫn zero-dependency                                                               |

---

## 1. `stringToBase64` / `base64ToString` - làm trước

Cặp này rõ contract nhất nên làm đầu để lập khuôn cho các hàm còn lại.

**Hiện trạng:** đúng về logic (`TextEncoder` -> `btoa`), không JSDoc, không test.

**Vấn đề đo được:**

- `base64ToString` gọi `atob` trên chuỗi hỏng -> ném `InvalidCharacterError`,
  **không khai báo ở đâu cả**. Đây đúng là "failure mode không rõ".
- Không xử lý base64url (`-_`) và thiếu padding. Hiện trả kết quả sai trong im
  lặng hoặc ném, tuỳ chuỗi.
- `stringToBase64` nối chuỗi trong vòng lặp từng byte. Với input MB thì đây là
  điểm nóng. Có `performance test` ở cột Production.

**Contract phải chốt:**

```
stringToBase64(s: string): string
  - đảm bảo: base64ToString(stringToBase64(s)) === s với MỌI string
  - không ném với bất kỳ string nào, kể cả lone surrogate
base64ToString(b: string): string
  - NÉM TypeError khi b không phải base64 hợp lệ
  - KHÔNG tự đoán base64url: hoặc nhận cả hai và ghi rõ, hoặc từ chối
```

**Quyết định cần chốt:** lone surrogate. `TextEncoder` thay surrogate đơn lẻ bằng
U+FFFD, nên round-trip **không** giữ nguyên. Hai đường: khai trong JSDoc rằng
surrogate đơn lẻ bị thay thế (trung thực, đơn giản), hoặc ném. Khuyến nghị khai
báo - thay thế là hành vi của chính `TextEncoder`, giấu nó đi mới là nói dối.

**Test bắt buộc:** property test round-trip trên chuỗi ngẫu nhiên gồm ASCII, tiếng
Việt có dấu, emoji ngoài BMP, chuỗi rỗng. Owner đã nêu "fuzz/property testing nên
có cho encoder/decoder" - đây chính là nó.

---

## 2. `objectToFormData` - gần chuẩn nhất, có một lỗi chết người

**Hiện trạng:** 186 dòng, JSDoc đầy đủ, có options. Là file tốt nhất trong 66 file.

**Lỗi phải sửa trước mọi thứ khác:**

```ts
if (value instanceof FileList)   // ReferenceError: FileList is not defined
```

`FileList` không tồn tại ở **bất kỳ** bản Node nào (đo 2026-10-01, node 18/20/22/24).
Gọi hàm này trong SSR là crash, không phải degrade. Sửa:
`typeof FileList !== 'undefined' && value instanceof FileList`.

**Lỗi khác:**

- Không chống chu trình. `const o={}; o.self=o; objectToFormData(o)` -> tràn stack.
- `Date` không hợp lệ bị **bỏ im lặng**. JSDoc không nói. Phải chọn: ném, hay bỏ và
  ghi vào JSDoc.
- Giá trị `symbol` -> `String(sym)` ném `TypeError` không khai báo.

**Contract phải chốt:** ba câu hỏi trên, mỗi câu một dòng trong JSDoc.

**Test:** nested + array + Blob + Date + null; SSR (chạy trong Node thuần, không
jsdom) để chứng minh đã hết ReferenceError; chu trình phải ném có kiểu.

---

## 3. `encodeToHTMLEntities` - hỏng nặng nhất, cân nhắc viết lại

**Đây là hàm nguy hiểm nhất trong cả nhánh.** Nó dựng regex như sau:

```ts
const charactersToEncode = Object.keys(HTMLEntitiesMap).filter(...).join('');
const regex = new RegExp(`[${charactersToEncode}]`, 'gi');
```

**Đính chính 2026-10-01.** Bản đầu của pha này liệt kê bốn lỗi; chạy thử chính
thuật toán gốc với bảng thật cho thấy hai trong số đó là tôi suy đoán sai:

- ~~Cờ `i` làm `Á` khớp key `á` và sinh entity sai~~ - **không**. Code tra cứu
  theo _chuỗi khớp được_, không theo pattern, nên nó tự đúng: `Á á` ra
  `&Aacute; &aacute;`.
- ~~JSDoc bỏ sót `ĩ` là bằng chứng regex hỏng~~ - **không**. Thuật toán gốc encode
  `ĩ` bình thường; ví dụ trong JSDoc chỉ viết sai.

Số lượng cũng sai: bảng có **1510** entry, không phải 1126 - regex đếm ban đầu bỏ
sót key không đặt trong nháy.

Lỗi THẬT, đo được:

1. **65 key nhiều code point** (`<⃒`, `=⃥`, `fj`). Character class chỉ khớp được
   một code point, nên `<⃒` ra `&lt;` còn dấu kết hợp bị bỏ rơi phía sau - một ký
   tự hoàn toàn khác. Đây là phá dữ liệu.
2. **65 entity thiếu dấu `;`** trong chính dữ liệu nguồn. `&bne` nối chữ phía sau
   thành `&bnex`, trình duyệt in nguyên văn.
3. **Một giá trị trùng** (`&varsupsetneqq` ứng hai ký tự) làm decode nhập nhằng và
   phá round-trip.
4. **Regex 1510 nhánh dựng lại mỗi lần gọi.**

**Khuyến nghị: viết lại, không vá.** Dùng `String.prototype.replace` với một
callback tra map theo từng code point (`for...of` lặp theo code point, không theo
code unit), bỏ hẳn regex động.

**Quyết định cần chốt - phạm vi:** mã hoá **mọi** ký tự trong bảng 1510 entry, hay
chỉ 5 ký tự bắt buộc của HTML (`& < > " '`)? Đây là câu hỏi "contract chứng minh
được" của owner. Mã hoá tất cả cho output to hơn nhiều lần và không an toàn hơn.
Khuyến nghị: mặc định 5 ký tự, có option mở rộng. Và **đổi tên** cho khớp việc nó
làm - một tên, dùng ở cả tên file lẫn tên export.

---

## 4. `blobToFile` - lỗi determinism

```ts
return new File([blob], fileName, { type: blob.type });
```

Không truyền `lastModified`, nên `File` lấy `Date.now()`. **Gọi hai lần cùng input
ra hai kết quả khác nhau.** Vi phạm trực tiếp tiêu chí Deterministic.

**Sửa:** thêm tham số `lastModified` tuỳ chọn; không truyền thì mặc định `0`, không
phải `Date.now()`. Mặc định phải xác định được.

Phụ thuộc QĐ-A (`File` cần Node 20+).

---

## 5. `fileToBlob` - viết mới hoặc bỏ hẳn

File rỗng. Trước khi viết, trả lời: `File extends Blob` rồi, hàm này để làm gì?

- Nếu là "tước tên và lastModified để còn Blob thuần" -> hợp lệ, nhưng tên phải là
  `stripFileMetadata` hoặc tương tự, và JSDoc phải nói nó **tạo Blob mới**.
- Nếu không trả lời được -> **xoá**. Một hàm không giải thích được lý do tồn tại
  thì không có contract để chứng minh.

Khuyến nghị: xoá. Thêm một dòng vào README mục FAQ: "`File` đã là `Blob`, truyền
thẳng được."

---

## Tiêu chí xong của cả pha

- 5 hàm (hoặc 4, nếu bỏ `fileToBlob`) rời `incoming/` vào `src/`.
- Mỗi hàm: JSDoc contract, trong `exports` + `typesVersions`, có ca trong
  `contract.json`, có test.
- `pnpm gate --full` 9/9 PASS.
- L1 tăng đúng số ca bằng số specifier mới.
- Property test round-trip của cặp base64 chạy >= 1000 mẫu, 0 fail.
- Chứng minh guard bằng cách phá: bỏ guard `typeof FileList` -> ca SSR của L2 phải
  đỏ. Đây là quy tắc sẵn có của repo, không phải thủ tục thêm.

## Tiếp theo

Pha 04 - 60 file còn lại.
