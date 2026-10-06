# Phase 05 - Đóng hợp đồng export

## Context links

- Plan cha: [`plan.md`](plan.md)
- Kiến trúc: [`architecture-plan.md`](architecture-plan.md) mục 5.2
- Nợ kỹ thuật: #18 (`types` lệch hình dạng), #16 (`autoInjectStyles` chết)
- Phụ thuộc: P2 (subpath `./ui/carousel-ticker/tokens.css` ra đời ở đó)

## Overview

- **Ngày** 2026-10-06
- **Mô tả** 7 subpath thiếu condition `types` trong `exports`. Thêm vào cho khớp
  hình dạng của các subpath khác.
- **Ưu tiên** Trung bình. Lệch im lặng, `attw` đang xanh nhờ allowlist.
- **Implementation status** Not started
- **Review status** Chưa review

## Key Insights

- 7 subpath có `import` + `require` nhưng **không** có `types`:
  `hooks/useDoubleTap`, `hooks/usePagination`, `hooks/useRefreshComponent`,
  `hooks/useRequiredContext`, `hooks/useWindowSize`,
  `hooks/useIsomorphicLayoutEffect`, `utils/jsxJoin`. Các subpath còn lại có.
- Bất biến build #3 của repo: `types` **tách theo condition** (`import` ->
  `.d.mts`, `require` -> `.d.ts`). Không tách thì `attw` báo `FalseCJS` toàn bộ
  subpath. 7 cái này không tách vì chúng không khai `types` **gì cả** - tức
  TypeScript rơi về suy luận từ `main`/file cạnh, và nó tình cờ đúng.
- `attw` xanh **nhờ allowlist**, nên ca L1 `02-attw` hiện không bắt được lệch
  này. Đó là lý do nó im lặng.
- `typesVersions` có 16 pattern cho các subpath JS - phải đồng bộ, và L1
  `08-typesversions-sync` là cửa chặn duy nhất.

## Requirements

1. 7 subpath thêm `types` tách theo condition, đúng hình dạng các subpath khác
   đang dùng.
2. `./ui/carousel-ticker/tokens.css` có trong `exports` (làm ở P2, xác minh lại
   ở đây).
3. Không đổi đường dẫn của subpath nào - đây không phải phase đổi public API.
4. Quyết định `utils/autoInjectStyles` (nợ #16): giữ export, hay deprecate. Owner
   chốt. Nếu giữ thì ghi lý do; nếu bỏ thì đó là breaking và thuộc cùng cửa sổ
   với P4.

## Architecture

Không đổi. Chỉ làm 36 entry trong `exports` về cùng một hình dạng.

## Related code files

| File                                 | Thay đổi                                      |
| ------------------------------------ | --------------------------------------------- |
| `packages/tinita-react/package.json` | `exports` 7 subpath, `typesVersions` xác minh |
| `compatibility/contract.json`        | xác minh specifier khớp hai chiều             |

## Implementation Steps

1. Liệt kê hình dạng `types` của một subpath đã đúng, dùng làm khuôn.
2. Thêm `types` cho 7 subpath.
3. Chạy L1 `02-attw`, `05-contract-drift`, `08-typesversions-sync`.
4. Kiểm `attw` **không** cần thêm entry allowlist mới.
5. Hỏi owner về `autoInjectStyles`.
6. `pnpm gate`.

## Todo list

- [ ] Khuôn `types` từ subpath đã đúng
- [ ] 7 subpath có `types` tách condition
- [ ] L1 `02-attw` xanh, allowlist KHÔNG dài thêm
- [ ] L1 `05-contract-drift` 18 specifier khớp hai chiều (hoặc 19 sau P2)
- [ ] L1 `08-typesversions-sync` xanh
- [ ] Owner chốt `autoInjectStyles`
- [ ] `pnpm gate` exit 0

## Success Criteria

1. Đếm subpath JS có condition `types`: từ **10/17** lên **17/17**. (36 entry
   trong `exports` gồm 19 entry CSS dạng string và 17 entry JS dạng object.)
2. L1 `02-attw:tinita-react` PASS, và số entry trong allowlist của
   `contract.json` **không tăng**.
3. L1 `05-contract-drift:tinita-react` PASS với số specifier khớp hai chiều.
4. L1 `08-typesversions-sync:tinita-react` PASS: mọi subpath giải được qua
   pattern.
5. Trong project cô lập của L1,
   `tsc --moduleResolution node` import cả 7 subpath đó **không** báo
   `TS7016`.
6. `pnpm gate` exit **0**.

## Risk Assessment

| Rủi ro                                           | Giảm thiểu                                                  |
| ------------------------------------------------ | ----------------------------------------------------------- |
| Thêm `types` sai nhánh làm `attw` báo `FalseCJS` | SC2 đòi allowlist không dài thêm                            |
| `typesVersions` lệch `exports` âm thầm           | SC4, và đó là lý do ca `08` tồn tại                         |
| Sửa thành công nhưng ca L1 không thể fail        | Thử tạm trỏ một `types` sang file không tồn tại, ca phải đỏ |

## Security Considerations

Không.

## Next steps

`phase-06-docs.md`.
