# Design Guidelines - tinita-react

Cập nhật: 2026-09-24 (vòng 2) · commit 0a1dd88

Tài liệu này mô tả hệ design token, quy ước class, mô hình customization và contract
accessibility của `tinita-react`.

Quy ước đọc tài liệu:

- **[ĐANG CÓ]** - đã tồn tại trong source, xác minh được bằng file dẫn kèm.
- **[ĐỊNH HƯỚNG]** - target architecture do owner đặt ra, **chưa** có trong code.
- **[KHOẢNG CÁCH]** - chênh lệch giữa hai mục trên, cần đóng lại.

Nguyên tắc trung tâm **[ĐỊNH HƯỚNG]**: _Own the contract, borrow the machinery._ Tự sở hữu
100% design token, component API, visual language, composition, accessibility contract,
documentation. Mượn (không tự viết) ARIA implementation, focus management, keyboard
navigation, positioning, portal, dismissable layer.

Phạm vi hiện tại của package (v0.0.2-alpha.1): 3 UI component (`file-tree`, `ping`,
`carousel-ticker`), 2 hook (`useToggle`, `useIsomorphicLayoutEffect`).

Import path thật (không có `tinita-react/ui` hay `tinita-react/hooks` dạng barrel):

```ts
import { FileTree } from 'tinita-react/ui/file-tree';
import { Ping } from 'tinita-react/ui/ping';
import { CarouselTicker } from 'tinita-react/ui/carousel-ticker';
import { useToggle } from 'tinita-react/hooks/useToggle';
import 'tinita-react/styles.css'; // bundle đầy đủ
import 'tinita-react/styles/globals.css'; // chỉ token + theme
import 'tinita-react/styles/animations.css'; // chỉ motion
```

---

## 1. Design token **[ĐANG CÓ]**

Toàn bộ token là CSS variable prefix `--tnt-`. Nguồn: `packages/tinita-react/src/styles/globals.css`
và `packages/tinita-react/src/styles/animations.css`.

### 1.1 Color - `globals.css`

Khai báo ở `:root` (light) và override ở `.dark, [data-theme='dark']`.

| Token                          | Light                 | Dark                        |
| ------------------------------ | --------------------- | --------------------------- |
| `--tnt-background`             | `#ffffff`             | `#0a0a0a`                   |
| `--tnt-foreground`             | `#1a1a1a`             | `#e5e7eb`                   |
| `--tnt-primary`                | `#2563eb`             | `#60a5fa`                   |
| `--tnt-primary-foreground`     | `#ffffff`             | `#0a0a0a`                   |
| `--tnt-secondary`              | `#f3f4f6`             | `#1f1f1f`                   |
| `--tnt-secondary-foreground`   | `#1a1a1a`             | `#e5e7eb`                   |
| `--tnt-muted`                  | `#6b7280`             | `#9ca3af`                   |
| `--tnt-muted-foreground`       | `#ffffff`             | `#0a0a0a`                   |
| `--tnt-accent`                 | `rgba(0, 0, 0, 0.06)` | `rgba(255, 255, 255, 0.06)` |
| `--tnt-accent-foreground`      | `#1a1a1a`             | `#e5e7eb`                   |
| `--tnt-destructive`            | `#dc2626`             | `#f87171`                   |
| `--tnt-destructive-foreground` | `#ffffff`             | `#0a0a0a`                   |
| `--tnt-border`                 | `#e5e7eb`             | `#374151`                   |
| `--tnt-input`                  | `#ffffff`             | `#1f1f1f`                   |
| `--tnt-ring`                   | `#2563eb`             | `#60a5fa`                   |
| `--tnt-ping`                   | `oklch(55.6% 0 0)`    | `oklch(70.8% 0 0)`          |

`color-scheme: light` / `color-scheme: dark` được set cùng block.

### 1.2 Radius, spacing, typography - `globals.css`

- Radius: `--tnt-radius: 0.5rem`, `--tnt-radius-sm: 0.25rem`,
  `--tnt-radius-md: 0.375rem`, `--tnt-radius-lg: 0.5rem`
- Spacing: `--tnt-spacing-tree-indent: 16px`
- Font: `--tnt-font-sans` (system-ui stack), `--tnt-font-mono`
  (`'Consolas', 'Monaco', 'Courier New', monospace`)

### 1.3 Motion - `animations.css`

