# Khoảng cách giữa code hiện tại và chuẩn, đo 2026-10-02

Mọi số dưới đây đo trên `main` tại `0d0db44`.

## Toàn cảnh

| Chỉ số                                          | Giá trị |
| ----------------------------------------------- | ------: |
| `throw new` trong `packages/*/src`              |  **63** |
| trong đó `TypeError`                            |      61 |
| `Error` trần                                    |       2 |
| `RangeError`                                    |   **0** |
| Thông báo có tiền tố tên hàm (§7)               | 40 / 61 |
| Assertion helper đã tồn tại                     |   **2** |
| Synonym lệch chuẩn (`ensure`/`require`/`check`) |   **0** |

## Lỗi nghiêm trọng nhất: helper đã có, không ai dùng

```
packages/tinita/src/html/html.ts:23
function assertString(value: unknown, method: string): asserts value is string
```

Nó có **đúng** signature `asserts` mà §5 đòi, và nó giải đúng bài toán xuất hiện ở
**14 file**. Nó đang được dùng ở **1**.

`assertDpi` trong `unit/printPixels.ts` thì **không** dùng `asserts` - nó khai
`dpi: number`. Hai helper trong cùng codebase, hai lối, viết cách nhau một ngày. Đây
đúng lớp lỗi §20 cảnh báo, và nó xảy ra vì người viết `assertDpi` (chính tôi) không
tìm helper tương đương trước.

## Invariant lặp lại, và phán quyết theo §17 / §19

| Invariant                               | Lần | File | Phán quyết                                       |
| --------------------------------------- | --: | ---: | ------------------------------------------------ |
| `typeof x !== 'string'`                 |  17 |   14 | **extract** - `assertString`                     |
| `typeof x !== 'string' \|\| x === ''`   |   3 |    2 | **extract** - `assertNonEmptyString`             |
| `!Array.isArray(x)`                     |  15 |   10 | **extract** - `assertArray`                      |
| `!Number.isFinite(x)`                   |  10 |    8 | **extract** - `assertFiniteNumber`               |
| `x === null \|\| typeof x !== 'object'` |   8 |    6 | **extract** - xem ghi chú tên bên dưới           |
| `!Number.isInteger(x)`                  |   3 |    2 | **extract** - lý do ở dưới, không phải vì số lần |
| `!Number.isFinite(x) \|\| x <= 0`       |   2 |    2 | **extract** - `assertPositiveFiniteNumber`       |
| `typeof x !== 'function'`               |   2 |    2 | **giữ inline** (§19)                             |
| `!(x instanceof Blob)`                  |   2 |    2 | **giữ inline** - `x instanceof Blob` tự đọc được |
| `!(x instanceof Uint8Array)`            |   1 |    1 | **giữ inline** (§19)                             |

### Hai phán quyết cần giải thích

**`assertObject`, không phải `assertPlainObject`.** Cả 8 chỗ dùng đúng một hình dạng
`x === null || typeof x !== 'object'`, và hình dạng đó **nhận cả array và class
instance**. Gọi nó `assertPlainObject` là §11 - tên che mất hành vi. `omitEmptyValues`
có một `isPlainObject` riêng với kiểm prototype thật; đó là invariant **khác**, giữ
nguyên chỗ cũ.

**`assertInteger` extract dù chỉ 3 lần.** Không vì số lần mà vì §17 câu 4: hiện
`createRange` kiểm hai biên trong **một** điều kiện, nên thông báo không nói biên nào
sai:

```ts
if (!Number.isInteger(start) || !Number.isInteger(end)) {
  throw new TypeError(
    `createRange: both bounds must be integers, got (${start}, ${end})`
  );
}
```

Tách ra cho hai lời gọi riêng thì lỗi nêu đúng tham số.

## Giá của việc dùng chung, đo trên dist thật

Đây là ràng buộc riêng của repo này: `bundle: true` inline mọi import vào **từng**
entry. Nên câu hỏi là một module chung tốn cả module hay chỉ phần được dùng.

| Đo                                    | Kết quả      |
| ------------------------------------- | ------------ |
| Một assertion primitive sau minify    | **109 B**    |
| Entry trung vị của `tinita`           | **329 B**    |
| Số entry `.mjs`: tinita / dom / react | 57 / 24 / 20 |

Và câu hỏi quyết định - esbuild có tree-shake **trong** bundle?

```
validation/patterns.ts   export 5 regex
dist/validation/patterns.mjs   247 B   (cả 5)
dist/validation/isEmail.mjs    122 B   chỉ chứa emailRegex; 4 cái kia KHÔNG có
```

**Có.** Nên module chung tốn ~109B **mỗi primitive thật sự được dùng**, không phải cả
module. Ràng buộc `bundle: true` không chặn thiết kế này.

## §8: chuẩn tự mâu thuẫn, owner đã chốt

§8 liệt kê `value <= 0` dưới **TypeError**, rồi định nghĩa `RangeError` là "đúng kiểu,
ngoài khoảng đã định" với ví dụ `0..100`. Hai danh sách chồng nhau.

Owner chốt 2026-10-02: **`RangeError` chỉ cho khoảng CÓ BIÊN tường minh.** `<= 0` là
contract dương nên là `TypeError`.

Hệ quả đo được: **0 breaking change.** Cả 61 assertion `toThrow(TypeError)` giữ
nguyên. Và `RangeError` có đúng một nhà mới, là một lỗi đang tồn tại chứ không phải
đổi loại:

