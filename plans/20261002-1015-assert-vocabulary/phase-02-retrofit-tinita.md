# Pha 02 - Retrofit `tinita`: thay inline bằng vốn từ, ở ĐÚNG biên

## Context links

- Plan cha: [`plan.md`](./plan.md) · Phụ thuộc: **pha 01 xong** (vốn từ + guard)
- Song song được với pha 03 (khác package)
- Số đo: [`reports/00-do-khoang-cach.md`](./reports/00-do-khoang-cach.md)

## Overview

**Ngày:** 2026-10-02 · **Ưu tiên:** P1 · **Trạng thái:** chưa làm · **Review:** chưa

Thay các điều kiện inline trong `tinita` bằng primitive của pha 01. Việc khó không
phải thay, mà là **không thay ở chỗ không nên thay**.

## Key Insights

**§14 là phần dễ làm sai nhất của pha này, và repo có sẵn hai cái bẫy.** Hai hàm
trong `tinita` đệ quy:

```
object/omitEmptyValues.ts   omitEmptyValues() -> filter() -> filter() -> ...
converter/objectToMap.ts    objectToMap() tự gọi chính nó cho mỗi object lồng
```

`omitEmptyValues` hiện kiểm `obj === null || typeof obj !== 'object'` **trong
`filter`**, tức ở mỗi tầng đệ quy. Thay nó bằng `assertObject` mà giữ nguyên vị trí
là biến một kiểm nội bộ thành một lời gọi helper chạy O(số node) - đúng điều §14 và
§15 nói đừng làm. Đích đúng: `assertObject` một lần ở `omitEmptyValues`, và `filter`
tin invariant đó.

Nhưng `objectToMap` thì **khác**: nó tự gọi chính nó như một hàm công khai, và mỗi
tầng nhận dữ liệu chưa kiểm từ tầng trước. §14 nói revalidate khi "hàm độc lập công
khai" - nên ở đây giữ kiểm từng tầng là đúng. Hai hàm đệ quy, hai phán quyết trái
nhau, và lý do phải ghi vào code.

**§15 có một ca thật trong `converter`.** `bytesToBase64` chia khối trong vòng lặp;
assertion của nó nằm ngoài vòng, và phải giữ như vậy. `objectToFormData` đi cây và
`sortAlphaText` gọi `read()` cho mỗi phần tử - `read()` hiện ném `TypeError` nêu đúng
index khi item không phải string. Đó **không** phải vi phạm §15: nó kiểm từng phần tử
vì mỗi phần tử là dữ liệu khác nhau, không phải kiểm lặp cùng một giá trị. Phân biệt
này phải nêu, vì nhìn qua nó giống hệt một assert trong hot loop.

**21 thông báo thiếu tiền tố tên hàm trở thành vấn đề ở chính pha này.** Khi 14 file
cùng gọi `assertString`, thông báo không nêu tên hàm thì không ai biết API nào từ
chối - đó đúng là điều §7 nói. Pha này truyền `caller` cho mọi lời gọi; phần sửa 21
thông báo inline còn lại thuộc pha 04.

## Requirements

1. Mọi lời gọi primitive truyền `caller` là **tên API công khai**, không phải tên hàm
   nội bộ (§7).
2. Assertion ở **biên công khai**, không ở mọi tầng nội bộ (§14). Mỗi ngoại lệ phải
   có một dòng lý do trong code.
3. Không thêm assertion vào vòng lặp đang chạy trên cùng một giá trị (§15).
4. Không đổi loại error của chỗ nào (§8 theo cách đọc owner chốt: 0 breaking change).
5. Thông báo lỗi có thể đổi **hình dạng** nhưng phải giữ thông tin: tên API, cái gì
   sai, nhận được gì.
6. Điều kiện chỉ xuất hiện một lần và không phải invariant tái dùng thì **giữ inline**
   (§3 Level 1) - không thay cho đủ bộ.

## Architecture

### Phán quyết từng nhóm trong `tinita`

