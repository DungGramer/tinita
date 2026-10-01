# Pha 05 - 29 file của `tinita`: lên chuẩn, không xoá cái nào

## Context links

- Plan cha: [`plan.md`](./plan.md) · Phụ thuộc: **pha 04 xong** (tên đã chốt)
- Khuôn mẫu: pha 03, `packages/tinita/src/converter/bytesToBase64.ts` và
  `packages/tinita/tests/converter-base64.test.ts`
- Nguồn hằng số: [`reports/02-nguon-goc-bang-hang-so.md`](./reports/02-nguon-goc-bang-hang-so.md)

## Overview

**Ngày:** 2026-10-01 · **Ưu tiên:** P1 · **Trạng thái:** XONG 2026-10-01 ·
**Review:** chưa

Owner chốt 2026-10-01: **giữ hết, nâng chuẩn.** Không có lô xoá. 29 file của
`tinita` đi qua cổng vào của pha 03 rồi được export.

## Key Insights

**Quyết định "giữ hết" đổi bài toán.** Lô A cũ (13 file mỏng) định xoá để giảm số
cam kết API. Giữ hết nghĩa là nhận 29 cam kết vĩnh viễn thay vì 16, cộng 29 ca L1
và 29 entry `typesVersions`. Điều đó đặt ra một yêu cầu không có ở bản plan cũ:
**hàm mỏng phải có contract mỏng tương ứng, không phải contract phình ra để trông
đáng publish.** `createRange(n)` cần đúng ba câu: nhận gì, trả gì, ném khi nào. Viết
40 dòng JSDoc cho 4 dòng code là hạ chuẩn theo chiều ngược lại.

**Nguyên tắc của owner áp vào đây gần như nguyên văn:** "Đừng optimize utility cho
mọi edge case; hãy optimize cho một contract có thể chứng minh được." Với 13 hàm
mỏng, contract chứng minh được thường là **một** invariant:
`getArrayValue(a, i)` trả `a[i]` hoặc `fallback`, không bao giờ ném.

**Bảng MIME là dữ liệu sai, không phải code thiếu test.** Đo được: 139 entry dòng
dõi Tomcat ~2003, có `image/x-jg` (AOL Johnson-Grace, đã chết), thiếu `image/webp`,
`image/avif`, `font/woff2`, `application/wasm`, `video/webm`. Ba hàm đang dựa lên
nó. Viết test cho bảng sai chỉ khoá cái sai lại.

**`print_type.ts` có lỗi hai cơ sở tính.** `'8INX10IN'` ratio `8/10` tính theo inch;
`'A4'` ratio `2480/3508` tính theo pixel @300dpi; `'14INX14IN'` ratio viết tay `1`.
Ba cơ sở trong một bảng 12 dòng.

**`isVietnamese` KHÔNG xác định - tìm được ở pha 04.** `vietnameseRegex` khai với cờ
`g`, và `isVietnamese` gọi `.test()` lên chính regex dùng chung đó. Cờ `g` làm
`.test()` đẩy `lastIndex`, nên cùng một input trả **luân phiên**. Đo 2026-10-01:

```
isVietnamese('Hòa') 6 lần liên tiếp -> true false true false true false
                                       (lastIndex 2, 0, 2, 0, 2, 0)
```

Một predicate thuần không xác định là lỗi nặng nhất có thể có với utility, và nó
**vô hình** với test chỉ gọi một lần. Sửa: bỏ cờ `g` (và `u` giữ lại). Test phải
gọi hai lần cùng input và so bằng nhau - đó là ca duy nhất bắt được nó.

Cùng lớp: `patterns.ts` có `emailRegex` giới hạn TLD `{2,4}` nên từ chối `.museum`,
`.online`; và `urlRegex` là 6 dòng tự dựng trong khi `URL.canParse` là câu trả lời.

**Nợ từ pha 04 phải trả ở pha này:** `mime/mimeTypeTable.ts` đang
`/* eslint-disable @typescript-eslint/no-explicit-any */` cả file vì 139 cast `<any>`
của mánh reverse-mapping `enum`. Khi bảng sinh lại từ `mime-db` thành
`Record<string, string>` thì **xoá dòng disable đó** - tiêu chí 5 đã đòi 0 `<any>`.

## Requirements