Header file mô tả bộ này bám "Apple iOS animation standards". Xác minh trong file: có đủ bộ
duration thang 100-400ms, 4 preset spring physics, 6 easing curve, scale value theo ngữ cảnh,
và timing thích ứng theo ngữ cảnh tương tác - đúng cấu trúc của bộ motion kiểu iOS. Tuy nhiên
**các spring parameter hiện chưa được tiêu thụ bởi bất kỳ CSS rule nào trong file**; chúng là
token dành cho JS animation engine đọc ra. Các easing cubic-bezier là xấp xỉ, không phải spring
thật.

| Duration                 | Giá trị | Ngữ cảnh (theo comment trong file) |
| ------------------------ | ------- | ---------------------------------- |
| `--tnt-duration-instant` | `100ms` | Button press, touch feedback       |
| `--tnt-duration-fast`    | `200ms` | Quick UI updates, toggles          |
| `--tnt-duration-base`    | `300ms` | Standard interactions              |
| `--tnt-duration-medium`  | `350ms` | Sheet, navigation, modals          |
| `--tnt-duration-slow`    | `400ms` | Page transitions, first-time       |

Duration thích ứng theo ngữ cảnh: `--tnt-duration-first-time` (`400ms`),
`--tnt-duration-repeated` (`200ms`), `--tnt-duration-destructive` (`400ms`),
`--tnt-duration-feedback` (`100ms`).

| Easing                  | Giá trị                             |
| ----------------------- | ----------------------------------- |
| `--tnt-ease-standard`   | `cubic-bezier(0.4, 0.0, 0.2, 1)`    |
| `--tnt-ease-decelerate` | `cubic-bezier(0.0, 0.0, 0.2, 1)`    |
| `--tnt-ease-accelerate` | `cubic-bezier(0.4, 0.0, 1, 1)`      |
| `--tnt-ease-sharp`      | `cubic-bezier(0.4, 0.0, 0.6, 1)`    |
| `--tnt-ease-spring`     | `cubic-bezier(0.36, 0.66, 0.04, 1)` |
| `--tnt-ease-bounce`     | `cubic-bezier(0.34, 1.56, 0.64, 1)` |

Spring physics - 4 preset `--tnt-spring-{standard,interactive,smooth,bounce}-{damping,stiffness,mass}`,
lần lượt damping/stiffness/mass: standard `0.85` / `200` / `1.0`, interactive `0.7` / `170` / `1.0`,
smooth `0.95` / `220` / `1.0`, bounce `0.6` / `180` / `1.0`.

Scale `--tnt-scale-*`: `button-press` `0.96`, `button-release` `1.0`, `card-lift` `1.02`,
`modal-enter` `0.95`, `alert-enter` `1.15` (overshoot), `popover-enter` `0.9`, `sheet-drag` `0.98`.

Opacity `--tnt-opacity-*`: `full` `1.0`, `press` `0.8`, `disabled` `0.4`,
`placeholder` `0.5`, `hidden` `0`.

Transform `--tnt-translate-*`: `parallax` `-30%`, `sheet` `100%`, `slide` `20px`.

Backdrop (frosted glass), 3 cấp - mỗi cấp có `blur` + màu nền `light` / `dark`:
standard (`blur 20px`, `saturate 180%`), heavy (`blur 40px`, `saturate 200%`),
overlay (`blur 4px`, không saturate). Biến: `--tnt-backdrop-{blur,saturate,light,dark}-{standard,heavy,overlay}`.

### 1.4 Cầu nối token sang Tailwind

`globals.css` có block `@theme inline` map `--tnt-*` sang tên Tailwind semantic:
`--color-{background,foreground,primary,primary-foreground,secondary,secondary-foreground,muted,muted-foreground,accent,accent-foreground,destructive,destructive-foreground,border,input,ring}`,
`--radius`, `--radius-{sm,md,lg}`, `--spacing-tree-indent`, `--font-sans`, `--font-mono`.
Đây là lớp duy nhất trong package biết tới Tailwind; CSS component không biết.

---

## 2. Quy ước đặt tên class **[ĐANG CÓ]**

Prefix `tnt-` cho mọi class, đặt tên theo BEM-like. Ví dụ thật từ
`src/ui/file-tree/FileTree.css`:

```
.tnt-filetree                                        /* block    */
.tnt-filetree__{list,item,label,label-text,icon,arrow}          /* element  */
.tnt-filetree__accordion-{item,trigger,content}
.tnt-filetree__label--{folder,file}                             /* modifier */
```

