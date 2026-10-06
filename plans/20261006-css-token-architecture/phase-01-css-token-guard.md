# Phase 01 - Guard: token dùng trong CSS graph phải khai trong CSS graph

## Context links

- Plan cha: [`plan.md`](plan.md)
- Kiến trúc: [`architecture-plan.md`](architecture-plan.md) mục 7 (I6, I4, I8), D5
- Số đo: [`reports/00-measured-state.md`](reports/00-measured-state.md) mục 3, 4, 5
- Quy tắc repo: `CLAUDE.md` mục "Guard mới phải được chứng minh bằng cách phá
  đúng thứ nó canh"
- Phụ thuộc: không. Là phase đầu.

## Overview

- **Ngày** 2026-10-06
- **Mô tả** Thêm `scripts/check-css-tokens.mjs` kiểm I6 + I4 + I8, và ca L4
  `motion-present` đo hậu quả thật trong Chromium. **Cả hai phải ĐỎ** khi phase
  kết thúc.
- **Ưu tiên** Cao nhất. Không sửa được thứ chưa đo được.
- **Implementation status** **DONE** 2026-10-06, guard đỏ đúng chủ đích
- **Review status** Tự verify bằng hai lần phá; chưa có người review

## Key Insights

- Guard này đỏ **ngay trên code thật** là bằng chứng mạnh nhất có thể có rằng nó
  canh đúng thứ nó nói. Repo đã có **năm** lần ca xanh mà không kiểm thứ nó nói
  đang kiểm; đây là cách duy nhất đã dùng được để chặn.
- Script đọc **`dist`**, không đọc `src`: bridge dùng specifier bare giải qua
  `exports`, và `dist` là thứ consumer thật nhận.
- Một lần đọc graph trả lời được cả ba invariant, nên không cần script thứ hai.
- Ca L4 là ca **duy nhất** chứng minh hậu quả. Script chỉ chứng minh nguyên
  nhân. Hai cái mù khác chỗ nhau: script không biết browser làm gì với
  `var()` không giải được; L4 không biết token nằm ở file nào.

## Requirements

1. Script resolve `@import` của `dist/ui/<name>/index.css` qua `exports` của
   `package.json`, đệ quy, gom tập declaration và tập `var()` use.
2. Báo mọi `var(--tnt-*)` use không có declaration trong graph **và** không có
   fallback trong chính `var()`.
3. Kiểm I4: token khai trong `dist/ui/<name>/tokens.css` phải khớp
   `^--tnt-<name>(-|$)`. Nhánh `$` là bắt buộc: `ui/ping/tokens.css` khai
   `--tnt-ping` (light + dark), và luật thiếu nhánh đó bắt oan đúng 2 khai báo
   đó - đo 2026-10-06.
4. Kiểm I8: `dist/ui/*/index.css` không `@import` `styles.css`,
   `styles.layer.css`, `styles/globals.css`, `styles/animations.css`.
5. Ca L4 mount `Ping` nhập từ `tinita-react/ui/ping`, **không** import
   `styles.css`, đọc `getComputedStyle(el).animationDuration`.
6. Vào `pnpm gate` sau khi P2 làm nó xanh, **không** phải trong phase này.

## Architecture

