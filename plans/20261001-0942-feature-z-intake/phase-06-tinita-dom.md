# Pha 06 - 15 file của `tinita-dom`: viết lại ba nhóm có lỗi phá dữ liệu

## Context links

- Plan cha: [`plan.md`](./plan.md) · Phụ thuộc: **pha 04 xong**
- Song song được với pha 05 (khác package, khác file)
- Khuôn mẫu browser: `packages/tinita-dom/src/smooth-scroll.ts`
- Lab: `compatibility/README.md` (L4 Chromium là guard của package này)

## Overview

**Ngày:** 2026-10-01 · **Ưu tiên:** P1 · **Trạng thái:** chưa làm · **Review:** chưa

Owner chốt 2026-10-01: **"Viết lại cover mọi edge case."** Ba nhóm (storage,
download, html-JSON) có lỗi làm hỏng dữ liệu người dùng, không chỉ thiếu test.

## Key Insights

**Một lưu ý về chỉ thị "mọi edge case".** Nguyên tắc xuyên suốt của plan là "đừng
optimize utility cho mọi edge case; hãy optimize cho một contract chứng minh được".
Hai câu này không mâu thuẫn nếu đọc đúng: ba nhóm này đang **sai ở chính đường
chạy chính**, không sai ở biên hiếm gặp. `cookieStorage.set('a', 'x;y')` phá cả
cookie jar - đó là input thường, không phải edge case. Nên tôi đọc chỉ thị là:
**contract phải đầy đủ và kín**, chứ không phải "thêm guard cho mọi input tưởng
tượng được". Nếu owner muốn nghĩa thứ hai thì nói, tôi làm theo.

**`cookieStorage` có 4 lỗi, mỗi lỗi hỏng dữ liệu:**

```
set(): không encodeURIComponent  -> giá trị chứa ';' hoặc '=' phá cookie jau
set(): không path=/              -> ghi ở /a/b, đọc ở / không thấy
set(): không SameSite            -> Chrome coi là Lax và cảnh báo
clear(): `expire=` viết SAI      -> thuộc tính đúng là `expires=`, nên clear() KHÔNG xoá gì
get(): split('; ') rồi split('=') -> giá trị chứa '=' bị cắt mất phần sau
```

`clear()` đáng chú ý nhất: nó **trông như** hoạt động (không ném, không lỗi) và
không xoá gì cả. Đây đúng lớp "silent failure" mà cổng vào cấm.

**`localStorageAction.get` ném khi gặp giá trị không phải JSON.** `JSON.parse`
không try/catch. Một giá trị do code khác (hoặc một thư viện khác, hoặc chính người
dùng) ghi vào cùng key làm hàm ném thay vì trả `defaultValue` - đúng ngược lại điều
tên `defaultValue` hứa. Và `defaultValue = null` làm kiểu trả về ngầm `any`.

**`isBlockLevelHtml` dùng `innerHTML` trên chuỗi đầu vào.** `innerHTML` không chạy
`<script>`, nhưng nó **có** chạy `<img src=x onerror=...>`. Thay bằng `DOMParser`:
nó không chạy script và không fetch resource.

Đính chính phạm vi: `htmlToJson` **đã** dùng `DOMParser` từ pha 02, chỉ
`isBlockLevelHtml` còn `innerHTML`.

Và lưu ý về cách chứng minh: **jsdom không tải resource**, nên
`isBlockLevelHtml('<img src=x onerror="globalThis.__pwned=1">')` trong jsdom để
`__pwned` là `undefined` dù vẫn dùng `innerHTML` - đo 2026-10-01. Ca chứng minh
XSS **phải** là L4 trong Chromium thật; một ca jsdom sẽ xanh giả, đúng lớp lỗi
"ca báo xanh mà không kiểm thứ nó nói đang kiểm" mà repo đã gặp bốn lần.