Block gốc của các component còn lại: `.tnt-ping`, `.tnt-carousel-ticker` (và
`.tnt-carousel-ticker__fade` dùng trong JSX nhưng chưa có rule trong
`CarouselTicker.css`). `ping/` không có file CSS - xem mục 4.

**Variant không dùng class modifier mà dùng `data-*` attribute trên block gốc.** Đây là lựa
chọn thật trong code, không phải BEM thuần:

```
[data-size='sm' | 'md' | 'lg']
[data-border-radius='sm' | 'md' | 'lg']
[data-indicator='true' | 'false']
[data-show-arrow='true' | 'false']
[data-animation='true' | 'false']
[data-theme='dark']
[data-icon='markdown' | 'javascript' | 'css' | ...]
[data-level='0']
```

Ưu điểm: không nổ tổ hợp class, selector đọc ra đúng prop, và consumer override bằng attribute
selector không cần đấu specificity với class dài.

Class utility trong `animations.css` nằm ngoài quy ước BEM. **Chưa prefix:** 8 class
`.transition-{smooth,spring,modal,fade,slide,instant,fast,slow}`, `.interactive`, và 16 class
`.animate-{fade-in,fade-out,sheet-up,sheet-down,alert-in,alert-out,modal-in,modal-out,popover-in,popover-out,push-in,push-out,pop-in,pop-out,slide-up,slide-down,slide-left,slide-right}`.
**Đã prefix:** `.tnt-btn`, `.tnt-card`, `.tnt-backdrop`, `.tnt-backdrop-heavy`,
`.tnt-backdrop-overlay`. Tên keyframes đã prefix đủ (`tnt-fade-in`, `tnt-modal-in`, ...)
trừ `accordion-down` / `accordion-up` trong `FileTree.css`.

**[KHOẢNG CÁCH]** `.transition-*`, `.animate-*`, `.interactive` là tên rất dễ đụng với app host.
Cần đổi sang `tnt-transition-*` / `tnt-animate-*` trước khi lên bản stable.

---

## 3. Ba mức customization

### Level 1 - override CSS variable (đủ cho ~90% consumer) **[ĐANG CÓ]**

Không chạm component, không chạm class. Ghi đè biến ở scope bạn muốn.

```css
/* app.css của consumer */
:root {
  --tnt-primary: #7c3aed;
  --tnt-radius: 0.75rem;
}

/* hoặc chỉ riêng một component */
.tnt-filetree {
  --tnt-filetree-bg: #fdf6e3;
  --tnt-filetree-hover: rgba(0, 0, 0, 0.08);
  --tnt-filetree-indent: 24px;
  --tnt-filetree-icon-markdown: #b58900;
}
```

`FileTree` phơi ra bộ biến riêng ngoài token toàn cục: `--tnt-filetree-{bg,text,text-dim,hover,active,spacing,indent}`,
cộng 20 biến màu icon `--tnt-filetree-icon-{folder,file,readme,markdown,javascript,css,html,json,database,php,vue,git,text,code,font,image,video,audio,spreadsheet,archive}`.
Mỗi biến icon dùng fallback `var(--tnt-filetree-icon-x, var(--tnt-filetree-text-dim))`,
nên bỏ trống vẫn ra màu hợp lý.

### Level 2 - variant prop + `className` **[ĐANG CÓ]**

`FileTree` props (nguồn: `src/ui/file-tree/README.md`):

```tsx
<FileTree
  text={tree}
  theme="dark" // 'dark' | 'light'      default 'light'
  size="lg" // 'sm' | 'md' | 'lg'    default 'md'   (density)
  borderRadius="sm" // 'sm' | 'md' | 'lg'    default 'md'
  indicator // boolean               default true
  showArrow // boolean               default false
  enableAnimation // boolean               default true
  hideRootName // boolean               default false
  className="my-tree"
/>
```

`size` chỉ đổi padding (density), `borderRadius` tách riêng - hai trục độc lập, không gộp
thành một preset.

### Level 3 - full override **[ĐANG CÓ]**

Qua `className` + attribute selector của block gốc:

```css
.my-tree.tnt-filetree {
  font-family: 'IBM Plex Mono', monospace;
}
.my-tree[data-size='lg'] .tnt-filetree__accordion-trigger {
  padding-block: 12px;
}
```

### Dấu hiệu architecture SAI

