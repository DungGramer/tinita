'use client';

import React, { useMemo } from 'react';
import { getFileNameParts } from 'tinita/file/getFileNameParts';
import { Tree } from '../tree';
import type { TreeNode } from '../tree';
import { FileIcon } from './components/FileIcon';
import type { FileIconType, FileTreeProps, ParsedNode } from './types';
import { getIconType, parseFileTreeUniversal } from './utils';
import styles from './FileTree.module.css';

/**
 * FileTree - adapter từ chuỗi cây sang `Tree`.
 *
 * `FileTree` chỉ làm ba việc: đọc chuỗi thành node, gắn icon theo phần mở rộng, và
 * đưa cho `Tree`. Mọi hành vi - mở/đóng, bàn phím, chọn, chú thích, RTL, animation -
 * nằm ở `Tree`.
 *
 * Tách như vậy vì cấu trúc cây và cú pháp cây CLI là hai thứ khác nhau. Trước đây
 * chúng dính làm một, nên không dùng được component với dữ liệu đã có sẵn dạng cây -
 * phải chuyển ngược về chuỗi rồi parse lại.
 *
 * @example
 * ```tsx
 * <FileTree
 *   text={tree}
 *   sort="type"
 *   selected="src/components/Button.tsx"
 *   showDescriptions="src/components"
 * />
 * ```
 *
 * Có sẵn dữ liệu dạng cây thì dùng thẳng `Tree`:
 * ```tsx
 * import { Tree } from 'tinita-react/ui/tree';
 * <Tree nodes={nodes} />
 * ```
 */
export const FileTree = React.forwardRef<HTMLDivElement, FileTreeProps>(function FileTree(
  { text, showRoot, hideRootName = false, iconColors, style, className, ...treeProps },
  ref
) {
  const nodes = useMemo(() => {
    const parsed = parseFileTreeUniversal(text);

    // `showRoot` thắng `hideRootName` khi truyền cả hai.
    const keepRoot = showRoot ?? !hideRootName;
    const roots =
      !keepRoot && parsed.length === 1 && parsed[0]?.children ? parsed[0].children : parsed;

    return roots.map(toTreeNode);
  }, [text, showRoot, hideRootName]);

  /**
   * `iconColors` đi qua CSS variable chứ không phải một cơ chế riêng.
   *
   * Đây là inline style, và nó là ngoại lệ có chủ ý so với quy tắc "dùng class,
   * không dùng inline style": giá trị đến từ người dùng lúc chạy nên không thể có
   * sẵn trong stylesheet. Gán vào đúng biến mà theme vẫn dùng, nên nó không tạo ra
   * đường thứ hai để tô màu icon.
   */
  const iconStyle = useMemo(() => {
    if (!iconColors) return style;
    const vars: Record<string, string> = {};
    for (const [type, color] of Object.entries(iconColors)) {
      if (color) vars[`--tnt-filetree-icon-${type}`] = color;
    }
    return { ...vars, ...style } as React.CSSProperties;
  }, [iconColors, style]);

  return (
    <Tree
      {...treeProps}
      ref={ref}
      nodes={nodes}
      // GỘP chứ không ghi đè. Bản đầu viết `className={styles.root}` sau khi spread
      // `treeProps`, nên `className` của người dùng bị nuốt mất - có ca test bắt.
      className={[styles.root, className].filter(Boolean).join(' ')}
      style={iconStyle}
    />
  );
});

function toTreeNode(node: ParsedNode): TreeNode {
  const isFolder = node.children !== undefined;
  const iconType: FileIconType = isFolder ? 'folder' : (getIconType(node.name) as FileIconType);

  /**
   * Tách đuôi file để `overflow: 'truncate'` không ăn mất nó.
   *
   * `getFileNameParts` của `tinita` chứ không phải một `lastIndexOf('.')` viết tại
   * đây: nó đã xử lý dotfile (`.gitignore` là TÊN, không có đuôi), nhiều dấu chấm
   * (`my.file.txt` -> `txt`) và dấu chấm cuối, cùng bất biến
   * `name + ('.' + ext) === input`. `tinita` nằm ở `devDependencies` nên hàm này
   * được BUNDLE vào `dist/` - consumer không phải cài thêm gì (rule 5,
   * `docs/code-standards.md` mục "Quy Tắc Dependency").
   *
   * Thư mục không tách: `src.old/` là tên thư mục, `.old` không phải đuôi file.
   */
  const [base, extension] = isFolder ? [node.name, ''] : getFileNameParts(node.name);

  return {
    id: node.path,
    name: base,
    ...(extension ? { nameSuffix: `.${extension}` } : {}),
    ...(node.description !== undefined ? { description: node.description } : {}),
    icon: <FileIcon iconType={iconType} />,
    ...(isFolder ? { expandedIcon: <FileIcon iconType="folder" open /> } : {}),
    ...(node.children ? { children: node.children.map(toTreeNode) } : {}),
  };
}
