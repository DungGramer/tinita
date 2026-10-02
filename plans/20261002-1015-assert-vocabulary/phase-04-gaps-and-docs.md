# Pha 04 - Hai silent failure, 21 thông báo thiếu tên, docs

## Context links

- Plan cha: [`plan.md`](./plan.md) · Phụ thuộc: **pha 02 và 03 xong**
- Số đo: [`reports/00-do-khoang-cach.md`](./reports/00-do-khoang-cach.md)
- Chuẩn: §7 (tên hàm trong thông báo), §8 (`RangeError`)

## Overview

**Ngày:** 2026-10-02 · **Ưu tiên:** P1 · **Trạng thái:** chưa làm · **Review:** chưa

Ba việc còn lại: hai lỗi silent failure tìm được khi rà chuẩn, 21 thông báo không nêu
API nào từ chối, và tài liệu.

## Key Insights

**`RangeError` của §8 có đúng một nhà, và nó là một lỗi đang tồn tại chứ không phải
đổi loại error.** Owner chốt đọc §8 theo nghĩa "chỉ cho khoảng CÓ BIÊN", nên 61
assertion `toThrow(TypeError)` giữ nguyên và 0 chỗ đổi loại. Nhưng việc rà theo §8 đã
tìm ra hai chỗ **không validate gì cả**:

```
resizeImage.quality   JSDoc ghi "0 to 1", 0 chỗ validate
cookieJar.maxAge      không validate
```

Cả hai là silent failure, thứ cổng vào của repo cấm:

- `canvas.toDataURL(type, quality)` theo spec **bỏ qua** giá trị ngoài `[0, 1]` và
  dùng mặc định. Nên `quality: 1.5` trả về ảnh chất lượng mặc định và không báo gì -
  người gọi tưởng đã đặt chất lượng cao nhất.
- `Math.floor(NaN)` là `NaN`, nên `maxAge: NaN` sinh `Max-Age=NaN`. Trình duyệt không
  parse được thuộc tính đó và **bỏ qua cả cookie**. Hàm trả `void` nên không có
  đường nào biết.

`quality` là khoảng có biên tường minh -> `RangeError` sau khi `assertFiniteNumber`
đã lo phần kiểu. Đây là ví dụ §8 của chính chuẩn, gần như nguyên văn.

`maxAge` thì **không** có biên trên: cookie sống bao lâu là việc của người gọi.
Invariant đúng là "số nguyên không âm hữu hạn" -> `TypeError`, không `RangeError`. Hai
tham số nằm cạnh nhau, hai loại error khác nhau, và lý do phải ghi vào code.

**21 thông báo thiếu tiền tố tên hàm giờ đã một phần tự khỏi.** Pha 02 và 03 truyền
`caller` cho mọi lời gọi primitive, nên các chỗ đã retrofit tự có tiền tố. Pha này
chỉ còn phần inline còn lại - và số thật phải đếm lại sau pha 03, không dùng lại con
số 21 đo trước pha 01.

## Requirements

1. `resizeImage.quality`: `assertFiniteNumber` rồi `RangeError` nếu ngoài `[0, 1]`
   (§8). Chỉ kiểm khi `type` là lossy - `image/png` bỏ qua `quality` theo spec.
2. `cookieJar.maxAge`: `TypeError` cho không phải số nguyên không âm hữu hạn. Không
   `RangeError` - không có biên trên.
3. Mọi `throw` còn lại trong ba package nêu tên API công khai (§7).
4. `docs/code-standards.md` có mục "Quy Tắc Validation" đầy đủ, gồm cách đọc §8 owner
   đã chốt và bảng 7 primitive.
5. `CHANGELOG.md` ghi: 8 subpath mới, hai lỗi đã vá, và **không** breaking change nào
   về loại error.
6. `pnpm gate --full` 9/9.

## Architecture

### `quality`: hai lớp, hai loại error

```ts
if (type !== 'image/png' && quality !== undefined) {
  assertFiniteNumber(quality, 'resizeImage');
  if (quality < 0 || quality > 1) {
    throw new RangeError(
      `resizeImage: quality must be between 0 and 1, got ${quality}`
    );
  }
}
```

Đây là ví dụ §8 gần như nguyên văn: `TypeError` cho kiểu, `RangeError` cho khoảng.
Điều kiện `type !== 'image/png'` không phải tiện tay - spec nói `toDataURL` bỏ qua
`quality` cho PNG, nên ném ở đó sẽ từ chối một lời gọi hoàn toàn hợp lệ.

### `maxAge`: không có biên trên, nên không `RangeError`

```ts
if (maxAge !== undefined) {
  assertNonNegativeInteger(maxAge, 'cookieJar.set');
}
```

**Và đây là chỗ tạo primitive thứ 8**, `assertNonNegativeInteger` - pha 01 cố ý
không tạo nó vì chưa có consumer (§3). Giờ có đúng một. §19 nói đừng extract cho một
consumer, nên **phán quyết: giữ inline ở `cookieJar`**, và ghi một dòng nói vì sao
không extract. Nếu consumer thứ hai xuất hiện thì extract lúc đó.

## Related code files

- `packages/tinita-dom/src/image/resizeImage.ts`
- `packages/tinita-dom/src/storage/cookieJar.ts`
- Mọi file còn `throw` không nêu tên API - danh sách lấy bằng script, không grep tay
- `docs/code-standards.md`, `CHANGELOG.md`, `README.md`
- `compatibility/contract.json` - rà `accepted`, hiện `[]` cả ba

