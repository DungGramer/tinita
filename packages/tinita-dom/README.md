# tinita-dom

Tiện ích DOM framework-agnostic. **Browser-only** - xem mục dưới.

Zero dependency. Zero peer dependency. Không cần React.

## Cài

```bash
npm install tinita-dom
```

## Browser-only, và đó là có chủ ý

Package này chạm `document`, `window.matchMedia`, `requestAnimationFrame`, `getComputedStyle`.
**Không có SSR guard**, và đó là quyết định chứ không phải sơ suất: `installSmoothScroll` cài
listener trên `document`: trên server không có gì để cài, nên gọi nó ở đó là lỗi của người gọi.

Thêm guard im lặng sẽ biến một lỗi rõ ràng thành "sao smooth scroll không hoạt động". Gọi nó trong
`useEffect`, hoặc sau khi biết chắc đang ở browser.

## `installSmoothScroll`

Một listener `wheel` cho toàn app, nên scroller không phải tự xin smoothing.

```ts
import { installSmoothScroll } from 'tinita-dom/smooth-scroll';

// Gọi MỘT LẦN, ngoài React. Đây là việc ở tầng document, không component nào sở hữu nó, và
// effect bị gọi hai lần của StrictMode sẽ cài nó hai lần.
const uninstall = installSmoothScroll();

// Khi cần gỡ (test, hot reload):
uninstall();
```

Hai hành vi, và chúng là hai thứ riêng:

1. **Wheel có detent được làm mượt (eased)** trên đúng element mà browser vốn sẽ scroll. Cùng
   element, cùng khoảng cách, cùng điểm kết thúc.
2. **Wheel dọc trên element chỉ scroll được NGANG thì scroll nó ngang.** Browser không làm việc này,
   và `Shift+wheel` là câu trả lời mà phần lớn người dùng không nghĩ tới.

Input vốn đã mượt (Mos, SmoothScroll, Mac Mouse Fix, hoặc trackpad) được để nguyên cho browser ở
trường hợp 1 - làm mượt lần hai trên cái đã mượt chính là thứ khiến trang có cảm giác trễ so với tay.

### Nó cố ý KHÔNG đụng vào

- Wheel mà handler bên trong đã nhận (kiểm bằng `defaultPrevented`). Listener nằm ở `document` pha
  **bubble**, không phải capture, nên wheel-to-zoom hay scroll-zoom của map chạy trước và nó nhường.
- `Ctrl+wheel` - đó là zoom của browser.
- Wheel đã có `deltaX` - trackpad quét ngang thì vốn đã scroll ngang.
- Subtree có `data-no-smooth-scroll` - đường opt-out tường minh.
- Người đã bật `prefers-reduced-motion`.

## `wheel-source`

Phân loại nguồn wheel từ chuỗi event, không phải từ việc dò xem có app nào đang cài.

```ts
import { classifyWheelSource, WHEEL_SAMPLE_COUNT } from 'tinita-dom/wheel-source';
```

Đây là subpath công khai chứ không phải chi tiết nội bộ: nó zero-dep, và các hằng số trong đó
(`WHEEL_STEP_MIN_PIXELS`, `WHEEL_REPEAT_SHARE`...) là số đã đo, có ghi ngày trong comment. Đổi chúng
là breaking change.

## Đường nhập

```ts
import { installSmoothScroll } from 'tinita-dom/smooth-scroll';   // khuyến nghị
import { classifyWheelSource } from 'tinita-dom/wheel-source';    // khuyến nghị
import { installSmoothScroll } from 'tinita-dom';                 // barrel, kéo cả 2 module
```

## Nguồn gốc

Port từ `apps/iva-service/web/src/lib/` của deepstream-v2, nơi nó chạy thật. Các comment chứa số đo
và ngày được giữ nguyên - chúng không tái tạo được.
