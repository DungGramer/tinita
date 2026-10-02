# Pha 03 - Retrofit `tinita-dom` và `tinita-react`

## Context links

- Plan cha: [`plan.md`](./plan.md) · Phụ thuộc: **pha 01 xong**
- Song song được với pha 02 (khác package, khác file)
- Số đo: [`reports/00-do-khoang-cach.md`](./reports/00-do-khoang-cach.md)

## Overview

**Ngày:** 2026-10-02 · **Ưu tiên:** P1 · **Trạng thái:** chưa làm · **Review:** chưa

Áp vốn từ vào hai package browser. Hai package này có hai thứ `tinita` không có:
biên **không tin được** (dữ liệu từ DOM, từ người dùng), và React - nơi một throw
trong render có hệ quả khác.

## Key Insights

**`tinita-dom` là nơi §14 nói "revalidate ở biên không tin được", và nó có biên thật.**
`cookieJar.get()` đọc `document.cookie` - một chuỗi mà **code khác trên cùng origin**
đã ghi. `localStorageJson.get()` đọc giá trị người khác ghi. Khác với `tinita`, nơi
mọi đầu vào đến từ người gọi, ở đây đầu vào đến từ môi trường. Nên hai hàm đó đang
`try/catch` thay vì assert, và đó là **đúng**: §13 nói `assertX` ném, nhưng hợp đồng
của `JsonStore.get` là **không bao giờ ném**. Không được thay.

Đây là ca rõ nhất của "đừng thay cho đủ bộ": `createJsonStore` có 4 `try/catch` và 0
assertion ở đường đọc, và nó phải giữ nguyên như vậy.

**React: một throw trong thân render làm vỡ cả cây.** `useRequiredContext` ném có chủ
ý, và đó là hợp đồng của nó. Nhưng thêm assertion vào `usePagination` hay
`useWindowSize` thì khác: chúng chạy mỗi render, nên §15 áp dụng theo một nghĩa mạnh
hơn vòng lặp - một assert trong thân hook chạy lại mỗi lần render.

`usePagination` hiện **không ném gì cả**: nó clamp mọi thứ, kể cả `NaN` và
`Infinity`, và có property test 2000 mẫu khoá hành vi đó. Thêm assertion vào đó là
**đổi hợp đồng**, không phải lên chuẩn. Không làm.

**`Tree.tsx:418` là lỗi thật, không phải chỗ cần vốn từ mới.**

```ts
if (!value) throw new Error('TreeItem must be rendered inside <Tree>');
```

Nó tự viết lại đúng việc của `useRequiredContext` - cùng package, cùng ý niệm, thông
báo khác hình dạng. §20 gọi đúng tên: duplicate validator. Sửa bằng cách gọi
`useRequiredContext`, không bằng cách thêm primitive.

Và `Error` ở đây **đúng**: "thiếu Provider" không phải vi phạm kiểu tham số, và không
có built-in error nào chính xác hơn. §8 nói đừng dùng `Error` khi có loại chính xác
hơn - ở đây không có.

## Requirements

1. Không thay `try/catch` ở đường đọc của `createJsonStore` - hợp đồng là không ném.
2. Không thêm assertion vào thân hook React nào đang không ném (§15, và vì nó đổi hợp
   đồng).
3. `Tree.tsx` gọi `useRequiredContext` thay vì tự kiểm.
4. `caller` là tên API công khai; với method của một object thì
   `cookieJar.set`, `mime.fromExtension`.
5. Không đổi loại error của chỗ nào.
6. Mọi module vẫn **import** sạch khi không có DOM - vốn từ đến từ `tinita` là hàm
   thuần nên không rủi ro, nhưng phải kiểm lại bằng ca SSR của L2.

## Architecture

### `tinita-dom`