Mỗi file trong 29 file phải đạt **cùng** cổng vào của pha 03:

| Tiêu chí              | Chứng minh bằng                                                |
| --------------------- | -------------------------------------------------------------- |
| Type-safe             | `pnpm check-types` 0 lỗi, không `any` ngầm, không `<any>` cast |
| Single responsibility | một hàm một việc, không cờ đổi kiểu trả về                     |
| Deterministic         | cùng input ra cùng output, kể cả thời gian                     |
| Không side effect     | không chạm global, không mutate tham số, **không `console.*`** |
| Error semantics rõ    | JSDoc nói ném khi nào và ném cái gì                            |
| Unicode/boundary      | test: rỗng, ngoài BMP, surrogate đơn lẻ, chuỗi dài             |
| Round-trip invariant  | property test ở nơi có cặp nghịch đảo                          |
| Browser/SSR           | ca L1 Node + fixture SSR của L2                                |
| JSDoc                 | contract, không implementation                                 |
| API stability         | có trong `contract.json`                                       |

Thêm ba yêu cầu riêng pha này:

1. **Không `console.*` trong `src/`.** `snakeToTitleCase` hiện `console.error` rồi
   trả nguyên input. Vừa side effect vào global vừa silent failure.
2. **Bảng MIME phải sinh từ nguồn kiểm được**, không copy tay.
3. **`photoPrintSizes` phải tính `ratio` một cơ sở**, suy từ mm.

## Architecture

### Nhóm theo contract, không theo folder

**Nhóm 1 - predicate thuần (5 file).** `isNumber`, `isAlphabet`, `isURL`,
`isEmail`, `isVietnamese`. Contract một dòng: `(value: unknown) => boolean`, không
bao giờ ném. `isURL` dùng `URL.canParse` khi có, fallback `new URL` trong try/catch

- `URL.canParse` chỉ có từ Node 18.17, và `engines` khai `>=18.0.0`.

**Nhóm 2 - array (5 file).** `createRange`, `getArrayValue`, `sortAlphaText`,
`uniqueArray`, `prependUnique`. Hai cái đã có JSDoc contract từ pha 02
(`prependUnique`); ba cái còn lại theo khuôn đó. `sortAlphaText` phải khai dùng
`Intl.Collator` locale nào - sort chữ Việt bằng `<` cho kết quả sai thứ tự.

**Nhóm 3 - object (6 file).** `pick`, `omit`, `once`, `sortObjectKey`, `enumKeys`,
`conditionalEntry`, `omitEmptyValues`. `omitEmptyValues` và `conditionalEntry` đã
qua pha 02. `pick`/`omit` cần quyết: giữ prototype hay không (`Object.create(null)`
vs `{}`) - khai vào JSDoc.

**Nhóm 4 - string (6 file).** 5 hàm tách từ `text.ts` + `stringToSelector`. Đây là
nhóm nhiều lỗi nhất:

```
titleCase('hello WORLD')     -> 'Hello World'   (lowercase trước, mất chữ hoa cố ý)
titleCase("o'brien")         -> "O'brien"       (không tách sau dấu nháy)
titleCase('a  b')            -> 'A  B'          (split(' ') giữ chuỗi rỗng)
snakeToTitleCase(42 as any)  -> console.error + trả 42
insertTextAfterWords        -> mặc định '<br>', một hàm string sinh HTML
collapseWhitespace('')      -> '' nhưng tên cũ nói "remove"
```

Quyết định cần chốt trong pha: `titleCase` có `toLowerCase()` trước hay không.
Khuyến nghị **không**, và thêm option `lowercaseRest?: boolean` mặc định `false` -
vì `titleCase('iPhone SDK')` hiện ra `'Iphone Sdk'`, phá dữ liệu.

**Nhóm 5 - MIME (4 file).** `mimeTypeTable`, `fileExtensionToMimeType`,
`mimeTypeToFileExtension`, `acceptAttributeToRegExp`.

Bảng sinh bằng `scripts/generate-mime-table.mjs` đọc `mime-db` (devDependency),
in ra `src/mime/mimeTypeTable.ts` rồi **commit kết quả**. `tinita` không nhận
dependency runtime nào. Script ghi vào đầu file ngày sinh và phiên bản `mime-db`.

