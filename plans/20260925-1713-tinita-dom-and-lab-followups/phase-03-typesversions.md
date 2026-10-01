# Pha 03 - V4 (QĐ-2): support TS cũ bằng `typesVersions`

## Context links

- Plan cha: [plan.md](./plan.md)
- Dependency: **pha 02** (cần `tinita-dom` tồn tại để thêm `typesVersions` cho cả 3 package)
- Research: [researcher-01-typesversions.md](./research/researcher-01-typesversions.md)
- Số đo: [reports/00-verified-context.md](./reports/00-verified-context.md) mục "Việc 4"
- Ca hiện có: `compatibility/cases/l2/index.mjs` ca `tsc:node` (đang `expectedFailure`),
  `compatibility/contract.json` entry `accepted` `NoResolution`

## Overview

- **Date:** 2026-09-25
- **Description:** Owner chốt **support** TS cũ. Thêm `typesVersions` cho cả 3 package để consumer
  `moduleResolution: node` resolve được type của subpath. Kèm ca L1 mới kiểm `typesVersions` đồng bộ
  với `exports`, vì đó là nguồn lệch mới do chính pha này tạo ra.
- **Priority:** P1 - phải xong trước pha 04, vì publish phải publish bản đã có `typesVersions`
- **Implementation status:** Done
- **Review status:** Not reviewed

## Key Insights

1. **`typesVersions` chỉ sửa TYPE resolution, không đụng runtime.** Runtime đã chạy: đo được
   `require('tinita/file/fileSize')` và `import()` đều EXIT 0, vì Node dùng `exports`. Vấn đề hiện
   tại nằm đúng ở tầng type: consumer `moduleResolution: node` fail **10 import** với
   `error TS2307: Cannot find module 'tinita/file/fileSize' or its corresponding type declarations`.
2. **Thêm `typesVersions` an toàn với consumer mới.** Với `moduleResolution: node16`/`nodenext`/
   `bundler`, TS ưu tiên `exports` và **bỏ qua** `typesVersions`. Nên ca `tsc:bundler` và
   `tsc:nodenext` (đang PASS, 11 specifier sạch) phải vẫn PASS sau thay đổi - và đó là tiêu chí.
3. **Hình dạng researcher đề xuất chưa được đo.** `"typesVersions": { "*": { "*": ["dist/*.d.ts",
"dist/*/index.d.ts"] } }`. Nó hợp lý nhưng phải ĐO: `tinita` có subpath dạng `./file/fileSize` ->
   `dist/file/fileSize.d.ts`, còn `tinita-react` có dạng `./ui/file-tree` -> `dist/ui/file-tree/index.d.ts`.
   Hai hình dạng khác nhau nên một pattern có thể không phủ cả hai. **Đo trước, khai sau.**
4. **Dùng `.d.ts` không `.d.mts` trong `typesVersions`.** Consumer TS cũ không hiểu `.d.mts`.
5. **Thứ tự key quan trọng**: pattern cụ thể trước, `"*"` cuối. Nếu để `"*"` trước thì nó khớp hết và
   pattern sau không bao giờ tới.
6. **Đây là nguồn lệch MỚI.** `typesVersions` phải đồng bộ `exports` mỗi lần thêm subpath, và không
   có tool tự động. Không có ca kiểm thì nó sẽ lệch âm thầm - đúng loại lỗi mà ca `05-contract-drift`
   ra đời để chặn cho `exports`. Nên pha này phải thêm ca tương đương.
7. **Sửa xong thì thu hẹp allowlist.** Quy trình đã làm một lần với `FalseCJS` (6/6 -> 0/6, xoá
   entry). Lần này là `NoResolution`.

## Requirements

- `typesVersions` cho cả 3 package, phủ **mọi** subpath trong `exports`.
- Ca `tsc:node` của L2 chuyển từ `expectedFailure` sang **PASS thật** (0 lỗi TS).
- Ca `tsc:bundler` và `tsc:nodenext` **vẫn PASS** - không được hồi quy.
- `attw` hết báo `node10: Resolution failed` cho cả 3 package.
- Entry `NoResolution` bị **xoá** khỏi `contract.json` `accepted` của `tinita`.
- **Ca L1 mới** kiểm `typesVersions` <-> `exports` đồng bộ hai chiều, kèm ca tự phá.
- `docs/code-standards.md` có quy tắc: thêm subpath phải cập nhật cả `exports` VÀ `typesVersions`
  trong cùng commit.

## Architecture

Hai hình dạng subpath khác nhau, nên `typesVersions` có thể cần 2 pattern:

