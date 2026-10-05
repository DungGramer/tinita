# Làm tiếp sau khi viết lại floating-window

Chốt 2026-10-02, cập nhật 2026-10-05. Nhánh `feature/snap-corner`.

Owner đã chốt hai mục kể từ bản đầu: **Q3 mở hai hook thành subpath** và **N3 phím tắt
thành prop**. Hai dòng đó vẫn giữ trong bảng, gạch ngang kèm kết quả, để lần sau thấy
được câu hỏi đã được trả lời thế nào chứ không chỉ thấy nó biến mất.

Note này ghi thứ **chưa làm** và **lý do chưa làm**, kèm số đo để không phải đo lại.
Thứ đã làm nằm trong commit message của `b7fa25c` - đừng chép lại vào đây.

## Việc chỉ owner làm được

| #   | Việc                                                                                                                                                                                                                                                                                                                                                                 | Chặn bởi                                      |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------- |
| O1  | `npm login`, `pnpm publish` ba package `0.1.0`, `npm deprecate tinita@0.0.1` và `tinita-react@0.0.2`, rồi chạy lại L1 để `07-registry-vs-local` đổi XFAIL -> PASS                                                                                                                                                                                                    | `scripts/publish.mjs` dừng ở `npm whoami`     |
| O2  | **Baseline ảnh L4 chưa từng tồn tại.** Đo 2026-10-02: `compatibility/cases/l4/__screenshots__` có **0 file `.png`**, và cả 6 ca `shot:*` đều SKIP với lý do "chưa có baseline (sinh trong container trước)". Tức nửa visual-regression của L4 chưa bao giờ so sánh gì. Phải sinh **trong container** (`--update-snapshots`) để ảnh không mang font/DPI của máy owner | cần chạy trong container, không phải máy host |

## Quyết định cần owner chốt

| #      | Câu hỏi                                                                                                                                                                                                                                                                                                                           | Số đo đã có                                                                                                                                                                                          |
| ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Q1     | **L1/L2 có chạy React 18 không?** Package khai `>=18`, hai lab đó chỉ cài `react@19`. Chi phí: L1 +~100s **mỗi** `pnpm gate`; L2 nhân đôi phần chậm nhất (lần cuối 782s). Đây đúng loại đánh đổi owner đã tự chốt khi phân tier                                                                                                   | Nợ #20. Sàn 18 là sàn **cứng** (`useSyncExternalStore` ở `ui/tree/store.ts` + `hooks/useWindowSize.ts`). `FloatingWindow` đã có coverage 18 thật qua L4; các component khác cũng vậy. Thiếu là L1/L2 |
| Q2     | **Backfill `types` tách theo condition cho 8 subpath còn phẳng của `tinita-react`?** Trước đó phải trả lời: `CLAUDE.md` bất biến 3 nói "không tách thì `attw` báo `FalseCJS` toàn bộ subpath", mà điều đó **không tái lập được** - `attw` đang PASS với allowlist rỗng                                                            | Nợ #18. Đo 2026-10-02: 7 subpath tách, 8 phẳng, 4 CSS. Cả 4 entry `ui/*` đều phẳng                                                                                                                   |
| ~~Q3~~ | **ĐÃ CHỐT 2026-10-05: mở.** `useDragSnap` và `useWindowDrag` giờ là subpath `tinita-react/hooks/*`, mỗi cái một story, mỗi cái re-export kiểu mà signature của nó dùng. `geometry` KHÔNG thành subpath - hai hook đã re-export đủ, và `src/hooks/`/`src/utils/` bị quét phẳng nên đặt ở đó là tự sinh entry build-mà-không-export | Nợ #19 đã đóng                                                                                                                                                                                       |

## Việc nhỏ, làm được ngay, không chặn bởi ai