**`downloadBlob` có race.** `setTimeout(revoke, 100)` - 100ms là phỏng đoán, không
phải hợp đồng. Firefox cần delay; con số đúng không tồn tại. `link.remove()` cũng
thiếu: hàm trả `<a>` chưa bao giờ gắn vào DOM nên không rò node, nhưng việc **trả
về `<a>`** thì không có lý do nào.

**`convertLength` là class có `export default`.** Nó đụng `document` để quy px.
Class cho một phép đổi đơn vị thuần là API nặng hơn việc nó làm; và `document` chỉ
cần cho `px`, nên 5/6 đơn vị không cần DOM chút nào.

## Requirements

1. Cổng vào của pha 03, áp cho cả 15 file.
2. **Ba nhóm phải viết lại, không vá tại chỗ.** Vá `cookieStorage` tại chỗ vẫn để
   lại thiết kế 4 method không có API đọc đồng bộ tin được.
3. `tinita-dom` phải khai `engines` - hiện `undefined` trong khi hai package kia
   khai `>=18.0.0`, và `CLAUDE.md` nói Node >= 18.
4. Mỗi export công khai của `tinita-dom` **phải có story** (`pnpm check-stories`
   canh), hoặc nằm trong `EXEMPT` kèm lý do viết ra.
5. Không hàm nào chạm `document`/`window` ở thời điểm **import**. Browser-only là
   về lúc _gọi_, không phải lúc _load_ - nếu không ca SSR của L2 sẽ đỏ.

## Architecture

### `storage/` - viết lại thành một hình dạng, ba bản cài

Ba file hiện là ba object literal khác hình dạng. Thay bằng một interface và ba bản:

```
interface JsonStore {
  get<T>(key: string, fallback: T): T;   // KHÔNG BAO GIỜ ném
  set(key: string, value: unknown): boolean;  // false khi quota đầy
  remove(key: string): void;
  clear(): void;
}
```

Ba quyết định phải khai vào JSDoc:

| Câu hỏi                                  | Chốt                                    |
| ---------------------------------------- | --------------------------------------- |
| giá trị không parse được                 | trả `fallback`, không ném, không log    |
| `localStorage` bị chặn (Safari riêng tư) | `get` trả `fallback`, `set` trả `false` |
| quota đầy                                | `set` trả `false`, không ném            |

`cookieStore` **không** dùng interface đó: cookie không lưu JSON được an toàn (giới
hạn 4096 byte, và nó đi theo mọi request). API riêng:

```
cookieStore.get(name): string | null          // null khi không có, '' khi rỗng
cookieStore.set(name, value, options?)        // encodeURIComponent cả name và value
                                              // options: maxAge, path='/',
                                              // sameSite='Lax', secure, domain
cookieStore.remove(name, options?)            // expires=Thu, 01 Jan 1970
cookieStore.entries(): [string, string][]     // thay cho clear() vô dụng
```

Bỏ `clear()`. Lý do: không thể xoá cookie một cách đáng tin từ JS - cookie
`HttpOnly` không thấy được, và cookie đặt ở `path`/`domain` khác không xoá được mà
không biết đúng cặp đó. Một `clear()` xoá được 60% là tệ hơn không có `clear()`.
Đây là ví dụ "contract chứng minh được" thắng "API trông đầy đủ".

### `html/` - `DOMParser` thay `innerHTML`

`isBlockLevelHtml`, `htmlToJson`, `jsonToHtml`, `elementToJson`.

```
// trước: tempContainer.innerHTML = content  -> chạy onerror
// sau:   new DOMParser().parseFromString(content, 'text/html')
```

`DOMParser` không chạy script và không fetch resource - đó là lý do nó là lựa chọn
đúng, không phải vì nó mới hơn.

`jsonToHtml` sinh chuỗi HTML nên nó là điểm inject theo thiết kế. Hai việc: escape
mọi text node và mọi giá trị attribute (dùng `html.encode` của `tinita` ở pha 03 -
đây là lý do thứ hai cái đó tồn tại), và JSDoc nói thẳng rằng output chỉ an toàn
nếu input đi qua chính `htmlToJson`.