Quyết định: `mimeTypeToFileExtension` là quan hệ **một-nhiều**
(`image/jpeg` -> `jpg`, `jpeg`, `jpe`). Hiện trả một giá trị. Khuyến nghị trả
`string` là phần mở rộng **ưu tiên** (`mime-db` có cột đó) và khai rõ trong JSDoc
rằng nó không phải nghịch đảo đầy đủ - round-trip
`fileExtensionToMimeType(mimeTypeToFileExtension(m)) === m` giữ được, nhưng chiều
ngược lại thì không với `jpe`.

**Nhóm 6 - print (3 file).** `pageSizes` (51 khổ ISO, giữ nguyên số), `printMargins`
(tách `DEFAULT_MARGIN_PRINT` ra), `photoPrintSizes` (tính lại `ratio`).

**Nhóm 7 - date (1 file).** `sortDate` - đã sửa ở pha 02 (`(left - right) * direction`,
trả array mới, NaN về cuối). Chỉ cần test + export.

### `tsup` không cần sửa

`tinita/tsup.config.ts` quét `src/*/**/*.ts` nên folder mới (`string/`, `mime/`,
`print/`) tự thành entry. Nhưng xem rủi ro: **49 entry build, 18 export** trước pha
này. Sau pha này con số phải khớp nhau.

## Related code files

- 29 file trong `packages/tinita/src/` (sau khi pha 04 đổi tên)
- `packages/tinita/package.json` - `exports` + `typesVersions`
- `packages/tinita/src/index.ts` - barrel
- `compatibility/contract.json` - 29 specifier mới
- `packages/tinita/tests/` - file test mới theo nhóm, không một file một hàm
- `scripts/generate-mime-table.mjs` - **mới**
- `compatibility/cases/` - fixture SSR phải import converter của `tinita` (lỗ hổng
  ghi ở pha 01, chưa vá)

## Implementation Steps

1. Vá lỗ hổng SSR trước: fixture `SSR_ESM`/`SSR_CJS` của L2 đọc `contract.json` và
   import **mọi** specifier của `tinita`, không liệt kê tay. Làm đầu tiên để 29
   export sau đó tự được canh.
2. Nhóm 1 (predicate) - 5 file. Rẻ nhất, lập khuôn test cho pha.
3. Nhóm 2 + 3 (array, object) - 11 file.
4. Nhóm 4 (string) - 6 file. Chốt câu hỏi `titleCase` trước khi viết.
5. Nhóm 5 (MIME): viết `scripts/generate-mime-table.mjs`, sinh bảng, commit bảng,
   rồi 3 hàm.
6. Nhóm 6 (print) - 3 file. Tính lại `ratio` từ mm, một cơ sở.
7. Nhóm 7 (`sortDate`) - test + export.
8. Khai 29 subpath vào `exports` + `typesVersions` + `contract.json`.
9. Kiểm số: entry build == số export công khai + số file nội bộ có lý do.
10. `pnpm gate --full`.

## Todo list

- [ ] Fixture SSR L2 đọc `contract.json`, import mọi specifier `tinita`
- [ ] Nhóm 1 predicate (5 file) + test
- [ ] Nhóm 2 array (5 file) + test
- [ ] Nhóm 3 object (6 file) + test
- [ ] Chốt câu hỏi `titleCase` lowercase
- [ ] Nhóm 4 string (6 file) + test
- [ ] `scripts/generate-mime-table.mjs` + bảng sinh ra
- [ ] Nhóm 5 MIME (3 hàm) + test round-trip
- [ ] Nhóm 6 print (3 file) + test đối chiếu ISO 216
- [ ] Nhóm 7 `sortDate` + test
- [ ] 29 entry `exports` + `typesVersions` + `contract.json`
- [ ] Ca tự phá SSR + ca tự phá `console.*`
- [ ] `pnpm gate --full` 9/9

## Success Criteria

1. `node -e "const p=require('tinita/package.json'); console.log(Object.keys(p.exports).length)"`
   in ra **47** (18 hiện có + 29 mới).
2. Trong project cô lập chỉ có `tinita`: với **mỗi** specifier trong `exports`,
   `node -e "require('<specifier>')"` exit 0 **và**
   `node --input-type=module -e "await import('<specifier>')"` exit 0. 47/47.
