# Pha 05 - L4 Real-world: CSS leak, hydration, visual regression

## Context links

- Plan cha: [plan.md](./plan.md)
- Dependency: **pha 03** (consumer app + `css-probe.mjs`), **pha 04** (hạ tầng Docker)
- Context đã đo: [reports/00-verified-context.md](./reports/00-verified-context.md) mục "Bề mặt rò rỉ
  CSS" (bảng 11 dòng có file:dòng), mục "SSR - chưa từng kiểm"
- Research: [researcher-02-consumer-css-ssr.md](./research/researcher-02-consumer-css-ssr.md) -
  baseline PHẢI sinh trong container; `maxDiffPixelRatio` + `animations: 'disabled'`
- Docs: `docs/design-guidelines.md` mục 4, `docs/project-roadmap.md` mốc M1 (bịt rò rỉ CSS)

## Overview

- **Date:** 2026-09-25
- **Description:** Tầng nặng nhất. Production build + browser thật trong container: đo rò rỉ CSS
  bằng computed style, kiểm hydration trong Next, chụp visual regression với baseline sinh trong
  container. Đây là tầng duy nhất nhìn thấy được sự cố production mà owner đã gặp.
- **Priority:** P1 - không chạy mỗi commit; nhưng là tầng có giá trị cao nhất cho sự cố đã xảy ra
- **Implementation status:** Not started
- **Review status:** Not reviewed

## Key Insights

1. **Đây là tầng ứng với sự cố thật.** Owner đã deploy library vào web client và CSS xung đột. Mọi
   tầng trước chỉ suy ra từ source; tầng này là chỗ duy nhất tái hiện được tình huống đó với trang
   thật, cascade thật, và Chromium thật.
2. **Baseline ảnh PHẢI sinh trong container.** Font rendering và antialiasing của macOS khác Linux.
   Baseline sinh trên host rồi so trong container sẽ đỏ toàn bộ vì lý do không liên quan library.
   Quy tắc: không có đường nào sinh baseline ngoài container.
3. **Visual regression là chân yếu nhất, computed style là chân mạnh nhất.** Ảnh nói "có gì đổi";
   computed style nói "thuộc tính nào, trên element nào, từ giá trị nào sang giá trị nào". Khi cả hai
   đỏ, computed style là cái đọc được. Nên ảnh là bổ trợ, không phải chính.
4. **Hydration mismatch cần Next thật.** `renderToString` của pha 03 bắt được truy cập
   `window`/`document`, nhưng không bắt được server render khác client render. Next log cảnh báo
   hydration ở console của browser, nên phải đọc console message, không chỉ exit code của build.
5. **Bảng rò rỉ sẽ đảo chiều sau mốc M1.** Hiện 11 bề mặt rò rỉ là hành vi thật. Sau khi M1 bịt
   chúng, ca test phải đổi từ "ghi nhận rò rỉ" sang "xác nhận không rò rỉ". Thiết kế ca phải cho phép
   đảo chiều bằng cấu hình, không phải viết lại.
6. **`prefers-reduced-motion` là ca rẻ và đang có vấn đề rõ.** `animations.css:530-539` có
   `*, *::before, *::after { ... !important }` không scope. Playwright đặt được media này, nên ca
   kiểm "library có đè xử lý reduced-motion của consumer không" là một dòng cấu hình.

## Requirements

- Toàn pha chạy trong container Playwright chính thức, không chạy trên host.
- Baseline ảnh sinh và commit từ container; có lệnh riêng để sinh, không sinh tự động khi test fail.
- Ca rò rỉ CSS dùng `css-probe.mjs` của pha 03, chạy trên production build (không dev server).
- Ca hydration đọc console message của browser, không chỉ exit code.
- Trục React version (18 và 19) và CSS environment (Tailwind v4 / không Tailwind) được phủ ở pha này,
  vì pha 04 cố tình không phủ.
- Kết quả rò rỉ ghi dạng **bảng có thể đảo chiều**: mỗi bề mặt có `expected: 'leaks' | 'clean'` đọc
  từ cấu hình, để sau M1 chỉ đổi cấu hình.
- `run.mjs l4` exit 2 nếu Docker hoặc image Playwright không có, **không** exit 1.

## Architecture