### `validation/` - feature detection trước, UA là fallback

Owner chốt 2026-10-01: **"Giữ làm fallback."** Nên hình dạng là:

```
isTouchDevice()    -> đo năng lực thật: ontouchstart, maxTouchPoints, msMaxTouchPoints
isCoarsePointer()  -> MỚI: matchMedia('(pointer: coarse)')  - đây là câu trả lời đúng
isMobileDevice()   -> matchMedia('(pointer: coarse) and (hover: none)') TRƯỚC;
                      chỉ rơi xuống UA regex khi matchMedia không có
isIOS() isAndroid() isWindows() isMacOS() isIOSWebView()
                   -> giữ, JSDoc khai rõ: heuristic trên UA, có thể sai,
                      KHÔNG dùng cho quyết định bảo mật hay tính phí
```

`isWindowsTouch` bỏ: nó là `isWindows() && isTouchDevice()`, người gọi ghép được, và
chính nó là thứ đã sinh ra lỗi `isWindows` không tồn tại ở bản cũ.

Hai điều phải khai mà bản cũ không khai:

1. **`isIOS` chạm `document`** (`'ontouchend' in document`). Nó không chạy được
   trong worker. JSDoc phải nói.
2. **Chrome đã freeze chuỗi UA.** Nghĩa là `isAndroid()` dựa trên một chuỗi mà nhà
   cung cấp đã công bố ngừng cập nhật. JSDoc nêu điều này và chỉ sang
   `navigator.userAgentData` cho ai cần chính xác.

### `convertLength` - hàm, không class

```
convertLength(value: number, from: LengthUnit, to: LengthUnit): number
```

`mm`, `cm`, `inch`, `pt`, `pc` đổi được bằng hằng số thuần - **không cần DOM**, nên
5 đơn vị này chuyển về `tinita`. `px` cần DOM (phụ thuộc DPI thật) nên ở lại
`tinita-dom` thành `convertCssPixels`. Đây là lần tách duy nhất của pha, và nó có
lý do đo được: 5/6 đơn vị không có quan hệ nào với trình duyệt.

### `engines` cho `tinita-dom`

Thêm `"engines": { "node": ">=18.0.0" }`. Không phải vì package chạy trên Node, mà
vì bundler và SSR **load** nó trên Node, và `undefined` nghĩa là npm không cảnh báo
được gì. Ca L1 mới: cả ba package khai `engines` giống nhau.

## Related code files

- 15 file trong `packages/tinita-dom/src/`
- `packages/tinita-dom/package.json` - `exports`, `typesVersions`, `engines`
- `packages/tinita-dom/tsup.config.ts` - glob đã sửa ở pha 03 (`src/**/*.ts`)
- `apps/storybook/stories/` - story cho mỗi export mới
- `scripts/check-stories.mjs` - `EXEMPT` kèm lý do
- `compatibility/contract.json`, `compatibility/cases/` - L4 Chromium
- `packages/tinita/src/html/html.ts` - `jsonToHtml` dùng để escape

## Implementation Steps

1. `engines` + ca L1 kiểm ba package khai giống nhau.
2. `storage/` viết lại: `JsonStore` + 2 bản cài + `cookieStore`. Nhóm nguy hiểm nhất
   nên làm trước lúc còn tập trung.
3. `html/` viết lại 4 file bằng `DOMParser`, escape qua `tinita`.
4. `downloadBlob`: bỏ `setTimeout` phỏng đoán, bỏ việc trả `<a>`, dùng
   `requestAnimationFrame` hai nhịp rồi revoke, hoặc nhận `revokeAfterMs` tường
   minh và khai mặc định.
5. `validation/`: thêm `isCoarsePointer`, đổi `isMobileDevice` sang matchMedia-trước,
   JSDoc heuristic cho 5 hàm UA, bỏ `isWindowsTouch`.