```
scripts/check-css-tokens.mjs
  đọc packages/tinita-react/package.json  exports
  với mỗi ui/<name>:
    graph = resolve(dist/ui/<name>/index.css)      đệ quy @import
    decls = mọi `--tnt-x:` trong graph
    uses  = mọi `var(--tnt-x` trong graph, kèm cờ có-fallback
    đỏ nếu  use ∉ decls  và  không fallback
```

Script **không** chạy bundler: `@import` của CSS là quan hệ tĩnh, đọc text là
đủ. Đây là lý do nó rẻ và vào được `pnpm gate`.

## Related code files

| File                                                 | Vai trò                                     |
| ---------------------------------------------------- | ------------------------------------------- |
| `packages/tinita-react/scripts/check-css-tokens.mjs` | MỚI                                         |
| `packages/tinita-react/package.json`                 | `exports` là đầu vào của script             |
| `packages/tinita-react/dist/ui/*/index.css`          | graph cần resolve                           |
| `compatibility/cases/l4/index.mjs`                   | ca `motion-present`                         |
| `package.json` (root)                                | script `check-css-tokens` (chưa vào `gate`) |

## Implementation Steps

1. Viết `check-css-tokens.mjs`, in theo từng component: use thiếu declaration,
   token sai tiền tố, bridge import file cấm.
2. Chạy trên `dist` hiện tại. Kỳ vọng: **9 use thiếu** (8 token motion +
   `--tnt-carousel-min-block-size`), **2 component sai tiền tố**, **0 import
   cấm**.
3. Chứng minh script không mù: thêm tạm `var(--tnt-khong-ton-tai)` vào một
   `.module.css`, build, script phải báo thêm đúng 1 dòng. Gỡ ra.
4. Chứng minh phần tiền tố không mù: đổi tạm một token của `ping` thành
   `--tnt-pong-x`, script phải báo. Gỡ ra.
5. Thêm ca L4 `motion-present`.
6. Chạy L4, ghi lại `animationDuration` thật.

## Todo list

- [x] `check-css-tokens.mjs` resolve `@import` đệ quy qua `exports`
- [x] Phần I6, in từng use thiếu kèm file nguồn
- [x] Phần I4 tiền tố, luật `^--tnt-<name>(-|$)`, `--tnt-ping` KHÔNG bị bắt
- [x] Phần I8 import cấm, cộng đếm `@import` không giải được
- [x] Hai lần tự phá, kết quả ghi ở Success Criteria 4 và 5
- [x] Ca `motion-present` - đặt ở **L2**, không phải L4 (lý do ở SC6)
- [x] Helper `cases/l2/lib/preview.mjs`, khối `vite:render` cũ dùng lại nó thay
      vì nhân bản hai lần sửa bug đã trả giá (IPv6 bind, chờ-không-ngủ)
- [x] Script `check-css-tokens` trong `package.json` root, CHƯA vào `gate`
- [x] **I2 (ngoài plan, từ vòng adversarial)**: graph phải kéo
      `ui/<name>/styles.css` của chính component. Không có nó thì xoá hết
      `@import` khỏi một bridge cho graph rỗng -> 0 use -> guard XANH, trong khi
      component ship ra không có style nào. Đo bằng cách xoá `@import` khỏi
      `dist/ui/ping/index.css`: `I6` tụt **11 -> 10** (con số trông như đỡ hơn)
      và `I2` lên **1**, nêu tên `ping`

## Success Criteria

Hành vi quan sát được, giá trị cụ thể:

1. `node packages/tinita-react/scripts/check-css-tokens.mjs` exit **1**, và
   stdout kể tên **11** dòng use thiếu declaration - **ĐẠT**.

   Plan dự đoán 9 và dự đoán SAI: 9 là số _declaration site trong source_, còn
   guard đếm _token riêng biệt mỗi component_. Hai số cùng đúng về hai tập khác
   nhau: 7 cặp (token, file) riêng biệt, 11 dòng theo component vì graph của
   `file-tree` chứa `ui/tree/styles.css` nên 4 token của Tree bị đếm lại dưới
   `file-tree`. Số theo component là số dùng được: nó nói entrypoint nào hỏng.

2. Cùng lệnh đó kể tên đúng **2** component sai tiền tố - **ĐẠT**: `file-tree`
   20 token `--tnt-filetree-*`, `floating-window` 17 token `--tnt-fw-*`.
   `carousel-ticker` **không** vào danh sách này: nó chưa có `tokens.css` nên I4
   không có gì để soi, và `--tnt-carousel-min-block-size` bị I6 bắt ở dạng use
   thiếu declaration.
3. Cùng lệnh đó báo **0** bridge import file cấm - **ĐẠT**. Và **0** `@import`
   không giải được qua `exports`: một graph không resolve được chính nó sẽ XANH
   vì không thấy use nào, nên đây là cách guard tự tố mình.
4. Thêm `var(--tnt-khong-ton-tai)` vào `Ping.module.css` rồi build: I6 tăng từ
   11 lên **13** - **ĐẠT, và +2 chứ không +1**. Dòng thứ hai là hệ quả của lần
   phá kia: đổi `--tnt-ping-gap` sang `--tnt-pong-gap` làm
   `var(--tnt-ping-gap)` trong module CSS mất declaration. Guard bắt cả hai hệ
   quả của một lần rename, không chỉ cái đã nhắm. Gỡ ra thì về 11.
5. Đổi `--tnt-ping-gap` thành `--tnt-pong-gap`: số component sai tiền tố tăng
   từ 2 lên **3** - **ĐẠT**. Gỡ ra thì về 2. Hai lần phá chạy trong cùng một
   build vì chúng chạm hai counter độc lập.
6. Ca **L2** (không phải L4) `motion-present` **FAIL** - **ĐẠT**:

   ```
   FAIL  motion-present   position=absolute opacity=0.75 animationName=none
                          animationDuration=0s | CSS tới=true, token giải
                          được=false <- token nằm NGOÀI CSS graph của component
   ```

   Hai thay đổi so với plan, cả hai do đo mà ra:

   **Ca thuộc L2, không phải L4.** `app/layout.tsx` của L4 có
   `import 'tinita-react/styles.css'`, và trong Next App Router root layout áp
   cho MỌI route nên không route nào tránh được - L4 không thể host ca này.
   Thêm nữa, consumer vite của L2 (`vite:render`) cũng nhập `styles.css`. Tức
   **cả hai tầng browser duy nhất của repo đều che đúng lớp lỗi này**, đo
   2026-10-06. Ca mới dựng consumer riêng `vite-no-global-css` cố ý không nhập.

   **Hậu quả nặng hơn plan nói.** Plan viết `animation-duration` thành `0s`.
   Thực tế `animation` là SHORTHAND, nên `var()` không giải được làm invalid cả
   declaration và `animation-name` cũng về initial `none`: pulse **mất hẳn**,
   không phải chạy-với-0-giây.

   Và bản probe đầu của tôi SAI vì đọc `animationName` + `animationDuration` -
   hai giá trị do cùng một shorthand đặt nên chúng hỏng cùng nhau và không phân
   biệt được "CSS không tới" với "token không giải được". Phát hiện được vì
   `css-graph:ping` cùng lượt chạy PASS với 2396 byte CSS của Ping, trái hẳn
   với `CSS tới=false`. Tín hiệu thứ hai phải đến từ declaration KHÔNG qua
   token: `position: absolute` + `opacity: 0.75` trong cùng rule `.pulse`.

7. `pnpm gate` vẫn exit **0** - **ĐẠT** (`GATE_EXIT=0`, 9/9 PASS, l1 87.8s).
   Script có trong `package.json` dưới tên `check-css-tokens` nhưng **không**
   trong `scripts/gate.mjs`: P1 cố ý để guard đỏ, P2 mới đưa vào gate.

## Risk Assessment

| Rủi ro                                                                      | Giảm thiểu                                                                      |
| --------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| Script xanh vì resolve `@import` sai và thấy graph rỗng                     | Bước 3/4 tự phá; thêm assert "mỗi component phải resolve ra >= 3 file"          |
| Script coi `--tnt-fw-x` (JS set) là lỗi                                     | Có fallback trong `var()`, đo 6/6 đang có, nên luật "có fallback thì bỏ qua" đủ |
| Luật tiền tố bắt oan token mang đúng tên component                          | Nhánh `$`; đo được `--tnt-ping` x2 là ca thật, không phải giả thiết             |
| `--tnt-tree-content-height` khai local trong `.group`, không ở `tokens.css` | Script gom declaration từ **toàn bộ** graph kể cả `styles.css`, nên nó thấy     |
| Ca L4 fail vì chromium thiếu, không vì lỗi thật                             | L4 đã có cơ chế SKIP khi không có browser; phải phân biệt SKIP với FAIL         |
| L4 chưa có baseline `.png`                                                  | Ca này đọc `getComputedStyle`, không so ảnh, nên không cần baseline             |

## Security Considerations

Không. Script đọc file trong repo, không chạy code của consumer, không gọi
mạng. Ca L4 chạy trong container đã có.

## Next steps

`phase-02-close-token-holes.md` - sửa 9 lỗ, guard chuyển xanh, rồi mới đưa
script vào `pnpm gate`.

---

## Kết quả đo, 2026-10-06

```
$ node packages/tinita-react/scripts/check-css-tokens.mjs ; echo $?
I6 - var() thiếu declaration và thiếu fallback: 11
I4 - token sai tiền tố trong tokens.css của chính nó: 2 component
I8 - bridge import file global: 0
@import không giải được qua exports: 0
I2 - graph KHÔNG kéo CSS của chính component: 0
ĐỎ: 13 vấn đề
1

$ mv dist/ui /tmp && node .../check-css-tokens.mjs ; echo $?
check-css-tokens: không thấy dist/ui/*/index.css. Chạy `pnpm build` trước.
2

$ node compatibility/run.mjs l2 --tier=1 ; echo $?
FAIL  motion-present   position=absolute opacity=0.75 animationName=none
                       animationDuration=0s | CSS tới=true, token giải được=false
29 ca, 1 fail, 7 skip
1

$ pnpm gate ; echo $?
9/9 PASS (l1 87.8s)
0
```

File đã thêm hoặc sửa:

```
packages/tinita-react/scripts/check-css-tokens.mjs   MỚI, guard I6+I4+I8
compatibility/cases/l2/lib/preview.mjs               MỚI, helper preview+chromium
compatibility/cases/l2/index.mjs                     ca motion-present + dùng helper
package.json                                         script check-css-tokens
```
