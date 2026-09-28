# FileTree

Vẽ cây thư mục từ một chuỗi văn bản.

`FileTree` là **adapter**: nó đọc chuỗi thành node, gắn icon theo phần mở rộng, rồi
đưa cho [`Tree`](../tree). Mọi hành vi - mở/đóng, bàn phím, chọn, chú thích, RTL,
animation, tràn ngang - nằm ở `Tree`.

Đã có dữ liệu dạng cây thì **dùng thẳng `Tree`**, đừng chuyển nó về chuỗi rồi parse
lại:

```tsx
import { Tree } from 'tinita-react/ui/tree';

<Tree nodes={nodes} />;
```

## Cài đặt

```bash
pnpm add tinita-react lucide-react
```

`lucide-react` là **optional peer**, chỉ `FileTree` cần (nó vẽ icon theo loại file).
`Tree` không cần. Xem `docs/code-standards.md` mục "Quy Tắc Dependency".

CSS phải import một lần ở gốc ứng dụng:

```tsx
import 'tinita-react/styles.css';
// hoặc, nếu app đã dùng cascade layer:
import 'tinita-react/styles.layer.css';
```

## Dùng cơ bản

```tsx
import { FileTree } from 'tinita-react/ui/file-tree';

const tree = `
src/
  components/
    Button.tsx
    index.ts
  utils/
    format.ts
README.md
`;

<FileTree text={tree} />;
```

## Định dạng đầu vào

Parser nhận **cả hai** định dạng, tự nhận biết.

**Thụt lề 2 dấu cách:**

```
project/
  src/
    app.tsx
  README.md
```

**Cây CLI (`tree` của Windows hoặc Unix):**

```
project/
├── src/
│   └── app.tsx
└── README.md
```

Hai quy ước quan trọng:

| Viết          | Nghĩa               |
| ------------- | ------------------- |
| `docs/`       | thư mục             |
| `docs`        | **file** tên `docs` |
| `empty/` rỗng | thư mục rỗng        |

Dấu `/` ở cuối là tín hiệu **duy nhất** phân biệt file với thư mục rỗng.

### Chú thích bằng `?`

Dấu `?` có **khoảng trắng đứng trước** tách phần chú thích:

```
src/          ? Mã nguồn
  app.tsx     ? Điểm vào
  types.ts
```

Yêu cầu khoảng trắng là có chủ ý: `foo?.ts` là tên file hợp lệ và nó không bị cắt.

`showDescriptions` quyết định chú thích hiện inline hay nằm trong tooltip.

## Props

`FileTreeProps` kế thừa **toàn bộ** `TreeProps` trừ `nodes`, cộng thêm:

| Prop           | Kiểu                                    | Mặc định | Mô tả                                                                                            |
| -------------- | --------------------------------------- | -------- | ------------------------------------------------------------------------------------------------ |
| `text`         | `string`                                | -        | **Bắt buộc.** Cây dạng văn bản.                                                                  |
| `showRoot`     | `boolean`                               | `true`   | Ẩn node gốc khi nó chỉ là đường dẫn máy (`D:\PROJECT`). Chỉ có tác dụng khi cây có đúng một gốc. |
| `hideRootName` | `boolean`                               | `false`  | Nghịch đảo của `showRoot`, giữ từ bản đầu. Truyền cả hai thì `showRoot` thắng.                   |
| `iconColors`   | `Partial<Record<FileIconType, string>>` | -        | Ghi đè màu icon theo loại.                                                                       |

Props thừa hưởng từ `Tree`:

