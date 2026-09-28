import type { ReactNode } from 'react';

/**
 * Một node trong cây.
 *
 * `children` phân biệt ba trạng thái, và sự phân biệt đó là có ý nghĩa:
 * - `undefined` -> đây là LÁ (file). Không có mũi tên, không mở được.
 * - `[]`        -> thư mục RỖNG. Có mũi tên, mở ra thì trống.
 * - `[...]`     -> thư mục có nội dung.
 *
 * Bản cũ dùng `children.length > 0` nên thư mục rỗng và file là một - không
 * hiển thị khác nhau được.
 */
export interface TreeNode {
  /**
   * Định danh ỔN ĐỊNH và duy nhất trong cả cây.
   *
   * Đây là thứ `expanded`, `selected` và `showDescriptions` nhắm tới, nên nó phải
   * có nghĩa với người dùng. `FileTree` dùng đường dẫn đầy đủ
   * (`src/components/Button.tsx`). Bản cũ dùng `${level}-${idx}` - đổi thứ tự sort
   * là mọi trạng thái mở/đóng nhảy sang node khác.
   */
  id: string;
  /** Nhãn hiển thị. */
  name: string;
  /**
   * Phần đuôi của nhãn KHÔNG BAO GIỜ bị rút ngắn.
   *
   * Tồn tại vì `overflow: 'truncate'`. Rút `Button.stories.tsx` thành
   * `Button.stor…` là mất đúng phần mang thông tin - đuôi file cho biết đó là
   * cái gì. Tách ra hai span thì `name` co lại còn `nameSuffix` giữ nguyên, ra
   * `Button.stor….tsx`.
   *
   * `Tree` không biết gì về file nên nó không tự tách: `FileTree` tách bằng
   * `getFileNameParts` của `tinita` rồi truyền `'.tsx'` vào đây. Bất biến:
   * `name + (nameSuffix ?? '')` phải bằng đúng nhãn gốc - sort và gõ-để-nhảy đều
   * dựa vào đó.
   */
  nameSuffix?: string;
  /** Xem ghi chú ở trên: `undefined` là lá, `[]` là thư mục rỗng. */
  children?: TreeNode[];
  /** Chú thích. Hiện inline hay trong tooltip do `showDescriptions` quyết định. */
  description?: string;
  /** Icon lúc đóng, hoặc icon của lá. */
  icon?: ReactNode;
  /** Icon lúc mở. Không truyền thì dùng `icon`. */
  expandedIcon?: ReactNode;
  /** Không focus được, không mở được. */
  disabled?: boolean;
}

/**
 * - `'name'`: theo tên, so sánh tự nhiên (`file2` trước `file10`).
 * - `'type'`: thư mục trước, rồi tới file, mỗi nhóm theo tên.
 * - `'none'`: giữ nguyên thứ tự đầu vào. Mặc định - thứ tự trong chuỗi tree
 *   thường đã có nghĩa.
 * - hàm: so sánh tuỳ ý, áp cho từng cấp.
 */
export type TreeSort = 'name' | 'type' | 'none' | ((a: TreeNode, b: TreeNode) => number);

/**
 * Ngữ cảnh truyền cho `renderNode`.
 *
 * `defaultContent` có mặt để `renderNode` BỌC được thay vì phải thay thế. Không có
 * nó thì mọi tuỳ biến nhỏ đều buộc người dùng dựng lại icon, mũi tên, chú thích và
 * thụt lề - và họ sẽ dựng sai.
 */
export interface TreeNodeRenderContext {
  node: TreeNode;
  /** 0 là cấp ngoài cùng. */
  level: number;
  isExpanded: boolean;
  isSelected: boolean;
  /** `children` khác `undefined`. Thư mục rỗng vẫn là thư mục. */
  isFolder: boolean;
  /** id của tổ tiên, gần nhất đứng cuối. */
  ancestors: string[];
  /** Nội dung mặc định: mũi tên + icon + tên + chú thích. */
  defaultContent: ReactNode;
  /** Mở/đóng. Không làm gì với lá. */
  toggle: () => void;
  /** Kích hoạt node (giống click hoặc Enter). */
  select: () => void;
}