| File                                             | Phán quyết                                                                                                      |
| ------------------------------------------------ | --------------------------------------------------------------------------------------------------------------- |
| `storage/cookieJar.ts`                           | `assertNonEmptyString` cho `name` ở `get`/`set`/`remove`                                                        |
| `storage/createJsonStore.ts`                     | **không thay** - `try/catch`, hợp đồng không ném                                                                |
| `storage/localStorageJson`, `sessionStorageJson` | không có kiểm nào, không thêm                                                                                   |
| `file/downloadBlob.ts`                           | `assertNonEmptyString` cho `fileName`; `instanceof Blob` giữ inline                                             |
| `html/jsonToHtml.ts`                             | `assertObject`; `try/catch` quanh `createElement` giữ nguyên (bọc `DOMException`)                               |
| `html/htmlToJson.ts`                             | `assertString`                                                                                                  |
| `html/elementToJson.ts`                          | giữ inline - kiểm `typeof element.nodeName !== 'string'`, một lần, không phải invariant tái dùng                |
| `html/isBlockLevelHtml.ts`                       | `assertString`                                                                                                  |
| `style/setCssVariables.ts`                       | `assertObject`; kiểm tên custom property giữ inline (§11: nó là domain hẹp, và thông báo hiện nêu đúng tên sai) |
| `image/resizeImage.ts`                           | `assertPositiveFiniteNumber` cho `scale`; `quality` sang pha 04                                                 |
| `unit/toDevicePixels.ts`                         | `assertFiniteNumber` cho `fromDevicePixels`                                                                     |
| `validation/*`                                   | **không thay** - predicate, trả `boolean`                                                                       |
| `smooth-scroll`, `wheel-source`                  | không có kiểm nào                                                                                               |

### `tinita-react`

| File                                                         | Phán quyết                                                |
| ------------------------------------------------------------ | --------------------------------------------------------- |
| `hooks/useRequiredContext.ts`                                | giữ `Error` - không có loại chính xác hơn                 |
| `ui/tree/Tree.tsx:418`                                       | **gọi `useRequiredContext`** thay vì tự kiểm              |
| `hooks/usePagination.ts`                                     | **không thay** - clamp là hợp đồng, có property test khoá |
| `hooks/useWindowSize`, `useDoubleTap`, `useRefreshComponent` | không có kiểm nào, không thêm                             |
| `utils/jsxJoin.tsx`                                          | không có kiểm nào; `nodes?.filter(...) ?? []` là chủ ý    |

Tổng cộng `tinita-react` đổi **đúng một chỗ**: `Tree.tsx`. Đó là kết quả đúng, không
phải thiếu sót - package này gần như không validate vì React và TypeScript đã đứng ở
biên, và những chỗ nó có hợp đồng thì hợp đồng là clamp chứ không phải ném.

## Related code files

- ~10 file trong `packages/tinita-dom/src/`
- `packages/tinita-react/src/ui/tree/Tree.tsx` - một chỗ
- `packages/tinita-dom/package.json` - `tinita` đã là devDependency, không đổi
- `packages/tinita-react/package.json` - `tinita` đã là devDependency
- `compatibility/cases/l2` - ca SSR, phải vẫn xanh

## Implementation Steps

1. `cookieJar` và `downloadBlob` trước - `assertNonEmptyString` có đúng 3 consumer và
   đây là cả ba.
2. `html/` - chốt từng file là biên công khai hay nội bộ.
3. `image/`, `unit/`, `style/`.
4. `Tree.tsx` gọi `useRequiredContext`; kiểm thông báo lỗi mới vẫn nêu `TreeItem`.
5. Chạy `node scripts/check-assert-reuse.mjs` để xác nhận không còn sót.
6. `pnpm gate --full` - cần L2 cho SSR và L4 cho Chromium, vì pha này sửa
   `tinita-dom`.

## Todo list

- [ ] `cookieJar` + `downloadBlob` (3 consumer của `assertNonEmptyString`)
- [ ] `html/` 4 file, chốt biên từng file
- [ ] `image/`, `unit/`, `style/`
- [ ] `Tree.tsx` gọi `useRequiredContext`
- [ ] Xác nhận `createJsonStore` **không** bị thay
- [ ] `check-assert-reuse` sạch cho cả hai package
- [ ] 3 ca tự phá
- [ ] `pnpm gate --full` 9/9