| Chỗ                   | Lỗi                                                                                                                                        |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `resizeImage.quality` | JSDoc ghi "0 to 1", **0 chỗ validate**. `toDataURL` bỏ qua giá trị ngoài khoảng và dùng mặc định -> `quality: 1.5` âm thầm ra ảnh mặc định |
| `cookieJar.maxAge`    | không validate. `Math.floor(NaN)` ra `NaN` -> `Max-Age=NaN`, trình duyệt bỏ qua **cả cookie**                                              |

Hai cái này là silent failure, thứ cổng vào của repo cấm. Owner chốt xử cùng plan.

## Hai `Error` trần

| Chỗ                        | Phán quyết                                                                                            |
| -------------------------- | ----------------------------------------------------------------------------------------------------- |
| `useRequiredContext.ts:46` | **đúng**. "Thiếu Provider" không phải vi phạm kiểu tham số; không có built-in error nào chính xác hơn |
| `Tree.tsx:418`             | **lỗi thật**: nó tự viết lại đúng việc của `useRequiredContext` thay vì gọi nó                        |

## §7: 21 thông báo thiếu tên hàm

40/61 có tiền tố `tênHàm:`. 21 chỗ còn lại không nêu API nào đã từ chối giá trị - đúng
điều §7 nói là "ambiguous khi nhiều API dùng chung một helper", và việc dùng chung sắp
xảy ra ở pha 02/03.

## Vì sao cần assert dù đã có TypeScript

Theo tài liệu owner dán 2026-10-02 (`ChatGPT-Tách Assert Validation`): TS bảo vệ
source, assertion bảo vệ runtime - **bổ sung nhau, không thay thế**. Hai điểm áp trực
tiếp vào repo này:

- `number` của TS **bao gồm** `NaN`, `Infinity`, `-Infinity`, `0`, số âm. Nó không
  biểu diễn được `DPI = finite && > 0`. Branded type chỉ chuyển validation sang chỗ
  khác, vẫn cần runtime ở biên.
- Ba package này publish lên npm, nên consumer có thể là **JS thuần**: `.d.ts` không
  bảo vệ `fromPrintPixels(100, 'mm', NaN)`.

Bảng của tài liệu, hai dòng áp vào đây: "Package public cho npm -> **có** assert";
"Performance-critical inner loop -> validate ở **boundary**".

## Kết quả sau khi code, đo 2026-10-02

| Chỉ số                             | Trước |       Sau |
| ---------------------------------- | ----: | --------: |
| `throw new` trong `packages/*/src` |    63 |    **33** |
| Thông báo nêu tên API              | 40/61 | **31/33** |
| `tinita` subpath công khai         |    53 |    **61** |
| Test toàn repo                     |   465 |   **519** |
| Primitive                          |     2 |     **8** |
| Bước trong `pnpm gate`             |     8 |     **9** |

Hai thông báo còn lại không có tiền tố `tên:` là `useRequiredContext` và chỗ gọi nó
trong `Tree.tsx`, và cả hai **đúng**: `useCart must be used within a CartProvider` đã
nêu API ngay từ đầu câu, và nó báo lỗi **cách dùng** chứ không phải lỗi đối số - một
loại thông báo khác.

## Guard khớp pattern, không khớp ý định: 4/43 false positive

Lần chạy đầu guard báo 43 chỗ. 39 là thật. Bốn cái này cần marker kèm lý do, không
cần sửa:

| Chỗ                                      | Vì sao pattern khớp mà không nên sửa                                                         |
| ---------------------------------------- | -------------------------------------------------------------------------------------------- |
| `validation/isUrl`                       | predicate - `isUrl(42)` phải là `false`, không throw                                         |
| `object/omitEmptyValues` `isPlainObject` | predicate, và nghĩa HẸP hơn `assertObject`                                                   |
| `html/html.ts` decode                    | trả nguyên match cho reference không nhận ra - hợp đồng                                      |
| `object/enumKeys`                        | `!Number.isFinite` LÀ logic của hàm, không phải validation                                   |
| `usePagination` `clamp`                  | hợp đồng là clamp; property test 2000 mẫu khoá                                               |
| `html/elementToJson`                     | `typeof el.nodeName !== 'string'` nhận ra Element mà không dùng `instanceof` (gãy qua realm) |

Đó là lý do marker **đòi lý do** thay vì để guard tự phán: tỉ lệ 90% đúng là đủ hữu
ích, và 10% còn lại cần một con người viết một câu.

## Ba lỗi của chính guard, tìm bằng cách dùng nó

1. **Marker không sống sót comment nhiều dòng.** Nó neo vào `index - 1`, nên một lý do
   dài ba dòng làm marker rời khỏi dòng nó bảo vệ. Sửa: lùi qua cả dòng trắng **và**
   dòng comment, vì một khối comment là một đơn vị.
2. **Marker không với tới được dòng cách bởi một dòng code.** `enumKeys` có điều kiện
   nằm trong `.filter(...)` hai dòng dưới marker. Sửa: hỗ trợ marker **cùng dòng**,
   dạng không layout nào tách được.
3. **Thông báo tổng kết nói sai.** Nó in "6 điều kiện đều dùng primitive" trong khi 6
   là số **exemption**, không phải tổng. Sửa thành "113 file, 0 điều kiện trùng
   primitive, 7 exemption đều có lý do".

## Một phán quyết đổi so với plan

Plan xếp `prependUnique` vào nhóm chuyển bình thường. Đọc code thì nó
`if (!Array.isArray(list)) return list;` - **âm thầm trả về** giá trị không phải
array, trong khi `uniqueArray`, `sortAlphaText` và `sortDates` đều ném. Nó là cái
lệch, không phải chúng. Không test nào khoá hành vi đó, nên chuyển sang `assertArray`
là vá một silent failure chứ không phải đổi hợp đồng đã khai.
