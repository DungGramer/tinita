# Pha 04 - 60 file còn lại

**Phụ thuộc:** pha 03 xong (khuôn mẫu đã có từ cặp base64).

## Nguyên tắc: mặc định là XOÁ, không phải GIỮ

Vùng chờ `incoming/` chỉ có giá trị nếu nó về 0. Mỗi file phải có người đứng ra
trả lời "ai cần nó, để làm gì". Không trả lời được thì xoá - code còn trong git
history, lấy lại được bất cứ lúc nào.

Lý do không phải tiết kiệm công: mỗi export là một **cam kết API vĩnh viễn**. 60
export thêm vào nghĩa là 60 thứ không bao giờ được đổi signature nữa, cộng 60 ca
L1, 60 entry `typesVersions`. Đó là cái giá thật, trả bằng mọi lần release sau này.

## Lô theo mức độ chắc chắn

### Lô A - xoá ngay, không cần bàn (10 file)

Trùng với thư viện chuẩn hoặc với code đã có:

| File | Lý do |
| --- | --- |
| `object/omit.ts`, `object/pick.ts` | 10 dòng mỗi cái, người dùng tự viết nhanh hơn đọc docs |
| `object/once.ts` | trùng ý niệm đã quá phổ biến |
| `array/uniqueArray.ts` | `[...new Set(a)]` |
| `array/createRange.ts` | 3 dòng |
| `array/getArrayVal.ts` | 3 dòng |
| `validation/isURL.ts` | 3 dòng, `URL.canParse` đã là chuẩn |
| `validation/isNumber.ts`, `isAlphabet.ts` | 5 dòng |
| `converter/mapToObject.ts`, `objectToMap.ts` | `Object.fromEntries(map)` / `new Map(Object.entries(o))` |

Một util chỉ đáng publish khi nó **khó viết đúng**. `truncateFileName` đáng vì nó
có 8 defect đã từng được vá. `pick` thì không.

### Lô B - chặn bởi dependency (3 file)

`object/conditionObj.ts`, `object/filterValidValue.ts`, `validation/isEmail.ts`
import `lodash-es`, vốn **không** nằm trong `dependencies` của `tinita`, và
`tinita` cam kết zero-dependency.

Ba đường: viết lại không cần lodash; hoặc bỏ; hoặc phá cam kết zero-dep. Đường thứ
ba không mở - nó là lý do `tinita` tồn tại.

### Lô C - cần quyết định thiết kế trước khi sửa (8 file)

| File | Câu hỏi phải trả lời |
| --- | --- |
| `constant/HTML_entities_map.ts` (1514 dòng) | QĐ-B: subpath riêng hay không |
| `converter/HTMLEntitiesToString.ts` | cùng nhóm với hàm encode ở pha 03 |
| `converter/text.ts` (63 dòng) | tên không nói gì, bên trong là gì? |
| `converter/unit-converter.ts` | đụng `document` để đổi px; dùng `tinita-dom` |
| `regex/index.ts` | export regex dùng chung = cam kết API cho từng pattern |
| `converter/stringToEventCode.ts` | `KeyboardEvent.code` đã là chuẩn, còn cần không? |
| `detect/checkMobile.ts` | user-agent sniffing là kỹ thuật đã lỗi thời |
| `date/sortDate.ts` | hiện có lỗi cú pháp: tham số vừa `?` vừa có giá trị mặc định |

### Lô D - giữ, cần nâng lên chuẩn (khoảng 15 file)

Các hàm có lý do tồn tại rõ: `sortAlphaText`, `uniquePushArray` (sau khi sửa
`isEmpty` không tồn tại), `sortObjectKey`, `acceptTypeToRegex`,
`fileExtensionToMIME`/`MIMEToFileExtension`, `enumKey`, `isVietnamese`,
`stringToSelector`, nhóm hook React, `getScrollbarSize`.

Mỗi file qua đúng cổng ở pha 03.

### Lô E - `tinita-react` (7 file)

`createContextHook`, `useDoubleTap`, `usePagination`, `useRefreshComponent`,
`useWindowSize`, `jsxJoin`.

Khác biệt với hai package kia: **phải sống sót SSR**. `useWindowSize` đụng `window`
- trong React đó là lỗi nếu không guard, vì React app có SSR. Khuôn mẫu đã có sẵn
trong repo: `usePrefersReducedMotion` ở `CarouselTicker.tsx` (khởi tạo `false`, chỉ
đọc `matchMedia` trong effect, nghe `change`).

Thêm ràng buộc: mỗi component/hook public **phải có story**, `pnpm check-stories`
đã canh việc này.

## Thứ tự

Lô A (xoá) -> Lô B (quyết dependency) -> Lô E (React, có khuôn mẫu sẵn) ->
Lô D -> Lô C (khó nhất, để cuối khi đã quen chuẩn).

## Tiêu chí xong

- `packages/*/incoming/` **rỗng cả ba**, thư mục bị xoá.
- Mỗi export mới có: ca `contract.json`, entry `exports` + `typesVersions`, test,
  JSDoc contract. Story nếu là React.
- `pnpm gate --full` 9/9 PASS.
- Ca L1 `08-typesversions-sync` vẫn PASS (nó canh `exports` và `typesVersions`
  không lệch, và số lượng vừa tăng mạnh nên đây là lúc nó dễ lệch nhất).
- `docs/codebase-summary.md` và `README.md` khớp số lượng export mới.

## Rủi ro lớn nhất của pha này

**Mệt mỏi dẫn đến hạ chuẩn.** 60 file là nhiều, và cám dỗ là "cái này nhỏ, bỏ qua
test cũng được". Chặn bằng: lô A xoá trước để số file giảm thấy rõ, và không có
ngoại lệ nào cho cổng vào. Một hàm không đáng viết test thì cũng không đáng publish
- đó chính là tiêu chí để xếp nó vào lô A.
