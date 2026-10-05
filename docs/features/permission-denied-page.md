# Feature: Trang "không có quyền" (/forbidden) cho SPA

Playbook tái sử dụng. Đọc từ trên xuống, làm theo từng mục, đánh dấu checklist ở cuối.
Áp dụng cho SPA có router hỗ trợ guard chạy trước render (TanStack Router `beforeLoad`,
React Router `loader`, Vue Router `beforeEach`, Angular `canActivate`...). Ví dụ code dùng
TypeScript + TanStack Router + TanStack Query, nhưng mọi quy tắc đều không phụ thuộc
framework.

Mọi mục "Lỗi đã gặp" là lỗi thật, đã lọt tới trình duyệt ít nhất một lần.

---

## 1. Vấn đề cần giải

| Trước                                                                           | Sau                                                                               |
| ------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| Trang không có quyền vẫn render, tương tác được, chỉ bật toast "not authorized" | Không render gì của trang bị chặn, chuyển sang `/forbidden` nói rõ bị chặn cái gì |
| Mỗi route tự guard, lặng lẽ đẩy về `/`                                          | Một chỗ gate duy nhất, một trang đích duy nhất                                    |
| Deep link tới bản ghi không có quyền lặng lẽ rơi về danh sách                   | Hỏi đúng bản ghi, 403 thì `/forbidden`                                            |

## 2. Quyết định cần chốt trước khi code

Hỏi product/owner. Cột "Mặc định" là lựa chọn đã được dùng và chứng minh ổn.

| #   | Câu hỏi                                                 | Mặc định                                                                                   |
| --- | ------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| D1  | Chặn bằng redirect sang route riêng hay render tại chỗ? | Route riêng `/forbidden` (link được, reload được, test được)                               |
| D2  | Mấy lớp chặn?                                           | Hai: (a) gate theo quyền trang/menu, (b) gate theo bản ghi (403 từ API đọc chính)          |
| D3  | `/forbidden` hiển thị gì?                               | Tên trang/bản ghi bị chặn, "liên hệ quản trị viên", nút Về trang chủ, nút Quay lại         |
| D4  | Toast khi 403?                                          | Đọc (GET) 403: im lặng, trang tự nói. Ghi (POST/PUT/DELETE) 403: vẫn toast                 |
| D5  | Không đọc được quyền (mạng, 5xx)?                       | Vẫn chặn, `reason=unverified`, có nút Thử lại. Không bao giờ "cho qua khi không chắc"      |
| D6  | Trang chủ cũng bị chặn thì nút Home đi đâu?             | Trang đầu tiên user được xem; không có trang nào thì ẩn Home                               |
| D7  | Thu hồi quyền khi đang mở app?                          | Chỉ kiểm tra lại khi reload/điều hướng có gate; trang đọc dữ liệu bị 403 thì lớp (b) xử lý |

## 3. Kiến trúc

```
                 ┌───────────────────────────── route-access (1 module) ─────┐
URL ──► guard ──►│ menuDenial(path)  recordDenial(id)  tabDenial(hash) ...    │──► null | Denial
                 │ accessDenial(href) = chạy tất cả gate cho 1 href           │
                 └────────────────────────────────────────────────────────────┘
                     │ Denial
                     ▼
        redirect /forbidden?from=<href>&page=<key>&what=<record>&reason=<...>#<hash gốc>  (replace)
                     │
                     ▼ reload / sau đăng nhập
        /forbidden guard: accessDenial(from) == null ? redirect(from) : render
```

Nguyên tắc:

1. **Mọi gate nằm trong một module** (`route-access`). Guard của route và guard của
   `/forbidden` gọi cùng hàm. Hai bản logic sẽ lệch nhau và đẩy user qua lại.
2. **Gate chạy trong guard của router, trước render.** Không bao giờ trong `useEffect`
   hay `<Navigate>` của component.
3. **Một nguồn sự thật cho quyền**: API "quyền của tôi" (vd. `GET /me/permissions`).
   Thông tin role lưu lúc đăng nhập chỉ là fallback khi API đó không đọc được.
4. **Bản đồ path → quyền** lấy từ chính cấu hình menu/nav (cái quyết định ẩn link), không
   viết danh sách thứ hai.

### Hợp đồng URL của `/forbidden`

