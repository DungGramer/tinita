# CSS / Token Architecture cho `tinita-react`

**Ngày** 2026-10-06 · **Nhánh** `feature/snap-corner` · **Base** `f73de05`

Kiến trúc CSS per-component đã ship ngày 2026-10-05 (4 commit
`5a4dae4..f73de05`). Plan này **không** thiết kế lại nó. Plan này: chốt các
quyết định còn mở, và sửa **một lỗi đúng chức năng** mà bản đã ship đang mắc.

- Tài liệu kiến trúc đầy đủ (11 mục, mọi quyết định kèm Why / Alternatives /
  Why rejected / Invariant): [`architecture-plan.md`](architecture-plan.md)
- Số đo gốc: [`reports/00-measured-state.md`](reports/00-measured-state.md)

## Lỗi cần sửa

8 declaration trong `Tree`, `Ping`, `FloatingWindow` tham chiếu token **chỉ**
khai trong `styles/animations.css`, mà không bridge nào `@import` file đó. Đo
trên artifact: `dist/ui/tree/styles.css` dùng `var(--tnt-duration-fast)` x1,
khai x0; chỗ duy nhất khai là `dist/styles.css`. Không có fallback.

**ĐÃ ĐO TRONG CHROMIUM** 2026-10-06 (ca L2 `motion-present`, consumer vite chỉ
nhập `tinita-react/ui/ping`): `position=absolute opacity=0.75` nên CSS của Ping
tới, nhưng `animationName=none animationDuration=0s` nên token không giải được.
`animation` là shorthand, `var()` hỏng làm invalid cả declaration, nên pulse
**mất hẳn** chứ không phải chạy-với-0-giây. Suy ra cùng cơ chế: Tree mất
transition và row disabled về `opacity: 1`, Tree collapse mất animation vì
`transition-duration` thành `0s` - đúng điều kiện làm `getAnimationType` của
Base UI bỏ animation.

Đường `styles.css` không bị. Lỗ chỉ trên đường per-component, tức đường vừa mở.

Cộng `--tnt-carousel-min-block-size` không khai ở đâu cả - hỏng cả hai đường,
có từ trước. Guard đếm theo component ra **11 dòng** (7 cặp token/file riêng
biệt; 4 token của Tree đếm lại dưới `file-tree` vì graph của FileTree chứa CSS
của Tree).

Và lỗ này chưa bao giờ bị bắt vì **cả hai tầng browser của repo đều che nó**:
consumer vite của L2 và root layout của app Next trong L4 đều
`import 'tinita-react/styles.css'`.

## Phase

| #   | Phase                                                           | Mục tiêu                                                                                                                                | Status              | Progress |
| --- | --------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- | ------------------- | -------- |
| 01  | [Guard token trong CSS graph](phase-01-css-token-guard.md)      | `check-css-tokens.mjs` + ca **L2** `motion-present`, đỏ đúng chủ đích                                                                   | **DONE** 2026-10-06 | 100%     |
| 02  | [Đóng 11 lỗ token](phase-02-close-token-holes.md)               | 5 token motion sang `styles/tokens.css`, carousel có `tokens.css`, guard P1 xanh                                                        | Not started         | 0%       |
| 03  | [Token component dẫn xuất](phase-03-derive-component-tokens.md) | 91 literal -> `var()` từ palette semantic, trừ 38 màu nhận dạng                                                                         | Not started         | 0%       |
| 04  | [Đồng bộ tiền tố token](phase-04-token-prefix.md)               | 43 tên: `--tnt-filetree-*` -> `--tnt-file-tree-*`, `--tnt-fw-*` -> `--tnt-floating-window-*`. **Breaking, PHẢI xong trước publish đầu** | Not started         | 0%       |
| 05  | [Đóng hợp đồng export](phase-05-export-contract.md)             | 7 subpath thiếu `types`, subpath token của carousel                                                                                     | Not started         | 0%       |
| 06  | [Tài liệu](phase-06-docs.md)                                    | Hai version cùng cây là unsupported; sửa câu tsup/vite                                                                                  | Not started         | 0%       |

**Thứ tự bắt buộc**: P1 trước P2 (guard phải đỏ trước khi sửa). P5 sau P2
(subpath mới ra đời ở P2). P4 trước lần publish đầu hoặc không bao giờ.

P3 cần baseline L4 tồn tại (hiện 0 `.png`, 6 ca SKIP) - dependency ngoài duy
nhất của plan này.

P3, P4 độc lập với P1/P2 và với nhau.

## Hai câu hỏi chặn - đã chốt 2026-10-06

1. **`--tnt-carousel-ticker-min-block-size: 100px`.** Không phải phán quyết:
   commit `0037f8f` tokenize đúng dòng `isVertical && 'h-full min-h-[100px]'`
   thành `min-block-size: var(--tnt-carousel-min-block-size)` rồi quên khai
   token. Giá trị gốc còn trong git, nên đây là phục hồi.
2. **P4 LÀM**, và không miễn trừ gì: cả 6 biến runtime `--tnt-fw-x/y/...` cũng
   đổi, vì hai tiền tố trong một component là mời người sau "sửa cho nhất
   quán". Phải xong **trước lần publish đầu** - sau đó rename là breaking thật.

## Những gì plan này CỐ Ý không làm

- **Không** thêm runtime warning / version token / versioned class name cho ca
  hai version cùng cây. Đã đo: bản cũ thắng cascade vì nó bundle sau. Kết luận:
  unsupported giống React, tài liệu hoá, không machinery. Lý do đầy đủ ở D10.
- **Không** rename `--tnt-background` thành `--tnt-color-background`. Không sửa
  failure mode nào. Lý do ở D12.
- **Không** thêm ca lab khẳng định "bản cũ thắng" - khoá một hành vi không muốn
  hứa và phụ thuộc thứ tự bundler.
- **Không** mở rộng sang nợ #20 (L1/L2 chỉ react@19) và #21 (`tinita-dom`
  import-cleanliness).
