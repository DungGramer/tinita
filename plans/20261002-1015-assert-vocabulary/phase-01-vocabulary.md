# Pha 01 - Dựng vốn từ `tinita/src/asserts/`, kèm guard chống phân kỳ

## Context links

- Plan cha: [`plan.md`](./plan.md)
- Số đo: [`reports/00-do-khoang-cach.md`](./reports/00-do-khoang-cach.md)
- Chuẩn: §1-§21 trong task của owner. Lý do cần assert dù có TS: tài liệu
  `ChatGPT-Tách Assert Validation-20261002-0948.md`
- Quy tắc repo: `docs/code-standards.md` mục "Quy Tắc Đặt Tên", `CLAUDE.md` mục
  "Không tồn tại"

## Overview

**Ngày:** 2026-10-02 · **Ưu tiên:** P0, chặn pha 02 và 03 · **Trạng thái:** chưa làm
· **Review:** chưa

Dựng 7 primitive trong `tinita/src/asserts/`, export công khai, cộng một guard chặn
việc thêm `throw new TypeError` trùng một invariant đã có helper. Pha này **không**
retrofit chỗ nào.

## Key Insights

**Helper đã có và không ai dùng.** `html.ts:23` có `assertString` với **đúng**
signature `asserts` mà §5 đòi, giải bài toán xuất hiện ở 14 file, và đang dùng ở 1.
Còn `assertDpi` viết hôm sau thì khai `dpi: number`, không `asserts`. Hai lối trong
cùng codebase, cách nhau một ngày - §20 nói đúng, và nó xảy ra vì người viết
`assertDpi` không tìm helper tương đương trước. Pha này tồn tại để việc đó không lặp
lại, và **guard là phần không thể bỏ**: không có guard thì retrofit mục rữa ngay.

**`bundle: true` không chặn thiết kế, và đó là kết quả đo chứ không phải giả định.**
Repo này inline mọi import vào từng entry, nên một module chung có thể nhân lên 57
lần. Đo: `dist/validation/isEmail.mjs` là **122B và chỉ chứa 1 trong 5** regex của
`patterns.ts` (bản đầy đủ 247B). esbuild tree-shake trong bundle, nên giá là **109B
mỗi primitive thật sự dùng**, không phải cả module. Entry trung vị của `tinita` là
329B, nên một hay hai primitive là chi phí chấp nhận được; **năm** primitive trong
một entry thì không, và đó là lý do §14 nói validate ở biên chứ không ở mọi tầng.

**Export công khai là quyết định của owner, và nó có giá rõ.** 7 subpath mới nghĩa là
7 cam kết signature vĩnh viễn, 7 entry `typesVersions`, 7 specifier `contract.json`,
và ca L1 `03-smoke-cjs-esm` tăng ~14 lần thực thi. Lý do nhận giá đó: theo tài liệu
owner dán, consumer của một package npm có thể là **JS thuần** nơi `.d.ts` không bảo
vệ gì - nên cho họ dùng chung vốn từ là có giá trị thật, không phải tiện tay.

**`tinita` không cần story.** `scripts/check-stories.mjs` chỉ đọc `exports` của
`tinita-react` và `tinita-dom`. 7 subpath này không kéo theo việc viết story.

## Requirements

1. Bảy primitive, không hơn. Danh sách suy từ số đo ở report 00, không copy §4.
2. Mỗi primitive dùng signature `asserts value is T` với tham số `unknown` (§5), nên
   nó vừa validate runtime vừa narrow compile-time.
3. Mỗi primitive nhận `caller: string` và đặt nó làm tiền tố thông báo (§7).
4. `TypeError` cho vi phạm kiểu và contract giá trị; `RangeError` **chỉ** cho khoảng
   có biên tường minh (§8, theo cách đọc owner đã chốt).
5. Một file một export công khai, khớp quy tắc đặt tên đã có của repo.
6. `assertDpi` **giữ tên domain** (§6) nhưng cài trên `assertPositiveFiniteNumber`
   (§12), và chuyển khỏi `printPixels.ts`.
7. `assertString` của `html.ts` **chuyển đi**, không nhân bản (§20).
8. Guard: thêm một invariant mới trùng helper đã có phải bị chặn.

## Architecture

### Bảy primitive, và vì sao đúng bảy

| File                                    | Bằng chứng extract                                    |
| --------------------------------------- | ----------------------------------------------------- |
| `asserts/assertString.ts`               | 17 chỗ, 14 file                                       |
| `asserts/assertNonEmptyString.ts`       | 3 chỗ, 2 file                                         |
| `asserts/assertArray.ts`                | 15 chỗ, 10 file                                       |
| `asserts/assertFiniteNumber.ts`         | 10 chỗ, 8 file                                        |
| `asserts/assertObject.ts`               | 8 chỗ, 6 file                                         |
| `asserts/assertPositiveFiniteNumber.ts` | 2 chỗ, và `assertDpi` cài lên nó                      |
| `asserts/assertInteger.ts`              | 3 chỗ, 2 file - lý do là §17 câu 4, không phải số lần |