| Param    | Ý nghĩa                                                       | Validate                                       |
| -------- | ------------------------------------------------------------- | ---------------------------------------------- |
| `from`   | URL đầy đủ (path + search + hash) user định vào               | Xem mục 5.1. Không hợp lệ thì bỏ               |
| `page`   | key trang trong nav, để hiện tên trang                        | Chuỗi; không khớp nav thì dùng câu chung chung |
| `what`   | loại bản ghi khi chặn ở mức bản ghi (`camera`, `document`...) | enum, sai thì bỏ                               |
| `reason` | `unverified` khi không đọc được quyền                         | enum, sai thì bỏ                               |
| `#hash`  | hash gốc của trang bị chặn (tab đang mở)                      | Ghi tường minh, không để router tự giữ         |

Mọi param: lấy giá trị đầu nếu bị lặp (`?a=1&a=2` thành mảng), `.catch(undefined)` để
param rác không bao giờ làm route lỗi trắng trang.

---

## 4. Code mẫu (TanStack, rút gọn)

```ts
// route-access.ts
export type Denial = { page?: string; what?: 'record'; reason?: 'unverified' };

export async function menuDenial(
  qc: QueryClient,
  pathname: string
): Promise<Denial | null> {
  const leaf = leafForPath(pathname); // prefix match có ranh giới '/'
  if (!leaf) return null; // /forbidden, /login: không thuộc leaf nào
  const ok = (d: Perms) => canSee(leaf, d);
  try {
    let d = await qc.ensureQueryData(myPermissionsQuery);
    if (!ok(d))
      d = await qc.fetchQuery({ ...myPermissionsQuery, staleTime: 0 }); // cache cũ có thể trước lúc được cấp
    return ok(d) ? null : { page: leaf.key };
  } catch {
    return { reason: 'unverified' }; // D5
  }
}

export async function recordDenial(
  qc: QueryClient,
  id?: string
): Promise<Denial | null> {
  if (!id) return null;
  if (qc.getQueryData<{ id: string }[]>(listKey)?.some((r) => r.id === id))
    return null; // list chỉ chứa bản ghi được phép
  try {
    await qc.ensureQueryData({
      queryKey: [...detailKey(id), 'access'],
      queryFn: () => api(`/records/${id}`, { silent: true }),
      retry: false,
    });
    return null;
  } catch (e) {
    const s = e instanceof ApiError ? e.status : 0;
    if (s === 403) return { page: 'records', what: 'record' };
    if (s === 0 || s >= 500) return { reason: 'unverified' };
    return null; // 404 không phải chuyện quyền
  }
}

export async function accessDenial(qc: QueryClient, href: string) {
  const url = new URL(href, 'http://internal.invalid');
  return (
    (await menuDenial(qc, url.pathname)) ??
    (url.pathname === '/records'
      ? recordDenial(qc, url.searchParams.get('id') ?? undefined)
      : null)
  );
}
```

```ts
// _shell (layout cha của mọi trang) - guard
beforeLoad: async ({ context, location }) => {
  const from =
    location.pathname +
    location.searchStr +
    (location.hash ? `#${location.hash}` : '');
  if (!isAuthenticated())
    throw redirect({ to: '/login', search: { redirect: from } });
  const denial = await menuDenial(context.queryClient, location.pathname);
  if (denial)
    throw redirect({
      to: '/forbidden',
      search: { from, ...denial },
      hash: location.hash,
      replace: true,
    });
};
```

```ts
// /forbidden - guard: kiểm tra lại tại chỗ khi tài liệu bắt đầu ở đây
let rechecked = false; // module-level = 1 lần / document
beforeLoad: async ({ search, context }) => {
  if (rechecked || !search.from) return;
  rechecked = true;
  // đọc window/performance TRONG hàm, không ở top-level module (test chạy trong node sẽ vỡ)
  const entry = performance.getEntriesByType('navigation')[0] as
    | PerformanceNavigationTiming
    | undefined;
  const start = new URL(entry?.name ?? location.href);
  const landedHere =
    start.pathname === '/forbidden' ||
    (start.pathname === '/login' &&
      !!start.searchParams.get('redirect')?.startsWith('/forbidden'));
  if (!landedHere) return; // đến từ gate trong app: gate vừa trả lời rồi
  if (await accessDenial(context.queryClient, search.from)) return; // vẫn bị chặn: render, URL đứng yên
  throw redirect({ href: search.from, replace: true });
};
```

```ts
// router
createRouter({ ..., defaultPendingComponent: PagePending, defaultPendingMs: 300 });
```

---

## 5. Edge case và lỗi dễ gặp

Mỗi dòng: tình huống, cái sai đã xảy ra, cách đúng.

### 5.1 Bảo mật: `from` / `redirect` (open redirect)

| Tình huống                                                                 | Sai đã gặp                                                                                           | Đúng                                                                       |
| -------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| `from=//evil.com`                                                          | Bắt đầu bằng `/` nên qua check "starts with /"                                                       | Không pattern-match. Parse bằng `new URL(v, base)` và so `origin === base` |
| `from=/\evil.com`                                                          | Trình duyệt chuẩn hoá `\` thành `/` → `//evil.com`                                                   | Như trên                                                                   |
| `from=/%09/evil.com` (tab, `\n`, `\r`)                                     | Regex `^/(?![/\\])` cho qua (ký tự 2 là tab), parser URL **bỏ** tab/CR/LF → `http://evil.com/`       | Như trên. Đây là lý do pattern-match luôn thua                             |
| `from=/forbidden...`, `/login...`, `/./login`, `/FORBIDDEN`, `/a/../login` | Re-check đi vòng: `from` lồng nhau, hoặc qua `/login` (đã đăng nhập) bị đẩy về `/` và báo nhầm trang | Loại theo **path đã parse, lowercase**, không theo chuỗi thô               |
| Trang login có `?redirect=`                                                | Cùng lỗi với `from`                                                                                  | Dùng chung hàm `internalHref()`                                            |

