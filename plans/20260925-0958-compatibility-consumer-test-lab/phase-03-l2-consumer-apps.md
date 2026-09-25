# Pha 03 - L2 Consumer app

## Context links

- Plan cha: [plan.md](./plan.md)
- Dependency: **pha 01** (`consumer.mjs`, `manifest.json`), **pha 02** (`contract.json`; L2 giả định
  L1 đã xanh và không lặp lại ca L1)
- Context đã đo: [reports/00-verified-context.md](./reports/00-verified-context.md) mục "Bề mặt rò rỉ
  CSS", mục "SSR - chưa từng kiểm", mục "Dependency theo component"
- Research: [researcher-02-consumer-css-ssr.md](./research/researcher-02-consumer-css-ssr.md) -
  **hữu ích về pattern, nhưng chuỗi lỗi trong đó KHÔNG được dùng làm acceptance criteria**
- Docs: `docs/design-guidelines.md` mục 4 (bảng kiểm rò rỉ), `docs/system-architecture.md` mục
  "Bề Mặt Rò Rỉ CSS Ra Global Scope"

## Overview

- **Date:** 2026-09-25
- **Description:** Dựng application thật tiêu thụ tarball: Vite + React 19, Next App Router, Node
  thuần (ESM và CJS), và một consumer `tsc` để kiểm type resolution dưới 3 `moduleResolution`. Đây
  là tầng đầu tiên thấy được lỗi bundler, CSS và SSR - những thứ `node -e` của pha 02 không chạm tới.
- **Priority:** P0 - cùng pha 02 tạo thành tier 1, là hai tầng đáng đầu tư nhất theo tài liệu nguồn
- **Implementation status:** Done
- **Review status:** Not reviewed

## Key Insights

1. **Rò rỉ CSS phải đo bằng `getComputedStyle`, không bằng ảnh.** Ảnh chỉ nói "có gì đổi"; nó không
   nói "cái gì đè cái gì" và không chạy được trong tier 1. Cách đo: render một trang có element của
   chủ nhà mang giá trị style đã biết, chụp `getComputedStyle` **trước** khi nạp CSS của library,
   nạp vào, chụp lại, so. Chênh nào không thuộc cây của library là rò rỉ.
2. **jsdom không đọc được style trong `@layer`.** Nên ca kiểm cascade layer buộc phải chạy trên
   Chromium thật. Ở pha này dùng Playwright ở chế độ nhẹ nhất (chromium headless local, không
   Docker, không screenshot); ảnh và baseline để pha 05.
3. **`renderToString` là smoke test SSR rẻ nhất và nó đủ để bắt lớp lỗi hay gặp nhất.** Nó bắt
   được truy cập `window`/`document` lúc render. Nó KHÔNG bắt được hydration mismatch - việc đó cần
   Next thật, và đó là lý do pha này có cả hai, không chọn một.
4. **`'use client'` là câu hỏi mở, chưa được kiểm.** Source `tinita-react` không có directive nào.
   `FileTree` dùng `@radix-ui/react-accordion` (có hook/state). Tài liệu nghiên cứu nói consumer bọc
   là KHÔNG đủ, nhưng chuỗi lỗi nó đưa ra có dấu hiệu diễn giải lại. Nên bước đầu của ca Next là
   **đo hành vi thật** rồi mới viết assertion.
5. **Hai consumer CSS đối lập mới lộ được vấn đề.** Consumer **có** Tailwind v4 + shadcn lộ việc 22
   token không prefix đè token của họ. Consumer **không** có Tailwind lộ việc `Ping` và
   `CarouselTicker` viết class Tailwind thô trong JSX mà bundle không ship utility. Chỉ một trong
   hai thì bỏ sót một nửa.
6. **Consumer `tsc` là chỗ duy nhất thấy vấn đề type resolution ở góc nhìn người dùng.** `attw` ở
   pha 02 nói "có vấn đề"; consumer `tsc` nói "vấn đề đó làm người dùng không compile được".

## Requirements

- 5 consumer, tất cả install từ tarball qua `consumer.mjs`, không consumer nào đọc `packages/*`.
- Consumer `node-esm` và `node-cjs`: chỉ `tinita` + `tinita-react` + `react`, dùng `renderToString`.
- Consumer `vite-react19`: build production được, và render được trong chromium headless local.
- Consumer `next-app-router`: build được, chạy được, và trả lời được câu hỏi `'use client'`.
- Consumer `tailwind-shadcn`: có Tailwind v4 + bộ token shadcn, dùng để đo rò rỉ token.
- Consumer `no-tailwind`: **không** có Tailwind, dùng để đo phụ thuộc ngầm vào host.
- Consumer `tsc-matrix`: compile dưới `moduleResolution` `node`, `bundler`, `nodenext`.
- Toàn pha chạy **local, Node 24** - không Docker. Playwright chỉ dùng chromium headless, không ảnh.