| Nhóm                                       | Thay bằng                      | Ghi chú                                                                                                   |
| ------------------------------------------ | ------------------------------ | --------------------------------------------------------------------------------------------------------- |
| `string/*` (6 file)                        | `assertString`                 | mỗi hàm một lời gọi ở đầu                                                                                 |
| `validation/*` (5 file)                    | **không thay**                 | chúng là predicate `isX`, trả `boolean`, không ném (§12)                                                  |
| `array/*`                                  | `assertArray`, `assertInteger` | `createRange` tách hai biên thành hai lời gọi                                                             |
| `object/pick,omit,enumKeys,sortObjectKeys` | `assertObject` + `assertArray` | biên công khai, một lần mỗi hàm                                                                           |
| `object/omitEmptyValues`                   | `assertObject` **một lần**     | `filter` nội bộ tin invariant - xem Key Insights                                                          |
| `object/once`                              | giữ inline                     | `typeof !== 'function'`, 2 chỗ (§19)                                                                      |
| `converter/objectToMap`                    | `assertObject` **mỗi tầng**    | hàm tự gọi chính nó như API công khai                                                                     |
| `converter/base64*`                        | giữ `instanceof` inline        | `bytes instanceof Uint8Array` tự đọc được                                                                 |
| `converter/parseKeyCombination`            | `assertNonEmptyString`         | hiện kiểm string rồi kiểm `trim() === ''` riêng - gộp                                                     |
| `unit/convertLength`                       | `assertFiniteNumber`           | `assertLengthUnit` **không** tạo: bảng `PX_PER_UNIT` đã là nguồn, và thông báo hiện liệt kê đơn vị hợp lệ |
| `unit/printPixels`                         | `assertDpi` (từ pha 01)        | cộng `assertFiniteNumber` cho `pixels`                                                                    |
| `date/sortDates`                           | `assertArray`                  |                                                                                                           |
| `mime/mime.ts`                             | `assertString`                 | 4 method, mỗi method một lời gọi, caller là `mime.fromExtension` ...                                      |
| `html/html.ts`                             | `assertString` đã chuyển       | giữ caller `html.encode` / `html.decode`                                                                  |
| `file/*`                                   | `assertString`                 |                                                                                                           |

### `assertLengthUnit`: cố ý KHÔNG tạo

§3 Level 2 gợi ý nó, nhưng ở đây nó sẽ là §11 - che mất hành vi. `convertLength` hiện
tra `PX_PER_UNIT[key]` và nếu `undefined` thì ném kèm **danh sách đơn vị hợp lệ lấy
từ chính bảng đó**:

```ts
`convertLength: ${JSON.stringify(from)} is not a CSS absolute length unit. Known: ${known}`;
```

Một `assertLengthUnit` sẽ phải mang bản sao danh sách, và bản sao đó lệch được. Bảng
là nguồn duy nhất; giữ nguyên.

## Related code files

- ~25 file trong `packages/tinita/src/`
- `packages/tinita/tests/*` - thông báo lỗi bị khoá trong test hiện có
- `scripts/check-assert-reuse.mjs` - guard của pha 01 làm đỏ chỗ nào còn sót

## Implementation Steps

1. Chạy `node scripts/check-assert-reuse.mjs` để có danh sách chính xác chỗ cần sửa -
   không grep tay.
2. Nhóm `string/` và `file/` trước: đơn giản nhất, lập khuôn cho `caller`.
3. Nhóm `object/`: chốt từng hàm là biên công khai hay nội bộ **trước** khi sửa.
4. `omitEmptyValues`: chuyển kiểm ra `omitEmptyValues`, ghi một dòng lý do trong
   `filter` nói vì sao nó không kiểm lại.
5. `objectToMap`: giữ kiểm từng tầng, ghi một dòng lý do nói vì sao **trái** với
   `omitEmptyValues`.
6. `array/`, `date/`, `unit/`, `mime/`, `converter/`.
7. Sửa test nào khoá hình dạng thông báo cũ.
8. `pnpm gate`.

## Todo list