```ts
export function internalHref(v?: string): string | undefined {
  if (!v || !v.startsWith('/')) return undefined;
  const base = 'http://internal.invalid';
  try {
    return new URL(v, base).origin === base ? v : undefined;
  } catch {
    return undefined;
  }
}
```

Test bắt buộc: `//x`, `/\x`, `/\tx`, `/\nx`, `/\rx`, `https://x`, `javascript:...`, `x`, `''`,
param lặp, `/forbidden`, `/./login`, `/LOGIN`, và look-alike hợp lệ (`/forbidden-reports`)
phải được giữ.

### 5.2 Không được render trước khi biết quyền

| Tình huống                                                               | Sai đã gặp                                                                                                                                       | Đúng                                                                                                                           |
| ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------ |
| Kiểm tra bản ghi trong component (`useQuery` + `useEffect`/`<Navigate>`) | Trang hiện ra (danh sách, video, dữ liệu) rồi mới nhảy                                                                                           | Kiểm tra trong guard của router; router giữ navigation tới khi có câu trả lời                                                  |
| `<Navigate>` render-time với `from = location.href`                      | Sau khi URL đổi sang `/forbidden`, component render lại, đọc location **mới**, redirect tiếp → `from=/forbidden?from=/forbidden?from=...` vô hạn | Không redirect lúc render. Guard của router, hoặc effect chỉ chạy 1 lần với giá trị chụp trước                                 |
| API quyền chậm                                                           | Màn trắng 2-3s không có dấu hiệu gì                                                                                                              | Pending component mặc định của router, hiện sau ~300ms                                                                         |
| Gate dùng retry mặc định của data lib                                    | Lỗi 500 trên API quyền treo 20s+ (ladder retry) trước khi báo                                                                                    | `retry: false` cho query quyền. Gate và nav dùng **chung một query options**, nếu không nav đang retry còn gate chờ promise đó |

### 5.3 Điều hướng và lịch sử