## Architecture

```
compatibility/cases/l2/
├── node-esm/            <- renderToString, import
├── node-cjs/            <- renderToString, require
├── vite-react19/        <- vite build + preview + chromium
├── next-app-router/     <- next build + start + chromium
├── tailwind-shadcn/     <- Tailwind v4 + token shadcn, đo rò rỉ
├── no-tailwind/         <- không Tailwind, đo phụ thuộc ngầm
├── tsc-matrix/          <- 3 moduleResolution
└── lib/
    ├── css-probe.mjs    <- chụp getComputedStyle trước/sau, trả bảng chênh
    └── host-fixture.html<- element chủ nhà có giá trị style đã biết
```

`host-fixture.html` mang các element mà bảng rò rỉ chỉ ra là bị ảnh hưởng, mỗi cái có giá trị chủ
nhà đặt tường minh:

| Element | Chủ nhà đặt | Bề mặt rò rỉ tương ứng |
| --- | --- | --- |
| `body` | `background`, `color` | reset `body { @apply bg-background text-foreground }` |
| `div[data-host]` | `border-color` | reset `* { @apply border-border }` |
| `:root` | `--color-primary`, `--radius`, `--font-sans` | 22 token không prefix trong `@theme inline` |
| `.animate-fade-in` của chủ nhà | `animation-name` riêng | 18 class `.animate-*` không prefix |
| `.transition-fast` của chủ nhà | `transition-duration` riêng | 8 class `.transition-*` không prefix |
| `.interactive` của chủ nhà | `opacity` riêng | class `.interactive` không prefix |
| `[data-host] > *` trong `CarouselTicker` | `box-sizing: content-box` | `.tinita-carousel-ticker * { box-sizing: border-box }` |
| `@layer host { .tinita-filetree { ... } }` | override có chủ ý | CSS component ngoài mọi `@layer` |

## Related code files

| File | Vai trò |
| --- | --- |
| `packages/tinita-react/src/styles/globals.css` | dòng 81-111 (22 token), 116-127 (reset `*`/`body`) |
| `packages/tinita-react/src/styles/animations.css` | dòng 114-318 (27 class), 530-539 (`*` + `!important`) |
| `packages/tinita-react/src/ui/file-tree/FileTree.css` | không `@layer`; dòng 230,237 dùng `--radix-*` |
| `packages/tinita-react/src/ui/carousel-ticker/CarouselTicker.css` | dòng 15-17, 20-25 (`*` trong component) |
| `packages/tinita-react/src/ui/ping/Ping.tsx` | dòng 45-50 Tailwind thô trong JSX |
| `packages/tinita-react/src/ui/carousel-ticker/CarouselTicker.tsx` | dòng 211-291 Tailwind thô |
| `packages/tinita-react/src/utils/autoInjectStyles.ts` | dòng 12 SSR guard, 22-25 `document.head` |
| `packages/tinita/package.json` | `exports.types` trỏ `.d.ts` - nguồn của ca `tsc-matrix` |

## Implementation Steps

1. Consumer `node-esm` và `node-cjs`: dựng 2 project, mỗi cái render `Ping` và `CarouselTicker` qua
   `renderToString`. **Không** render `FileTree` ở đây (nó cần optional peer, đã phủ ở pha 02).
   Xác nhận không throw và output chứa class `tinita-` mong đợi.
2. Ca `autoInjectStyles` dưới SSR: gọi nó trong `renderToString` (môi trường không có `document`),
   xác nhận không throw - SSR guard hoạt động. Ghi nhận thêm: **không component nào gọi nó**, nên ca
   này kiểm một API mà runtime không dùng; báo cáo điều đó như finding.
3. Consumer `vite-react19`: `vite build` rồi `vite preview`, mở bằng chromium headless, xác nhận 3
   component render và CSS của library được nạp (`document.styleSheets` có rule `tinita-`).
4. Consumer `next-app-router`: **bước đo trước, assertion sau.** Dựng app import `FileTree` trong
   một Server Component (không `'use client'` phía app), chạy `next build`, và **ghi lại nguyên văn**
   output. Dựa trên chuỗi thật đó mới viết assertion. Sau đó dựng biến thể thứ hai có `'use client'`
   ở phía app để biết consumer bọc có đủ hay không. Kết luận đi vào report như một quyết định cần
   chốt: library có phải thêm `'use client'` vào source hay không.
