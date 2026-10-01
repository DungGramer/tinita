# Pha 04 - Chốt tên, vị trí, hình dạng export. Làm TRƯỚC mọi thứ khác

## Context links

- Plan cha: [`plan.md`](./plan.md)
- Phụ thuộc: pha 03 **XONG** (`pnpm gate --full` 9/9 PASS, 2026-10-01)
- Dữ liệu: [`reports/03-ra-soat-ten-va-vi-tri.md`](./reports/03-ra-soat-ten-va-vi-tri.md),
  [`reports/02-nguon-goc-bang-hang-so.md`](./reports/02-nguon-goc-bang-hang-so.md)
- Quy tắc: `docs/code-standards.md`, `CLAUDE.md` mục "Thêm component mới" bước 3

## Overview

**Ngày:** 2026-10-01 · **Ưu tiên:** P0, chặn mọi pha sau · **Trạng thái:** XONG
2026-10-01 · **Review:** chưa

**QĐ-E chốt: E1** (acronym là từ thường). **QĐ-D chốt:** giữ `pageSizes` nguyên số,
sinh lại bảng MIME từ `mime-db` ở pha 05, `ratio` một cơ sở.

Đổi tên, di chuyển và thống nhất hình dạng export cho 50 file, **trước khi** viết
test và khai `exports`. Không viết thêm logic nào ở pha này.

## Key Insights

**Cửa sổ đổi tên sắp đóng.** Đo bằng `npm view`: `tinita` chỉ có `0.0.1` trên
registry, `tinita-react` có tới `0.0.2`, `tinita-dom` **chưa tồn tại** (E404).
Local cả ba là `0.1.0` và chưa publish. Mọi tên đổi hôm nay miễn phí; đổi sau lần
publish `0.1.0` đầu tiên là breaking change phải chờ major.

**Làm sau = làm hai lần.** Mỗi export mới phải khai ở 4 nơi: `package.json`
`exports`, `typesVersions`, `compatibility/contract.json`, và barrel. Đổi tên sau
khi khai nghĩa là sửa lại cả 4 nơi cho từng file, cộng sửa test đã viết. Đó là lý
do pha này đứng trước, không phải vì nó dễ.

**Lớp lỗi "tên file khác tên export" đã trả giá một lần.** Pha 03:
`stringToHTMLEntities.ts` export `encodeToHTMLEntities`, owner gọi
`encodeHtmlEntities` - ba tên cho một hàm, và không ai phát hiện tới khi phải viết
docs. 6 ca nữa đang chờ.

**`export default` có hệ quả đo được, không phải sở thích.** 8 file dùng default.
Với `bundle: true` + `outExtension` của repo, `require('tinita-dom/x')` trên một
file default export trả `{ default: fn }` chứ không trả hàm - đúng lớp lỗi B1 mà
`outExtension` đã phải vá một lần.

## Requirements

1. Một quy ước viết hoa acronym, áp cho cả 3 package, kể cả tên đã có
   (`blobToDataUrl` vs `generateUUID` hiện đang trái nhau).
2. Tên file == tên export công khai. Một export công khai một file.
3. Named export. Không `export default` ở bất kỳ file nào trong `src/`.
4. Folder phân loại được: xoá `typescript/`, `download/`; hợp nhất `validation/` và
   `detect/`; tách `string/` khỏi `converter/`.
5. Tên phải nói ra việc hàm làm, gồm cả việc **cấp phát thứ cần dọn**.
6. Không đổi hành vi nào. Pha này chỉ di chuyển và đổi tên.

## Architecture

### QĐ-E: quy ước acronym (owner chốt, hai đường)

| Đường                                   | `blobToDataUrl` | `generateUUID` | `JSONToHTML` | Phải đổi |
| --------------------------------------- | --------------- | -------------- | ------------ | -------: |
| **E1** acronym là từ thường (Google TS) | giữ nguyên      | `generateUuid` | `jsonToHtml` |       13 |
| **E2** acronym CHỮ HOA (nền tảng web)   | `blobToDataURL` | giữ nguyên     | `jsonToHTML` |       11 |

Khuyến nghị **E1**. Lý do: Google TypeScript Style Guide quy định coi acronym như
một từ thường (`loadHttpUrl`), đây là lối duy nhất không cần luật phụ cho trường
hợp acronym đứng đầu tên; và nó giữ được `blobToDataUrl`/`dataUrlToBlob` vốn là cặp
nghịch đảo đã viết test ở pha 03. E2 phải đổi chính cặp đó.