3. Ca L1 `08-typesversions-sync` PASS; `typesVersions` có đúng 47 key tường minh,
   0 wildcard.
4. `grep -rn "console\." packages/tinita/src` trả **0 dòng**.
5. `grep -rn "<any>" packages/tinita/src` trả **0 dòng** (hiện 139, toàn bộ ở bảng MIME).
6. Test `tinita` >= **200** ca (hiện 90), exit 0.
7. Bảng page size: test đối chiếu 7 giá trị chuẩn ISO 216/217 trong report 02
   (`A4` `[210,297]`, `C5` `[162,229]`, `SRA3` `[320,450]`, `LETTER` `[215.9,279.4]`,
   `LEGAL` `[215.9,355.6]`, `TABLOID` `[279.4,431.8]`, `EXECUTIVE` `[184.15,266.7]`)
   - 7/7 khớp.
8. Bảng MIME: chứa `image/webp`, `image/avif`, `font/woff2`, `application/wasm`,
   `video/webm`; **không** chứa `image/x-jg`.
9. `photoPrintSizes`: mọi `ratio` thoả `Math.abs(ratio - width/height) < 1e-9` với
   `width`/`height` tính bằng mm. 12/12.
10. Property test round-trip MIME: với mọi `(mimeType, ext)` trong bảng,
    `fileExtensionToMimeType(mimeTypeToFileExtension(mimeType)) === mimeType`.
11. **Ca tự phá 1 (SSR):** bỏ fixture SSR import `tinita/converter/objectToFormData`
    rồi thêm lại một `value instanceof FileList` không guard -> ca SSR của L2 phải
    ĐỎ. Hiện tại nó xanh giả vì fixture không chạm `tinita`.
12. **Ca tự phá 2 (`console`):** thêm `console.warn('x')` vào một file `src/` ->
    `pnpm lint` exit khác 0.
13. `pnpm gate --full` 9/9 PASS.

## Risk Assessment

| Rủi ro                                                                  | Mức  | Chặn bằng                                                                   |
| ----------------------------------------------------------------------- | ---- | --------------------------------------------------------------------------- |
| 29 export = 29 cam kết vĩnh viễn, hối không rút lại được                | Cao  | đây là quyết định owner đã chốt; ghi vào CHANGELOG `0.1.0` rõ ràng          |
| "Mệt mỏi dẫn đến hạ chuẩn" ở file thứ 20                                | Cao  | làm theo nhóm, mỗi nhóm một commit + `pnpm gate` trước khi sang nhóm        |
| JSDoc phình ra cho hàm 4 dòng để trông đáng publish                     | TB   | giới hạn: contract của hàm mỏng <= 6 dòng JSDoc                             |
| `titleCase` đổi hành vi (bỏ `toLowerCase`) phá người dùng cũ            | Thấp | chưa publish `0.1.0`; test khoá cả hai nhánh option                         |
| Bảng MIME sinh ra khác bảng cũ -> `acceptAttributeToRegExp` đổi kết quả | TB   | test đối chiếu trực tiếp các `accept` thực tế: `image/*`, `.pdf`, `audio/*` |
| 49 entry build / 18 export -> tarball phình                             | TB   | tiêu chí 1 và bước 9 buộc hai số khớp                                       |
| `URL.canParse` không có ở Node 18.0-18.16                               | TB   | fallback try/catch; ca L1 chạy trên `node:18-alpine`                        |

## Security Considerations

- **`isURL` không phải guard an toàn.** `URL.canParse('javascript:alert(1)')` trả
  `true`. JSDoc phải nói thẳng: hàm này kiểm **cú pháp**, không kiểm scheme, và
  không được dùng để quyết định có điều hướng tới một URL hay không.
- **`isEmail` cùng loại.** Regex không chứng minh hộp thư tồn tại. JSDoc nói rõ nó
  dùng để lọc lỗi nhập, không dùng để xác thực.
- **`stringToSelector`** dựng CSS selector từ chuỗi. Nếu chuỗi đến từ người dùng và
  kết quả đi vào `querySelector`, một chuỗi có `"]` phá được selector. Phải dùng
  `CSS.escape` khi có, và JSDoc khai rõ.