| #      | Việc                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | Vì sao chưa làm                                                                       |
| ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| N1     | L4 không import `tinita-react/ui/tree` - chỉ `ping`, `carousel-ticker`, `file-tree`, `floating-window`. **Nhưng KHÔNG phải `Tree` chưa được mount**: `FileTree.tsx:6` là `import { Tree } from '../tree'`, nên `Tree` đã chạy trong browser thật qua đường bắc cầu. Cái CHƯA đo là `Tree` dùng trực tiếp với `nodes` - API primitive của nó - khác hẳn đường đi qua bộ parse chuỗi của `FileTree`                                                                                 | Ngoài phạm vi nhánh này. Thêm vào cùng page với `FloatingWindow` thì gần như miễn phí |
| N2     | `FloatingWindow` chưa có ca `shot:` nào. Nó là `position: fixed` qua portal nên phải chụp **cả viewport**, không chụp theo `[data-shot]` như ba ca kia - khác cơ chế, cần quyết hình dạng ca trước                                                                                                                                                                                                                                                                                | Phụ thuộc O2: chưa có baseline nào thì thêm ca mới cũng chỉ SKIP                      |
| ~~N3~~ | **ĐÃ LÀM 2026-10-05, dưới dạng prop.** Owner chốt: bất kỳ phím hay tổ hợp nào, cho close/minimize/maximize, qua `keyBindings` - và **không mặc định phím nào**. Cú pháp dùng `tinita/converter/parseKeyCombination` nên không có parser thứ hai. Ba quyết định kèm lý do nằm trong `useKeyBindings.ts` và `CLAUDE.md`: listener trên `document` gated bởi `open && active`; phím in được không modifier bị bỏ qua khi focus ở field; dep của effect là `JSON.stringify(bindings)` | Không còn là việc mở                                                                  |
| N4     | Điều phối nhiều cửa sổ (z-order, active, slot bubble) giờ là việc của consumer. Logic nén rank z-index trong bản cũ là thật và đã đo (`order` thô làm z bão hoà), nó vẫn còn trong git ở `637220d` nếu cần gói lại thành một hook                                                                                                                                                                                                                                                 | Phạm vi đã chốt là một subpath                                                        |

## Thêm 2026-10-05 cùng phần tooltip phím tắt

| #   | Việc                                                                                                                                                                                                                                                                                                                                            | Trạng thái                  |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------- |
| N5  | **Bất biến "mọi module `tinita-dom` import sạch khi không có DOM" không có guard.** Ca SSR của L2 `skip` mọi package `browserOnly`, và cũng loại `tinita-react` ra. Vì vậy `formatKeyCombination.ts` phải trùng lặp một regex Mac thay vì dùng `isMacOS()` của `tinita-dom`. Cách bịt: ca import từng specifier trong node, chỉ đòi không throw | Nợ #21, mở                  |
| N6  | Tách `formatKeyCombination`/`pickForPlatform` sang `tinita` nếu có consumer thứ hai. Giờ đúng một, nên theo §19 giữ local - cùng lý do với phần so khớp event                                                                                                                                                                                   | Có chủ ý, không phải bỏ sót |

## Nợ cũ, không phải do nhánh này

Đọc `docs/project-roadmap.md` mục "Nợ kỹ thuật còn lại" - 20 dòng, các mục mở còn lại là
#7 (barrel `src/index.ts` trái quy tắc "NO barrel imports"), #9 (không CI/CD), #16
(`autoInjectStyles` là API chết về runtime), #17 (rò rỉ CSS, đã đo lại), #18-#20 ở trên.

Ba vấn đề lab treo vẫn treo, có chủ ý: `yarn-classic` network flake, `yarn-pnp`
chưa đi qua resolver PnP, tier 2 chưa đo lại sau khi có package thứ ba.
Chi tiết trong `compatibility/README.md`.

## Hai bài học của phiên này, đã viết vào CLAUDE.md

1. **`expectedFailure` biến ca đỏ thành XFAIL, và XFAIL không làm suite đỏ**
   (`compatibility/scripts/report.mjs:18` và `:25`). Chỉ dùng cho thứ đã biết hỏng và
   tạm chấp nhận. Một ca khẳng định "việc này PHẢI fail" thì encode vào `ok`.
2. **Một ca mong đợi fail phải khớp cả exit code LẪN lý do.** Chỉ đòi `exit != 0` là
   đang canh "có fail", và nó xanh y nguyên khi nguyên nhân đổi.

Và lần thứ năm của mẫu "ca xanh mà không kiểm thứ nó nói đang kiểm": `check-stories`
PASS vì nó đọc `exports`, mà component mới chưa khai subpath.