**KHÔNG** tạo: `assertFunction` (2 chỗ), `assertBlob` (2), `assertUint8Array` (1) -
§19. **KHÔNG** tạo trước: `assertNonNegativeFiniteNumber`,
`assertNonNegativeInteger`, `assertPositiveInteger` - §3 nói thêm khi có consumer
thật, và hiện không có.

### `assertObject`, không phải `assertPlainObject`

Cả 8 chỗ là `x === null || typeof x !== 'object'`, hình dạng **nhận cả array và class
instance**. Tên `assertPlainObject` sẽ là §11: che mất hành vi. JSDoc phải nói thẳng
rằng array đi qua được, và chỉ sang `isPlainObject` của `omitEmptyValues` (có kiểm
prototype thật) cho ai cần nghĩa hẹp.

### Guard: `scripts/check-assert-reuse.mjs`

Quét `packages/*/src` tìm `throw new TypeError` mà điều kiện ngay trên khớp một
invariant đã có primitive, rồi làm đỏ kèm tên helper nên dùng.

Lý do nó phải là script chứ không phải quy ước: lớp lỗi này **đã xảy ra** với
`assertString` (14 file có thể dùng, 1 file dùng) và với `assertDpi` (signature lệch
sau một ngày). Quy ước đã không chặn được nó.

Dạng phát hiện, mỗi dạng ứng một primitive:

```
typeof X !== 'string'                     -> assertString
typeof X !== 'string' || X === ''         -> assertNonEmptyString
!Array.isArray(X)                         -> assertArray
!Number.isFinite(X)                       -> assertFiniteNumber
X === null || typeof X !== 'object'       -> assertObject
!Number.isInteger(X)                      -> assertInteger
```

Thoát bằng `// assert-reuse-ignore <lý do>` ngay trên dòng, **bắt buộc có lý do** -
marker trống thì guard vẫn đỏ. Rút kinh nghiệm `doc-links-ignore`: marker phải sống
sót `prettier`, nên guard lùi qua dòng trắng.

Thêm vào `pnpm gate` cạnh `doc-links`. Rẻ, chỉ đọc file.

### Vị trí trong ba package

`tinita-dom` và `tinita-react` dùng qua devDependency `tinita` - đúng khuôn
`getFileNameParts` và `convertLength` đang dùng, và `bundle: true` inline nên bản
publish không nhận runtime dependency nào.

## Related code files

- `packages/tinita/src/asserts/*.ts` - **mới**, 7 file
- `packages/tinita/src/html/html.ts` - `assertString` chuyển đi, 3 call site đổi
- `packages/tinita/src/unit/printPixels.ts` - `assertDpi` chuyển đi, cài lại trên primitive
- `packages/tinita/package.json` - 7 `exports` + 7 `typesVersions`
- `packages/tinita/src/index.ts` - barrel
- `compatibility/contract.json` - 7 specifier
- `scripts/check-assert-reuse.mjs` - **mới**; `scripts/gate.mjs` - thêm bước
- `docs/code-standards.md` - mục "Quy Tắc Validation"

## Implementation Steps

1. Viết 7 primitive. Mỗi cái: `asserts` signature, `caller`, JSDoc nêu postcondition
   tường minh (§2) - "sau lời gọi này, có thể giả định X".
2. Chuyển `assertString` khỏi `html.ts`, sửa 3 call site sang
   `assertString(value, 'html.encode')` để giữ tiền tố `html.` đang có.
3. Chuyển `assertDpi` khỏi `printPixels.ts` sang `asserts/assertDpi.ts`, cài trên
   `assertPositiveFiniteNumber`, đổi sang `asserts dpi is number`.
4. Khai 7 subpath (8 với `assertDpi`) vào `exports`, `typesVersions`,
   `contract.json`, barrel.
5. Viết `scripts/check-assert-reuse.mjs`, thêm vào `pnpm gate`.
6. Test cho từng primitive: nhận hợp lệ, từ chối từng dạng không hợp lệ, thông báo
   chứa `caller`, và **narrowing compile-time** kiểm bằng một hàm nhận `unknown` rồi
   dùng giá trị như `number` sau assert.
7. `docs/code-standards.md` mục "Quy Tắc Validation": 7 primitive, quy tắc §8 theo
   cách đọc owner chốt, và quy tắc "tìm helper tương đương trước khi viết mới".
8. `pnpm gate`.

## Todo list