Consumer phải leo thang specificity để override: `.my-app .tnt-button`, rồi
`.tnt-button.tnt-button`, rồi `!important`. Nếu chuỗi đó xuất hiện trong codebase
consumer thì library đã hết customizable - đó là bug của library, không phải của consumer.
Thang đo đúng: Level 1 phải giải quyết được đổi màu, bo góc, khoảng cách, font; chỉ khi cần đổi
_cấu trúc_ mới phải xuống Level 3.

---

## 4. Cô lập CSS - bảng kiểm rò rỉ **[NỢ ĐÃ BIẾT]**

Owner đã từng deploy library này vào web của client và **CSS global + Tailwind của library xung
đột với CSS của client**. Đây là sự cố production đã xảy ra, không phải rủi ro giả định. Vì vậy
cô lập CSS là ràng buộc cứng của package, ngang hàng với accessibility, và là mục trung tâm của
tài liệu này.

Toàn bộ mục 4 mô tả **hiện trạng**, trong đó phần lớn là nợ chưa trả. Quy tắc phải tuân theo từ
nay nằm ở mục 5.

### 4.1 Bảng kiểm rò rỉ - ĐO TRÊN ARTIFACT, không suy từ source

**Bảng trước đây SAI và đã được thay (2026-09-25).** Nó suy từ source. Nay đo trên `dist/styles.css`
trong Chromium thật: `node compatibility/run.mjs l2 --no-pack`, ca `css-leak:unlayered` và
`css-leak:layered`.

#### Điều quan trọng nhất: thắng/thua do THỨ TỰ KHAI LAYER

| Consumer                                                                     | Kết quả            | Vì sao                                                                          |
| ---------------------------------------------------------------------------- | ------------------ | ------------------------------------------------------------------------------- |
| **Không** khai `@layer` order                                                | **Library thắng**  | `@layer base` của library khai SAU layer của consumer                           |
| Khai `@layer theme, base, components, utilities` trước (Tailwind v4 làm vậy) | **Consumer thắng** | `@layer base` của library map vào layer `base` đã khai, sort trước `components` |

Consumer tự bảo vệ được bằng **một dòng** khai layer order. Đây là điều nên nói với người dùng
trước mọi thứ khác.

#### Rò rỉ THẬT (consumer có khai layer order)

| Bề mặt                            | Trước -> Sau                              | Nguồn                                           |
| --------------------------------- | ----------------------------------------- | ----------------------------------------------- |
| `body` background                 | `rgb(10,20,30)` -> `rgb(255,255,255)`     | `globals.css:121-126` -> dist `@layer base`     |
| `body` color                      | `rgb(40,50,60)` -> `rgb(26,26,26)`        | `globals.css:121-126`                           |
| `.animate-fade-in` bị **chiếm**   | `hostFade` -> `tnt-fade-in`               | `animations.css:243` -> dist `@layer utilities` |
| `.transition-fast`                | `777ms` -> `200ms`                        | `animations.css:156` -> `dist:114`              |
| `Ping` khi host không có Tailwind | `display: block`, đúng phải `inline-flex` | `Ping.tsx:45-50`                                |

#### KHÔNG rò rỉ như từng nghĩ - kèm lý do đo được

| Từng khẳng định                                       | Thực tế                                                                                                                                         |
| ----------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| 22 token `@theme inline` đè token consumer            | **Không ship.** `grep -c -- '--color-primary' dist/styles.css` = 0. Khối `@theme inline` chỉ tồn tại trong source để map sang utility lúc build |
| `* { border-color }` đè mọi element                   | Thua `div[data-host]` về specificity khi **cùng layer** (`*` = 0,0,0)                                                                           |
| `.interactive` đè `opacity`                           | `dist:171` là `.interactive:hover, .interactive:focus-visible`, chỉ set `will-change` - không đụng `opacity` ở trạng thái tĩnh                  |
| `.tnt-carousel-ticker *` ép `box-sizing` lên children | Inline style của consumer thắng mọi stylesheet                                                                                                  |

#### Đã đo thêm 2026-09-26

`*, *::before, *::after { animation: none; transition: none; !important }` trong
`animations.css:538-546` **có** đè element của chủ nhà: đặt `animation 5s/spin + transition 5s`,
nhận về `0s/none + 0s`. Ca L4 `reduced-motion-scope` đo liên tục, giao cho M1 scope lại.

#### Chưa đo - vẫn là rủi ro

