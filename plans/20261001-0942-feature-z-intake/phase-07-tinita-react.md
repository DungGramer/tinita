# Pha 07 - 6 file của `tinita-react`: SSR, named export, story

## Context links

- Plan cha: [`plan.md`](./plan.md) · Phụ thuộc: **pha 04 xong**
- Song song được với pha 05 và 06
- Khuôn mẫu SSR: `usePrefersReducedMotion` trong
  `packages/tinita-react/src/ui/carousel-ticker/CarouselTicker.tsx`
- Khuôn mẫu đã có: `packages/tinita-react/src/hooks/useIsomorphicLayoutEffect.ts`
- Quy tắc: `CLAUDE.md` mục "Thêm component mới", `docs/code-standards.md`

## Overview

**Ngày:** 2026-10-01 · **Ưu tiên:** P1 · **Trạng thái:** XONG 2026-10-01 ·
**Review:** chưa

6 file: `createContextHook`, `useDoubleTap`, `usePagination`, `useRefreshComponent`,
`useWindowSize`, `jsxJoin`. Pha nhỏ nhất nhưng có ràng buộc gắt nhất: **phải sống
sót SSR**, vì React app render trên server theo mặc định với App Router.

## Key Insights

**`useWindowSize` là ca SSR kinh điển và repo đã có câu trả lời.** Nó đụng `window`.
Khuôn mẫu đúng nằm ngay trong package: `usePrefersReducedMotion` khởi tạo `false`,
chỉ đọc `matchMedia` trong effect, và nghe `change`. Không phải sáng tạo gì mới -
chỉ áp lại.

**Nhưng khởi tạo bằng số 0 sinh lỗi hydration.** Nếu `useWindowSize` trả
`{width: 0, height: 0}` ở server và `{width: 1440, ...}` ở client, React báo
hydration mismatch cho bất kỳ markup phụ thuộc nó. Hai đường: trả `undefined` ở
server và buộc người gọi xử lý (trung thực, bất tiện), hoặc dùng
`useSyncExternalStore` với `getServerSnapshot` - API React 18 sinh ra **đúng cho
việc này**. Khuyến nghị `useSyncExternalStore`: nó đọc kích thước thật ngay ở lần
render đầu trên client, không có nhịp 0 nào, và React quản lý việc subscribe.

**`useWindowSize` hiện không throttle.** `resize` fire mỗi frame khi kéo cửa sổ. Mỗi
lần là một `setState`, nên mỗi component dùng hook này re-render ~60 lần/giây trong
suốt thao tác kéo. Đây là lỗi hiệu năng đo được, không phải tối ưu sớm.

**`usePagination` 109 dòng là file lớn nhất nhóm và chưa ai đọc lại.** Nó là nơi
duy nhất trong nhóm có logic thật (tính dãy trang + ellipsis). Logic đó có biên rõ:
`totalPages = 0`, `currentPage` ngoài khoảng, `siblingCount` lớn hơn `totalPages`.
Đây là ứng viên property test tốt nhất của pha: **dãy trả về luôn tăng dần, luôn
chứa trang 1, trang cuối và `currentPage`, và không bao giờ dài hơn
`siblingCount * 2 + 5`.**

**`jsxJoin` đã viết lại ở pha 02** (`ReactNode`, Fragment có key). Chỉ cần test +
export.

**`useRefreshComponent` 10 dòng là force-update.** Nó tồn tại để lách việc state
không đổi. Giữ thì phải khai thẳng trong JSDoc rằng đây là escape hatch và gần như
luôn có cách đúng hơn - nếu không nó thành công cụ người dùng với tay lấy đầu tiên.

**Đo ở pha 04, tệ hơn mô tả trên.** `useWindowSize` có một comment nói ngược lại
chính code của nó:

```ts
// Initialize state with undefined width/height so server and client renders match
const [windowSize, setWindowSize] = useState({
  width: window.innerWidth, // <- đọc window NGAY trong initializer
  height: window.innerHeight,
});
```

Comment hứa `undefined`; code đọc `window` trong thân render. Trên server đó là
`ReferenceError: window is not defined`, không phải mismatch. Và nó dùng
`useLayoutEffect` chứ không dùng `useIsomorphicLayoutEffect` **vốn đã có sẵn** ở
`packages/tinita-react/src/hooks/useIsomorphicLayoutEffect.ts`, nên React còn log
cảnh báo riêng khi SSR.

**`usePagination` sai đơn vị so sánh:**