Giá của E1: `generateUUID` -> `generateUuid`. Nó **đã publish** trong `tinita@0.0.1`,
nên cần alias deprecated hoặc chấp nhận breaking - `0.0.1` sẽ bị `npm deprecate` ở
pha 08 nên khuyến nghị breaking thẳng, không alias.

### Bảng đổi tên và di chuyển

`tinita`:

| Từ                                 | Thành                                                                                                                                            |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `converter/text.ts` (5 hàm)        | `string/titleCase.ts`, `string/sentenceCase.ts`, `string/snakeToTitleCase.ts`, `string/insertTextEveryNWords.ts`, `string/collapseWhitespace.ts` |
| `converter/stringToSelector.ts`    | `string/stringToSelector.ts`                                                                                                                     |
| `converter/blobToURL.ts`           | `converter/createBlobObjectUrl.ts`                                                                                                               |
| `converter/fileExtensionToMIME.ts` | `mime/fileExtensionToMimeType.ts`                                                                                                                |
| `converter/MIMEToFileExtension.ts` | `mime/mimeTypeToFileExtension.ts`                                                                                                                |
| `converter/acceptTypeToRegex.ts`   | `mime/acceptAttributeToRegExp.ts`                                                                                                                |
| `constant/mime_to_extension.ts`    | `mime/mimeTypeTable.ts`                                                                                                                          |
| `constant/print_size.ts`           | `print/pageSizes.ts` (+ tách `DEFAULT_MARGIN_PRINT` ra)                                                                                          |
| `constant/print_type.ts`           | `print/photoPrintSizes.ts`                                                                                                                       |
| `typescript/enumKey.ts`            | `object/enumKeys.ts`                                                                                                                             |
| `array/getArrayVal.ts`             | `array/getArrayValue.ts`                                                                                                                         |
| `object/conditionObj.ts`           | `object/conditionalEntry.ts`                                                                                                                     |
| `object/filterValidValue.ts`       | `object/omitEmptyValues.ts`                                                                                                                      |
| `array/uniquePushArray.ts`         | `array/prependUnique.ts`                                                                                                                         |
| `validation/*`                     | ở yên (`validation/` là tên giữ lại)                                                                                                             |

`tinita-dom`:

| Từ                              | Thành                                      |
| ------------------------------- | ------------------------------------------ |
| `detect/*`                      | `validation/*` (đồng bộ với `tinita`)      |
| `detect/isBlockTag.ts`          | `html/isBlockLevelHtml.ts`                 |
| `converter/htmlToJSON.ts`       | `html/htmlToJson.ts`                       |
| `converter/JSONToHTML.ts`       | `html/jsonToHtml.ts`                       |
| `converter/elementToJSON.ts`    | `html/elementToJson.ts`                    |
| `converter/unit-converter.ts`   | `unit/convertLength.ts` (hàm, không class) |
| `download/DownloadFile.ts`      | `download/downloadBlob.ts`                 |
| `style/CSSVariable.ts`          | `style/setCssVariables.ts`                 |
| `storage/localStorage.ts`       | `storage/localStorageJson.ts`              |
| `storage/sessionStorage.ts`     | `storage/sessionStorageJson.ts`            |
| `storage/cookieStorage.ts`      | `storage/cookieStore.ts`                   |
| `dimension/getScrollbarSize.ts` | ở yên, bỏ `export default`                 |

`tinita-react`:

| Từ                             | Thành                                     |
| ------------------------------ | ----------------------------------------- |
| `context/createContextHook.ts` | export `createContextHook`, bỏ PascalCase |
| 5 hook + `jsxJoin`             | ở yên, bỏ `export default`                |

### Tên `localStorageAction` -> `localStorageJson`

Hậu tố `Action` không mang nghĩa. Hậu tố `Json` thì có: nó nói ra điều quan trọng
nhất về đối tượng này - nó `JSON.stringify` khi ghi và `JSON.parse` khi đọc, nên nó
**không** là `localStorage` và không thay thế được cho nhau.

## Related code files

- 50 file trong `packages/*/src/` (danh sách đầy đủ ở report 03)
- `packages/*/tsup.config.ts` - glob tự quét, nên di chuyển file là đủ, không sửa config
- `packages/tinita-react/tsup.config.ts` - quét bằng glob, cùng tình trạng
- `packages/*/src/index.ts` - barrel, sửa tay

## Implementation Steps

1. Owner chốt QĐ-E. Không làm gì trước khi có câu trả lời - toàn bộ bảng phụ thuộc nó.
2. `git mv` theo bảng. Một commit cho mỗi package để diff đọc được.
3. Sửa tên export cho khớp tên file. Sửa mọi call site trong repo (`apps/storybook`,
   `packages/tinita-react/src/ui/*` đang dùng vài hàm này).