- [x] Lấy danh sách từ `check-assert-reuse`, không grep tay
- [x] `string/` + `file/` (10 file)
- [x] `object/` - chốt biên từng hàm trước khi sửa
- [x] `omitEmptyValues` một lần + dòng lý do trong `filter`
- [x] `objectToMap` mỗi tầng + dòng lý do nói vì sao trái
- [x] `array/`, `date/`, `unit/`, `mime/`, `converter/`
- [x] Sửa test khoá thông báo cũ
- [x] 2 ca tự phá
- [x] `pnpm gate` 9/9

## Success Criteria

1. `node scripts/check-assert-reuse.mjs` PASS cho `packages/tinita/src`, 0 phát hiện.
2. Số `throw new TypeError` trong `packages/tinita/src` giảm từ hiện tại xuống
   **<= 20**, và mỗi chỗ còn lại thuộc một trong hai loại: điều kiện một lần (§3
   Level 1), hoặc `instanceof` domain. Liệt kê từng chỗ kèm loại.
3. `throw new RangeError` trong `tinita` vẫn **0** - pha này không đổi loại error nào.
4. Mọi thông báo lỗi trong `packages/tinita/src` bắt đầu bằng `<tênAPI>: `. Kiểm bằng
   script, in **0** ca thiếu.
5. Test `tinita` vẫn **>= 295** ca và **0 fail**. Số không giảm: thay cách validate
   không được làm mất ca nào.
6. `assertObject` xuất hiện **đúng một lần** trong `omitEmptyValues.ts`, không ở
   trong `filter`. Kiểm bằng grep.
7. **Hiệu năng không xấu đi ở chỗ §15 nói.** `omitEmptyValues` trên một cây 10.000
   node: thời gian sau pha không vượt **1.2x** trước pha. Đo 3 lần, lấy trung vị, trên
   cùng máy.
8. **Ca tự phá 1:** đưa `assertObject` vào trong `filter` của `omitEmptyValues` -> ca
   hiệu năng số 7 phải ĐỎ. Đây là cách duy nhất chứng minh tiêu chí 7 đang canh thật.
9. **Ca tự phá 2:** đổi một `caller` thành tên hàm nội bộ (ví dụ `'filter'`) -> ca
   tiêu chí 4 phải ĐỎ.
10. `pnpm gate` 9/9 PASS.

## Risk Assessment

| Rủi ro                                                      | Mức | Chặn bằng                                                  |
| ----------------------------------------------------------- | --- | ---------------------------------------------------------- |
| Assertion lọt vào tầng đệ quy -> O(node) lời gọi helper     | Cao | tiêu chí 7 đo thời gian thật, tiêu chí 8 phá để chứng minh |
| Thay cho đủ bộ, kể cả chỗ §3 nói giữ inline                 | Cao | tiêu chí 2 đòi **liệt kê** từng chỗ còn lại kèm loại       |
| Thông báo lỗi đổi làm test đỏ hàng loạt, rồi bị sửa cho qua | Cao | tiêu chí 5: số ca **không giảm**                           |
| `caller` truyền tên nội bộ, thông báo vô dụng               | TB  | tiêu chí 4 + ca tự phá 2                                   |
| Đổi loại error ngoài ý muốn                                 | TB  | tiêu chí 3                                                 |
| Mệt mỏi ở file thứ 20 của 25                                | TB  | làm theo nhóm, `pnpm gate` trước khi sang nhóm             |

## Security Considerations

Không có bề mặt mới. Một điểm:

`assertString` thay cho kiểm inline ở `stringToSelector` - hàm dựng CSS selector từ
chuỗi người dùng và JSDoc đã khai rằng nó **không** là guard an toàn (chuỗi có `"]`
phá được selector). Việc gọi một hàm tên `assert*` ở đầu không được làm lời khai đó
mờ đi: JSDoc giữ nguyên, và nếu có đổi thì phải mạnh hơn chứ không nhẹ hơn.

## Next steps

Pha 03 - `tinita-dom` và `tinita-react`.