| Prop               | Kiểu                                             | Mặc định   | Mô tả                                                      |
| ------------------ | ------------------------------------------------ | ---------- | ---------------------------------------------------------- |
| `defaultExpanded`  | `boolean \| string[]`                            | `true`     | Trạng thái mở ban đầu khi không kiểm soát.                 |
| `expanded`         | `string[]`                                       | -          | Danh sách id đang mở. Truyền vào là chuyển sang kiểm soát. |
| `onExpandedChange` | `(expanded: string[]) => void`                   | -          | Bắt buộc nếu dùng `expanded`.                              |
| `selected`         | `string`                                         | -          | id node đang chọn, để tô sáng.                             |
| `onSelectedChange` | `(node: TreeNode) => void`                       | -          | Gọi khi click / Enter / Space.                             |
| `sort`             | `'none' \| 'name' \| 'type' \| (a, b) => number` | `'none'`   | `'type'` đưa thư mục lên trước.                            |
| `showDescriptions` | `boolean \| string \| string[]`                  | `false`    | Chú thích nào hiện inline. Còn lại vào tooltip.            |
| `overflow`         | `'scroll' \| 'truncate' \| 'wrap'`               | `'scroll'` | Nhãn dài hơn khung thì làm gì. Xem mục dưới.               |
| `renderNode`       | `(node, context) => ReactNode`                   | -          | Thay hoặc **bọc** nội dung một hàng.                       |
| `indicator`        | `boolean`                                        | `true`     | Đường kẻ dọc theo cấp.                                     |
| `size`             | `'sm' \| 'md' \| 'lg'`                           | `'md'`     | Mật độ hàng.                                               |
| `borderRadius`     | `'sm' \| 'md' \| 'lg'`                           | `'md'`     | Bo góc hàng.                                               |
| `showArrow`        | `boolean`                                        | `false`    | Mũi tên mở/đóng cho thư mục.                               |
| `enableAnimation`  | `boolean`                                        | `true`     | Luôn tắt khi bật `prefers-reduced-motion`.                 |
| `theme`            | `'dark' \| 'light'`                              | -          | Không truyền thì theo dark mode của trang.                 |

`id` của mỗi node là **đường dẫn đầy đủ** (`src/components/Button.tsx`). Đây là thứ
`expanded`, `selected` và `showDescriptions` nhắm tới.

## Nhãn dài: `overflow`

Câu hỏi này chỉ xuất hiện trên màn hình hẹp, và ba câu trả lời đều đúng ở hoàn cảnh
khác nhau.

```tsx
<FileTree text={tree} overflow="truncate" />
```

| Giá trị      | Hành vi                                                                                                 |
| ------------ | ------------------------------------------------------------------------------------------------------- |
| `'scroll'`   | **Mặc định.** Hàng rộng bằng nội dung, cả cây cuộn ngang. Không mất ký tự nào. Đây là cách VS Code làm. |
| `'truncate'` | Hàng vừa khung, tên rút bằng `…`, **đuôi file vẫn hiện**. Nhãn đầy đủ nằm trong `title`.                |
| `'wrap'`     | Tên xuống dòng. Không cuộn, không mất ký tự, nhưng hàng cao không đều nên khó quét mắt trên cây lớn.    |

`'truncate'` cho ra `UserProfileSetti….tsx` chứ không phải `UserProfileSettings…` -
đuôi file là phần mang thông tin nhất khi tên bị rút. `FileTree` tách đuôi bằng
[`getFileNameParts`](../../../../tinita/src/file/getFileNameParts.ts) của `tinita`,
nên dotfile (`.gitignore` là **tên**, không có đuôi) và nhiều dấu chấm
(`.env.production.local`) đều đúng.

Dùng `Tree` thuần thì tự truyền `nameSuffix` cho node - `Tree` không biết gì về file:

```tsx
<Tree
  overflow="truncate"
  nodes={[{ id: 'a', name: 'BaoCaoQuyIV_2026_final', nameSuffix: '.xlsx' }]}
/>
```

Bất biến: `name + (nameSuffix ?? '')` phải bằng đúng nhãn gốc. Sort và gõ-để-nhảy
đều dựa vào đó.

## Ví dụ

### Kiểm soát trạng thái mở

```tsx
const [expanded, setExpanded] = useState<string[]>(['src']);

<FileTree text={tree} expanded={expanded} onExpandedChange={setExpanded} />;
```

### Tô sáng file đang mở

```tsx
<FileTree text={tree} selected={currentPath} onSelectedChange={(node) => router.push(node.id)} />
```

### Chú thích chỉ cho một nhánh

```tsx
<FileTree text={tree} showDescriptions="src/components" />
```

Node ngoài nhánh vẫn giữ chú thích, nhưng nó vào tooltip và hàng mang dấu `?` ở cuối.