```ts
if (currentPage > totalItems) setCurrentPage(totalItems);
```

So **số trang** với **số item**. Với `totalItems = 100`, `pageSize = 10`, trang hợp
lệ là 1..10 nhưng điều kiện chỉ kẹp khi `currentPage > 100`. Phải là `totalPages`.
Pha 04 đã đặt `// eslint-disable-next-line react-hooks/exhaustive-deps` ở đó kèm lý
do; **xoá dòng disable khi sửa**, đừng để lại.

**Nợ từ pha 04:** `createContextHook` đã đổi thành `useRequiredContext` và chuyển về
`hooks/`. Lý do: ESLint `react-hooks/rules-of-hooks` làm đỏ ngay khi tên hết
PascalCase - hàm gọi `useContext` trực tiếp nên nó **là** hook, không phải factory
tạo hook. Tên cũ nói sai bản chất và PascalCase che được lint.

## Requirements

1. Cổng vào của pha 03.
2. **Không hook nào chạm `window`/`document` trong thân render.** Chỉ trong effect,
   hoặc qua `useSyncExternalStore` có `getServerSnapshot`.
3. Named export, không `export default` (6/6 file hiện dùng default).
4. **Story cho mỗi export** - `pnpm check-stories` canh, và hook cũng phải có story
   (một component demo nhỏ).
5. `peerDependencies` không thêm gì. 6 file này chỉ cần `react`.
6. Không hook nào gây hydration mismatch.

## Architecture

### `useWindowSize` qua `useSyncExternalStore`

```
const subscribe = (onChange) => {
  window.addEventListener('resize', onChange);
  return () => window.removeEventListener('resize', onChange);
};
const getSnapshot = () => `${innerWidth}x${innerHeight}`;  // chuỗi, để so sánh ===
const getServerSnapshot = () => '0x0';
```

Trả chuỗi rồi parse, **không** trả object: `useSyncExternalStore` so sánh bằng
`Object.is`, nên trả `{width, height}` mới mỗi lần làm nó loop vô hạn. Đây là bẫy
nổi tiếng của API này và là lý do dòng comment trong code phải nêu nó.

Throttle: `requestAnimationFrame` gộp, không `setTimeout`. `rAF` tự dừng khi tab ẩn.

### `createContextHook`

Đổi tên từ `CreateContextHook` (PascalCase cho một factory là sai). Contract phải
khai rõ: hook trả về **ném** khi dùng ngoài Provider, và thông báo ném phải nêu tên
context - "useFoo must be used within FooProvider", không phải
"Cannot read property of undefined". Đó là toàn bộ giá trị của factory này.

### `useDoubleTap`

60 dòng, có type khá kỹ (`DoubleTapResult` phụ thuộc `Callback`). Vấn đề: dùng
`setTimeout` với `threshold` mặc định, và **không dọn timer khi unmount** - setState
sau unmount. Thêm `useEffect` cleanup. Và khai rõ nó nghe `onClick`, nên nó không
phải "tap" trên thiết bị cảm ứng mà là double-click được đặt tên theo cảm ứng.

### `usePagination`

Giữ logic, thêm:

- Chuẩn hoá đầu vào: `totalPages < 1` trả `[]`; `currentPage` kẹp vào `[1, totalPages]`.
- Property test cho 4 invariant ở Key Insights.
- `DOTS` phải là một hằng số export được, không phải chuỗi `'...'` so sánh bằng tay.

## Related code files

- `packages/tinita-react/src/hooks/{useDoubleTap,usePagination,useRefreshComponent,useWindowSize}.ts`
- `packages/tinita-react/src/context/createContextHook.ts`
- `packages/tinita-react/src/utils/jsxJoin.tsx`
- `packages/tinita-react/src/hooks/useIsomorphicLayoutEffect.ts` - giữ nội bộ
- `packages/tinita-react/package.json` - `exports`, `typesVersions`
- `apps/storybook/stories/` - 6 story mới
- `compatibility/contract.json` + ca `next:rsc-*` của L2

## Implementation Steps

1. Bỏ `export default` 6 file (nếu pha 04 chưa làm xong phần này).
2. `useWindowSize` viết lại bằng `useSyncExternalStore` + `rAF`.
3. `createContextHook`: đổi tên, thông báo ném nêu tên context.
4. `useDoubleTap`: cleanup timer, JSDoc nói rõ nó là double-click.
5. `usePagination`: chuẩn hoá đầu vào, export `DOTS`, property test.
6. `useRefreshComponent`: JSDoc escape hatch.
7. `jsxJoin`: test.
8. 6 story. Hook thì story là một component demo nhỏ hiển thị giá trị hook trả về.
9. `exports` + `typesVersions` + `contract.json`.
10. `pnpm gate --full`, chú ý ca `next:rsc-*`.

