# Architecture Plan: CSS / Token của `tinita-react`

Ngày 2026-10-06. Mọi số trong tài liệu này đo trên commit `f73de05`, chi tiết ở
[`reports/00-measured-state.md`](reports/00-measured-state.md). Không có số nào
suy ra từ prompt.

Bối cảnh cần nói trước: **phần lớn kiến trúc trong yêu cầu đã được implement và
commit ngày 2026-10-05** (4 commit `5a4dae4..f73de05`). Nên tài liệu này không
phải thiết kế từ đầu, nó là: đánh giá cái đang có, chỉ ra **một lỗi đúng chức
năng** mà cái đang có đang mắc, và chốt những quyết định còn mở.

---

## 1. Current Architecture Assessment

### 1.1 Cái đã đạt

| Yêu cầu                                             | Trạng thái | Bằng chứng                                                                                            |
| --------------------------------------------------- | ---------- | ----------------------------------------------------------------------------------------------------- |
| 1. Import component không cần import CSS            | ĐẠT        | `ui/<c>/index.ts` có `import 'tinita-react/ui/<c>/index.css'`; ca L2 `css-graph:*` dựng vite thật     |
| 2. Tree-shake theo component                        | ĐẠT        | `css-graph:ping` có CSS Ping, không có FileTree; `css-graph:file-tree` có Tree, không có Ping         |
| 2b. Dedupe shared                                   | ĐẠT        | `css-graph:ping-plus-file-tree` `sharedTokenCount: 1`; `tree-plus-file-tree` `.tnt-tree-item{` x1     |
| 3. Giữ CSS Modules                                  | ĐẠT        | 5/5 component `import styles from './<Tên>.module.css'`, `generateScopedName: 'tnt-[folder]-[local]'` |
| 4. `styles.css` vẫn là import tay ở root app        | ĐẠT        | `exports['./styles.css']`, không bridge nào kéo nó                                                    |
| 6. `styles.css` vs `styles.layer.css` tách riêng    | ĐẠT        | `writeLayeredCSS()` sinh bản thứ hai từ cùng nguồn                                                    |
| 8. Dependency FileTree -> Tree tường minh           | ĐẠT        | `ui/file-tree/index.css` `@import` cả `tree/tokens.css` và `tree/styles.css`                          |
| 10. `ui/*` CSS-aware, `hooks/*`+`utils/*` Node-safe | ĐẠT        | `contract.json` có `cssAwareSpecifiers`; L1 `03-smoke` lọc theo trường đó                             |
| 10b. Không conditional `node` export                | ĐẠT        | Đã thử và loại, đo: condition có -> 0 byte CSS trên Server Component, bỏ ra -> 2424 byte              |

### 1.2 Cái CHƯA đạt, và một lỗi thật

**L1 - Component CSS tham chiếu token nằm ngoài CSS graph của chính nó.** Đây là
lỗi, không phải thiếu sót thiết kế. 8 declaration trong 3 component dùng token
**chỉ** khai trong `styles/animations.css`, mà không bridge nào `@import` file
đó:

```
Tree.module.css:93    transition: rotate var(--tnt-duration-fast) var(--tnt-ease-standard)
Tree.module.css:199   --tnt-tree-collapse-ease: var(--tnt-ease-in-out)
Tree.module.css:348   opacity: var(--tnt-opacity-disabled)
Ping.module.css:47    animation: pulse var(--tnt-duration-slow) ...
FloatingWindow.module.css:59,154,238,242   transition: ... var(--tnt-duration-fast) ...
```

Đo trên artifact: `dist/ui/tree/styles.css` dùng `var(--tnt-duration-fast)` x1,
khai x0; cả `dist/styles/tokens.css` và `dist/ui/tree/tokens.css` khai x0; chỗ
duy nhất khai là `dist/styles.css`. Không cái nào có fallback.

Theo spec CSS, `var()` không giải được làm declaration **invalid at
computed-value time**, property nhận giá trị initial. Hậu quả suy ra từ spec,
**chưa đo trong browser**: Ping mất animation `pulse`, Tree mất transition mũi
tên và row disabled hiện `opacity: 1`, và `transition: height 220ms
var(--tnt-tree-collapse-ease)` cũng invalid nên `transition-duration` thành
`0s`, đúng điều kiện làm `getAnimationType` của Base UI kết luận không có
animation (mục Base UI trong `CLAUDE.md`).

Đường `styles.css` không bị, vì nó khai đủ 5 token. **Lỗ chỉ nằm trên đường
per-component, tức đúng đường vừa mở.** Nguyên nhân gốc: comment trong bridge
nói "0/18 keyframes của `animations.css` được component tham chiếu" - đúng, tôi
đã đo _keyframes_ và kết luận cho cả _token_. `animations.css` khai 56 token,
5 trong số đó được component dùng.

**L2 - `--tnt-carousel-min-block-size` không khai ở đâu cả.** Hỏng trên **cả
hai** đường. Có từ trước thay đổi vừa rồi.

**L3 - Token component là 91/91 literal, 0 `var()`.** Consumer đổi
`--tnt-primary` thì không component nào đổi. Palette semantic đang chỉ để trang
trí: `--tnt-tree-bg: #ffffff` bằng đúng `--tnt-background`;
`--tnt-tree-selected-bg: rgb(37 99 235 / 0.12)` là `--tnt-primary` ở 12%, đóng
băng bằng tay.

**L4 - 14/37 token chung chỉ `globals.css` dùng**, không component nào. Chúng
chỉ phục vụ khối `@theme inline` của Tailwind, nhưng mọi bridge vẫn kéo cả 37.

**L5 - Tiền tố token lệch tiền tố class ở 3/5 component**: class
`tnt-file-tree-*` nhưng token `--tnt-filetree-*`; class
`tnt-floating-window-*` nhưng token `--tnt-fw-*`; class `tnt-carousel-ticker-*`
nhưng token `--tnt-carousel-*`.