5. Consumer `tailwind-shadcn`: Tailwind v4 + `:root` khai bộ token shadcn với giá trị **đặc trưng dễ
   nhận** (ví dụ `--color-primary: rgb(1, 2, 3)`), nạp `tinita-react/styles.css`, rồi dù
   `css-probe.mjs` so trước/sau. Mỗi token/element bị đổi là một dòng trong bảng rò rỉ của report.
6. Consumer `no-tailwind`: không Tailwind, render `Ping` và `CarouselTicker`, đo `getComputedStyle`
   của node mang class Tailwind thô. Kỳ vọng: `display` không phải `inline-flex`, `background-color`
   không phải màu `bg-green-500` - tức style thiếu. Đây là **bằng chứng của phụ thuộc ngầm vào host**,
   ghi vào report dạng finding, không phải lỗi hạ tầng.
7. Ca cascade layer: trong `tailwind-shadcn`, consumer khai `@layer host { .tinita-filetree { ... } }`
   với giá trị riêng. Đo xem override có thắng không. Kỳ vọng hiện tại: **không thắng**, vì CSS
   component nằm ngoài mọi layer. Ca này phải ghi rõ đây là hành vi hiện tại được chốt lại, và sẽ
   đảo chiều khi mốc M1 của roadmap bọc CSS component vào `@layer` - lúc đó ca phải được cập nhật.
8. Consumer `tsc-matrix`: 3 tsconfig, mỗi cái import mọi specifier trong `contract.json` và dùng ít
   nhất một named export. Chạy `tsc --noEmit`. Ghi kết quả từng `moduleResolution` riêng. Kỳ vọng
   `node` sẽ fail (khớp `attw` báo `node10: Resolution failed` 5/6) - đánh dấu `expectedFailure` kèm
   lý do, và quyết định có support TS cũ hay không để ở pha 06.
9. **Ca chứng minh lab bắt được** (theo pattern pha 01 tiêu chí 5-6): thêm tạm một rule vào CSS của
   library trong bản `.work/` gãy có chủ ý, ví dụ `h1 { color: red }`, pack lại, chạy ca 05 - phải
   bị bắt là rò rỉ mới. Gỡ ra thì lại sạch. Không có ca này thì không biết `css-probe` có thật sự
   nhìn thấy gì.

## Todo list

- [ ] `host-fixture.html` với 8 element/token theo bảng Architecture
- [ ] `css-probe.mjs` chụp trước/sau, trả bảng chênh
- [ ] Consumer `node-esm`, `node-cjs` + ca `renderToString`
- [ ] Ca `autoInjectStyles` dưới SSR
- [ ] Consumer `vite-react19` (build + preview + chromium)
- [ ] **Đo nguyên văn output `next build`** trước khi viết assertion
- [ ] Consumer `next-app-router`, 2 biến thể (có/không `'use client'` phía app)
- [ ] Consumer `tailwind-shadcn` + đo rò rỉ token
- [ ] Consumer `no-tailwind` + đo style thiếu
- [ ] Ca cascade layer override
- [ ] Consumer `tsc-matrix` 3 `moduleResolution`
- [ ] Ca chứng minh: thêm rule rò rỉ có chủ ý phải bị bắt

## Success Criteria

1. `node compatibility/run.mjs l2` exit 0 trên repo hiện tại, report liệt kê 7 consumer, không
   consumer nào `skipped`.
2. `node-esm` và `node-cjs`: `renderToString(<Ping />)` không throw, và chuỗi HTML trả về chứa
   `tinita-ping`. Cả hai chiều module đều pass.
3. `autoInjectStyles` gọi trong môi trường không có `document` không throw; report có finding ghi rõ
   không component nào gọi nó.
4. `vite-react19`: `vite build` exit 0; trang preview có `document.querySelectorAll('.tinita-filetree').length >= 1`;
   và tồn tại ít nhất một CSS rule có selector bắt đầu bằng `.tinita-`.
5. `next-app-router`: `next build` exit 0 ở biến thể được xác định là đúng. Report ghi **nguyên văn**
   output của biến thể fail (nếu có) và kết luận rõ ràng một trong hai: "library phải thêm
   `'use client'`" hoặc "consumer bọc là đủ", kèm bằng chứng là output thật.
