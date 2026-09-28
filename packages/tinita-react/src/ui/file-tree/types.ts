import type { TreeProps } from '../tree';

/**
 * Node do parser sinh ra.
 *
 * `children === undefined` là FILE. `children === []` là thư mục rỗng. Dấu `/` ở
 * cuối tên trong chuỗi đầu vào là tín hiệu duy nhất phân biệt hai thứ đó.
 *
 * @internal
 */
export interface ParsedNode {
  name: string;
  /** Đường dẫn đầy đủ, ví dụ `src/components/Button.tsx`. Đây là `id` của node. */
  path: string;
  description?: string;
  children?: ParsedNode[];
}

/**
 * Hình dạng node của bản đầu.
 *
 * Giữ nguyên để không phá code đang import nó. Parser giờ trả `ParsedNode` - có
 * thêm `path` và `description`, và `children` là tuỳ chọn để phân biệt file với
 * thư mục rỗng. `FileNode` vẫn gán được vào `ParsedNode` nếu bạn thêm `path`.
 *
 * @public
 */
export interface FileNode {
  name: string;
  children: FileNode[];
}

/**
 * Kiểu icon suy ra từ phần mở rộng. `iconColors` nhận đúng các khoá này.
 *
 * @public
 */
export type FileIconType =
  | 'folder'
  | 'file'
  | 'readme'
  | 'markdown'
  | 'javascript'
  | 'css'
  | 'html'
  | 'json'
  | 'database'
  | 'php'
  | 'vue'
  | 'git'
  | 'text'
  | 'code'
  | 'font'
  | 'image'
  | 'video'
  | 'audio'
  | 'spreadsheet'
  | 'archive';

/**
 * Props của FileTree.
 *
 * Kế thừa toàn bộ props của `Tree` trừ `nodes` - `FileTree` dựng `nodes` từ `text`.
 * Nếu bạn đã có cây dạng dữ liệu thì dùng thẳng `Tree`, đừng chuyển nó về chuỗi.
 *
 * @public
 */
export interface FileTreeProps extends Omit<TreeProps, 'nodes'> {
  /**
   * Cây dạng văn bản, một trong hai định dạng:
   *
   * **Thụt lề 2 dấu cách:**
   * ```
   * src/
   *   components/
   *     Button.tsx
   * ```
   *
   * **Cây CLI (Windows/Unix):**
   * ```
   * project/
   * ├── src/          ? Mã nguồn
   * │   └── app.tsx   ? Điểm vào
   * └── README.md     ? Tài liệu
   * ```
   *
   * Dấu `?` có khoảng trắng đứng trước tách phần chú thích. `showDescriptions`
   * quyết định chú thích hiện inline hay nằm trong tooltip.
   */
  text: string;

  /**
   * Hiện node gốc. Đặt `false` khi gốc chỉ là đường dẫn máy (`D:\PROJECT`) và
   * không mang thông tin gì - các con của nó lên làm cấp ngoài cùng.
   *
   * Chỉ có tác dụng khi cây có ĐÚNG một gốc.
   *
   * @default true
   */
  showRoot?: boolean;

  /**
   * Ẩn tên node gốc. Nghịch đảo của `showRoot`, giữ nguyên từ bản đầu.
   *
   * Truyền cả hai thì `showRoot` thắng.
   *
   * @default false
   */
  hideRootName?: boolean;

  /**
   * Ghi đè màu icon theo loại.
   *
   * ```tsx
   * <FileTree text={tree} iconColors={{ folder: '#eab308', javascript: '#f7df1e' }} />
   * ```
   *
   * Giá trị được gán vào biến `--tnt-filetree-icon-*` trên phần tử gốc, nên nó
   * theo đúng đường mà theme vẫn đi - không phải một cơ chế thứ hai.
   */
  iconColors?: Partial<Record<FileIconType, string>>;
}