export interface TreeProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'children'> {
  nodes: TreeNode[];

  /**
   * Trạng thái mở ban đầu khi KHÔNG kiểm soát.
   * - `true`: mở hết
   * - `false`: đóng hết
   * - `string[]`: chỉ những id này
   *
   * @default true
   */
  defaultExpanded?: boolean | string[];

  /** Danh sách id đang mở. Truyền vào là chuyển sang chế độ kiểm soát. */
  expanded?: string[];

  /** Gọi khi người dùng mở/đóng. Bắt buộc phải có nếu dùng `expanded`. */
  onExpandedChange?: (expanded: string[]) => void;

  /**
   * id của node đang được chọn, để tô sáng.
   * Ví dụ: `selected="src/components/Button.tsx"`.
   */
  selected?: string;

  /**
   * Gọi khi người dùng kích hoạt một node (click, Enter, Space).
   *
   * Tên là `onSelectedChange` chứ không phải `onSelect` vì `onSelect` đã là một
   * prop DOM (sự kiện bôi đen văn bản). Đè lên nó sẽ lặng lẽ làm hỏng code đang
   * truyền handler DOM xuống.
   */
  onSelectedChange?: (node: TreeNode) => void;

  /** @default 'none' */
  sort?: TreeSort;

  /**
   * Chú thích nào hiện INLINE. Phần còn lại vào tooltip, và node nào có chú thích
   * đều mang dấu `?` ở cuối hàng.
   *
   * - `false` (mặc định): không có chú thích nào inline
   * - `true`: tất cả inline
   * - `string | string[]`: chỉ node nằm TRONG các id này (tính cả chính nó)
   *
   * @default false
   */
  showDescriptions?: boolean | string | string[];

  /** Thay hoặc bọc nội dung một hàng. */
  renderNode?: (node: TreeNode, context: TreeNodeRenderContext) => ReactNode;

  /**
   * Nhãn dài hơn khung thì làm gì. Đây là câu hỏi CHỈ xuất hiện trên màn hình hẹp,
   * và ba câu trả lời đều đúng ở hoàn cảnh khác nhau - nên nó là prop, không phải
   * một mặc định ép buộc.
   *
   * - `'scroll'` (mặc định): hàng rộng bằng nội dung, cả cây cuộn ngang. Không mất
   *   ký tự nào. Đây là hành vi của VS Code và của bản trước, nên nó là mặc định.
   * - `'truncate'`: hàng vừa khung, tên rút bằng `…`, phần `nameSuffix` (đuôi file)
   *   luôn hiện. Nhãn đầy đủ vẫn có trong `title` để hover đọc được.
   * - `'wrap'`: tên xuống dòng. Không cuộn, không mất ký tự, nhưng hàng cao không
   *   đều nên khó quét mắt trên cây lớn.
   *
   * @default 'scroll'
   */
  overflow?: 'truncate' | 'scroll' | 'wrap';

  /** Đường kẻ dọc theo cấp. @default true */
  indicator?: boolean;

  /** @default 'md' */
  size?: 'sm' | 'md' | 'lg';

  /** @default 'md' */
  borderRadius?: 'sm' | 'md' | 'lg';

  /** Mũi tên mở/đóng cho thư mục. @default false */
  showArrow?: boolean;

  /**
   * Animation mở/đóng. Luôn tắt khi người dùng bật `prefers-reduced-motion`.
   * @default true
   */
  enableAnimation?: boolean;

  /** Không truyền thì theo dark mode của trang. */
  theme?: 'dark' | 'light';

  /** Nhãn cho `role="tree"`. Bỏ qua nếu đã có `aria-labelledby`. */
  'aria-label'?: string;
}