4. Bỏ `export default` ở 8 file. Với `getScrollbarSize` và `Converter`, đổi thành
   named export cùng tên file.
5. Áp QĐ-E cho tên đã ship: `generateUUID` -> `generateUuid` (E1) hoặc
   `blobToDataUrl` -> `blobToDataURL` (E2). Sửa `exports`, `typesVersions`,
   `contract.json`, test của pha 03, và story nếu có.
6. Xoá folder rỗng: `typescript/`, `constant/`, `detect/`.
7. Viết `docs/code-standards.md` mục mới **"Quy Tắc Đặt Tên"** ghi QĐ-E, quy tắc
   tên file == tên export, và cấm `export default`. Không có mục này thì pha sau
   lệch lại.
8. Thêm ca lint chặn `export default` trong `packages/*/src/**`. Dùng
   `eslint no-restricted-syntax` với selector `ExportDefaultDeclaration`.

## Todo list

- [ ] Owner chốt QĐ-E (E1 hay E2)
- [ ] `git mv` + đổi export `tinita` (29 file)
- [ ] `git mv` + đổi export `tinita-dom` (15 file)
- [ ] Bỏ `export default` `tinita-react` (6 file)
- [ ] Áp QĐ-E cho tên đã ship + sửa `exports`/`typesVersions`/`contract.json`
- [ ] Xoá 3 folder rỗng
- [ ] `docs/code-standards.md` mục "Quy Tắc Đặt Tên"
- [ ] Rule ESLint chặn `export default`
- [ ] Ca tự phá: thêm `export default` -> lint phải đỏ

## Success Criteria

1. `pnpm check-types` exit 0.
2. `pnpm lint` exit 0.
3. `pnpm gate` 7/7 PASS, trong đó ca L1 `08-typesversions-sync` PASS.
4. `grep -rn "export default" packages/*/src --include=*.ts --include=*.tsx` trả về
   **0 dòng**.
5. Với mọi file `packages/<pkg>/src/<path>/<name>.ts` không phải `index.ts`: tên
   export công khai của nó bằng `<name>`. Kiểm bằng script, in ra 0 ca lệch.
6. `ls packages/tinita/src/typescript packages/tinita/src/constant
packages/tinita-dom/src/detect` trả `No such file or directory` cho cả ba.
7. **Ca tự phá:** thêm `export default foo` vào một file bất kỳ trong
   `packages/tinita/src/` -> `pnpm lint` exit khác 0 và nêu tên file đó. Gỡ ra,
   lint xanh lại. Không chứng minh được bước này thì rule là trang trí.
8. Số export công khai **không đổi** so với trước pha (18 + 6 + 10 = 34). Pha này
   không thêm export nào - nếu số tăng, có file đã bị khai sớm.

## Risk Assessment

| Rủi ro                                                   | Mức | Chặn bằng                                                 |
| -------------------------------------------------------- | --- | --------------------------------------------------------- |
| `generateUUID` đã publish, đổi tên là breaking           | Cao | `0.0.1` sẽ bị `npm deprecate` ở pha 08; ghi vào CHANGELOG |
| Đổi tên làm vỡ `apps/storybook` hoặc `src/ui/*` lặng lẽ  | Cao | `pnpm check-types` + `pnpm build` 3/3 trước khi commit    |
| `git mv` nhiều file một commit làm diff không đọc được   | TB  | một commit một package                                    |
| Quên sửa `contract.json` -> ca L1 đỏ ở pha sau, khó truy | TB  | tiêu chí 3 chạy L1 ngay trong pha này                     |
| Đổi tên xong owner đổi ý về QĐ-E                         | Cao | **chặn ở bước 1**: không `git mv` nào trước khi QĐ-E chốt |

## Security Considerations

Không có bề mặt mới. Nhưng một đổi tên có ý nghĩa an toàn bộ nhớ:
`blobToURL` -> `createBlobObjectUrl`. Tên cũ không báo rằng nó **cấp phát** một
object URL mà người gọi phải `URL.revokeObjectURL`; mỗi lần gọi không revoke giữ
nguyên blob trong bộ nhớ tới khi document bị huỷ. Tiền tố `create` là cách nền tảng
web báo điều đó (`createImageBitmap`, `createObjectURL`), và JSDoc ở pha 05 phải nói
thẳng ai chịu trách nhiệm dọn.

## Làm khác plan, và vì sao