## Success Criteria

1. `node scripts/check-assert-reuse.mjs` PASS cho `tinita-dom` và `tinita-react`,
   0 phát hiện.
2. `grep -c "try {" packages/tinita-dom/src/storage/createJsonStore.ts` **không đổi**
   so với trước pha, và `grep -c "assert" ` của file đó là **0**. Hợp đồng không ném
   phải còn nguyên.
3. Test `JsonStore` vẫn khẳng định **không ném** trên giá trị rác: ca
   `không throw trên giá trị another library wrote` vẫn PASS.
4. `grep -rn "throw new Error" packages/tinita-react/src` trả **đúng 1** dòng, ở
   `useRequiredContext.ts`. `Tree.tsx` không còn ném trực tiếp.
5. Lỗi khi dùng `TreeItem` ngoài `Tree` vẫn nêu `TreeItem`: test khớp
   `/TreeItem.*within/`.
6. `usePagination` property test 2000 mẫu vẫn PASS và **vẫn không ném** với `NaN`
   / `Infinity`. Ca `survives NaN and Infinity without throwing` là cửa chặn.
7. Test `tinita-dom` >= **102** ca, `tinita-react` >= **89** ca, 0 fail. Không ca nào
   mất.
8. Ca SSR của L2 vẫn PASS: mọi module `tinita-dom` import sạch khi không có DOM.
9. Ca L4 `dom:*` vẫn 8/8 PASS - đặc biệt
   `dom:isBlockLevelHtml-does-not-execute`, vì `isBlockLevelHtml` được sửa ở pha này.
10. **Ca tự phá 1:** thay một `try/catch` ở đường đọc của `createJsonStore` bằng
    `assertString` -> tiêu chí 3 phải ĐỎ.
11. **Ca tự phá 2:** thêm `assertFiniteNumber` vào thân `usePagination` -> tiêu chí 6
    phải ĐỎ.
12. **Ca tự phá 3:** trả `Tree.tsx` về `throw new Error` tự viết -> tiêu chí 4 phải ĐỎ.
13. `pnpm gate --full` 9/9 PASS.

## Risk Assessment

| Rủi ro                                                                 | Mức  | Chặn bằng                                              |
| ---------------------------------------------------------------------- | ---- | ------------------------------------------------------ |
| Thay `try/catch` của `JsonStore` bằng assert -> phá hợp đồng không ném | Cao  | tiêu chí 2, 3 và ca tự phá 1                           |
| Thêm assert vào hook -> đổi hợp đồng clamp của `usePagination`         | Cao  | tiêu chí 6 và ca tự phá 2                              |
| Sửa `isBlockLevelHtml` làm vỡ guard XSS                                | Cao  | tiêu chí 9 - ca L4 trong Chromium thật                 |
| Assert trong thân hook chạy lại mỗi render                             | TB   | tiêu chí 6; §15 áp theo nghĩa mạnh hơn vòng lặp        |
| Vốn từ từ `tinita` kéo theo runtime dependency                         | Thấp | `bundle: true` inline; L1 `04a-consumer-is-clean` canh |

## Security Considerations

- **`cookieJar.get` và `localStorageJson.get` đọc dữ liệu KHÔNG TIN ĐƯỢC** - code
  khác trên cùng origin ghi được vào đó. Hợp đồng hiện tại là "không ném, trả
  fallback", và đó là lựa chọn an toàn: một throw ở đường đọc cho phép code khác trên
  origin làm vỡ trang của bạn bằng cách ghi rác vào một key. Pha này không được làm
  mờ điều đó.
- **`isBlockLevelHtml` đang là guard XSS đã chứng minh được** (phá `DOMParser` thành
  `innerHTML` -> `window.__pwned = 1` trong Chromium). Thêm `assertString` ở đầu
  không ảnh hưởng, nhưng tiêu chí 9 phải chạy lại ca đó vì file bị sửa.

## Next steps

Pha 04 - hai silent failure, 21 thông báo thiếu tên hàm, docs và CHANGELOG.