| Tình huống                                                        | Sai đã gặp                                                                                                     | Đúng                                                                                                                         |
| ----------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Redirect sang `/forbidden`                                        | Push → Back quay lại trang bị chặn → bị chặn lại                                                               | Luôn `replace`                                                                                                               |
| Hash của trang bị chặn                                            | Không truyền `hash` thì router **giữ hash cũ** của URL hiện tại (vd. `#general` thay vì `#rules` đang bị chặn) | Truyền `hash` tường minh ở mọi redirect                                                                                      |
| Retry / quay lại `from`                                           | `navigate({ to: from })` coi cả chuỗi là pathname, `?`/`#` thành ký tự literal                                 | Đi bằng history API với href đầy đủ (`history.replace(from)`, `redirect({ href })`)                                          |
| Reload `/forbidden` sau khi được cấp quyền                        | Trang chỉ hiển thị, không kiểm tra lại → vẫn "không có quyền"                                                  | Guard của `/forbidden` chạy lại `accessDenial(from)`; qua thì redirect tới `from`                                            |
| Reload khi vẫn bị chặn                                            | Phiên bản "redirect về `from` để trang đích tự kiểm tra": URL nháy `/forbidden` → `/trang` → `/forbidden`      | Kiểm tra **tại chỗ** bằng chung module gate; chỉ rời đi khi đã qua                                                           |
| Re-check bị lặp                                                   | Trang đích chặn bằng một luật mà re-check không biết → qua lại vô hạn                                          | Cờ 1 lần / document. Và mọi luật chặn phải nằm trong module gate (kể cả chặn tab)                                            |
| Chưa đăng nhập mở `/forbidden?from=X`                             | Sau đăng nhập, document bắt đầu ở `/login` nên không re-check → báo sai                                        | Re-check cả khi document bắt đầu ở `/login?redirect=/forbidden...` (chỉ trường hợp đó, không phải mọi phiên bắt đầu ở login) |
| Sau đăng nhập dùng `history.push`                                 | Back từ `/forbidden` về `/login`, login (đã auth) đẩy lại → Back "không làm gì"                                | Login luôn `replace`                                                                                                         |
| Đã đăng nhập mà mở `/login?redirect=...`                          | `redirect({ to: search.redirect })` làm hỏng `?`/`#`                                                           | `redirect({ href, replace: true })`                                                                                          |
| Nút Quay lại                                                      | `history.length > 1` → hiện cả khi trang trước là site khác, bấm là rời app                                    | Chỉ hiện khi router có entry trước (`useCanGoBack`) hoặc `document.referrer` cùng origin                                     |
| `reason=unverified` mà không có `from` (bị loại vì không an toàn) | Không có nút nào: ngõ cụt                                                                                      | Thử lại fallback về `/`                                                                                                      |
| Nút Home                                                          | Trang chủ cũng bị chặn → Home dẫn vào `/forbidden` lần nữa                                                     | Trang đầu tiên user được xem; không có thì ẩn                                                                                |

### 5.4 Cache và tính tươi của quyền

| Tình huống                                  | Sai đã gặp                                                      | Đúng                                                                                                                                           |
| ------------------------------------------- | --------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| Vừa được cấp quyền, điều hướng trong app    | Cache quyền cũ nói "không"                                      | Khi gate định chặn: fetch lại 1 lần với `staleTime: 0` rồi mới chặn                                                                            |
| Mở bản ghi từ danh sách (click item)        | Mỗi lần mở phải chờ 1 request kiểm tra                          | Danh sách server trả chỉ gồm bản ghi được phép → có trong cache list thì bỏ qua request. Chấp nhận: thu hồi giữa phiên không bị bắt ở bước này |
| Hai nguồn role (lưu lúc login vs API quyền) | Lệch nhau → trang hiện tab admin, gate nói không → nhảy qua lại | Một nguồn: API quyền; role lúc login chỉ fallback. Trang và gate đọc cùng cặp                                                                  |
| Đổi tài khoản                               | Cache của tài khoản trước còn trong bộ nhớ                      | Đăng xuất kết thúc document (`location.replace`), không reset store từng cái                                                                   |

### 5.5 Lớp bản ghi (record-level)

| Tình huống                                          | Sai đã gặp                                                                                                 | Đúng                                                                                               |
| --------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| Deep link `?id=X` tới bản ghi không có quyền        | Danh sách chỉ có bản ghi được phép, id không khớp, trang lặng lẽ hiện danh sách; filter phụ (select) trống | Hỏi đúng endpoint chi tiết: 403 → `/forbidden`, 404 → hành vi cũ                                   |
| 403 vs 404                                          | Gộp chung                                                                                                  | Tách: 404 là "không tồn tại", không phải chuyện quyền; đừng lộ tồn tại nếu backend cố tình trả 404 |
| Endpoint chi tiết lỗi mạng/5xx                      | Cho qua → trang mở mà không giải thích                                                                     | `reason=unverified` (D5)                                                                           |
| Lời báo                                             | "Bạn chưa được cấp quyền vào **Trang X**" trong khi user vào được Trang X, chỉ bị chặn 1 bản ghi           | `what=<loại>` → "Bạn chưa được cấp quyền xem <bản ghi> này"                                        |
| Nhiều param cùng trỏ bản ghi (`?id=`, `?filterId=`) | Chỉ kiểm tra một                                                                                           | Kiểm tra param nào có mặt (`id ?? filterId`)                                                       |

### 5.6 Trang có tab / quyền theo tab