## Todo list

- [ ] Bỏ `export default` 6/6
- [ ] `useWindowSize` qua `useSyncExternalStore` + rAF throttle
- [ ] `createContextHook` đổi tên + thông báo ném nêu tên
- [ ] `useDoubleTap` cleanup timer
- [ ] `usePagination` chuẩn hoá + `DOTS` + property test
- [ ] `useRefreshComponent` JSDoc escape hatch
- [ ] `jsxJoin` test
- [ ] 6 story
- [ ] `exports` + `typesVersions` + `contract.json`
- [ ] 2 ca tự phá
- [ ] `pnpm gate --full` 9/9

## Success Criteria

1. `node -e "const p=require('tinita-react/package.json'); console.log(Object.keys(p.exports).length)"`
   in ra **16** (10 hiện có + 6 mới).
2. `pnpm check-stories` exit 0 với 0 `EXEMPT` mới.
3. **Ca `next:rsc-*` của L2 PASS** với một trang Server Component import cả 6
   specifier mới ở top level - không ném, không cảnh báo `window is not defined`.
4. **Không hydration mismatch.** Trong ca L2 Next.js, render một trang dùng
   `useWindowSize`; log của server và client không chứa `Hydration failed` hay
   `Text content does not match`. Đo bằng output của `next build` + `next start`
   rồi tải trang bằng Playwright, đếm console error = **0**.
5. **`useWindowSize` không loop vô hạn.** Mount một component dùng nó, đếm số lần
   render trong 1000ms không có resize: **đúng 1** (hoặc 2 ở StrictMode). Đây là ca
   bắt lỗi `Object.is` của `useSyncExternalStore`.
6. **`useWindowSize` throttle.** Trong Chromium, phát 100 event `resize` liên tiếp
   trong một frame; số lần component render **<= 2**. Với code hiện tại số đó là 100.
7. **`createContextHook` ném có thông báo nêu tên.** Gọi hook ngoài Provider ném
   `Error` có `message` chứa cả tên hook và tên provider. Test khớp bằng regex.
8. **`usePagination` property test**, 2000 mẫu ngẫu nhiên có seed trên
   `(totalPages, currentPage, siblingCount)` trong `[0, 500] x [-10, 510] x [0, 10]`:
   dãy luôn tăng dần; luôn chứa `1`, `totalPages`, `currentPage` khi `totalPages >= 1`;
   độ dài `<= siblingCount * 2 + 5`; không ném. 0 fail.
9. **`useDoubleTap` không setState sau unmount.** Mount, tap một lần, unmount trước
   `threshold`; `console.error` không nhận cảnh báo nào. Với code hiện tại ca này đỏ.
10. Test `tinita-react` >= **80** ca. Đo 2026-10-01 bằng `pnpm test`: hiện **49 passed** trong 8 file, gồm 10 ca `no-global-leak`.
11. **Ca tự phá 1:** đổi `getServerSnapshot` thành đọc `window.innerWidth` -> ca
    `next:rsc-*` phải ĐỎ với `window is not defined`.
12. **Ca tự phá 2:** đổi `getSnapshot` trả `{width, height}` thay vì chuỗi -> ca
    tiêu chí 5 phải ĐỎ (render không dừng).
13. `pnpm gate --full` 9/9 PASS.

## Risk Assessment

| Rủi ro                                                           | Mức  | Chặn bằng                                                                                 |
| ---------------------------------------------------------------- | ---- | ----------------------------------------------------------------------------------------- |
| `useSyncExternalStore` trả object -> render loop vô hạn          | Cao  | tiêu chí 5 + ca tự phá 12; comment trong code nêu `Object.is`                             |
| Hydration mismatch chỉ hiện ở `next build`, không hiện ở dev     | Cao  | tiêu chí 4 đo trên `next start`, không phải `next dev`                                    |
| Hook cần story nhưng hook không vẽ gì -> cám dỗ cho vào `EXEMPT` | TB   | tiêu chí 2: **0** `EXEMPT` mới. Story là component demo nhỏ                               |
| `useWindowSize` throttle bằng `rAF` không chạy khi tab ẩn        | Thấp | đó là hành vi mong muốn; khai vào JSDoc                                                   |
| 6 export mới làm barrel `tinita-react` kéo thêm phụ thuộc        | Thấp | 6 file chỉ cần `react`; nhưng barrel vẫn re-export `ui/file-tree` nên vấn đề cũ không đổi |
| `usePagination` đổi hành vi với `totalPages = 0`                 | TB   | `0.1.0` chưa publish; property test khoá hành vi mới                                      |

