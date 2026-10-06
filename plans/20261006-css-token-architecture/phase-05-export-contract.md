# Phase 05 - Đóng hợp đồng export

## Context links

- Plan cha: [`plan.md`](plan.md)
- Kiến trúc: [`architecture-plan.md`](architecture-plan.md) mục 5.2
- Nợ kỹ thuật: #18 (`types` lệch hình dạng), #16 (`autoInjectStyles` chết)
- Phụ thuộc: P2 (subpath `./ui/carousel-ticker/tokens.css` ra đời ở đó)

## Overview

- **Ngày** 2026-10-06
- **Mô tả** **NGƯỢC HẲN plan.** 7 subpath mà plan gọi là "thiếu `types`" lại
  đúng hình dạng; **10** subpath mà plan gọi là đúng thì sai và gây `FalseCJS`.
  Và ca `02-attw` canh chuyện này đã xanh-oan suốt vì `attw` CRASH.
- **Ưu tiên** Trung bình. Lệch im lặng, `attw` đang xanh nhờ allowlist.
- **Implementation status** **DONE** 2026-10-06
- **Review status** gate 0, L1/L2/L4 đều 0; chưa có người review

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

---

## Tiền đề của plan SAI, và ca canh nó đã xanh-oan

Plan viết: "7 subpath thiếu condition `types`... Các subpath còn lại có." Đo
2026-10-06 thì ngược: 7 cái đó có hình dạng **ĐÚNG**

```json
"./hooks/useDoubleTap": {
  "import":  { "types": "./dist/hooks/useDoubleTap.d.mts", "default": "...mjs" },
  "require": { "types": "./dist/hooks/useDoubleTap.d.ts",  "default": "...cjs" }
}
```

đúng bất biến build #3 của `CLAUDE.md` (`types` tách theo condition). Còn 10 cái
kia dùng `types` **phẳng** trỏ `.d.ts`, đúng hình dạng mà `CLAUDE.md` nói gây
`FalseCJS`:

```json
"./hooks/useToggle": { "types": "./dist/hooks/useToggle.d.ts", "import": "...mjs", "require": "...cjs" }
```

Cách tôi dò ("có khoá `types` ở cấp 1 hay không") đo **sự có mặt của một khoá**,
không đo **tính đúng của hình dạng** - cùng lớp lỗi mà repo đã gặp nhiều lần.

`attw` chạy trực tiếp trên tarball báo đúng **10** dòng
`🎭 Masquerading as CJS`, khớp **1-1** với 10 subpath đó.

## Ca `02-attw` là instance thứ SÁU của mẫu "xanh mà không kiểm gì"

`@arethetypeswrong/cli@0.18.2` CRASH trên **cả ba** package - kể cả `tinita` và
`tinita-dom` không có CSS subpath nào, nên không phải do CSS:

```
exit=3
error while checking file:
Cannot read properties of undefined (reading 'filename')
```

Ca cũ đọc **chỉ** `out` và bỏ `code`:

```js
const { out } = npx(['attw', '--pack', dir, ...]);
if (/Masquerading as CJS/.test(out)) problems.add('FalseCJS');
const ok = unexpected.length === 0;   // -> true
```

stdout của bản crash không chứa chuỗi nào trong hai mẫu, nên `problems` rỗng và
ca PASS với "vấn đề: không (đều trong allowlist)" - trong khi `accepted: []`
RỖNG. Câu "đều trong allowlist" đó là thứ làm nó đọc như có kiểm soát.

Hệ quả: ca này chưa bao giờ thực sự kiểm package nào, và nó che `FalseCJS` trên
10 subpath.

## Ba thứ đã sửa

1. **`@arethetypeswrong/cli` 0.18.2 -> 0.18.5.** Đo: 0.18.2 crash bất kể gọi bằng
   tarball hay `--pack dir`, nên là bug version. 0.18.5 chạy, exit=1, 10 FalseCJS.
2. **10 subpath sang `types` tách theo condition.** FalseCJS về 0.
3. **Ca phán quyết trên BA thứ**: attw chạy được (không crash), không `FalseCJS`,
   không `NoResolution` - và chỉ tính trên **dòng bảng của entrypoint JS**.

   Vì sao lọc trong ca chứ không `--exclude-entrypoints`: đo 2026-10-06, cờ đó
   không loại được dòng nào ở cả ba dạng (`./x`, `x`, `tinita-react/x`). Và không
   dùng allowlist `NoResolution` vì nó thô - sẽ che luôn một subpath JS thật sự
   không resolve được. 21 dòng `Resolution failed` của `tinita-react` đều là CSS
   subpath, và `.css` không có declaration là thiết kế.

   Phần chú giải ở đầu output chứa câu "Import failed to resolve to type
   declarations or JavaScript files", khớp mẫu `failed to resolve` - nên dò trên
   cả output là tự sinh false positive. Ca chỉ đọc dòng có entrypoint trong ngoặc
   kép.

## Hai luật đã chứng minh phá được

```
PHÁ: trả ./hooks/useToggle về types phẳng
  FAIL  02-attw:tinita-react   NGOÀI allowlist: FalseCJS

PHÁ: types + default trỏ file không tồn tại
  FAIL  02-attw:tinita-react   NGOÀI allowlist: NoResolution
  │ "tinita-react/hooks/useToggle" │ 🟢 │ 💀 Resolution failed │ 💀 ... │ 💀 ... │

GỠ: L1_EXIT=0
```

Lần phá đầu cho `NoResolution` **không** kích hoạt được nó: chỉ trỏ `types` vào
file thiếu thì `publint` bắt còn attw vẫn PASS. Phải phá cả `default` mới ra.
Nếu dừng ở lần đầu thì luật đó sẽ ở lại dưới dạng chưa chứng minh.

`ATTW_CRASHED` thì bằng chứng là chính lần crash thật của 0.18.2.

## Kết quả

```
PASS  02-attw:tinita         exit=0, 61/61 entrypoint JS, vấn đề: không
PASS  02-attw:tinita-react   exit=1, 17/38 entrypoint JS, vấn đề: không
PASS  02-attw:tinita-dom     exit=0, 23/23 entrypoint JS, vấn đề: không

pnpm gate                      GATE_EXIT=0  10/10 (l1 91.6s)
node compatibility/run.mjs l2  L2_EXIT=0    29 ca, 0 fail  (tsc:bundler/nodenext/node đều 96 specifier sạch)
node compatibility/run.mjs l4  L4_EXIT=0    30 ca, 0 fail, 6 skip
```

`typesVersions` không cần đổi: nó phục vụ `moduleResolution: node` bằng cách map
subpath -> `.d.ts`, không liên quan condition. L1 `08-typesversions-sync` vẫn
PASS với 16 pattern.

## Chưa làm: `utils/autoInjectStyles`

Nợ #16 nói nó chết, và ca L2 `autoInjectStyles-unused-at-runtime` canh điều đó.
Bỏ export là **breaking**, nên nó cùng cửa sổ với P4 - trước lần publish đầu.
Đây là quyết định của owner, plan không tự chốt.