**Phát hiện lớn nhất: `pnpm lint` chưa bao giờ là cổng.** `eslint-plugin-only-warn`
hạ **mọi** rule thành warning, và ba script `lint` không có `--max-warnings`. Đo
2026-10-01: `pnpm --filter=tinita run lint` in **149 warning**, exit **0**. Nghĩa là
rule chặn `export default` mà pha này thêm vào sẽ vô tác dụng hoàn toàn.

Phải sửa trong pha này chứ không để pha sau, vì nếu không thì tiêu chí 7 (ca tự phá)
không thể đạt. Đã thêm `--max-warnings 0` cho cả ba package (`apps/storybook` đã có
từ trước - chỉ ba package thư viện là không có). 149 warning được dọn:

| Nguồn                                          | Cách xử lý                                                      |
| ---------------------------------------------- | --------------------------------------------------------------- |
| 139 cast `<any>`, `mime/mimeTypeTable.ts`      | tắt cả file kèm hạn chót: pha 05 sinh lại bảng thì xoá          |
| 4 file `tinita-dom` storage/style              | tắt một dòng kèm tên pha viết lại (pha 06)                      |
| `mapToObject`, `objectToMap`, `sortObjectKeys` | sửa thẳng sang generic / `unknown`                              |
| `once`                                         | giữ `any` kèm lý do: đó là hình dạng ràng buộc "một hàm bất kỳ" |
| `Tree.tsx` biến `animate` không dùng           | xoá                                                             |
| `usePagination` `exhaustive-deps`              | tắt một dòng kèm lý do; pha 07 sửa hành vi                      |

**9 ca lệch tên, không phải 6.** Report 03 đếm thiếu. Hai ca nặng nhất chỉ lộ ra khi
`sed` chạy không khớp gì: `fileExtensionToMIME.ts` export `getMIMEFromFileName` và
`MIMEToFileExtension.ts` export `getExtensionFromMIME` - **tên file và tên export
không chung một chữ nào**. Thêm `sortObjectKey.ts` export `sortObjectKeys`,
`date/sortDate.ts` export `sortDates`.

**`createContextHook` -> `useRequiredContext`, chuyển từ `context/` sang `hooks/`.**
Đổi `CreateContextHook` thành camelCase làm ESLint `react-hooks/rules-of-hooks` đỏ
ngay: hàm gọi `useContext` trực tiếp nên nó **là** hook, không phải factory tạo
hook. PascalCase cũ che được lint vì ESLint tưởng nó là component. Tên cũ nói sai
bản chất hàm.

**`html/plugin/entities` chuyển từ default sang named export.** Rule mới bắt được
nó. Đây là chỗ default export nguy hiểm nhất trong repo:
`html.extend(require('tinita/html/plugin/entities'))` truyền `{ default: fn }` vào
`extend()` rồi gãy **im lặng**. Đổi dù dayjs (mẫu mà `.extend()` học theo) dùng
default cho plugin của họ.

**Ba carve-out cho quy tắc tên file == tên export**, mỗi cái một lý do, mã hoá vào
script kiểm: entry module kebab-case ở `src/` (tên file CHÍNH LÀ subpath:
`smooth-scroll.ts`, `wheel-source.ts`); module nhóm nhiều export cùng vai
(`validation/browser.ts`, `validation/patterns.ts`); helper nội bộ component
(`ui/*/utils/*`, `ui/*/store.ts`).

**Hai lỗi HÀNH VI tìm được khi di chuyển file, ghi sang pha sau chứ không sửa ở đây:**

1. `isVietnamese` **không xác định**. `vietnameseRegex` có cờ `g` nên `.test()` đẩy
   `lastIndex`: `isVietnamese('Hòa')` 6 lần liên tiếp ra
   `true false true false true false`. Pha 05.
2. `useWindowSize` đọc `window.innerWidth` **trong initializer** của `useState`,
   dưới một comment nói ngược lại ("Initialize state with undefined width/height so
   server and client renders match"). Pha 07.
3. `usePagination` so `currentPage > totalItems` - **số trang với số item**. Pha 07.

**`blobToURL` ở yên `tinita`.** Report 03 bản đầu nói nó sai package vì
`URL.createObjectURL`. Đo `docker run node:{18,20,22}-alpine`: cả ba đều có và đều
tạo được `blob:` URL thật (Node thêm từ v16.7.0). Chỉ đổi tên thành
`createBlobObjectUrl` - tiền tố `create` để nói ra rằng nó cấp phát thứ phải
`revokeObjectURL`.

## Next steps

Pha 05 - 29 file của `tinita`.