`.dark` không prefix · `var(--radix-accordion-content-height)` trong keyframes public
(`FileTree.css:230,237`) · `tailwind.config.cjs` thiếu `prefix`/`important`/`corePlugins.preflight`
· `src/styles/index.css` mồ côi có `@import "tailwindcss"` · `autoInjectStyles` append cuối
`document.head`. Pha 05 của plan phủ nhóm này.

_Probe được chứng minh:_ ca `css-probe-proof` chèn rule có chủ ý và phải đo được thay đổi, nên bảng
rò rỉ trống sẽ fail chứ không bị đọc thành "library sạch".

### 4.2 Những gì ĐANG ĐẠT

Không phải tất cả đều là nợ. Bốn thứ sau đã đúng và phải giữ:

- **Preflight chính chủ không ship.** `src/styles/build-entry.css` chỉ có hai dòng
  `@import "./globals.css"` và `@import "./animations.css"`; không mắt xích nào
  `@import "tailwindcss"`. Đây là nội dung commit 0a1dd88 ("build ignore import tailwildCSS").
- **Token gốc của library đều prefix `--tnt-`** (mục 1), và `dist/styles.css` chứa 278 token
  `--tnt-*`. Block `@theme inline` là lớp _ánh xạ_ sang tên Tailwind và **không được emit vào
  bundle** - đo được: 0 match cho `--color-primary` trong dist.
- **Class CSS của component đều prefix `tnt-`** và theo BEM-like (mục 2). Keyframes cũng đã
  prefix, trừ `accordion-down` / `accordion-up`.
- **`globals.css` dùng `@layer base`, `animations.css` dùng `@layer utilities`.** Chỉ CSS
  component là còn ngoài layer.

### 4.3 `autoInjectStyles` là API chết, không phải cơ chế đang chạy

**Không component nào gọi nó.** grep chỉ ra đúng 2 hit: định nghĩa trong
`src/utils/autoInjectStyles.ts` và re-export ở `src/index.ts:11`. Hàm có SSR guard (dòng 12) và
chống trùng theo id (dòng 17), nhưng về runtime nó không tham gia vào bất kỳ component nào.

Mọi mô tả coi `autoInjectStyles` là "cơ chế inject CSS đang hoạt động" đều **sai**. Cách nạp CSS
thật hôm nay là consumer tự `import 'tinita-react/styles.css'`. Nếu sau này quyết định dùng nó
thật thì phải xử hai khiếm khuyết ở bảng 4.1 trước (chèn cuối `<head>`, không gỡ khi unmount).

### 4.5 `className` escape hatch - **ĐẠT**

Cả ba component đều nhận `className` và merge lên block gốc: `FileTree`, `Ping`
(`` `tnt-ping ${className}` ``), `CarouselTicker` (qua helper `cn()`).

### 4.6 Semantic variant - **ĐẠT MỘT PHẦN**

`FileTree` đã có `size` / `borderRadius` / `theme` dưới dạng prop, biểu diễn bằng `data-*`.
Nhưng chưa có trục `variant` semantic (primary / secondary / destructive) vì chưa có component
nào cần tới - token màu semantic (`--tnt-primary`, `--tnt-destructive`, ...) đã sẵn sàng
nhưng **chưa component nào tiêu thụ**.

### Shadow DOM - quyết định: KHÔNG dùng **[ĐỊNH HƯỚNG]**

Isolation mạnh nhất nhưng phá theming (CSS variable không xuyên qua tự nhiên), phá portal và
overlay, phá SSR, phá a11y tooling, và giết luôn khả năng customization ở Level 3. CSS layers +
prefix + scoped token + không Preflight là điểm cân bằng tốt hơn cho một library muốn được
override.

### Tailwind là implementation detail **[ĐỊNH HƯỚNG]**

Public API = variant props + token + `className`. Không bao giờ bắt consumer viết
`className="tnt-bg-primary tnt-px-4"`. Tailwind không phải design-system contract.

---

## 5. Accessibility & interaction contract

### 5.1 Bar chất lượng hiện tại **[ĐANG CÓ]**

Storybook (`apps/storybook/stories/`) là nơi bar này được kiểm. Bộ story `FileTree` gồm 6 file,
trong đó 4 file là contract a11y/interaction:

- `FileTree.accessibility.stories.tsx` (`UI/FileTree/Accessibility`) - `KeyboardNavigation` có
  `play` function thật: lấy folder qua `canvas.getByRole('button', { name: /src/i })`, test Tab,
  test Enter/Space expand/collapse. Còn `ARIACompliance`, `ScreenReaderFriendly`, `HighContrast`,
  `FocusIndicators`.
- `FileTree.rtl.stories.tsx` (`UI/FileTree/RTL`) - render trong `<div dir="rtl">` và `dir="ltr"`,
  có `RTLComparison` đặt cạnh nhau và `RTLWithDarkTheme`.
- `FileTree.nojs.stories.tsx` (`UI/FileTree/No-JS`) - `NoJavaScript`, `StaticTree`,
  `CSSOnlyStyling` chạy với arg `noJS: true`: cây vẫn đọc được và vẫn có style khi JS không chạy.
- `FileTree.themes.stories.tsx` (`UI/FileTree/Themes`) - `LightTheme`, `DarkTheme`,
  `ThemeComparison`. Doc của story khẳng định mọi tổ hợp màu đạt WCAG AA contrast ratio.

Còn `FileTree.responsive.stories.tsx`, `FileTree.stories.tsx`, `Animations/Animations.stories.tsx`,
`CarouselTicker/CarouselTicker.stories.tsx`, `Ping/Ping.stories.tsx`.

_Lưu ý trung thực:_ các story ngoài `KeyboardNavigation` là visual/manual check, không có
assertion tự động. Chúng đặt ra bar, chưa gác được bar.

### 5.2 Reduced motion **[ĐANG CÓ]**

Quy tắc: **tắt hẳn**. Không `0.01ms`, không giữ lại fade ngắn. Lý do đầy đủ và hai cửa chặn trong
lab ở `docs/code-standards.md` mục "Quy Tắc Reduced Motion". Tóm lại: với `0.01ms` animation vẫn
chạy nên `animationend`/`transitionend` vẫn fire, sinh lỗi thứ tự chỉ xuất hiện trên máy người bật
reduced-motion. Owner đã gặp thật.

Bốn lớp, tất cả đều tồn tại trong source:

1. `animations.css:538-546` - `@media (prefers-reduced-motion: reduce)` đặt `animation: none`,
   `transition: none`, `scroll-behavior: auto`, tất cả `!important`. Selector vẫn là
   `*, *::before, *::after` nên nó đè cả element của chủ nhà - rò rỉ đã đo được, giao cho M1.
2. `FileTree.css:511-531` - `transition: none` cho `__arrow`, `__accordion-trigger`, `__label` và
   `animation: none !important` cho accordion content.
3. `CarouselTicker.css:19-32` - `animation: none` / `transition: none` cho mọi con trong block.
   Khối này chỉ với tới CSS animation của children do người dùng truyền vào.
4. `CarouselTicker.tsx` - hook `usePrefersReducedMotion` + `pinContentAtStart`. **Đây mới là chỗ
   tắt được marquee.** Marquee chạy bằng Web Animations API nên lớp 3 không với tới nó; ghim
   content ở frame đầu để pattern thật (không `aria-hidden`) nằm trong viewport thay vì các clone
   dẫn đường. Nghe event `change` nên đổi setting hệ thống là dừng/chạy lại ngay, không cần reload.

### 5.3 Định hướng primitive **[ĐỊNH HƯỚNG]**

Mượn primitive headless cho ARIA, focus management, keyboard navigation, positioning, portal,
dismissable layer. Lựa chọn cho 2026: **Base UI** (`@base-ui/react`, headless, MIT). Radix vẫn
ổn cho code sẵn có; React Aria khi a11y + i18n là ưu tiên cực cao.

Bắt buộc bọc sau **anti-corruption layer**: consumer viết
`import { Dialog } from 'tinita-react'` và không được biết Base UI tồn tại. Đổi Base UI sang
React Aria sau này không được đổi public API.

**[KHOẢNG CÁCH]** `FileTree` hiện `import` thẳng `@radix-ui/react-accordion`. CSS lộ rõ dấu
vết: class `.tnt-filetree__accordion-trigger` / `__accordion-content`, selector
`[data-state='open']` / `[data-state='closed']`, và keyframes dùng
`var(--radix-accordion-content-height)`. Biến `--radix-*` là API nội bộ của Radix nằm lọt vào
CSS của chúng ta - đổi vendor sẽ vỡ animation. Đây là món nợ kiến trúc cần trả trước khi thêm
component thứ tư.