**L6 - 7 subpath thiếu condition `types`** trong `exports` (nợ #18).

**L7 - `carousel-ticker` không có `tokens.css`**, nên bridge của nó chỉ có 2
`@import` thay vì 3.

---

## 2. Architectural Decisions

### D1. Component entry kéo CSS bằng import TƯỜNG MINH trong source

**Decision** `ui/<name>/index.ts` chứa một dòng `import
'tinita-react/ui/<name>/index.css'` viết tay. Build chỉ compile và giữ nguyên
specifier.

**Why** Source graph bằng published graph, nên `grep` trên source trả lời đúng
câu hỏi mà consumer thực sự gặp. Đã ship, đang xanh.

**Alternatives considered** (a) build script chèn import vào output sau khi
build; (b) `cssCodeSplit` của vite tự chèn.

**Why rejected** (a) làm `Ping.ts` khác `Ping.ts + generated import`, debug lệch
và declaration tooling sinh edge case; (b) đo được vite 7.2.6 library mode
**emit** CSS theo component nhưng **không chèn import vào JS**: 5 entry, 0
import. Nên (b) không tồn tại như một lựa chọn.

**Invariant it protects** I1 (JS import graph -> CSS import graph).

### D2. Specifier trong bridge phải BARE, đi qua `exports` của chính package

**Decision** `@import 'tinita-react/ui/ping/styles.css'`, không phải
`@import './styles.css'`.

**Why** Rollup viết lại specifier external **tương đối** và viết sai: đo
2026-10-05, `./index.css` ra `../../ping/index.css`. Specifier bare thì nó để
nguyên.

**Alternatives considered** Đường tương đối cộng `output.paths` để rebase.

**Why rejected** `output.paths` rebase theo output root nên nó là một lớp bù trừ
phải bảo trì song song với mọi đổi cấu trúc thư mục, để giải đúng vấn đề mà
specifier bare giải bằng không dòng config.

**Invariant it protects** I2 (mọi CSS subpath trong bridge giải được qua
`exports`).

### D3. `index.css` là side-effect entry, KHÔNG phải nơi chứa style

**Decision** `index.css` chỉ chứa `@import`, không chứa rule nào.

**Why** Nó là bản khai dependency. Một rule nằm trong đó sẽ là style không
thuộc CSS Module nào và không có `tnt-` scope từ `generateScopedName`.

**Alternatives considered** Gộp `tokens.css` + `styles.css` vào thẳng
`index.css`.

**Why rejected** Mất khả năng để consumer nhập riêng token mà không nhập rule,
và mất cạnh `file-tree -> tree/tokens.css` ở dạng đọc được.

**Invariant it protects** I3 (0 selector trong `ui/*/index.css`).

### D4. Token có ba tầng, và chỗ đặt quyết định bằng một quy tắc máy kiểm được

**Decision** Ba tầng, xem mục 4. Quy tắc: token nào được **CSS của >= 2
component** tham chiếu, hoặc là thứ consumer đổi để retheme toàn bộ library, thì
thuộc `styles/tokens.css`. Token chỉ có nghĩa trong một component thì thuộc
`ui/<name>/tokens.css` và **phải** khớp `^--tnt-<name>(-|$)` - nhánh `$` cho
phép token mang đúng tên component, như `--tnt-ping`; viết luật thiếu nhánh đó
thì guard bắt oan 2 khai báo của Ping và người đọc sẽ rename vô cớ. Hằng số chỉ
dùng một lần và không phải quyết định design thì viết thẳng trong `.module.css`,
không thành token.

**Why** Hôm nay quy tắc này không tồn tại, và kết quả đo được là
`--tnt-spacing-tree-indent` (token của Tree) nằm trong file chung, trùng giá trị
với `--tnt-tree-indent` của chính Tree.

**Alternatives considered** Để tác giả component tự quyết theo cảm nhận.

**Why rejected** Đã thử, và đó là cách `--tnt-spacing-tree-indent` ra đời.

**Invariant it protects** I4 (tiền tố token = tên folder), I5 (0 token chung
không ai dùng).

### D5. Năm token motion vào `styles/motion-tokens.css`, file riêng

**ĐÃ SỬA 2026-10-06 sau khi implement.** Bản đầu là "chuyển sang
`styles/tokens.css`", và nó loại "file thứ ba" vì đó là "abstraction thêm cho một
vấn đề mà file sẵn có giải được". Số đo cho thấy file sẵn có **không** giải được.

**Decision** `--tnt-duration-fast`, `--tnt-duration-slow`, `--tnt-ease-standard`,
`--tnt-ease-in-out`, `--tnt-opacity-disabled` vào `styles/motion-tokens.css`, một
subpath công khai mới. `animations.css` `@import './motion-tokens.css'`, và 4
bridge cần chúng (`tree`, `ping`, `floating-window`, `file-tree`) `@import
'tinita-react/styles/motion-tokens.css'`. 51 token còn lại ở `animations.css` vì
chúng chỉ phục vụ 18 `@keyframes` mà không component nào dùng.

**Why** Ba ràng buộc cùng lúc, chỉ file riêng thoả cả ba:

1. Bridge của component cần 5 token này. Import `animations.css` là trả 56 token
   - 18 keyframes cho 5 cái thật cần.
2. **16 rule của chính `animations.css` dùng 5 token này** - đo 2026-10-06. Nên
   nó không thể chỉ nhường chúng đi.
3. `docs/design-guidelines.md` ghi `tinita-react/styles/animations.css` là đường
   nhập công khai ("chỉ motion"), nên nó phải **tự đủ**.

Đặt vào `styles/tokens.css` thì `animations.css` phải `@import` lại, mà
`globals.css` cũng import `tokens.css` và `build-entry.css` nạp cả hai, nên
postcss inline `tokens.css` **hai lần**: `dist/styles.css` nhảy từ 190 lên
**230** khai báo, `--tnt-duration-fast` khai **x2**. Bỏ `@import` để tránh trùng
thì ràng buộc 3 vỡ.

Ranh giới mới khớp hợp đồng đã ghi tài liệu: `globals.css` là "token + theme"
(màu, radius, font), `animations.css` là "chỉ motion". Token motion thuộc nhóm
sau, nên tách ra là **làm rõ** ranh giới sẵn có chứ không thêm một tầng.

**Alternatives considered** (a) bridge `@import` cả `animations.css`; (b) đặt vào
`styles/tokens.css` và `animations.css` import lại; (c) đặt vào
`styles/tokens.css` và `animations.css` KHÔNG import lại; (d) thêm fallback vào
từng `var()`; (e) chuyển cả 13 token duration+ease.

**Why rejected** (a) 56 token + 18 keyframes cho 5 cái cần; (b) double-inline, đo
230 vs 190 khai báo; (c) phá `tinita-react/styles/animations.css` dùng độc lập,
một đường nhập có tài liệu; (d) nhân bản giá trị ra 16 chỗ trong `animations.css`
cộng 8 chỗ trong component - lần sau sửa `200ms` là sửa 25 chỗ; (e) 8 token thêm
vào mọi component để phòng trường hợp chưa xảy ra, mà guard I6 báo đỏ đúng lúc
nó xảy ra.

**Invariant it protects** I6, và I5: `styles/tokens.css` giữ nguyên vai trò "màu

- radius + font" chứ không thành sọt chứa mọi token shared.

### D6. Token component DẪN XUẤT từ token semantic bằng `var()`, trừ màu nhận dạng

**Decision** Token màu của component tham chiếu palette semantic:
`--tnt-tree-bg: var(--tnt-background)`,
`--tnt-tree-selected-bg: color-mix(in oklab, var(--tnt-primary) 12%, transparent)`.
**Ngoại lệ**: 38/40 token icon của FileTree giữ literal.

**Why** Hôm nay 91/91 là literal, nên `--tnt-primary` là token công khai mà đổi
nó không đổi gì - đó không phải design system, đó là một bảng màu để đọc. Ngoại
lệ có lý do: `--tnt-filetree-icon-javascript: #eab308` là màu **nhận dạng loại
file**, dữ liệu chứ không phải quyết định design; dẫn xuất nó từ
`--tnt-primary` làm mọi icon đổi màu khi consumer đổi màu thương hiệu. Hai cái
trung tính thì dẫn xuất được: `--tnt-filetree-icon-file: #6b7280` bằng đúng
`--tnt-muted`.

**Alternatives considered** (a) giữ literal, tài liệu hoá rằng muốn retheme thì
đổi token component; (b) bỏ palette semantic, chỉ giữ token component.

**Why rejected** (a) consumer phải biết 91 tên token để đổi một màu; (b) bỏ
palette là bỏ luôn ý nghĩa của `styles.css` như design-system foundation, và
`@theme inline` mất nguồn.

**Invariant it protects** I7 (đổi một token semantic làm đổi rendered value của
component dẫn xuất nó).

### D7. `styles.css` và `styles.layer.css` giữ riêng, cả hai vẫn là import tay

**Decision** Không gộp, không auto-load.

**Why** Chúng phục vụ **mức trừu tượng khác**: người dùng design system, không
phải người dùng component. Và chính chúng giữ được lựa chọn layer / không layer
mà auto-load xoá mất: nếu bridge tự kéo một trong hai thì consumer không còn
quyền chọn cascade layer.

**Alternatives considered** Gộp thành một file có `@layer` tuỳ chọn.

**Why rejected** CSS không có cách để consumer bật/tắt `@layer` của một file đã
publish. Hai file là cách Mantine làm, và nó là cách duy nhất không cần build
step ở phía consumer.

**Invariant it protects** I8 (không bridge nào import `styles.css`,
`styles.layer.css`, `globals.css`).

### D8. `ui/*` và root là CSS-aware; chỉ `hooks/*` và `utils/*` là Node-safe

**Decision** Hợp đồng Node-safe thu về `hooks/*` + `utils/*`. Root barrel
re-export component nên **không** Node-safe.

**Why** `ui/*` có side effect CSS, mà `node` trần không load được `.css`. Root
re-export `./ui/file-tree` nên nó thừa hưởng.

**Alternatives considered** (a) conditional `node` export bỏ CSS; (b) giữ root
Node-safe bằng cách bỏ component khỏi barrel.

**Why rejected** (a) đo ma trận 5 môi trường: Next App Router resolve condition
`node` khi compile server, và client graph **thừa hưởng** cạnh CSS từ server
graph, nên bỏ CSS ở nhánh `node` làm Server Component mất CSS hoàn toàn - 0 byte,
đối chứng bỏ condition ra thì 2424 byte; (b) đổi public API để bảo toàn một
thuộc tính mà subpath đã cho sẵn.

**Invariant it protects** I9 (`cssAwareSpecifiers` của `contract.json` khớp đúng
tập subpath có side effect CSS).

### D9. KHÔNG encode `ERR_UNKNOWN_FILE_EXTENSION` vào test

**Decision** Ca lab đọc `cssAwareSpecifiers` từ `contract.json` và **bỏ qua**,
không khẳng định Node ném lỗi gì.

**Why** Thông điệp đó là chi tiết loader của Node hôm nay. Hợp đồng của package
là "subpath này cần bundler hiểu CSS", không phải "Node ném chuỗi X".

**Alternatives considered** Khẳng định đúng mã lỗi để ca có nội dung.

**Why rejected** Node thêm CSS module loader là ca đỏ, trong khi package không
đổi gì.

**Invariant it protects** I9.

### D10. Hai version `tinita-react` cùng cây = UNSUPPORTED, và không thêm machinery

**Decision** Coi như React: tài liệu hoá là không support, không thêm runtime
warning, không version token, không versioned class name.

**Why** Đã đo hành vi thật, không suy đoán. App vite thật, `0.1.1` top-level +
`0.1.0` lồng dưới `wrapper-lib`, bản lồng đánh dấu đè cùng property:

```
.tnt-ping-root định nghĩa x3, theo thứ tự trong bundle:
  offset  5717  {align-items:center;display:inline-flex}   0.1.1
  offset 12316  {align-items:center;display:inline-flex}   0.1.0 lồng
  offset 13199  {display:block;outline:3px solid magenta}  0.1.0 lồng, đánh dấu
```

Specificity bằng nhau nên cái cuối thắng: **bản cũ thắng cho cả component của
bản mới**. Khi hai bản CSS giống nhau thì bundler gộp còn x1; khác nhau thì giữ
cả hai và chỉ cộng delta (77 byte, đúng hai dòng thêm vào).

Ba lý do không thêm gì: (i) đây là lớp "multiple instances" mà React,
`styled-components` và mọi CSS library đều khai là unsupported, không phải đặc
thù của repo này; (ii) `npm ls tinita-react` trả lời câu hỏi này trong một lệnh,
rẻ hơn mọi guard; (iii) owner đã ra quy tắc "treat any new process as guilty
until it moves a number", và không có số nào cho thấy guard này ngăn được một
sự cố thật.

**Alternatives considered** (a) version token trong `:root` để F12 thấy ngay;
(b) `console.warn` lúc dev kiểu React; (c) hash class theo version.

**Why rejected** (a) không sửa xung đột, chỉ làm nó đọc được, và nó thêm một
declaration vào mọi trang để phục vụ một ca unsupported; (b) thêm global side
effect vào package phải sống qua SSR, và phải import được từ mọi component
entry; (c) owner đã loại hash tên ngày 2026-09-26 vì nó lấy mất khả năng
override bằng CSS của người dùng - đó là lý do mạnh hơn.

**Invariant it protects** Không. Đây là quyết định **không** thêm invariant, và
nó cần nói rõ như vậy.

### D11. CSS Modules với tên LOCAL, không hash

**Decision** `generateScopedName: 'tnt-[folder]-[local]'`,
`localsConvention: 'camelCaseOnly'`.

**Why** Vừa có namespace tự động (bug trùng `@keyframes accordion-down` của
shadcn là lý do gốc), vừa giữ `tnt-ping-root` đọc được và override được bằng
CSS thường.

**Alternatives considered** (a) hash; (b) global selector viết tay.

**Why rejected** (a) consumer không override được tên sinh ra; (b) mất guard tự
động chống trùng tên, mà đó là thứ CSS Modules đang trả về.

**Invariant it protects** I10 (0 `.module.css` lọt ra `dist` dưới dạng
`.module.css`; mọi class ship ra mang tiền tố `tnt-`).

### D12. KHÔNG rename `--tnt-background` thành `--tnt-color-background`

**Decision** Giữ tên token semantic hiện tại.

**Why** Tên token là **public API** - consumer override chúng. Rename không sửa
failure mode nào trong mục 1.2. Tiền tố `--tnt-` đã làm hết việc namespace mà
`-color-` định làm.

**Alternatives considered** Rename theo gợi ý trong yêu cầu, gộp vào một release
breaking.

**Why rejected** Không có lý do từ dependency graph, cascade, packaging hay hành
vi consumer - đúng loại thay đổi mà chính yêu cầu nói không được tự thêm. Nếu
owner muốn vì lý do thẩm mỹ thì **lúc này là lúc rẻ nhất** (`0.1.0` chưa
publish), nhưng đó là quyết định của owner chứ không phải kết luận của plan.

**Invariant it protects** Không.

### D13. Tiền tố token component phải bằng tên folder

**Decision** `ui/file-tree/tokens.css` khai `--tnt-file-tree-*` (21 tên, 40 khai báo);
`ui/floating-window/tokens.css` khai `--tnt-floating-window-*` (23 tên, kể cả
biến runtime khai local); `ui/carousel-ticker/tokens.css` sinh ra ở P2 đã đúng tiền tố.

**Why** Đây là điều kiện để I4 kiểm được bằng máy, và nó khớp tiền tố class mà
`generateScopedName` đã sinh (`tnt-file-tree-root`). Hôm nay 2/4 file `tokens.css` lệch, nên quy
tắc nào cũng cần một lần đồng bộ.

**Alternatives considered** (a) giữ nguyên và cho guard một bảng alias; (b) bỏ
guard.

**Why rejected** (a) bảng alias là chỗ để thêm ngoại lệ mới mãi mãi, tức guard
hết tác dụng sau vài lần; (b) bỏ guard thì `--tnt-spacing-tree-indent` lặp lại.

**Phạm vi** 43 tên riêng biệt trên 10 file, 136 dòng, gồm cả biến runtime `--tnt-fw-x/y/width/height/scale-x/scale-y`
dù chúng là tầng 3 và guard I4 không đọc tới: giữ hai tiền tố trong một
component là mời người sau "sửa cho nhất quán", đúng loại churn D13 sinh ra để
chặn. Owner chốt LÀM 2026-10-06.

**Rủi ro** Rename token là breaking cho consumer đang override. Hiện `0.1.0`
**chưa publish**, nên chi phí là 0 nếu làm trước lần publish đầu. Sau đó thì
không - nên P4 là **điều kiện chặn** của lần publish đầu.

**Invariant it protects** I4.

### D14. `carousel-ticker` phải có `tokens.css`

**Decision** Thêm `ui/carousel-ticker/tokens.css` khai
`--tnt-carousel-ticker-min-block-size`, thêm `@import` vào bridge và subpath vào
`exports`.

**Why** `CarouselTicker.module.css` đang dùng `var(--tnt-carousel-min-block-size)`
không fallback, và token đó không khai ở đâu cả - kể cả trong `dist/styles.css`.
Component này hỏng trên cả hai đường nhập.

**Alternatives considered** (a) xoá dòng dùng token; (b) thêm fallback inline.

**Why rejected** Giá trị đúng là **`100px`** và nó không phải phán quyết: commit
`0037f8f` chuyển Tailwind trong JSX thành CSS thật, tokenize đúng dòng
`isVertical && 'h-full min-h-[100px]'` thành
`min-block-size: var(--tnt-carousel-min-block-size)`, rồi quên khai token. Nên
xoá dòng là bỏ một quyết định đã có, và thêm fallback là nhân bản nó. Rule tồn
tại vì ticker dọc đặt `block-size: 100%`, mà `100%` trong parent `auto` giải về
`auto`, nên cửa sổ cuộn co về chiều cao nội dung và marquee hết thứ để cuộn.

**Invariant it protects** I6.

---

## 3. Target CSS Architecture

### 3.1 Cấu trúc

Giữ đúng cấu trúc đang có, thêm `tokens.css` cho `carousel-ticker`:

```
src/styles/
  tokens.css          token shared: màu + radius + font
  motion-tokens.css   5 token motion mà CSS component tham chiếu
  animations.css      @import motion-tokens + 51 token riêng + 18 @keyframes
  globals.css       @import tokens + khối @theme inline của Tailwind
  build-entry.css   nguồn cho styles.css / styles.layer.css

src/ui/<name>/
  index.ts          component + 1 dòng import CSS       <- viết TAY
  index.css         bridge, chỉ @import                 <- viết TAY
  tokens.css        token của riêng component           <- viết TAY
  <Tên>.module.css  CSS Modules, nguồn                  <- viết TAY
  <Tên>.tsx         logic
```

`styles.css` do build sinh, không phải file nguồn. `ui/<name>/styles.css` cũng
do vite emit từ `.module.css`, **không** có trong `src/`.

### 3.2 Dependency graph

```
ui/ping/index.ts
  └── import 'tinita-react/ui/ping/index.css'        (JS -> CSS, cạnh duy nhất)
        ├── @import 'tinita-react/styles/tokens.css'     shared
        ├── @import 'tinita-react/ui/ping/tokens.css'    riêng
        └── @import 'tinita-react/ui/ping/styles.css'    compiled từ .module.css

ui/file-tree/index.ts
  └── import 'tinita-react/ui/file-tree/index.css'
        ├── @import 'tinita-react/styles/tokens.css'
        ├── @import 'tinita-react/ui/file-tree/tokens.css'
        ├── @import 'tinita-react/ui/tree/tokens.css'    <- cạnh FileTree -> Tree
        ├── @import 'tinita-react/ui/tree/styles.css'    <- cạnh FileTree -> Tree
        └── @import 'tinita-react/ui/file-tree/styles.css'
```

Dependency giữa component **biểu diễn ở tầng CSS**, trong bridge của component
phụ thuộc. Không dựa vào việc JS của FileTree import Tree: cạnh JS và cạnh CSS
là hai cạnh khác nhau, và `floating-window` là bằng chứng - JS của nó phụ thuộc
`tinita`, CSS thì không (ca `css-graph:floating-window`).

Lý do chọn bridge thay vì để `.module.css` tự `@import`: `.module.css` đi qua
CSS Modules, nên mọi thứ nó import cũng bị scope hoá; `index.css` là CSS thường
nên `@import` giữ nguyên nghĩa.

### 3.3 Dedupe

Dedupe là việc của bundler, không phải của library. Library chỉ bảo đảm **mỗi
file được @import đúng một lần trên mỗi bridge**, và hai bridge cùng trỏ **cùng
một specifier** (`tinita-react/styles/tokens.css`), nên bundler thấy một module.
Đo: `sharedTokenCount: 1` và `.tnt-tree-item{` x1.

---

## 4. Token Architecture

### 4.1 Ba tầng

**Tầng 1 - shared/global**, `styles/tokens.css`. Consumer override để retheme.

| Nhóm                                                | Token                                                                                                                                                                                                                                             | Số  |
| --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --- |
| Màu semantic                                        | `--tnt-background`, `--tnt-foreground`, `--tnt-primary(+-foreground)`, `--tnt-secondary(+-foreground)`, `--tnt-muted(+-foreground)`, `--tnt-accent(+-foreground)`, `--tnt-destructive(+-foreground)`, `--tnt-border`, `--tnt-input`, `--tnt-ring` | 15  |
| Radius                                              | `--tnt-radius`, `--tnt-radius-sm/md/lg`                                                                                                                                                                                                           | 4   |
| Typography                                          | `--tnt-font-sans`, `--tnt-font-mono`                                                                                                                                                                                                              | 2   |
| Motion (D5) - file RIÊNG `styles/motion-tokens.css` | `--tnt-duration-fast/slow`, `--tnt-ease-standard`, `--tnt-ease-in-out`, `--tnt-opacity-disabled`                                                                                                                                                  | 5   |
| **Chuyển RA**                                       | `--tnt-spacing-tree-indent` -> xoá, Tree đã có `--tnt-tree-indent` cùng giá trị                                                                                                                                                                   | -1  |

Tổng sau khi sửa: `styles/tokens.css` **36** (màu + radius + font), cộng
`styles/motion-tokens.css` **5**. Đo 2026-10-06: `dist/styles.css` giữ đúng **140
token riêng biệt / 190 khai báo**, bằng baseline trước P2 - `--tnt-spacing-tree-indent`
mất đi và token của carousel thêm vào thì triệt tiêu nhau.

`globals.css` phải `@import` tokens.css của **cả 5** component, không phải 4: đo
2026-10-06, thiếu carousel làm `dist/styles.css` khai 139 token thay vì 140, tức
đường `styles.css` cũng mất token đó.

**Tầng 2 - component-specific**, `ui/<name>/tokens.css`, tiền tố
`--tnt-<folder>-`.

| Component         | Số  | Nội dung                                                                                       |
| ----------------- | --- | ---------------------------------------------------------------------------------------------- |
| `file-tree`       | 40  | 38 màu nhận dạng loại file + 2 màu trung tính                                                  |
| `tree`            | 22  | màu row/hover/selected, font, kích thước, indent, offset guide line                            |
| `floating-window` | 21  | header bg, border/shadow theo trạng thái, kích thước bubble/header/button, duration+ease riêng |
| `ping`            | 8   | màu dot, kích thước dot/gap/count                                                              |
| `carousel-ticker` | 1   | `--tnt-carousel-ticker-min-block-size: 100px` (D14), phục hồi từ `min-h-[100px]` của `0037f8f` |

**Tầng 3 - implementation-only**, viết thẳng trong `.module.css`, không khai ở
`tokens.css`:

- Biến do JS set qua inline style: `--tnt-fw-x/y/width/height/scale-x/scale-y`.
  **Phải có fallback trong `var()`** - đo: 6/6 đang có.
- Biến bọc API third-party: `--tnt-tree-content-height` bọc
  `--collapsible-panel-height` của Base UI, khai local trong `.group`. Đây là
  cách giữ biến không-namespace của Base UI ra khỏi hợp đồng công khai.
- Hằng số dùng một lần không phải quyết định design: `min-block-size: 0`,
  `line-height: 1.6`.
- Token khai local vì nó là quyết định của một rule: `--tnt-tree-collapse-duration: 220ms`
  trong `.group`.

### 4.2 Quy tắc đặt token mới

```
1. Có >= 2 component CSS tham chiếu nó?            -> tầng 1
2. Consumer cần đổi nó để retheme library?         -> tầng 1
3. Chỉ một component, và là quyết định design?     -> tầng 2, khớp ^--tnt-<folder>(-|$)
4. Do JS set, hoặc bọc biến third-party?           -> tầng 3, BẮT BUỘC fallback
5. Hằng số layout dùng một lần?                    -> không thành token
```

Câu 1 và 3 kiểm được bằng máy (guard I4 + I6). Câu 2 là phán quyết của người.

### 4.3 Màu nào global, màu nào component

Ranh giới là **tính thay thế được**, không phải "dùng mấy chỗ":

| Loại                                    | Thuộc                   | Ví dụ                                          | Lý do                                                                                         |
| --------------------------------------- | ----------------------- | ---------------------------------------------- | --------------------------------------------------------------------------------------------- |
| Palette semantic                        | global                  | `--tnt-primary`, `--tnt-border`                | Đổi là retheme; mọi component nên dẫn xuất từ đây                                             |
| Quyết định semantic trong một component | component, **dẫn xuất** | `--tnt-tree-selected-bg` = `--tnt-primary` 12% | "selected" là khái niệm của Tree, nhưng màu phải theo brand                                   |
| Màu **nhận dạng**                       | component, **literal**  | `--tnt-file-tree-icon-javascript: #eab308`     | Vàng JS không phải quyết định design của consumer; dẫn xuất nó làm icon đổi màu khi brand đổi |
| Màu trung tính trong component          | component, **dẫn xuất** | `--tnt-file-tree-icon-file` = `--tnt-muted`    | Giá trị đã bằng đúng `--tnt-muted` hôm nay                                                    |

38/40 token của FileTree là màu nhận dạng, nên component này giữ gần như toàn bộ
literal. Đó là kết luận, không phải ngoại lệ tạm.

### 4.4 Dark / light

Repo có theme support, và cơ chế đã đúng - không đổi:

- Light khai trên `:where(:root, [data-theme='light'])`, dark trên
  `:where(.dark, [data-theme='dark'])`.
- `:where()` cho specificity 0 ở cả hai, nên khi host đặt `.dark` lên chính
  `<html>` (cách Tailwind `darkMode: 'class'` và shadcn làm) thì cả hai rule
  match cùng element và **thứ tự khai** quyết định; khối dark đứng sau nên nó
  thắng. Dùng `:root` trần thì `:root` (0,1,0) thắng `:where(.dark)` (0,0,0) và
  dark mode vỡ hoàn toàn. Đo 2026-09-28.
- `theme` prop không có default: default `'light'` ép sáng mọi component nằm
  trong host dark.
- Component token **cũng** phải theo quy ước này, và hôm nay đúng: cả 4
  `ui/*/tokens.css` dùng `:where(...)`.
- Hệ quả của D6: khi `--tnt-tree-bg: var(--tnt-background)` thì khối dark của
  Tree **bớt đi** những token chỉ đổi vì palette đổi. Đây là lợi ích phụ đo
  được sau khi làm, không phải lý do để làm.

Guard: ca L2 `theme-matrix`.

---

## 5. Package / Export Architecture

Không đổi public API, trừ 3 việc đóng lỗ.

### 5.1 Bảng hợp đồng

| Nhóm              | Số  | Node-safe | Ghi chú                                                      |
| ----------------- | --- | --------- | ------------------------------------------------------------ |
| `.` (root barrel) | 1   | **KHÔNG** | re-export `./ui/file-tree`, thừa hưởng CSS + 2 optional peer |
| `./ui/<name>`     | 5   | **KHÔNG** | CSS-aware                                                    |
| `./hooks/<name>`  | 9   | CÓ        |                                                              |
| `./utils/<name>`  | 2   | CÓ        | `autoInjectStyles` là nợ #16                                 |
| CSS subpath       | 21  | n/a       | 2 bundle + 4 `styles/*` + 15 `ui/*/*`                        |

`contract.json` khai `cssAwareSpecifiers: ['.', './ui/ping', './ui/carousel-ticker',
'./ui/floating-window', './ui/file-tree', './ui/tree']` và ca lab **đọc trường
đó** chứ không hardcode.

### 5.2 Ba việc phải sửa

1. **7 subpath thiếu condition `types`**: `hooks/useDoubleTap`,
   `hooks/usePagination`, `hooks/useRefreshComponent`, `hooks/useRequiredContext`,
   `hooks/useWindowSize`, `hooks/useIsomorphicLayoutEffect`, `utils/jsxJoin`.
   Các subpath khác có. `attw` đang xanh nhờ allowlist, nên đây là lệch im lặng
   (nợ #18).
2. **Thêm `./ui/carousel-ticker/tokens.css`** vào `exports` + `typesVersions`
   khi file ra đời (D14).
3. **`sideEffects` giữ nguyên** `["./dist/**/*.css", "./dist/ui/*/index.mjs"]`.
   Dạng chỉ-CSS làm rollup **xoá** import CSS và chỉ hỏng ở production build -
   đây là bất biến đã trả giá, không phải lựa chọn.

### 5.3 Root barrel

Giữ là convenience, không bỏ. Nó re-export từ **source** (`./ui/x`), không
từ subpath của chính package: self-reference làm declaration build phụ thuộc
declaration tsup đang sinh, đo được `TS7016`. Hệ quả trung thực là barrel kéo
CSS của mọi component nó re-export - đó là nghĩa của barrel, và `CLAUDE.md` nói
rõ để người đọc chọn subpath.

---

## 6. Build Architecture

### 6.1 Ba graph khác nhau

```
source graph      src/ui/ping/index.ts -> src/ui/ping/index.css -> 3 @import
                  Đọc được bằng grep. Là nguồn sự thật.

published graph   dist/ui/ping/index.mjs -> dist/ui/ping/index.css -> 3 @import
                  PHẢI bằng source graph. D1 tồn tại để bảo đảm điều này.

generated artifact dist/styles.css, dist/styles.layer.css, dist/ui/*/styles.css
                  Không có bản tương ứng trong src/. Build sinh.
```

### 6.2 Trách nhiệm

| Thành phần                              | Sở hữu                                                                                                                                                               | KHÔNG làm                                                              |
| --------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| `vite build` x2 (`TNT_FORMAT=es`/`cjs`) | compile JS, compile `.module.css` -> `dist/ui/*/styles.css`, gắn `tnt-` qua `generateScopedName`, đặt CSS cạnh entry sở hữu nó qua `assetFileNames`                  | không chèn import CSS vào JS (đo: không làm được)                      |
| `tsup`                                  | **chỉ** sinh declaration (`build:types`)                                                                                                                             | không sinh JS cho `tinita-react`                                       |
| `scripts/build-css.mjs`                 | ghép `dist/ui/*/styles.css` thành `dist/styles.css`, sinh bản `@layer`, copy nguồn CSS publish (`styles/tokens.css`, `ui/*/tokens.css`, `ui/*/index.css`) vào `dist` | **không** sinh import trong source; không xoá CSS per-component        |
| `index.css` bridge                      | khai dependency CSS, viết tay                                                                                                                                        | không chứa rule                                                        |
| `exports`                               | map specifier bare -> file trong `dist`, cho cả bridge và consumer                                                                                                   | không có tool đồng bộ; sửa tay, L1 `08-typesversions-sync` là cửa chặn |

`build-css.mjs` ném nếu `dist/unattributed.css` tồn tại - nghĩa là có CSS không
thuộc entry nào và sẽ không ai nạp.

Ghi chú tài liệu: `CLAUDE.md` viết "tsup cho cả 3 package". Với `tinita-react`
thì tsup chỉ sinh types, JS do vite. Câu đó cần sửa.

---

## 7. Invariants

Không invariant nào dùng byte count. Byte chỉ in ra làm diagnostic.

| #   | Invariant                                                                                                                                 | Kiểm bằng                                                                  | Hôm nay                                                              |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| I1  | JS import graph -> CSS import graph: import component X thì CSS của X và dependency CSS của X có mặt, CSS của component khác không        | L2 `css-graph:*`, vite build thật                                          | XANH                                                                 |
| I2  | Mọi specifier trong `ui/*/index.css` là bare và giải được qua `exports`, **và** graph phải kéo `ui/<name>/styles.css` của chính component | `check-css-tokens.mjs`                                                     | XANH                                                                 |
| I3  | `ui/*/index.css` chứa 0 selector                                                                                                          | script                                                                     | XANH                                                                 |
| I4  | Token khai trong `ui/<name>/tokens.css` khớp `^--tnt-<name>(-\|$)`                                                                        | script                                                                     | **ĐỎ 2/4** (`carousel-ticker` chưa có `tokens.css` nên chưa đo được) |
| I5  | Token trong `styles/tokens.css` được >= 2 component dùng, hoặc nằm trong danh sách semantic công khai                                     | script                                                                     | ĐỎ (14 token chỉ `globals.css` dùng; D6 sửa phần lớn)                |
| I6  | Mọi `var(--tnt-*)` trong CSS graph của một component được khai **trong graph đó**, hoặc có fallback                                       | `check-css-tokens.mjs` trên `dist`                                         | **ĐỎ 11 dòng** (7 cặp token/file)                                    |
| I7  | Đổi một token semantic làm đổi computed value của component dẫn xuất nó                                                                   | L4 Chromium                                                                | chưa có ca                                                           |
| I13 | Component nhập từ `ui/*` mà KHÔNG nhập `styles.css` vẫn có motion                                                                         | L2 `motion-present`, Chromium                                              | **ĐỎ**: `animationName=none`                                         |
| I8  | 0 bridge import `styles.css`, `styles.layer.css`, `globals.css`, `animations.css`                                                         | script                                                                     | XANH                                                                 |
| I9  | `cssAwareSpecifiers` khớp đúng tập subpath có side effect CSS                                                                             | L1 `03-smoke`, L2 `peer-matrix-css-aware`                                  | XANH                                                                 |
| I10 | 0 file `*.module.css` trong `dist`; mọi class ship ra mang tiền tố `tnt-`                                                                 | L1 `06-artifact-shape`, `tests/styles/no-global-leak`                      | XANH                                                                 |
| I11 | Shared CSS vào bundle đúng 1 lần khi nhiều component cùng dùng                                                                            | L2, đếm **định nghĩa rule** (`.tnt-tree-item{`), không đếm class name trần | XANH                                                                 |
| I12 | 0 class Tailwind / literal trong `className` của `src/ui`                                                                                 | `tests/styles/variant-contract`                                            | XANH                                                                 |

I6 là invariant quan trọng nhất trong plan này: nó bắt L1, L2, và mọi lần tái
phát. Hôm nay nó đỏ ở 11 dòng.

I13 là invariant mà **cả hai tầng browser của repo đang mù với nó**: consumer
vite của L2 và root layout của app Next trong L4 đều
`import 'tinita-react/styles.css'`, nên không ca nào từng chạy ở hình dạng
consumer mà tài liệu khuyến nghị. Ca `motion-present` của P1 là ca đầu tiên.

I5 cần một danh sách semantic công khai viết tay, vì "consumer cần nó để
retheme" không đo được. Danh sách đó là bảng ở mục 4.1.

---

## 8. Test Strategy

### 8.1 Tầng nào kiểm gì

| Tầng                  | Chạy ở            | Kiểm                                                                                 | Không kiểm      |
| --------------------- | ----------------- | ------------------------------------------------------------------------------------ | --------------- |
| `pnpm test` (vitest)  | mọi lần           | invariant đọc được từ source: I3, I12, không rò selector global                      | hành vi bundler |
| script `pnpm check-*` | trong `pnpm gate` | I2, I4, I5, I6, I8                                                                   | hành vi bundler |
| L1                    | `pnpm gate`       | hình dạng artifact, `exports` vs `typesVersions`, Node-safe load được, optional peer | CSS             |
| L2                    | `pnpm gate:full`  | I1, I9, I11: vite production + Next App Router production, CSS bundle thật           | pixel           |
| L4                    | `pnpm gate:full`  | I7 và hành vi animation trong Chromium, React 18 + 19                                | packaging       |

### 8.2 Invariant kiến trúc vs chi tiết implementation

| Là invariant                                         | Là chi tiết implementation              |
| ---------------------------------------------------- | --------------------------------------- |
| "import Ping thì CSS FileTree vắng mặt"              | "vite emit 5 file CSS"                  |
| "`.tnt-tree-item{` xuất hiện đúng 1 lần"             | "bundle nặng 9432 byte"                 |
| "subpath này cần bundler hiểu CSS"                   | "Node ném `ERR_UNKNOWN_FILE_EXTENSION`" |
| "token dùng trong graph phải khai trong graph"       | "token nằm ở file nào"                  |
| "thiếu optional peer thì build fail VÀ nêu tên peer" | "exit code là 1"                        |

### 8.3 Ca cần thêm

1. **`check-css-tokens.mjs`** - I6. Đọc `dist/ui/*/index.css`, resolve `@import`
   qua `exports`, gom declaration và gom `var()` use, báo mọi use không có
   declaration và không có fallback. Vào `pnpm gate`.
2. **`check-css-tokens.mjs`** cũng kiểm I4 (tiền tố) và I8 (bridge không import
   file global) - cùng một lần đọc, không cần script thứ hai.
3. **L4 `token-derivation`** - I7. Mount Tree trong Chromium, set
   `--tnt-primary` trên `<html>`, đọc `getComputedStyle` của row selected, phán
   quyết là **đổi** so với baseline. Đây là ca duy nhất chứng minh D6 có tác
   dụng, và không có cách nào đo nó ngoài browser.
4. **L4 `motion-present`** - chứng minh hậu quả của L1. Mount Ping từ
   `ui/ping` **không** import `styles.css`, đọc `getComputedStyle().animationDuration`,
   phán quyết `!== '0s'`. Ca này **phải đỏ trước khi sửa** - đó là cách chứng
   minh nó canh đúng thứ nó nói.
5. **Không thêm ca cho hai version cùng cây** (D10). Một ca khẳng định "bản cũ
   thắng" sẽ khoá một hành vi không muốn hứa, và nó phụ thuộc thứ tự bundler.

### 8.4 Nợ test đã biết, không mở rộng trong plan này

- L4 có 0 baseline `.png`, 6 ca SKIP. Cần sinh trong container trước khi P3
  (D6) có thể xác minh bằng ảnh.
- L1/L2 chỉ cài `react@19`; chỉ L4 chạy cả 18 và 19 (nợ #20).
- `tinita-dom` import-cleanliness chưa có guard (nợ #21).

---

## 9. Migration Phases

6 phase. Mỗi phase một commit, review được độc lập.

| #   | Goal                                                                            | Rollback boundary                                                                      |
| --- | ------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| P1  | Guard I6/I4/I8, **chấp nhận đỏ** để chứng minh lỗ                               | thêm 1 script + 1 dòng gate; revert không chạm `src/`                                  |
| P2  | Sửa 9 lỗ token, guard P1 thành xanh                                             | chỉ `tokens.css` + bridge + `exports`; revert về lại trạng thái đỏ-nhưng-chạy-như-cũ   |
| P3  | Token component dẫn xuất từ semantic (D6)                                       | chỉ 4 `ui/*/tokens.css`; đổi rendered value nên cần L4 baseline trước                  |
| P4  | Đồng bộ tiền tố token (D13), 43 tên trên 10 file                                | rename trong `tokens.css` + `.module.css` + `.tsx`; **breaking**, chặn lần publish đầu |
| P5  | Đóng `exports`: 7 condition `types`, subpath token của carousel                 | chỉ `package.json` + `typesVersions`                                                   |
| P6  | Tài liệu: hai version là unsupported (D10), sửa câu tsup/vite trong `CLAUDE.md` | chỉ `.md`                                                                              |

Thứ tự bắt buộc: P1 trước P2 (guard phải đỏ trước). P5 sau P2 (subpath mới ra
đời ở P2). P4 trước lần publish đầu hoặc không bao giờ. P3 cần L4 baseline, nên
nó là phase duy nhất có dependency ngoài.

P3 và P4 độc lập với P1/P2 và với nhau; làm được song song nếu muốn.

Chi tiết từng phase ở `phase-01` .. `phase-06`.

---

## 10. Risks / Rejected Alternatives

### 10.1 Rủi ro

| Rủi ro                                                    | Mức        | Giảm thiểu                                                                                                       |
| --------------------------------------------------------- | ---------- | ---------------------------------------------------------------------------------------------------------------- |
| P2 sửa token nhưng hậu quả thật (animation) không được đo | cao        | Ca L4 `motion-present` ở P1, phải đỏ trước khi sửa                                                               |
| P3 đổi màu rendered mà không ai thấy                      | cao        | L4 baseline phải tồn tại trước; `--tnt-tree-selected-bg` dùng `color-mix` nên giá trị không bằng đúng literal cũ |
| `color-mix(in oklab, ...)` support                        | trung bình | Baseline Chromium của L4 là bằng chứng duy nhất; cần quyết định sàn browser trước P3                             |
| P4 rename token là breaking                               | trung bình | Chỉ làm trước lần publish đầu; `0.1.0` chưa publish                                                              |
| Guard I5 cần danh sách viết tay                           | thấp       | Danh sách là bảng 4.1, nằm trong repo cạnh guard                                                                 |
| Guard mới xanh mà không kiểm gì                           | cao        | Quy tắc repo: phá đúng thứ nó canh. P1 đỏ ngay trên code thật là bằng chứng mạnh nhất có thể có                  |

### 10.2 Đã loại, có số đo

| Phương án                                                         | Lý do loại                                                                                                                                                                                                                        |
| ----------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Conditional `node` export bỏ CSS khỏi `ui/*`                      | Next App Router mất CSS trên Server Component: 0 byte, đối chứng bỏ condition ra 2424 byte                                                                                                                                        |
| `sideEffects: ["./dist/**/*.css"]`                                | Rollup xoá import CSS, chỉ hỏng ở production                                                                                                                                                                                      |
| Specifier tương đối trong bridge                                  | Rollup viết lại sai: `./index.css` -> `../../ping/index.css`                                                                                                                                                                      |
| Build script chèn import CSS vào output                           | Source graph khác published graph                                                                                                                                                                                                 |
| Bridge import `animations.css`                                    | 56 token + 18 keyframes cho 5 token thật cần                                                                                                                                                                                      |
| ~~File motion token riêng~~                                       | **Loại rồi NHẬN LẠI 2026-10-06**: `styles/tokens.css` KHÔNG làm được - 16 rule của `animations.css` cũng dùng 5 token đó, nên gộp vào gây double-inline (230 vs 190 khai báo) hoặc phá đường nhập độc lập `styles/animations.css` |
| Hash tên CSS Modules                                              | Consumer mất khả năng override (owner chốt 2026-09-26)                                                                                                                                                                            |
| Global selector viết tay thay CSS Modules                         | Mất guard chống trùng tên; `@keyframes accordion-down` từng trùng shadcn                                                                                                                                                          |
| Runtime warning / version token / versioned class cho hai version | D10: không có số nào cho thấy nó ngăn sự cố thật; `npm ls` rẻ hơn                                                                                                                                                                 |
| Rename `--tnt-*` thành `--tnt-color-*`                            | Không sửa failure mode nào                                                                                                                                                                                                        |
| Gộp `styles.css` và `styles.layer.css`                            | CSS không cho consumer bật/tắt `@layer` của file đã publish                                                                                                                                                                       |
| Ca lab khẳng định `ERR_UNKNOWN_FILE_EXTENSION`                    | Chi tiết loader của Node, không phải hợp đồng package                                                                                                                                                                             |

---

## 11. Final Architecture Diagram

```
CONSUMER, hai mức trừu tượng độc lập

  mức component                          mức design system
  ───────────────                        ──────────────────
  import { Ping } from                   @import 'tinita-react/styles.css'
    'tinita-react/ui/ping'                 hoặc  styles.layer.css
          │                                        │
          │ CSS tự đến                             │ import TAY, 1 lần ở root
          ▼                                        ▼
  ┌───────────────────┐                  ┌──────────────────────┐
  │ ui/ping/index.mjs │                  │ dist/styles.css      │
  └─────────┬─────────┘                  │ = ghép ui/*/styles   │
            │ import (bare)              │   + token + theme    │
            ▼                            └──────────────────────┘
  ┌──────────────────────┐                 sinh bởi build-css.mjs
  │ ui/ping/index.css    │  bridge, 0 rule
  └──┬─────────┬─────────┘
     │         │         └──────────────────────┐
     ▼         ▼                                ▼
 styles/     ui/ping/                      ui/ping/
 tokens.css  tokens.css                    styles.css
  41 token    8 token, --tnt-ping-*         vite emit từ Ping.module.css
  shared      dẫn xuất từ shared            class tnt-ping-*
     ▲
     │  CÙNG specifier từ mọi bridge -> bundler thấy 1 module -> x1
     │
 ui/tree/index.css ─┬─> styles/tokens.css
                    ├─> ui/tree/tokens.css
                    └─> ui/tree/styles.css
                         ▲
 ui/file-tree/index.css ─┘  cạnh FileTree -> Tree, tường minh ở tầng CSS


BIÊN NODE-SAFE vs CSS-AWARE

  Node-safe                    CSS-aware (cần bundler hiểu CSS)
  ─────────                    ────────────────────────────────
  hooks/*  (9)                 .            root barrel, re-export ui/*
  utils/*  (2)                 ui/*         (5)

  `node` trần load được        `node` trần KHÔNG load được .css
  L1 03-smoke chạy             L1 03-smoke BỎ QUA theo cssAwareSpecifiers
```

---

## Checklist

```
[x] Architecture validated          - 9/10 yêu cầu đã ĐẠT và có bằng chứng; 1 lỗi thật ở mục 1.2
[x] CSS graph defined               - mục 3.2, cạnh component biểu diễn ở tầng CSS trong bridge
[x] Token ownership defined         - mục 4, ba tầng + quy tắc 5 câu + ranh giới màu
[x] Export contract defined         - mục 5, 36 entry, 3 việc phải sửa
[x] Node-safe vs CSS-aware boundary - mục 5.1 + diagram, đọc từ contract.json
[x] Tree-shaking invariants defined - mục 7, I1/I11, không byte count
[x] Consumer tests defined          - mục 8, 5 tầng + 4 ca cần thêm + 1 ca CỐ Ý không thêm
[x] Migration phases defined        - mục 9, 6 phase, P1 phải đỏ trước P2
```

**Hai câu hỏi chặn, đã chốt 2026-10-06:**

1. `--tnt-carousel-ticker-min-block-size: 100px`, phục hồi từ `min-h-[100px]`
   trong commit `0037f8f` (D14). Không phải phán quyết.
2. P4 **LÀM**, 43 tên trên 10 file, không miễn trừ biến runtime (D13). Phải xong trước lần
   publish đầu, nên nó là điều kiện chặn của publish.

**Không còn câu hỏi chặn nào. Plan sẵn sàng implement từ P1.**