## Security Considerations

Không có bề mặt an toàn mới: 6 file không chạm mạng, storage, hay HTML.

Một điểm về `jsxJoin`: nó nhận `ReactNode[]` và `separator: ReactNode`. React tự
escape text node nên không có đường inject - nhưng nếu người dùng truyền
`<div dangerouslySetInnerHTML>` làm separator thì rủi ro là của họ, không phải của
hàm. Không cần guard; chỉ cần không khuyến khích trong `@example`.

`createContextHook` ném thông báo chứa tên context. Tên context là hằng số do lập
trình viên viết, không phải dữ liệu người dùng, nên không có rò thông tin.

## Kết quả đo được

| Chỉ số                 | Trước pha | Sau pha |
| ---------------------- | --------: | ------: |
| `tinita-react` subpath |        11 |  **17** |
| `typesVersions` key    |         6 |  **12** |
| Test `tinita-react`    |        49 |  **89** |
| Story file toàn repo   |        10 |  **23** |
| EXEMPT mới             |         - |   **0** |

49 đường dẫn trong `exports` của `tinita-react` đều resolve, 0 thiếu.

## `usePagination` tệ hơn plan mô tả: 5 lỗi, không phải 1

Plan ghi "giữ logic, thêm chuẩn hoá đầu vào". Đọc thật thì không giữ được:

1. **So trang với số item ở HAI chỗ**: `initialPage >= totalItems` và
   `if (currentPage > totalItems)`. Với 100 item, pageSize 10, chỉ có trang 0-9 tồn
   tại - nhưng trang 99 đi qua cả hai phép kiểm.
2. **Bốn `useEffect` đồng bộ state từ props, trong đó HAI cái cùng ghi
   `currentPage` từ `initialPage`** - một có kiểm biên, một không. Cái không kiểm
   chạy sau, nên đổi `initialPage` là bỏ qua biên hoàn toàn.
3. **Trả `setConditionCanNext` / `setConditionCanPrev`**, cho caller ghi đè chính
   `canNext`/`canPrev` mà hook tự tính - và `goToPage` cũng ghi vào chúng. Một khi
   đã set thì không có đường về giá trị tính được, nên hai cờ đó lúc thì suy ra lúc
   thì là override cũ, và không có cách nào biết đang là cái nào.
4. `initialPageSize` mặc định `1`.
5. `PaginationOptions` và `Pagination` **không export**, nên consumer không gọi tên
   được giá trị nó nhận về.

Viết lại: chỉ `page` và `pageSize` là state, mọi thứ khác tính lúc render, **không
còn `useEffect` nào**. Trang **1-based** vì đó là số UI hiển thị, và lệch một giữa
hook với nhãn chính là lỗi hình dạng này tồn tại để chặn. Clamp lúc **đọc** chứ
không trong effect - effect sẽ render một frame với trang ngoài biên.

Invariant, đúng với mọi đầu vào kể cả `NaN` và `Infinity`, khoá bằng property test
2000 mẫu có seed:

```
totalPages    === items === 0 ? 0 : ceil(items / pageSize)
page          in [1, max(1, totalPages)]
firstIndex    === (page - 1) * pageSize
lastIndex     === min(firstIndex + pageSize, items)
canGoNext     === page < totalPages
canGoPrevious === page > 1
```

## `useWindowSize`: comment nói ngược lại code

```ts
// Initialize state with undefined width/height so server and client renders match
const [windowSize, setWindowSize] = useState({
  width: window.innerWidth, // đọc window NGAY trong initializer
  height: window.innerHeight,
});
```

Trên server đó là `ReferenceError`, không phải mismatch. Nó còn dùng
`useLayoutEffect` chứ không dùng `useIsomorphicLayoutEffect` **vốn có sẵn trong
package**, nên React log thêm một cảnh báo khi SSR; và gọi `setState` trên **mỗi**
event `resize`, khoảng 60 lần/giây suốt thao tác kéo cửa sổ, không gộp gì.

Viết lại bằng `useSyncExternalStore`. Hai chi tiết quyết định, cả hai có test:

