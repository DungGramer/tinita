# Vốn từ validation: áp chuẩn §1-§21 vào ba package

**Ngày:** 2026-10-02 · **Nền:** `main` tại `0d0db44`, `pnpm gate --full` 9/9 PASS
**Số đo đầy đủ:** [`reports/00`](./reports/00-do-khoang-cach.md)

## Vì sao cần, dù đã có TypeScript

TS bảo vệ source, assertion bảo vệ runtime. `number` của TS bao gồm `NaN`, `Infinity`
và số âm, nên không biểu diễn được `DPI = finite && > 0`; và ba package publish lên
npm nên consumer có thể là **JS thuần**, nơi `.d.ts` không chặn gì. Lập luận đầy đủ ở
[`reports/00`](./reports/00-do-khoang-cach.md) mục cuối, theo tài liệu owner dán.

## Khoảng cách đo được

| Chỉ số                               |        Giá trị |
| ------------------------------------ | -------------: |
| `throw new` trong `packages/*/src`   |         **63** |
| `TypeError` / `Error` / `RangeError` | 61 / 2 / **0** |
| Thông báo nêu tên hàm (§7)           |        40 / 61 |
| Helper đã có                         |          **2** |
| Synonym lệch chuẩn (§16)             |          **0** |

**Lỗi nặng nhất:** `html.ts:23` đã có `assertString` với **đúng** signature `asserts`
mà §5 đòi, giải bài toán xuất hiện ở **14 file**, và đang dùng ở **1**. Còn `assertDpi`
viết hôm sau thì khai `dpi: number`, không `asserts`. Hai lối trong cùng codebase,
cách nhau một ngày - §20 nói đúng, và nguyên nhân là người viết `assertDpi` (tôi)
không tìm helper tương đương trước. Vì vậy **guard là phần không thể bỏ** của pha 01:
quy ước đã không chặn được nó một lần.

## Bảy primitive, suy từ số đo chứ không copy §4

| Primitive                    | Lần | File | Ghi chú                      |
| ---------------------------- | --: | ---: | ---------------------------- |
| `assertString`               |  17 |   14 |                              |
| `assertArray`                |  15 |   10 |                              |
| `assertFiniteNumber`         |  10 |    8 |                              |
| `assertObject`               |   8 |    6 |                              |
| `assertNonEmptyString`       |   3 |    2 |                              |
| `assertInteger`              |   3 |    2 | §17 câu 4, không phải số lần |
| `assertPositiveFiniteNumber` |   2 |    2 | `assertDpi` cài lên nó (§12) |

**KHÔNG** tạo: `assertFunction` (2), `assertBlob` (2), `assertUint8Array` (1) - §19;
`assertNonNegative*`, `assertPositiveInteger` - §3 chờ consumer thật;
`assertLengthUnit` - nó sẽ mang bản sao danh sách đơn vị mà `PX_PER_UNIT` đang là
nguồn duy nhất, và bản sao lệch được (§11).

`assertObject`, **không** `assertPlainObject`: cả 8 chỗ dùng
`x === null || typeof x !== 'object'`, hình dạng **nhận cả array và class instance**;
tên kia che mất hành vi (§11).

## Hai quyết định owner đã chốt

**Export công khai.** 8 subpath (7 primitive + `assertDpi` chuyển ra) = 8 cam kết
signature vĩnh viễn, cộng `typesVersions` và `contract.json`. Nhận giá đó vì consumer
JS thuần cần cùng vốn từ.

**§8 tự mâu thuẫn**, và owner chốt cách đọc: `value <= 0` là contract dương ->
`TypeError`; `RangeError` **chỉ** cho khoảng có biên tường minh. Hệ quả: **0 breaking
change**, cả 61 assertion `toThrow(TypeError)` giữ nguyên.

## Giá của việc dùng chung

`bundle: true` inline mọi import vào từng entry. Đo: `dist/validation/isEmail.mjs` là
**122 B và chỉ chứa 1 trong 5** regex của `patterns.ts` (bản đầy đủ 247 B) - esbuild
tree-shake **trong** bundle. Một primitive sau minify là **109 B**, entry trung vị của
`tinita` là **329 B**. Nên một hai primitive mỗi entry là chấp nhận được, năm thì
không, và đó chính là lý do §14 nói validate ở **biên**.

## Hai lỗi tìm được khi rà, cả hai là silent failure

`resizeImage.quality` - JSDoc ghi "0 to 1", **0 chỗ validate**; `toDataURL` bỏ qua giá
trị ngoài khoảng nên `quality: 1.5` âm thầm ra ảnh mặc định. `cookieJar.maxAge` -
không validate; `Math.floor(NaN)` ra `NaN` nên `Max-Age=NaN` làm trình duyệt bỏ **cả
cookie**, và `set` trả `void` nên không có đường nào biết.

Owner chốt xử cùng plan. `quality` là nhà duy nhất của `RangeError`.

## Các pha

| Pha | Việc                                   | Trạng thái | Link                                         |
| --- | -------------------------------------- | ---------- | -------------------------------------------- |
| 01  | Vốn từ `tinita/src/asserts/` + guard   | **XONG**   | [phase-01](./phase-01-vocabulary.md)         |
| 02  | Retrofit `tinita`                      | **XONG**   | [phase-02](./phase-02-retrofit-tinita.md)    |
| 03  | Retrofit `tinita-dom` + `tinita-react` | **XONG**   | [phase-03](./phase-03-retrofit-dom-react.md) |
| 04  | Hai silent failure, §7, docs           | **XONG**   | [phase-04](./phase-04-gaps-and-docs.md)      |

### Việc chia pha của tôi SAI ở một điểm, phát hiện lúc code

Plan nói pha 01 chặn 02/03 và hai pha đó song song được. Đúng về phụ thuộc, **sai về
khả năng tách**: guard của pha 01 làm đỏ 43 chỗ inline ngay khi được thêm vào
`pnpm gate`, nên pha 01 **không thể kết thúc với gate xanh** nếu chưa retrofit. Một
guard chỉ xanh được sau khi việc nó canh đã làm xong thì không tách khỏi việc đó.

Hệ quả: bốn pha thành **một commit**. Đường thoát khác là để guard chạy ở chế độ
báo-cáo cho tới pha 03, tức đúng cái bẫy "xanh vì không kiểm" mà repo đã ghi là lớp
lỗi lặp lại bốn lần. Không chọn.

## Rủi ro lớn nhất của cả plan

**Thay cho đủ bộ.** Chuẩn liệt kê 7 primitive ở §4 và rất dễ đọc thành "tạo cả 7 rồi
dùng khắp nơi". Nhưng §3, §14, §15 và §19 đều nói ngược lại, và repo này có bốn chỗ
mà thay là **sai**:

- `createJsonStore` - hợp đồng là **không bao giờ ném**, nên 4 `try/catch` phải giữ
- `usePagination` - hợp đồng là **clamp**, có property test 2000 mẫu khoá
- `omitEmptyValues.filter` - đệ quy, assert ở đó là O(số node) lời gọi helper
- `validation/*` - là predicate `isX` trả `boolean` (§12), không phải assertion

Mỗi pha có một ca tự phá canh đúng chỗ đó, vì tiêu chí "đã thay hết" không phân biệt
được thay đúng với thay bừa.

## Nguyên tắc của chuẩn, giữ nguyên văn

> Thứ cần không phải "code validation ngắn nhất", mà là **abstraction nhỏ nhất thiết
> lập rõ một invariant ổn định**.