| Package        | Subpath ví dụ     | File type đích                 |
| -------------- | ----------------- | ------------------------------ |
| `tinita`       | `./file/fileSize` | `dist/file/fileSize.d.ts`      |
| `tinita-dom`   | `./smooth-scroll` | `dist/smooth-scroll.d.ts`      |
| `tinita-react` | `./ui/file-tree`  | `dist/ui/file-tree/index.d.ts` |

Hình dạng khởi điểm để ĐO (không phải để tin ngay):

```json
"typesVersions": {
  "*": {
    "*": ["dist/*.d.ts", "dist/*/index.d.ts"]
  }
}
```

Ca L1 mới `08-typesversions-sync`:

- Với mỗi subpath trong `exports` (trừ `.` và các `*.css`), giải `typesVersions` theo đúng thuật toán
  của TS (thử từng pattern theo thứ tự, thay `*`), rồi kiểm file kết quả **tồn tại trong tarball**.
- Chiều ngược: mỗi pattern trong `typesVersions` phải giải được cho ít nhất một subpath - pattern
  không bao giờ khớp là rác, và là dấu hiệu `exports` đã đổi mà `typesVersions` chưa.
- Ca này chạy trên tarball đã giải nén, như mọi ca L1 khác.

## Related code files

| File                                 | Sửa gì                                                |
| ------------------------------------ | ----------------------------------------------------- |
| `packages/tinita/package.json`       | thêm `typesVersions`                                  |
| `packages/tinita-dom/package.json`   | thêm `typesVersions`                                  |
| `packages/tinita-react/package.json` | thêm `typesVersions`; chú ý subpath CSS không có type |
| `compatibility/cases/l1/index.mjs`   | ca `08-typesversions-sync`                            |
| `compatibility/cases/l2/index.mjs`   | ca `tsc:node` bỏ `expectedFailure`, thành PASS thật   |
| `compatibility/contract.json`        | xoá entry `accepted` `NoResolution`                   |
| `docs/code-standards.md`             | quy tắc đồng bộ `exports` + `typesVersions`           |

## Implementation Steps

1. **ĐO TRƯỚC.** Thêm `typesVersions` hình dạng khởi điểm vào `packages/tinita` (một package thôi),
   build, pack, rồi chạy ca `tsc:node` của L2. Nếu vẫn fail, ghi lại **nguyên văn** lỗi TS còn lại và
   điều chỉnh pattern. Không khai cho 3 package rồi mới đo - sẽ không biết pattern nào sai ở đâu.
2. Khi `tinita` đã PASS `tsc:node`, đo `attw --pack` xác nhận `node10` hết báo. Nếu attw vẫn báo thì
   pattern đúng cho `tsc` nhưng chưa đúng cho attw - ghi lại khác biệt.
3. Áp cho `tinita-dom` (subpath phẳng, dễ nhất). Đo lại.
4. Áp cho `tinita-react` (subpath dạng thư mục + có subpath CSS). **Subpath CSS không có type** nên
   `typesVersions` không được map chúng - xác nhận `tsc:node` không báo lỗi về `./styles.css`.
5. Viết ca L1 `08-typesversions-sync`, hai chiều.
6. Ca `tsc:node` của L2: bỏ `expectedFailure`, đổi kỳ vọng thành EXIT 0 và 0 lỗi TS.
7. Xoá entry `NoResolution` khỏi `contract.json` `accepted`.
8. **Ca tự phá**: xoá một pattern khỏi `typesVersions` của `tinita` -> ca `08` phải EXIT khác 0 và
   nêu tên subpath không giải được. Thêm một subpath vào `exports` mà không cập nhật `typesVersions`
   -> ca `08` cũng phải đỏ. Phục hồi thì PASS lại.
9. Thêm quy tắc vào `docs/code-standards.md`, kèm lý do: `typesVersions` không có tool đồng bộ nên
   lệch là âm thầm; ca `08` là cửa chặn.
10. Gate repo + `run.mjs l1` + `run.mjs l2`.

## Todo list

- [ ] Đo hình dạng `typesVersions` trên `tinita` TRƯỚC, ghi lỗi TS còn lại nếu có
- [ ] Xác nhận `attw` hết báo `node10` cho `tinita`
- [ ] Áp cho `tinita-dom`, đo lại
- [ ] Áp cho `tinita-react`, xử subpath CSS không có type
- [ ] Ca L1 `08-typesversions-sync` hai chiều
- [ ] `tsc:node` bỏ `expectedFailure`
- [ ] Xoá `NoResolution` khỏi allowlist
- [ ] 2 ca tự phá (xoá pattern; thêm subpath không cập nhật)
- [ ] Quy tắc vào `docs/code-standards.md`
- [ ] Gate + l1 + l2

## Success Criteria