| Tình huống                                                | Sai đã gặp                                                | Đúng                                                                                  |
| --------------------------------------------------------- | --------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| Tab admin mở bằng URL (`/settings#rules`) bởi user thường | Lặng lẽ hiện tab mặc định                                 | Redirect `/forbidden?page=settings#rules`                                             |
| Vào trang có tab                                          | URL không có tab (`/settings`), khó biết đang ở quyền nào | Luôn ghi tab vào URL bằng replace (`/settings` → `/settings#general`)                 |
| Hash rác (`#bogus`)                                       | Giữ lại thành `#general/bogus`                            | Ghi lại thành tab mặc định, bỏ phần rác (an toàn khi mọi surface con đều ghi sau tab) |
| Tab chung cho mọi user nhưng trang gọi API cần quyền      | Toast 403 mỗi lần mở tab chung                            | Chỉ bật query khi có quyền tương ứng; không có thì dùng default                       |
| Luật chặn tab nằm trong component                         | Re-check của `/forbidden` không biết luật đó → nháy       | Đưa danh sách tab hạn chế vào module gate; component đọc từ đó                        |

### 5.7 Toast và thông báo lỗi

| Tình huống                                 | Sai đã gặp                                                      | Đúng                                                              |
| ------------------------------------------ | --------------------------------------------------------------- | ----------------------------------------------------------------- |
| API quyền lỗi                              | Toast "Máy chủ gặp sự cố" lặp lại cùng lúc trang báo unverified | Gọi API quyền `silent`                                            |
| Request bị hủy khi rời trang (AbortSignal) | Toast "Không kết nối được máy chủ" khi chỉ là điều hướng        | `catch` của fetch: `if (signal?.aborted) throw e` trước khi toast |
| GET 403 của trang chính                    | Toast + trang forbidden: cùng tin báo hai lần                   | Đọc 403 im lặng (D4)                                              |
| Hiển thị message từ server                 | Text server (tiếng Anh, kỹ thuật) lên UI                        | UI dùng message đã dịch; text server chỉ ra console               |

### 5.8 Gate theo path

| Tình huống             | Sai đã gặp                                     | Đúng                                                                               |
| ---------------------- | ---------------------------------------------- | ---------------------------------------------------------------------------------- |
| Prefix match           | `/cases-x` khớp `/cases`; `/` khớp mọi thứ     | Ranh giới `/`: `path === to \|\| path.startsWith(to + '/')`; `/` chỉ khớp chính nó |
| Trang con              | `/records/123` lọt gate vì chỉ gate `/records` | Prefix match ở trên bao luôn trang con                                             |
| `/forbidden`, `/login` | Bị gate → vòng lặp                             | Không thuộc leaf nào                                                               |
| Guard cũ từng route    | Mỗi route tự `redirect('/')` im lặng           | Xoá hết, chỉ còn gate chung                                                        |
| Admin-only leaf        | Chỉ kiểm tra menu key                          | `canSee = hasMenuKey && (!leaf.adminOnly \|\| isAdmin)`                            |

### 5.9 Kỹ thuật

| Tình huống                                            | Sai đã gặp                                                                           | Đúng                                                                 |
| ----------------------------------------------------- | ------------------------------------------------------------------------------------ | -------------------------------------------------------------------- |
| Đọc `location`/`performance` ở top-level module route | Test (môi trường node) import route → `location is not defined`                      | Đọc trong hàm guard                                                  |
| Pending component áp cho mọi route                    | Lần tải đầu, spinner thay cả khung app                                               | Chấp nhận, hoặc pending riêng cho layout cha                         |
| Id dạng số trong search param                         | Router stringify JSON (`"123"` → `%22123%22`), `URLSearchParams.get` ra có ngoặc kép | Dùng parser search của router, hoặc id luôn là chuỗi không-số (UUID) |

---

## 6. Tiêu chí chấp nhận (kiểm bằng trình duyệt)