6. `tailwind-shadcn`: bảng rò rỉ trong report có **ít nhất** các dòng cho `body.background-color`,
   `div[data-host].border-color`, và `:root --color-primary`. Mỗi dòng ghi giá trị trước và sau.
   Nếu bảng trống thì `css-probe` sai, không phải library sạch - tiêu chí 12 chặn việc đó.
7. `no-tailwind`: `getComputedStyle` của node `Ping` cho `display` **khác** `inline-flex`. Report
   ghi đây là finding "phụ thuộc ngầm vào Tailwind của host", không phải failure của lab.
8. Ca cascade layer: override trong `@layer host` **không** thắng CSS của `FileTree`. Report ghi
   hành vi này kèm ghi chú "sẽ đảo chiều sau mốc M1".
9. `tsc-matrix`: `moduleResolution: bundler` và `nodenext` exit 0. `node` exit khác 0 và được đánh
   dấu `expectedFailure` kèm số specifier fail (kỳ vọng 5/6 cho `tinita`, khớp `attw`).
10. Ca chứng minh ở bước 9: thêm `h1 { color: red }` vào CSS library bản `.work/` thì bảng rò rỉ có
    thêm dòng `h1.color`; gỡ ra thì dòng đó mất. Đây là tiêu chí chứng minh `css-probe` hoạt động.
11. Mọi consumer có `node_modules` chứa `tinita*` là **thư mục thật**, không symlink - xác minh bằng
    `lstat`, tái dùng assertion 2 và 5 của pha 01.
12. Tổng wall-clock của `run.mjs l2` được đo và ghi vào report; nếu vượt 3 phút thì pha 06 phải chia
    lại tier, vì tier 1 mục tiêu dưới 4 phút cho cả L0+L1+L2.

## Risk Assessment

| Rủi ro | Xác suất | Ảnh hưởng | Giảm thiểu |
| --- | --- | --- | --- |
| Lấy chuỗi lỗi Next từ báo cáo nghiên cứu (nguồn yếu) làm assertion, ca sai mà vẫn xanh | Cao nếu bỏ qua | Nghiêm trọng | Bước 4 bắt buộc đo nguyên văn trước; chỉ 2 chuỗi đã đo thật được dùng trực tiếp |
| `css-probe` không thấy gì và bảng rò rỉ trống, bị hiểu là library sạch | Trung bình | Nghiêm trọng | Tiêu chí 10 (ca chứng minh) là cửa chặn |
| Next/Vite version drift làm ca vỡ không liên quan tới library | Cao theo thời gian | Trung bình | Pin version chính xác trong từng consumer `package.json`; lỗi build framework trả exit 2 (hạ tầng) không phải exit 1 |
| Ca cascade layer sẽ đảo chiều khi M1 xong, người sau tưởng lab hỏng | Chắc chắn xảy ra | Trung bình | Tiêu chí 8 ghi rõ; ca mang comment trỏ tới M1 |
| Chromium local khác Chromium container, kết quả `getComputedStyle` lệch | Thấp cho computed style, Cao cho ảnh | Thấp ở pha này | Pha này KHÔNG chụp ảnh; ảnh và baseline để pha 05 trong container |
| `next build` chậm, kéo tier 1 vượt ngân sách | Cao | Trung bình | Nếu vượt, chuyển riêng ca Next sang tier 2, giữ Vite ở tier 1 - quyết ở pha 06 theo số đo tiêu chí 12 |

## Security Considerations

- Consumer chạy `next build` và `vite build` nên thực thi code của framework. Chỉ install version đã
  pin từ registry chính thức; không dùng nguồn khác.
- Chromium headless mở **duy nhất** `localhost` của preview/start server, không mở URL ngoài. Không
  truyền cờ tắt sandbox ở local (cờ `--no-sandbox` chỉ dùng trong container ở pha 05 nếu cần).
- `css-probe` chạy `page.evaluate`, tức thực thi JS trong trang. Chỉ đọc `getComputedStyle` và
  `document.styleSheets`, không gửi dữ liệu ra ngoài.
- Server preview/start phải bind `127.0.0.1`, không `0.0.0.0`, và phải được kill trong `finally` để
  không để cổng mở sau khi run kết thúc.
- Bản gãy có chủ ý ở bước 9 nằm trong `.work/` (gitignore) và không bao giờ được pack vào artifact dùng chung.

## Next steps

Pha 04 lấy đúng các consumer của pha này và chạy lại chúng trong Docker dưới nhiều Node và package
manager. Vì vậy consumer của pha này phải không phụ thuộc gì vào máy dev: không đường dẫn tuyệt đối,
không biến môi trường riêng, không version Node cố định trong `engines`.