- **`insertTextEveryNWords` mặc định chèn `'<br>'`.** Một hàm string trả HTML là
  bẫy: kết quả trông như text nhưng chỉ đúng khi đi qua `innerHTML`. Đổi mặc định
  thành `'\n'` và để người gọi truyền `'<br>'` khi họ biết họ đang dựng HTML.

## Kết quả đo được

| Chỉ số                     | Trước pha |     Sau pha |
| -------------------------- | --------: | ----------: |
| `tinita` subpath công khai |        18 |      **51** |
| `typesVersions` key        |        17 |      **50** |
| `contract.json` specifier  |        18 |      **51** |
| Test `tinita`              |        90 |     **253** |
| Entry build / export được  |   49 / 18 | **55 / 51** |
| Đường chết trong dist      |        31 |       **4** |
| Cast `<any>` trong `src`   |       149 |       **0** |
| `console.*` trong `src`    |         1 |       **0** |

204 đường dẫn trong `exports` đều resolve tới file dist có thật (0 thiếu).
`typesVersions` 50 key khớp đúng 50 subpath non-root của `exports`, 0 lệch hai chiều.

Bốn file build nhưng không export được là bốn module nội bộ **có chủ ý**:
`html/types`, `mime/types`, `mime/defaultTypes`, `validation/patterns`. Tốn ~13KB
trong 487.8KB unpacked (tarball 142.9KB).

## Lỗi THẬT tìm được, mỗi cái có số đo

Danh sách này là lý do pha này không phải "thêm JSDoc và test".

| Hàm                       | Lỗi, và số đo                                                                                                                                                  |
| ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `isVietnamese`            | **không xác định**. Cờ `g` + `.test()` đẩy `lastIndex`: 6 lần cùng input ra `true false true false true false`                                                 |
| `stringToEventCode`       | **không parse được `Ctrl+Shift+A`** - `ctrlKey` ra `false`. `Cmd+Alt+Shift+K` chỉ còn `shiftKey`. `Ctrl+Ctrl+A` tất cả `false`                                 |
| `acceptTypeToRegex`       | **ném `SyntaxError`** trên `accept="image/*"`, giá trị accept phổ biến nhất. Regex không neo dấu chấm nên NHẬN `notapng`, `bigpng`. `accept=""` nhận cả `.exe` |
| `sortAlphaText`           | **mutate** tham số; `localeCompare` không locale sắp sai tiếng Việt (`Ẩn Anh Ánh Ba` thay vì `Anh Ánh Ẩn Ba`)                                                  |
| `uniqueArray`             | comment nói Set chậm hơn; đo ra reduce chậm hơn **13x-218x** (n=10000: 219.50ms vs 1.005ms)                                                                    |
| `urlRegex`                | từ chối `https://localhost:3000`; nhận `999.999.999.999`                                                                                                       |
| `emailRegex`              | TLD `{2,4}` nên từ chối `.museum`, `.online`, `.technology`                                                                                                    |
| `titleCase`               | `iPhone SDK` -> `Iphone Sdk`, `HTML and CSS` -> `Html And Css`, `McDonald` -> `Mcdonald`                                                                       |
| `stringToSelector`        | sai 4/7 pattern Tailwind thực tế: `hover:bg-red-500` -> `.hover:bg-red-500` (parse thành `.hover` + pseudo-class)                                              |
| `Pick` / `Omit`           | PascalCase **trùng tên utility type có sẵn của TypeScript**                                                                                                    |
| `mimeTypeToFileExtension` | fallback `split('/').pop()` trả `'vnd.ms-excel'` như thể là extension                                                                                          |
| `snakeToTitleCase`        | `console.error` rồi trả nguyên input - side effect vào global + silent failure                                                                                 |
| `insertTextAfterWords`    | mặc định separator `'<br>'`: hàm string trả HTML                                                                                                               |
| `getArrayValue`           | khai kiểu `T` trong khi trả `undefined` ngoài khoảng                                                                                                           |
| `PRINT_TYPE.ratio`        | tính trên **ba cơ sở** trong bảng 12 dòng: inch, pixel@300dpi, hằng số viết tay                                                                                |

## Năm hàm đổi tên vì tên nói sai việc