Contract cho component mới nằm ở mục 7 (nhóm "A11y & interaction").

---

## 6. Theming & dark mode **[ĐANG CÓ]**

Cơ chế thật hôm nay: **class/attribute trên ancestor, không dùng media query.** `globals.css`
override token trong `.dark, [data-theme='dark']` - hai selector song song: `.dark` (quy ước
Tailwind, khuyến nghị dùng) và `[data-theme='dark']` (tương thích ngược). Vì không dùng
`@media (prefers-color-scheme: dark)`, consumer phải tự gắn class - bù lại theme toggle thủ công
hoạt động ngay, không cần chống chọi với media query.

`FileTree` hỗ trợ thêm một bậc scope nữa, ba selector cùng lúc:

```css
.dark .tnt-filetree,          /* theme toàn app  */
.tnt-filetree[data-theme='dark'],  /* prop theme="dark" trên chính component */
[data-theme='dark'] .tnt-filetree  /* theme trên ancestor bất kỳ */
```

Nghĩa là `<FileTree theme="dark" />` để dark một cây riêng lẻ giữa app sáng vẫn hoạt động.

Cách consumer override theme:

```css
/* đổi palette dark riêng, không đụng light */
.dark {
  --tnt-primary: #a78bfa;
  --tnt-background: #111827;
}
```

**[ĐỊNH HƯỚNG]** thêm scope `[data-tinita]` (mục 4.3) và cho phép nhiều theme cùng trang.

---

## 7. Checklist review component UI mới

Kiến trúc & file:

- [ ] Theo Component Colocation: `ComponentName.tsx` chứa logic, `index.tsx` chỉ re-export.
- [ ] Có subpath export trong `package.json` + entry trong `tsup.config.ts`.
- [ ] CSS ở file riêng cùng thư mục, không CSS-in-JS, không bundle CSS vào JS.
- [ ] Không `import` thẳng primitive của vendor từ component công khai - phải qua wrapper.

Token & class:

- [ ] Mọi giá trị đổi được là CSS variable `--tnt-*`, không hard-code màu / radius / spacing.
- [ ] Class prefix `tnt-`, BEM-like, block gốc `.tnt-<component>`.
- [ ] Variant biểu diễn bằng `data-*` trên block gốc, không nổ tổ hợp class.
- [ ] Không thêm selector `*`, `body`, `html` hay tag selector trần.
- [ ] Không thêm class utility chưa prefix vào `animations.css`.

API:

- [ ] Nhận và merge `className`.
- [ ] Prop variant/size có default hợp lý, không bắt consumer truyền mới chạy được.
- [ ] Public API không lộ tên vendor (`radix`, `baseui`) ra type hay CSS variable.

A11y & interaction:

- [ ] Keyboard: mọi thứ click được đều Tab tới được, Enter/Space kích hoạt, Escape đóng.
- [ ] Focus ring nhìn thấy được; focus restoration khi đóng overlay.
- [ ] Role và accessible name đúng, test được bằng `getByRole`.
- [ ] Có block `@media (prefers-reduced-motion: reduce)` riêng của component, không phó mặc
      reset toàn cục trong `animations.css`. Tắt hẳn (`animation: none`), KHÔNG `0.01ms`.
- [ ] Animation không do CSS điều khiển (Web Animations API, `requestAnimationFrame`, smooth
      scroll tự viết) phải tự tắt ở JS qua `matchMedia` - CSS không với tới nó.
- [ ] RTL không vỡ: dùng logical property (`padding-inline-start`) thay `left` / `right`.
- [ ] No-JS: nội dung vẫn đọc được, không phải màn trắng.
- [ ] Contrast light + dark đạt WCAG 2.1 AA (4.5:1 text thường, 3:1 text lớn).
- [ ] Touch target tối thiểu 44x44px trên mobile.
- [ ] SSR-safe: không chạm `window` / `document` ngoài effect.

Tài liệu:

- [ ] `README.md` trong thư mục component: props table, ví dụ, bảng CSS variable.
- [ ] Story cho: default, các variant, dark theme, a11y (có `play` function nếu có tương tác).
- [ ] Token mới được thêm vào mục 1 của tài liệu này.

---

## Liên quan

- [Code standards](./code-standards.md)
- [System architecture](./system-architecture.md)
- [Naming guidelines](./naming-guidelines.md)
- [Project roadmap](./project-roadmap.md)