## Implementation Steps

1. Đếm lại số thông báo thiếu tiền tố **sau** pha 03 - con số 21 là của trước pha 01.
2. `resizeImage.quality`: hai lớp, kèm điều kiện `type`.
3. `cookieJar.maxAge`: inline, kèm dòng lý do không extract.
4. Sửa phần thông báo còn thiếu tiền tố.
5. `docs/code-standards.md` mục "Quy Tắc Validation".
6. `CHANGELOG.md`.
7. `README.md`: nếu `asserts/*` là API công khai thì nó phải có mặt trong bảng thư
   mục của `tinita` - hiện bảng đó liệt kê 12 thư mục.
8. `pnpm gate --full`.

## Todo list

- [ ] Đếm lại thông báo thiếu tiền tố sau pha 03
- [ ] `resizeImage.quality`: `assertFiniteNumber` + `RangeError`, chỉ cho lossy type
- [ ] `cookieJar.maxAge`: inline + dòng lý do không extract
- [ ] Sửa thông báo còn thiếu tiền tố
- [ ] `docs/code-standards.md` mục "Quy Tắc Validation"
- [ ] `CHANGELOG.md`
- [ ] `README.md` bảng thư mục thêm `asserts/`
- [ ] 3 ca tự phá
- [ ] `pnpm gate --full` 9/9

## Success Criteria

1. `resizeImage(src, { type: 'image/jpeg', quality: 1.5 })` ném `RangeError`;
   `quality: 0` và `quality: 1` không ném; `quality: '0.8'` ném `TypeError`.
2. `resizeImage(src, { type: 'image/png', quality: 1.5 })` **không** ném - PNG bỏ qua
   `quality` theo spec, nên từ chối là sai.
3. `cookieJar.set('k', 'v', { maxAge: Number.NaN })` ném `TypeError`;
   `maxAge: -1` ném; `maxAge: 0` **không** ném (cookie hết hạn ngay là hợp lệ).
4. Trong Chromium (L4): `cookieJar.set` với `maxAge` hợp lệ ghi được cookie đọc lại
   được. Ca này canh việc sửa không làm vỡ đường chính.
5. `throw new RangeError` trong ba package: **đúng 1**, ở `resizeImage.ts`.
6. Mọi thông báo lỗi trong `packages/*/src` bắt đầu bằng `<tênAPI>: ` hoặc
   `<object>.<method>: `. Script in **0** ca thiếu.
7. `docs/code-standards.md` có mục "Quy Tắc Validation" nêu: 7 primitive và bằng
   chứng extract từng cái; cách đọc §8 owner chốt kèm lý do §8 tự mâu thuẫn; quy tắc
   "tìm helper tương đương trước khi viết mới" kèm ca `assertString` 14-file-dùng-1.
8. `CHANGELOG.md` ghi **0 breaking change về loại error**, và nêu 8 subpath mới.
9. Test toàn repo >= **480** ca (hiện 465), 0 fail.
10. **Ca tự phá 1:** bỏ điều kiện `type !== 'image/png'` -> tiêu chí 2 phải ĐỎ.
11. **Ca tự phá 2:** đổi `RangeError` của `quality` thành `TypeError` -> tiêu chí 1
    và 5 phải ĐỎ.
12. **Ca tự phá 3:** xoá tiền tố tên API khỏi một thông báo -> tiêu chí 6 phải ĐỎ.
13. `pnpm gate --full` 9/9 PASS.

## Risk Assessment

| Rủi ro                                                     | Mức | Chặn bằng                                                       |
| ---------------------------------------------------------- | --- | --------------------------------------------------------------- |
| Thêm validate `quality` từ chối lời gọi PNG vốn hợp lệ     | Cao | tiêu chí 2 và ca tự phá 1                                       |
| `maxAge: 0` bị từ chối - nhưng nó hợp lệ (xoá cookie ngay) | TB  | tiêu chí 3 khẳng định `0` không ném                             |
| Tạo `assertNonNegativeInteger` cho một consumer (§19)      | TB  | phán quyết giữ inline, ghi lý do trong code                     |
| Đổi thông báo lỗi hàng loạt làm test đỏ rồi bị sửa cho qua | TB  | tiêu chí 9: số ca **tăng**, không giảm                          |
| Docs ghi số rồi lạc hậu ngay                               | TB  | `check-doc-links` không kiểm con số - nêu rõ đây vẫn là điểm mù |

## Security Considerations

- **`maxAge` không validate là một lỗi an toàn nhẹ, không chỉ là bất tiện.** Một
  `Max-Age=NaN` làm trình duyệt bỏ cả cookie, nên một cookie dùng cho trạng thái
  đăng nhập hay chống CSRF âm thầm **không được ghi**, và `cookieJar.set` trả `void`
  nên không có đường nào biết. Lỗi đó biểu hiện thành "thỉnh thoảng người dùng bị
  đăng xuất", một triệu chứng rất khó truy.
- **`quality` thì không** - nó chỉ ảnh hưởng kích thước và chất lượng ảnh. Ghi rõ sự
  khác nhau về mức độ để không ai xếp hai lỗi này cùng hạng.

## Next steps

Hết plan. Cổng publish `0.1.0` vẫn là việc của owner và không phụ thuộc plan này;
nhưng nếu publish **sau** plan này thì `0.1.0` chứa 8 subpath `asserts/*`, và
CHANGELOG phải phản ánh điều đó.