`isNumber` -> `isNumericString` (regex là `/^\d+$/`, nên `'1.5'` là `false`).
`isAlphabet` -> `isAsciiLetters` (`[a-zA-Z]`, nên `'Đèn'` là `false`).
`isVietnamese` -> `hasVietnameseDiacritics` (không ký tự test nào trả lời được "đây có
phải tiếng Việt": `Xin chao` không dấu, `à` là tiếng Pháp).
`stringToEventCode` -> `parseKeyCombination` (nó không sinh `event.code` như `'KeyA'`,
nó sinh cờ `KeyboardEvent`). `removeEmptySpace` -> `collapseWhitespace`.

## QĐ-F: bảng MIME tách hai, đo trên dist thật

Plan bản đầu nói "sinh từ `mime-db` rồi commit". Đo xong thì không làm đơn giản thế
được: bảng đầy đủ là 1015 type / 72KB, và `bundle: true` inline nó vào **mọi** entry
import nó - 216KB trong tarball để thay một bảng 5.8KB.

Owner chốt tách theo đúng khuôn QĐ-B (plugin + `.extend()` kiểu dayjs). Đo trên dist:

```
mime/mime.mjs          6.8 KB   bảng mặc định 67 type / 140 extension, inline sẵn
mime/plugin/full.mjs  71.3 KB   1015 type / 1239 extension, chỉ ai import mới trả
index.mjs             21.2 KB   barrel KHÔNG chứa bảng full
```

Inline đầy đủ sẽ cho `mime.mjs` ~78KB. Cả hai bảng sinh bằng
`scripts/generate-mime-table.mjs` đọc `mime-db 1.54.0`, ghi phiên bản và ngày vào
đầu file, nên không nửa nào copy tay. Script có guard: một type được nêu trong
`DEFAULT_TYPES` mà `mime-db` không có extension sẽ **ném**, không âm thầm biến mất -
nó đã bắt ngay `audio/flac` (tên đúng là `audio/x-flac`).

## Lỗ hổng SSR của L2 đã vá

`SSR_ESM`/`SSR_CJS` giờ **sinh từ `contract.json`** thay vì liệt kê import tay, nên
chúng import mọi specifier của package không `browserOnly` ở top level và assert
binding không `undefined`. Trước đó hai fixture chỉ chạm `tinita-react`: thêm một
export dùng `document` vào `tinita` thì ca SSR vẫn xanh.

## `pnpm lint` giờ mới là cổng

Ghi ở pha 04 nhưng hệ quả thuộc pha này: `--max-warnings 0` cộng với việc dọn 149
warning nghĩa là 0 cast `<any>` còn lại trong `src` của `tinita`. Dòng
`eslint-disable` cả file ở `mime/mimeTypeTable.ts` đã **xoá** cùng với chính file đó
khi bảng được sinh lại.

## Guard SSR chứng minh bằng cách phá, 2026-10-01

Quy tắc của repo, áp cho guard mới của pha này. Dùng chính `createConsumer` và
`ssrEsm` của lab nên nó đi qua đúng cơ chế ca thật dùng, không phải bản mô phỏng:

```
chưa phá                                EXIT=0   51 specifier import được
thêm `document.createElement` top level  EXIT=1   ReferenceError: document is not defined
     vào src/string/titleCase.ts
gỡ ra, build + pack lại                  EXIT=0   xanh lại
```

Trước khi vá, ca này **không thể** đỏ vì hai fixture chỉ import `tinita-react`.

## Đính chính

JSDoc tôi viết cho `titleCase('iPhone SDK')` ghi `'iPhone SDK'` - sai. `titleCase`
**phải** viết hoa chữ đầu mỗi từ nên kết quả là `'IPhone SDK'`; cải thiện thật là giữ
phần sau (`Phone`, `SDK`) chứ bản cũ ra `'Iphone Sdk'`. Sửa cả JSDoc lẫn test.

JSDoc `parseKeyCombination` ghi `'Ctrl++'` trả `key: '+'` - lúc đó **sai**, hàm ném.
`'Ctrl++'.split('+')` là `['Ctrl','','']` nên `pop()` lấy `''` làm key. Đã sửa code
cho khớp JSDoc chứ không sửa JSDoc cho khớp code.

Test tôi viết đoán `omitEmptyValues` bỏ `''` - sai. Contract thật là `invalidValues`
mặc định `[null, undefined]`, nên `''` **được giữ**. Sửa test và khoá mặc định đó lại.

## Next steps

Pha 06 - 15 file của `tinita-dom`.
