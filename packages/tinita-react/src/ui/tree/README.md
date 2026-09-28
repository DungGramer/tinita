# Tree

Primitive cây tổng quát. Nhận dữ liệu dạng cây, **không** biết gì về file, về phần
mở rộng, hay về cú pháp cây CLI - [`FileTree`](../file-tree) mới là adapter cho
những thứ đó.

Tách như vậy để component không bị khoá vào một định dạng chuỗi. Có sẵn dữ liệu dạng
cây thì dùng thẳng `Tree`, đừng chuyển ngược về chuỗi rồi parse lại.

**Zero optional peer.** `Tree` tự vẽ chevron và dấu `?` bằng SVG, không kéo theo
`lucide-react`.

## Dùng

```tsx
import { Tree } from 'tinita-react/ui/tree';
import type { TreeNode } from 'tinita-react/ui/tree';
import 'tinita-react/styles.css';

const nodes: TreeNode[] = [
  {
    id: 'docs',
    name: 'Tài liệu',
    description: 'Mọi thứ người đọc cần',
    children: [
      { id: 'docs/bat-dau', name: 'Bắt đầu' },
      { id: 'docs/trong', name: 'Chưa viết', children: [] },
    ],
  },
  { id: 'changelog', name: 'Changelog' },
];

<Tree nodes={nodes} aria-label="Tài liệu" />;
```

## `TreeNode`

| Trường         | Kiểu         | Mô tả                                                           |
| -------------- | ------------ | --------------------------------------------------------------- |
| `id`           | `string`     | **Bắt buộc.** Định danh ổn định, duy nhất trong cả cây.         |
| `name`         | `string`     | **Bắt buộc.** Nhãn hiển thị.                                    |
| `nameSuffix`   | `string`     | Đuôi nhãn không bao giờ bị rút. Xem `overflow`.                 |
| `children`     | `TreeNode[]` | Xem bảng dưới.                                                  |
| `description`  | `string`     | Chú thích. Inline hay tooltip do `showDescriptions` quyết định. |
| `icon`         | `ReactNode`  | Icon lúc đóng, hoặc icon của lá.                                |
| `expandedIcon` | `ReactNode`  | Icon lúc mở. Không truyền thì dùng `icon`.                      |
| `disabled`     | `boolean`    | Không focus được, không mở được.                                |

`children` phân biệt **ba** trạng thái, và sự phân biệt đó là có ý nghĩa:

| `children`  | Nghĩa                                          |
| ----------- | ---------------------------------------------- |
| `undefined` | **lá** (file). Không có mũi tên, không mở được |
| `[]`        | thư mục **rỗng**. Có mũi tên, mở ra thì trống  |
| `[...]`     | thư mục có nội dung                            |

`id` phải **ổn định**, không phải vị trí. Nó là thứ `expanded`, `selected` và
`showDescriptions` nhắm tới. Bản đầu dùng `${level}-${idx}`: đổi thứ tự sort là mọi
trạng thái mở/đóng nhảy sang node khác.

## Props

Xem bảng đầy đủ trong [`README` của `FileTree`](../file-tree/README.md#props) -
`FileTreeProps` kế thừa toàn bộ `TreeProps` trừ `nodes`. Bảng đó là nguồn duy nhất,
để hai nơi không nói khác nhau.

Riêng `Tree`:

```tsx
<Tree nodes={nodes} />
```

`nodes: TreeNode[]` là prop bắt buộc duy nhất.

## Bàn phím

Chuẩn [ARIA tree](https://www.w3.org/WAI/ARIA/apg/patterns/treeview/), roving
tabindex - cả cây là **một** điểm dừng Tab. Bảng phím: xem
[`FileTree`](../file-tree/README.md#bàn-phím).

`Tree` mượn `Collapsible.Root` + `Panel` của Base UI cho phần đóng/mở, nhưng
**không** dùng `Collapsible.Trigger`: nó render `<button aria-expanded>`, mà trong
`role="tree"` thì `aria-expanded` thuộc về `treeitem`. Khai hai lần là trình đọc màn
hình đọc sai.

## Hiệu năng

Hai quyết định, cả hai đều có số đo (2026-09-28, cây 1364 dòng):

1. **Cây con đang đóng không nằm trong DOM.** Số node DOM lúc đóng: 7277 -> 145.
2. **Mỗi node nghe đúng id của mình** qua `useSyncExternalStore` + `React.memo`.
   Trước đó `Set` id đang mở nằm trong state và truyền xuống, nên mỗi lần toggle là
   **mọi** hàng render lại - đo được 242ms đứng luồng chính. Chi tiết trong
   `store.ts`.

## RTL

Mọi thuộc tính chiều ngang trong CSS là **logical**
(`padding-inline-start`, `inset-inline-start`). Thụt lề, đường kẻ chỉ mục và mũi tên
đều lật trong `dir="rtl"`, và mũi tên trái/phải trên bàn phím đảo nghĩa.

Tên node mang `dir="auto"` nên tên tiếng Ả Rập không bị đảo trong giao diện LTR và
tên ASCII không bị đảo trong giao diện RTL.