```
compatibility/
├── docker/
│   └── playwright.Dockerfile     <- FROM mcr.microsoft.com/playwright:v<pinned>
└── cases/l4/
    ├── leak-surfaces.json        <- 11 bề mặt + expected: leaks|clean  (đảo chiều sau M1)
    ├── 01-css-leak.spec.ts       <- computed style, production build, Tailwind+shadcn host
    ├── 02-no-tailwind.spec.ts    <- host không Tailwind, đo style thiếu
    ├── 03-cascade-layer.spec.ts  <- consumer override trong @layer có thắng không
    ├── 04-hydration.spec.ts      <- Next prod, đọc console cảnh báo hydration
    ├── 05-reduced-motion.spec.ts <- prefers-reduced-motion, kiểm !important không scope
    ├── 06-visual.spec.ts         <- screenshot, baseline sinh trong container
    └── __screenshots__/          <- baseline, commit; sinh CHỈ trong container
```

`leak-surfaces.json` - mỗi dòng là một bề mặt trong bảng đã đo, có file:dòng làm chứng:

| id | Bề mặt | Đo trên | expected hiện tại |
| --- | --- | --- | --- |
| `reset-star` | `border-color` của `div[data-host]` | computed style | `leaks` |
| `reset-body` | `background-color`, `color` của `body` | computed style | `leaks` |
| `theme-tokens` | `--color-primary`, `--radius`, `--font-sans` trên `:root` | computed style | `leaks` |
| `unprefixed-animate` | `animation-name` của `.animate-fade-in` chủ nhà | computed style | `leaks` |
| `unprefixed-transition` | `transition-duration` của `.transition-fast` chủ nhà | computed style | `leaks` |
| `unprefixed-interactive` | `opacity` của `.interactive` chủ nhà | computed style | `leaks` |
| `dark-selector` | token đổi khi chủ nhà toggle `.dark` | computed style | `leaks` |
| `reduced-motion-important` | `animation-duration` của element chủ nhà khi bật reduced-motion | computed style | `leaks` |
| `component-star-boxsizing` | `box-sizing` của children chủ nhà trong `CarouselTicker` | computed style | `leaks` |
| `layerless-component-css` | override của consumer trong `@layer host` có thắng không | computed style | `leaks` |
| `raw-tailwind-in-jsx` | `display` của node `Ping` khi host không Tailwind | computed style | `leaks` |

## Related code files

| File | Vai trò |
| --- | --- |
| `packages/tinita-react/src/styles/globals.css` | 81-111 (token), 116-127 (reset) - nguồn 3 bề mặt đầu |
| `packages/tinita-react/src/styles/animations.css` | 114-318 (27 class), 530-539 (reduced-motion) |
| `packages/tinita-react/src/ui/file-tree/FileTree.css` | không `@layer`; 230,237 dùng `--radix-*` |
| `packages/tinita-react/src/ui/carousel-ticker/CarouselTicker.css` | 15-17, 20-25 (`*` + `!important`) |
| `packages/tinita-react/src/ui/ping/Ping.tsx` | 45-50 Tailwind thô |
| `apps/storybook/stories/FileTree/FileTree.*.stories.tsx` | 6 story a11y/rtl/nojs/themes - tham chiếu cho ca browser, KHÔNG chạy Storybook trong lab |
| `docs/project-roadmap.md` | mốc M1 - khi xong thì `leak-surfaces.json` đảo `expected` |

## Implementation Steps

1. `playwright.Dockerfile`: `FROM mcr.microsoft.com/playwright:v<pin>` với version pin chính xác.
   Không cài browser thêm - image đã có. Tái dùng layer của pha 04 nếu được để không build lại Node.
2. Viết `leak-surfaces.json` theo bảng trên. Mỗi entry: `{ id, selector, property, expected, evidence }`
   trong đó `evidence` là `file:dòng` từ bảng đã đo. Entry không có `evidence` thì không được thêm -
   buộc mọi bề mặt phải truy được về source.
3. Ca 01 rò rỉ CSS: dựng host Tailwind v4 + token shadcn với giá trị đặc trưng, `next build` hoặc
   `vite build` (production, không dev), serve, mở Chromium. Chụp computed style **trước** khi nạp
   `tinita-react/styles.css` và **sau**. So theo `leak-surfaces.json`: entry `expected: 'leaks'` phải
   thấy chênh; entry `expected: 'clean'` phải không chênh. Cả hai chiều đều assert - đó là cách ca
   đảo chiều được sau M1 mà không viết lại.
4. Ca 02 host không Tailwind: đo `display`, `background-color` của node `Ping`. Ghi finding "phụ
   thuộc ngầm vào Tailwind của host" kèm giá trị đo được.