### Bọc nội dung hàng

`renderNode` nhận `defaultContent` nên bọc được thay vì phải dựng lại từ đầu:

```tsx
<FileTree
  text={tree}
  renderNode={(node, ctx) => (
    <>
      {ctx.defaultContent}
      {ctx.isFolder && <span className="count">{node.children?.length}</span>}
    </>
  )}
/>
```

### Đổi màu icon

```tsx
<FileTree text={tree} iconColors={{ folder: '#eab308', javascript: '#f7df1e' }} />
```

Giá trị được gán vào biến `--tnt-filetree-icon-*` trên phần tử gốc, tức đi đúng
đường mà theme vẫn đi - không phải một cơ chế thứ hai.

## Bàn phím

Theo chuẩn [ARIA tree](https://www.w3.org/WAI/ARIA/apg/patterns/treeview/). Cả cây là
**một** điểm dừng Tab (roving tabindex).

| Phím              | Hành động                                       |
| ----------------- | ----------------------------------------------- |
| `↑` / `↓`         | Hàng trước / sau (chỉ tính hàng đang nhìn thấy) |
| `→`               | Mở thư mục; đã mở thì xuống con đầu             |
| `←`               | Đóng thư mục; đã đóng thì về cha                |
| `Home` / `End`    | Hàng đầu / hàng cuối                            |
| `Enter` / `Space` | Mở/đóng và kích hoạt node                       |
| `*`               | Mở mọi thư mục anh em cùng cấp                  |
| chữ cái           | Nhảy tới node kế tiếp bắt đầu bằng chữ đó       |

Trong `dir="rtl"`, `←` và `→` **đảo nghĩa**.

## Styling

Toàn bộ class là CSS Modules, sinh ra với tiền tố `tnt-`: `.tnt-tree-root`,
`.tnt-tree-row`, `.tnt-file-tree-root`. Không có class global nào rò vào trang của
bạn.

### Biến CSS

Chỉnh cấu trúc và màu qua biến, không cần ghi đè selector:

```css
:root {
  --tnt-tree-bg: #ffffff;
  --tnt-tree-text: #1a1a1a;
  --tnt-tree-text-dim: #6b7280;
  --tnt-tree-hover: rgb(0 0 0 / 0.06);
  --tnt-tree-selected-bg: rgb(37 99 235 / 0.12);
  --tnt-tree-font: Menlo, Monaco, 'Courier New', monospace;
  --tnt-tree-font-size: 14px;
  --tnt-tree-indent: 16px;
  --tnt-tree-row-gap: 1px;
}
```

Màu icon: `--tnt-filetree-icon-<loại>` với `<loại>` là một giá trị của
`FileIconType` (`folder`, `javascript`, `markdown`, `image`, ...).

### Theme

Dark mode tự động theo `.dark` hoặc `[data-theme='dark']` trên bất kỳ tổ tiên nào.
Ép một cây về một theme:

```tsx
<FileTree text={tree} theme="light" />
```

## Animation

Đóng/mở dùng `Collapsible` của [Base UI](https://base-ui.com), **transition trên
`height`** theo đúng mẫu trong docs của nó - không phải keyframes. Chi tiết và lý do
nằm trong `Tree.module.css`.

Cây con **đang đóng không nằm trong DOM**. Trên cây 1364 dòng, điều này giảm số node
DOM lúc đóng từ 7277 xuống 145.

`prefers-reduced-motion: reduce` **tắt hẳn** animation, không dùng thời lượng gần-0.

## Kiểu TypeScript

```tsx
import type { FileTreeProps, FileIconType } from 'tinita-react/ui/file-tree';
import type { TreeNode, TreeProps, TreeSort } from 'tinita-react/ui/tree';
```

`FileNode` vẫn được export để không phá code cũ. Parser nội bộ giờ trả `ParsedNode`
(có thêm `path` và `description`, `children` là tuỳ chọn).

## Liên quan

- [`Tree`](../tree) - primitive, không phụ thuộc thư viện icon
- `docs/code-standards.md` - Quy Tắc Dependency, Quy Tắc CSS Chống Rò Rỉ Global