6. `convertLength` -> `tinita/src/unit/`, `convertCssPixels` ở lại.
7. `getScrollbarSize`, `setCssVariables`, `resizeImage` - lên chuẩn, không đổi thiết kế.
8. Story cho mỗi export. Hàm thuần không vẽ gì thì vào `EXEMPT` kèm lý do.
9. Khai `exports` + `typesVersions` + `contract.json`.
10. `pnpm gate --full`.

## Todo list

- [ ] `engines` cho `tinita-dom` + ca L1 ba package đồng bộ
- [ ] `JsonStore` + `localStorageJson` + `sessionStorageJson` + test
- [ ] `cookieStore` viết lại (bỏ `clear`, thêm encode/path/sameSite) + test
- [ ] 4 file `html/` sang `DOMParser` + escape + test
- [ ] `downloadBlob` viết lại
- [ ] `validation/`: `isCoarsePointer`, `isMobileDevice`, JSDoc heuristic, bỏ `isWindowsTouch`
- [ ] `convertLength` sang `tinita`, `convertCssPixels` ở lại
- [ ] `getScrollbarSize`, `setCssVariables`, `resizeImage` lên chuẩn
- [ ] Story / `EXEMPT` cho mọi export mới
- [ ] `exports` + `typesVersions` + `contract.json`
- [ ] 3 ca tự phá (xem Success Criteria)
- [ ] `pnpm gate --full` 9/9

## Success Criteria

1. `node -e "const p=require('tinita-dom/package.json'); console.log(Object.keys(p.exports).length, JSON.stringify(p.engines))"`
   in ra **20** và `{"node":">=18.0.0"}`.
2. Mọi specifier `tinita-dom` resolve tới file dist có thật: 20/20.
3. `pnpm check-stories` exit 0.
4. **`cookieStore` round-trip giá trị có ký tự đặc biệt.** Trong Chromium (L4):
   `cookieStore.set('k', 'a;b=c d')` rồi `cookieStore.get('k')` trả đúng
   `'a;b=c d'`, **và** `document.cookie` vẫn còn mọi cookie đặt trước đó. Với code
   hiện tại ca này đỏ.
5. **`cookieStore.remove` thật sự xoá.** `set` rồi `remove` rồi `get` trả `null`, đo
   trong Chromium. Với `clear()` hiện tại (`expire=` viết sai) ca này đỏ.
6. **`localStorageJson.get` không ném trên giá trị rác.**
   `localStorage.setItem('k', 'not json')` rồi `localStorageJson.get('k', 42)` trả
   `42`, không ném. Với code hiện tại ca này đỏ.
7. **`isBlockLevelHtml` không thực thi gì.** Trong Chromium, gọi
   `isBlockLevelHtml('<img src=x onerror="window.__pwned=1">')` rồi
   `window.__pwned` là `undefined`. Với `innerHTML` hiện tại ca này **đỏ** - đó là
   bằng chứng lỗ hổng tồn tại thật, không phải lý thuyết.
8. **`jsonToHtml` escape.** `jsonToHtml` trên một node có text `'<script>'` ra chuỗi
   chứa `&lt;script&gt;`, và khi gán vào `innerHTML` không sinh element `script`
   nào (`document.querySelectorAll('script').length` không tăng).
9. Ca SSR của L2: import cả 20 specifier `tinita-dom` ở top level **không ném**.
   Gọi hàm thì ném/degrade - đó là hợp đồng browser-only, và nó được khai trong
   `README.md`.
10. Test `tinita-dom` >= **90** ca. Đo 2026-10-01 bằng `pnpm test`: hiện **17 passed + 1 todo**, trong 2 file (`wheel-source`, `smooth-scroll`) - 15 file của pha này có **0** ca.
11. **Ca tự phá 1:** đổi `DOMParser` về `innerHTML` trong `isBlockLevelHtml` -> ca
    L4 số 7 phải ĐỎ.
12. **Ca tự phá 2:** bỏ `encodeURIComponent` trong `cookieStore.set` -> ca L4 số 4
    phải ĐỎ.
13. **Ca tự phá 3:** đưa một lệnh `document.createElement` ra top level của một
    module -> ca SSR của L2 phải ĐỎ.