5. Ca 03 cascade layer: consumer khai `@layer host { .tinita-filetree { border-color: <đặc trưng> } }`.
   Đo xem `border-color` cuối cùng là của consumer hay của library.
6. Ca 04 hydration: Next production build + start, mở trang có `FileTree`, **thu console message**
   của browser (`page.on('console')`) và `page.on('pageerror')`. **Đo nguyên văn trước khi viết
   assertion** - không dùng chuỗi từ báo cáo nghiên cứu. Assertion viết dạng "không có console
   message mức `error` nào chứa `hydrat`", chữ thường hoá trước khi so.
7. Ca 05 reduced-motion: `page.emulateMedia({ reducedMotion: 'reduce' })`, đo
   `animation-duration` của element **của chủ nhà** (không phải của library). Nếu nó bị đổi thành
   `0.01ms` thì khối `!important` không scope đang đè consumer - đúng như bảng đã đo.
8. Ca 06 visual: chụp `FileTree`, `CarouselTicker`, `Ping` ở 2 theme × 2 React version.
   `animations: 'disabled'`, `maxDiffPixelRatio` và `threshold` đặt tường minh trong config với
   comment giải thích con số. Baseline **chỉ** sinh qua lệnh riêng
   (`run.mjs l4 --update-snapshots`) và lệnh đó **phải** kiểm rằng nó đang chạy trong container,
   refuse nếu chạy trên host.
9. Trục React version: 2 consumer, React 18 và React 19, cùng bộ ca. Lý do phủ ở đây chứ không ở pha
   04: React version ảnh hưởng render và hydration, tức thuộc trục consumer, không thuộc trục môi trường.
10. **Ca chứng minh** (theo pattern pha 01): đổi một entry trong `leak-surfaces.json` từ `leaks` sang
    `clean` mà không sửa gì trong library. Ca 01 phải fail và nêu đúng entry đó. Đây là bằng chứng ca
    thật sự đọc cấu hình và thật sự đo, không pass cứng.
11. Đo wall-clock toàn pha; ghi vào report cho pha 06.

## Todo list

- [ ] `playwright.Dockerfile` pin version, tái dùng layer pha 04
- [ ] `leak-surfaces.json` 11 entry, mỗi entry có `evidence` là file:dòng
- [ ] Ca 01 rò rỉ CSS trên production build, assert cả hai chiều `leaks`/`clean`
- [ ] Ca 02 host không Tailwind
- [ ] Ca 03 cascade layer override
- [ ] **Đo nguyên văn console message của Next** trước khi viết assertion hydration
- [ ] Ca 04 hydration qua console message
- [ ] Ca 05 reduced-motion đo element của chủ nhà
- [ ] Ca 06 visual + guard "chỉ sinh baseline trong container"
- [ ] 2 consumer React 18 và 19
- [ ] Ca chứng minh: đổi `expected` phải làm ca fail
- [ ] Đo wall-clock

## Success Criteria

1. `node compatibility/run.mjs l4` khi không có image Playwright thì exit **2** và stderr nêu image,
   không nêu ca test.
2. Ca 01: report có bảng 11 bề mặt × `expected` × `thực tế` × giá trị trước/sau. Với repo hiện tại,
   **cả 11** dòng `expected: 'leaks'` đều `thực tế: leaks` -> ca exit 0. Bảng không được có dòng nào
   `thực tế: unknown`.
3. Ca 01 chạy trên **production build**: xác minh bằng cách kiểm không có process dev server nào, và
   HTML trả về không chứa dấu vết HMR.
4. Ca 05: bật `reducedMotion: 'reduce'` thì `animation-duration` của element **của chủ nhà** đo được
   là `0.01ms` - chứng minh khối `!important` không scope đang đè consumer. Đây là giá trị cụ thể lấy
   từ `animations.css:530-539`.
5. Ca 03: `border-color` cuối cùng của `.tinita-filetree` là giá trị của **library**, không phải của
   consumer, dù consumer khai trong `@layer host`. Report ghi kèm ghi chú "đảo chiều sau M1".
6. Ca 02: `display` của node `Ping` khác `inline-flex` khi host không Tailwind. Report ghi finding
   kèm giá trị thật đo được.
7. Ca 04: không có console message mức `error` chứa `hydrat` (sau khi chữ thường hoá) trên cả React
   18 và React 19. Nếu có, report ghi **nguyên văn** message.