1. Ca `tsc:node` của L2 EXIT 0 với **0 lỗi TS**, không còn cờ `expectedFailure`. Trước đó nó báo
   `10 lỗi TS, đầu tiên: probe.ts(3,32): error TS2307: Cannot find module 'tinita/file/fileSize'`.
2. Ca `tsc:bundler` và `tsc:nodenext` **vẫn** báo `11 specifier compile sạch` - không hồi quy. Con số
   sẽ tăng khi có `tinita-dom`; điều kiện là 0 lỗi, không phải giữ đúng số 11.
3. `npx attw --pack` trên tarball của **cả 3** package: 0 dòng `node10: Resolution failed`, và vẫn 0
   dòng `Masquerading as CJS`.
4. `contract.json` không còn entry `accepted` nào cho `NoResolution`. Allowlist của `tinita` từ 1
   entry xuống **0**.
5. Ca `08-typesversions-sync` EXIT 0 trên cả 3 package, và report ghi số subpath đã giải được cho
   từng package.
6. **Ca tự phá A**: xoá pattern `"dist/*/index.d.ts"` khỏi `typesVersions` của `tinita-react` -> ca
   `08` EXIT khác 0 và thông báo chứa tên một subpath dạng `./ui/...`. Thêm lại -> EXIT 0.
7. **Ca tự phá B**: thêm `"./file/brandNew"` vào `exports` của `tinita` mà không sửa `typesVersions`
   -> ca `08` EXIT khác 0. (Ca `05-contract-drift` cũng sẽ đỏ - đó là đúng, hai ca bắt hai thứ khác
   nhau.) Gỡ ra -> cả hai EXIT 0.
8. Subpath CSS của `tinita-react` (`./styles.css`, `./styles/globals.css`, `./styles/animations.css`)
   **không** bị `typesVersions` map, và `tsc:node` không báo lỗi nào về chúng.
9. Runtime không đổi: ca `03-smoke-cjs-esm` vẫn EXIT 0 với đúng số lần thực thi như trước khi sửa -
   `typesVersions` không được ảnh hưởng runtime.
10. `docs/code-standards.md` có mục nêu quy tắc kèm **lý do** (không có tool đồng bộ, lệch là âm
    thầm, ca `08` là cửa chặn), không chỉ nêu quy tắc.
11. Gate repo 4/4 EXIT 0.

## Risk Assessment

| Rủi ro                                                                      | Xác suất                    | Ảnh hưởng  | Giảm thiểu                                                           |
| --------------------------------------------------------------------------- | --------------------------- | ---------- | -------------------------------------------------------------------- |
| Hình dạng researcher đề xuất không phủ cả 2 kiểu subpath (phẳng vs thư mục) | **Cao**                     | Trung bình | Bước 1 đo trên 1 package trước; bước 4 xử riêng `tinita-react`       |
| `typesVersions` lệch `exports` âm thầm sau này                              | Cao theo thời gian          | Cao        | Ca `08` + tiêu chí 6, 7 + quy tắc trong docs                         |
| Thêm `typesVersions` làm hồi quy consumer mới                               | Thấp (TS ưu tiên `exports`) | Cao        | Tiêu chí 2 kiểm tường minh thay vì tin vào lý thuyết                 |
| `attw` pass nhưng `tsc` thật vẫn fail, hoặc ngược lại                       | Trung bình                  | Trung bình | Bước 1-2 đo **cả hai** riêng biệt, không suy từ một cái sang cái kia |
| Map cả subpath CSS -> lỗi lạ                                                | Trung bình                  | Thấp       | Tiêu chí 8                                                           |
| Allowlist không được thu hẹp, `NoResolution` nằm lại                        | Trung bình                  | Trung bình | Tiêu chí 4                                                           |

## Security Considerations

- `typesVersions` chỉ ảnh hưởng type resolution lúc compile của consumer. Không đổi file nào được
  ship, không đổi runtime, không mở đường vào `dist` ngoài những gì `exports` đã cho.
- Không dùng pattern quá rộng kiểu `"*": ["dist/*"]` không có `.d.ts` - nó sẽ cho TS trỏ vào file
  `.mjs`/`.cjs` và sinh thông báo lỗi khó hiểu. Pattern phải kết thúc bằng `.d.ts`.
- Không thêm `typesVersions` cho subpath không tồn tại trong `exports`: làm vậy là công bố một đường
  nhập mà runtime không có, đúng loại lệch tài liệu đã gặp với `tinita-react/hooks`.

## Next steps

Pha 04 publish, và nó **phải** publish bản đã có `typesVersions` - đó là lý do thứ tự này. Nếu pha 04
chạy trước thì bản vừa publish lại thiếu thứ QĐ-2 yêu cầu và phải bump lần nữa.