- **Snapshot là CHUỖI** (`"1440x900"`), không phải object. `useSyncExternalStore` so
  bằng `Object.is`, nên trả `{width, height}` mới mỗi lần làm nó thấy thay đổi liên
  tục và render vô hạn. Ca test đếm số render.
- Kết quả **memo trên chuỗi snapshot**, nên object trả về ổn định theo tham chiếu -
  nếu không, `useEffect(..., [size])` của consumer chạy lại mỗi render. Ca test
  so `toBe`.

Gộp burst bằng `requestAnimationFrame`, không `setTimeout`: `rAF` tự dừng khi tab
ẩn. Ca test phát **100 event `resize`** trong một frame và đòi `<= 2` render.

Ca SSR chạy thật qua `renderToString`, đòi output chứa `0x0`.

## `useDoubleTap`: 3 lỗi

- **Không dọn timer khi unmount**, nên component unmount trong threshold vẫn chạy
  `onSingleTap` - callback bắn vào component không còn tồn tại.
- `useRef<NodeJS.Timeout>` - kiểu của Node trong code browser. Thành
  `ReturnType<typeof setTimeout>`.
- **`options` nằm trong deps của `useCallback`**, nên caller viết
  `useDoubleTap(fn, 300, { onSingleTap })` inline - cách gọi thông thường - tạo
  object mới mỗi render và vô hiệu hoá toàn bộ memo. Thay bằng latest-value ref, và
  có test khẳng định ref **được cập nhật** (gọi callback mới, không phải callback
  bắt được ở render đầu) - vì đó là cái giá của handler ổn định.

Signature đổi từ `(callback, threshold, options)` thành `(callback, options)` với
`threshold` nằm trong options: một object cho mọi tuỳ chọn.

## Lỗi hạ tầng: glob bỏ sót `.tsx`, lần thứ ba

Khai `./utils/jsxJoin` xong thì 4 đường dẫn trỏ file không tồn tại. Nguyên nhân:
**hai** nơi quét entry đều chỉ khớp `.ts`:

```
tsup.config.ts            globSync('src/utils/**/*.ts')
vite.config.build.mts     if (!file.endsWith('.ts')) continue;
```

`tinita-react` dựng JS bằng **vite** và chỉ dựng types bằng tsup, nên `jsxJoin.tsx`
có `.d.ts`/`.d.mts` mà **không** có `.mjs`/`.cjs` - đúng hình dạng khó thấy nhất.

Cùng lớp lỗi với glob phẳng `src/*.ts` của `tinita-dom` (bắt ở pha 03) và
`src/*/**/*.ts` của `tinita`. Ba lần, ba package. Sửa cả hai nơi thành `{ts,tsx}`,
và ghi lý do ngay tại chỗ.

## Story: 6 subpath mới, 0 EXEMPT

Hook không vẽ gì, nhưng mỗi cái có một thứ **chỉ story cho thấy được**:

- `usePagination` - nút "break it" đặt `totalItems: 0, pageSize: 0, initialPage: 500`
  và bảng invariant tính lại **live** từ giá trị trả về, nên người xem thấy nó giữ
  chứ không đọc một lời hứa.
- `useWindowSize` - kéo cửa sổ và xem bộ đếm render; cộng bộ đếm
  `useEffect([size])` riêng, hai số phải đi gần nhau, nếu lệch ra thì hook đang trả
  object mới mỗi render.
- `useDoubleTap` - tick bỏ "mounted" trong lúc chờ threshold và thấy `onSingleTap`
  **không** bắn.
- `useRequiredContext` - bấm đọc context ngoài Provider và đọc chính thông báo lỗi;
  đó là toàn bộ giá trị của hook so với `useContext` trần.
- `jsxJoin` - separator là một element có style riêng, thứ `Array.join` không làm được.
- `useRefreshComponent` - một box `resize: horizontal`: kéo nó thì React không biết
  gì, chỉ refresh tường minh mới đo lại. Đúng ca hẹp mà hook này dành cho.

## Đính chính plan

Plan ghi `usePagination` sinh dãy số trang + ellipsis và cần hằng số `DOTS` với
property test trên `(totalPages, currentPage, siblingCount)`. **Nó không làm việc
đó** - không có dãy trang nào. Tôi đoán sai từ cái tên. Property test thay vào đó
khoá 6 invariant thật ở trên; thêm tính năng `DOTS` chưa từng có sẽ là mở rộng phạm
vi, không phải lên chuẩn.

## Next steps

Pha 08 - docs, guard, và cổng publish của owner.