8. Ca 06: `run.mjs l4 --update-snapshots` chạy **trên host** thì exit khác 0 với thông báo nêu rõ
   baseline chỉ được sinh trong container. Chạy trong container thì exit 0 và sinh file dưới
   `__screenshots__/`.
9. Ca 06 chạy 2 lần liên tiếp trong cùng container cho cùng kết quả (không flaky). Nếu lần 2 khác lần
   1 thì `maxDiffPixelRatio` chưa đủ hoặc animation chưa tắt - phải sửa trước khi coi pha này xong.
10. Ca chứng minh ở bước 10: đổi một entry `expected` từ `leaks` sang `clean` -> ca 01 exit khác 0 và
    nêu đúng `id` của entry đó. Đổi lại thì exit 0.
11. Mọi entry trong `leak-surfaces.json` có `evidence` không rỗng và `evidence` trỏ tới file thật tồn
    tại trong `packages/tinita-react/src/`. Thêm entry không có evidence thì `run.mjs l4` exit 2.
12. Wall-clock toàn pha được ghi ra số cụ thể; nếu vượt 45 phút thì pha 06 phải chia nhỏ tier 3.

## Risk Assessment

| Rủi ro | Xác suất | Ảnh hưởng | Giảm thiểu |
| --- | --- | --- | --- |
| Baseline sinh trên macOS rồi so trong Linux, đỏ toàn bộ vì font | Cao nếu không chặn | Nghiêm trọng | Tiêu chí 8: lệnh sinh baseline refuse khi không ở trong container |
| Visual regression flaky, người ta tắt luôn ca này | Cao | Cao | Tiêu chí 9 (chạy 2 lần cùng kết quả) là cửa chặn; `animations: 'disabled'` + mask vùng động |
| Ảnh trở thành chân chính, computed style bị coi nhẹ | Trung bình | Cao | Thiết kế: ca 01 (computed style) ở trước ca 06 (ảnh) và fail trước; ảnh là bổ trợ |
| Sau M1, 11 ca đỏ và người sau tưởng lab hỏng | Chắc chắn xảy ra | Cao | `leak-surfaces.json` với `expected` đảo được bằng cấu hình; tiêu chí 2 và 10 |
| `next build` + 2 React version + 2 theme làm pha này rất chậm | Cao | Trung bình | Toàn pha ở tier 3; nếu vượt ngân sách thì tách ca 06 (ảnh) thành tier riêng - quyết ở pha 06 |
| Chuỗi cảnh báo hydration của Next đổi giữa các version | Trung bình | Trung bình | Assertion dùng `hydrat` chữ thường hoá, không so cả câu; version Next pin |
| Entry `leak-surfaces.json` thêm bừa không truy được về source | Trung bình | Trung bình | Tiêu chí 11: `evidence` bắt buộc và phải trỏ file tồn tại |

## Security Considerations

- Container Playwright chạy Chromium. Chỉ mở `127.0.0.1` của server do lab tự dựng; không mở URL
  ngoài, không tải tài nguyên từ internet trong lúc test (font phải được nhúng hoặc fallback, không
  fetch từ Google Fonts - nếu consumer fixture cần font thì nhúng local).
- `--no-sandbox` chỉ dùng nếu image bắt buộc, và phải ghi lý do trong Dockerfile. Không dùng ở host.
- `page.evaluate` chạy JS trong trang: chỉ đọc `getComputedStyle`, `document.styleSheets`, console.
  Không ghi, không gửi ra ngoài.
- Baseline ảnh commit vào repo: xác minh ảnh không chứa dữ liệu thật nào (fixture dùng dữ liệu bịa,
  không dùng tên file/đường dẫn của máy dev trong nội dung `FileTree`).
- Server dựng trong container bind `127.0.0.1` và bị kill trong `finally`; container chạy
  `--network=none` không được vì cần localhost, nên dùng network mặc định nhưng không expose cổng ra host.
- `.gitignore` phải cho phép commit `__screenshots__/*.png` nhưng chặn `.work/` và output build của consumer.

## Next steps

Pha 06 lấy số đo wall-clock của pha 03, 04, 05 để điền bảng 3 tier, cập nhật docs, và trình 2 quyết
định cho owner. Pha 06 cũng là nơi ghi quy tắc "thêm export mới phải thêm ca L1" vào
`docs/code-standards.md` để lab không bị bỏ rơi.