14. `pnpm gate --full` 9/9 PASS.

## Risk Assessment

| Rủi ro                                                              | Mức | Chặn bằng                                                          |
| ------------------------------------------------------------------- | --- | ------------------------------------------------------------------ |
| Bỏ `cookieStorage.clear()` là mất API người dùng cũ có thể đang gọi | TB  | `tinita-dom` **chưa publish** (npm E404) - không có người dùng cũ  |
| `DOMParser` không có ở Node -> ca SSR đỏ nếu gọi ở top level        | Cao | tiêu chí 9 + ca tự phá 3                                           |
| 20 export mỗi cái cần story -> lại là 20 việc phụ dễ bỏ qua         | Cao | `pnpm check-stories` là cổng, không phải khuyến nghị               |
| `convertLength` chuyển sang `tinita` làm hai package cùng đổi       | TB  | làm bước 6 thành commit riêng, chạy `pnpm build` 3/3               |
| JSDoc "heuristic" vẫn bị người dùng tin là chính xác                | TB  | README có mục riêng, không chỉ JSDoc                               |
| L4 cần chromium nên vòng lặp chậm -> cám dỗ chỉ chạy `pnpm gate`    | TB  | 5 trong 14 tiêu chí chỉ đo được ở L4; chạy `--full` cuối mỗi nhóm  |
| `resizeImage` dùng canvas -> ảnh có EXIF orientation bị quay sai    | TB  | test với ảnh có EXIF orientation 6; khai vào JSDoc nếu không xử lý |

## Security Considerations

Pha này có **ba** bề mặt an toàn thật, nhiều nhất trong cả plan.

1. **XSS qua `innerHTML` (đang tồn tại).** `isBlockTag` và `htmlToJSON` gán chuỗi
   đầu vào vào `innerHTML`. `<img src=x onerror=...>` chạy ngay. Tiêu chí 7 đo
   chính điều này, và ca tự phá 11 chứng minh guard hoạt động. Đây là lý do nhóm
   `html/` không được "vá tại chỗ".
2. **`jsonToHtml` KHÔNG cần escape - đo 2026-10-01, claim này của tôi sai.** Hàm
   dựng qua `document.createElement` + `setAttribute` + `createTextNode` rồi lấy
   `outerHTML`, nên serializer của DOM tự escape:

   ```
   text node  '<script>alert(1)</script>'  ->  &lt;script&gt;alert(1)&lt;/script&gt;
   attribute  '"><img src=x onerror=1>'    ->  title="&quot;><img src=x onerror=1>"
   ```

   Nên **bỏ** ý định import `html.encode` của `tinita` vào đây: nó dư thừa.

   Hai lỗi thật thay thế:
   - `jsonToHtml({ nodeName: 'img', attributes: { onerror: '...' } })` ra
     `<img src="x" onerror="window.__p=1">`. Serializer trung thực, nghĩa là **cho
     JSON không tin cậy vào thì ra markup nguy hiểm**. Đây là contract phải khai,
     không phải bug phải vá - một serializer âm thầm bỏ attribute còn tệ hơn.
   - `nodeName` không hợp lệ ném `DOMException` (`"a b" did not match the Name
production`), không phải `TypeError`, và không khai ở đâu. Phải bọc lại.

3. **Cookie.** `path`, `SameSite`, `Secure` là thuộc tính **an toàn**, không phải
   tiện ích. Mặc định `path='/'` + `sameSite='Lax'`; `secure` mặc định `true` khi
   `location.protocol === 'https:'`. Và JSDoc phải nói: cookie đi theo **mọi**
   request tới domain, nên đừng đặt dữ liệu riêng tư vào đó -
   `sessionStorageJson` là chỗ đúng.

Một điều KHÔNG làm: `cookieStore` không nhận `HttpOnly`. JS không đặt được nó, và
một option bị trình duyệt bỏ qua im lặng là tệ hơn không có option.

## Next steps

Pha 07 - 6 file của `tinita-react`.