- [x] 8 primitive + JSDoc nêu postcondition (plan ghi 7; `assertDpi` tách riêng vì tên miền)
- [x] `assertString` chuyển khỏi `html.ts`, 3 call site
- [x] `assertDpi` chuyển đi, cài trên `assertPositiveFiniteNumber`, thêm `asserts`
- [x] 8 subpath vào `exports` + `typesVersions` + `contract.json` + barrel
- [x] `scripts/check-assert-reuse.mjs` + bước trong `pnpm gate`
- [x] Test mỗi primitive, gồm ca narrowing
- [x] `docs/code-standards.md` mục "Quy Tắc Validation"
- [x] 3 ca tự phá (xem Success Criteria)
- [x] `pnpm gate` 9/9

## Success Criteria

1. `node -e "const p=require('tinita/package.json'); console.log(Object.keys(p.exports).length)"`
   in ra **61** (53 hiện có + 8).
2. Mọi specifier mới resolve tới file dist có thật: 8/8. `typesVersions` khớp
   `exports`, 0 lệch hai chiều.
3. Ca L1 `05-contract-drift:tinita` báo **60** specifier khớp hai chiều.
4. `grep -rn "function assertString" packages/*/src` trả **đúng 1** dòng, ở
   `asserts/assertString.ts`.
5. `grep -rn "assertDpi" packages/tinita/src/unit/printPixels.ts` trả **0** định
   nghĩa, chỉ import.
6. Narrowing hoạt động thật, kiểm bằng `tsc` chứ không bằng mắt: một hàm
   `(value: unknown) => number` gọi `assertFiniteNumber(value, 'f')` rồi `return
value * 2` phải **compile sạch**.
7. Mỗi primitive: thông báo lỗi bắt đầu bằng đúng chuỗi `caller` được truyền. Test
   khớp bằng regex `^f: `.
8. `pnpm gate` có bước `assert-reuse` và nó PASS.
9. **Ca tự phá 1:** thêm `if (typeof x !== 'string') throw new TypeError(...)` vào
   một file `src` -> `pnpm gate` exit khác 0, nêu file, dòng, và **tên helper nên
   dùng**. Gỡ ra, xanh lại.
10. **Ca tự phá 2:** marker `// assert-reuse-ignore` **không có lý do** -> vẫn đỏ.
    Có lý do -> xanh.
11. **Ca tự phá 3:** chạy `pnpm format` sau khi đặt marker -> guard vẫn xanh. Đây là
    đúng lỗi `doc-links-ignore` đã mắc: `prettier` chèn dòng trắng và marker rời khỏi
    dòng nó bảo vệ.
12. Test `tinita` >= **295** ca (hiện 274).
13. Số `throw new` trong `src` **không giảm** ở pha này - pha 01 không retrofit. Nếu
    giảm, có người đã làm việc của pha 02 vào đây.

## Risk Assessment

| Rủi ro                                                          | Mức  | Chặn bằng                                                         |
| --------------------------------------------------------------- | ---- | ----------------------------------------------------------------- |
| 8 subpath = 8 cam kết API vĩnh viễn                             | Cao  | owner đã chốt export công khai; CHANGELOG nêu rõ ở pha 04         |
| Guard khớp sai (false positive) làm người ta tắt nó             | Cao  | marker **bắt buộc có lý do**, và ca tự phá 2 canh chính việc đó   |
| Marker không sống sót `prettier`                                | TB   | ca tự phá 3, viết từ lỗi `doc-links-ignore` đã mắc                |
| `assertString` chuyển đi làm thông báo của `html` đổi hình dạng | TB   | truyền `'html.encode'` làm caller; test `html` đã khoá thông báo  |
| Thêm primitive "cho đủ bộ" theo §4 mà không có consumer         | TB   | tiêu chí 1 chốt đúng **61** export - thêm cái thứ 9 là đỏ         |
| `bundle: true` nhân primitive vào 57 entry                      | Thấp | đo rồi: tree-shake trong bundle, 109B mỗi primitive **được dùng** |

## Security Considerations

Không có bề mặt mạng hay DOM mới. Hai điểm về chính lớp validation:

- **Assertion không phải sanitization.** `assertString` xác nhận kiểu, không làm sạch
  nội dung. JSDoc phải nói thẳng, vì tên `assert*` dễ đọc thành "đã an toàn" - và
  repo này có `jsonToHtml` là serializer trung thực và `isUrl` nhận
  `javascript:alert(1)`, cả hai đã phải khai giới hạn tương tự.
- **Thông báo lỗi chứa giá trị bị từ chối** (`got ${String(value)}`). Với một thư
  viện utility thì input là dữ liệu người gọi, không phải secret, nên đây là đánh đổi
  đúng. Nhưng `String(value)` trên một object lớn sinh thông báo dài, và trên một
  object có getter thì **gọi getter** - JSDoc phải nêu, và `assertObject` nên in
  `typeof` thay vì nội dung.

## Next steps

Pha 02 - retrofit `tinita`; pha 03 - `tinita-dom` và `tinita-react`. Hai pha đó song
song được.