| #   | Thao tác                                  | Kỳ vọng                                                                   |
| --- | ----------------------------------------- | ------------------------------------------------------------------------- |
| A1  | Không có quyền trang, mở URL trực tiếp    | `/forbidden?from=...&page=...`, hash giữ, không toast, không render trang |
| A2  | Không có quyền trang con `/x/123#tab`     | Như A1, `#tab` giữ                                                        |
| A3  | Có quyền                                  | Không redirect                                                            |
| A4  | API quyền 500/mạng                        | `reason=unverified`, nút Thử lại, không treo, không toast trùng           |
| A5  | Deep link bản ghi bị 403                  | `/forbidden?...&what=...`, không nháy dữ liệu trước                       |
| A6  | Deep link bản ghi 404                     | Hành vi cũ                                                                |
| A7  | Reload `/forbidden` khi vẫn bị chặn       | URL không rời `/forbidden` (lấy mẫu mỗi 100ms)                            |
| A8  | Reload `/forbidden` sau khi được cấp      | Tới `from`, không hiện UI forbidden lần nào                               |
| A9  | Chưa đăng nhập → login → được cấp / không | Tới `from` / `/forbidden`                                                 |
| A10 | `from` độc (mục 5.1)                      | Bị loại, không request nào ra ngoài origin                                |
| A11 | Back trên `/forbidden`                    | Về trang trước trong app; đến từ ngoài thì không có Back                  |
| A12 | API chậm 2s                               | Spinner trong ≤500ms, không màn trắng                                     |
| A13 | Click item trong danh sách được phép      | 0 request kiểm tra bản ghi                                                |
| A14 | Tab admin bằng URL, user thường           | `/forbidden#<tab>`; admin vào được; reload không nháy                     |
| A15 | Tab chung, user không có quyền phụ        | Không toast 403, không request thừa                                       |
| A16 | Rời trang khi request đang bay            | Không toast mất kết nối                                                   |

---

## 7. Cách kiểm chứng (để không tự lừa mình)

1. **Trình duyệt thật, giả lập trong trình duyệt.** Puppeteer/Playwright với request
   interception: giả `GET /me/permissions` và endpoint bản ghi (403, abort mạng, delay).
   Abort mọi request không phải GET nếu chạy trên môi trường dùng chung. Không gõ mật khẩu
   tài khoản thật; nạp token từ file vào storage.
2. **Lấy mẫu theo thời gian, không chỉ trạng thái cuối.** Mỗi 100ms ghi `pathname + hash`
   và marker DOM (UI forbidden / UI trang / spinner / trống). Nháy UI và URL nhảy qua lại
   chỉ thấy được bằng cách này.
3. **Thấy guard fail trước khi tin nó.** Tạm vô hiệu một nhánh (vd. bỏ qua cache) và xác
   nhận số đo đổi (0 request → 1 request), rồi trả lại.
4. **Báo cáo bằng exit code** của test/lint, không chỉ dòng tổng kết.

Lỗi probe đã gặp, kiểm tra trước khi tin kết quả:

| Lỗi probe                                                                    | Trông như                                                  |
| ---------------------------------------------------------------------------- | ---------------------------------------------------------- |
| Regex chặn `evil.com` khớp luôn URL localhost chứa `evil.com` trong query    | "App crash"                                                |
| Selector `[aria-label^="Mở "]` bắt nhầm nút "Mở rộng..." hoặc phần tử ẩn 0×0 | "Click không hoạt động"                                    |
| Tab mới không cài interception                                               | Quyền thật (admin) trả lời → "không bị chặn"               |
| Token hết hạn giữa chừng                                                     | Bị đẩy về login → tưởng gate hỏng                          |
| Probe dùng role khác nhau ở 2 nguồn (storage vs API giả)                     | Nháy qua lại → có thể là lỗi thật (5.4) hoặc chỉ là probe  |
| `page.goto` khởi đầu ở trang login để nạp storage                            | History có entry trong app → test "Back từ site ngoài" sai |

## 8. Checklist triển khai

- [ ] Chốt D1-D7
- [ ] Module gate duy nhất: menu, bản ghi, tab; `accessDenial(href)` gộp
- [ ] Query quyền: `retry: false`, silent, dùng chung cho gate và nav
- [ ] Gate trong guard layout cha; redirect `replace` + `hash` tường minh
- [ ] Route `/forbidden`: validate param (5.1), copy theo `page`/`what`/`reason`, Home/Back/Retry đúng 5.3
- [ ] Re-check tại chỗ trên `/forbidden` (1 lần / document, chỉ khi bắt đầu ở đó hoặc login → đó)
- [ ] Login: `internalHref`, `replace`, `redirect({ href })`
- [ ] Gỡ guard cũ từng route
- [ ] Tab: URL luôn có tab, hash rác → mặc định, tab hạn chế → `/forbidden#tab`
- [ ] Query cần quyền trên trang chung: chỉ bật khi có quyền
- [ ] api-client: GET 403 im lặng, abort không toast
- [ ] Pending component (~300ms)
- [ ] i18n cho mọi chuỗi mới
- [ ] Test: `internalHref` (5.1), re-check 1 lần / document (5.3), mapping path → leaf (5.8)
- [ ] Kiểm A1-A16 trên trình duyệt theo mục 7
