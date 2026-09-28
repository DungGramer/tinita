'use client';

import React, { useMemo } from 'react';
import { getFileNameParts } from 'tinita/file/getFileNameParts';
import { cn } from '../../utils/cn';
import { Tree } from '../tree';
import type { TreeNode } from '../tree';
import { FileIcon } from './components/FileIcon';
import type { FileIconType, FileTreeProps, ParsedNode } from './types';
import { getIconType, parseFileTreeUniversal } from './utils';
import styles from './FileTree.module.css';

/**
 * FileTree - adapter from a tree string to `Tree`.
 *
 * It does exactly three things: parse the string into nodes, attach icons by file
 * extension, and hand the result to `Tree`. Every behaviour - expand/collapse,
 * keyboard, selection, descriptions, RTL, animation, overflow - lives in `Tree`.
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
 * If you already have tree-shaped data, use `Tree` directly:
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

    // `showRoot` wins over `hideRootName` when both are passed.
    const keepRoot = showRoot ?? !hideRootName;
    const roots =
      !keepRoot && parsed.length === 1 && parsed[0]?.children ? parsed[0].children : parsed;

    return roots.map(toTreeNode);
  }, [text, showRoot, hideRootName]);

  /**
   * `iconColors` goes through the same CSS variables the theme uses, so there is
   * only one path for colouring icons.
   *
   * Inline style is a deliberate exception here: the values arrive at runtime and
   * cannot exist in the stylesheet ahead of time.
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
      // Merge, never overwrite: assigning after the spread would swallow the
      // caller's `className`.
      className={cn(styles.root, className)}
      style={iconStyle}
    />
  );
});

function toTreeNode(node: ParsedNode): TreeNode {
  const isFolder = node.children !== undefined;
  const iconType: FileIconType = isFolder ? 'folder' : (getIconType(node.name) as FileIconType);

  /**
   * Split off the file extension so `overflow: 'truncate'` cannot eat it.
   *
   * `getFileNameParts` rather than a local `lastIndexOf('.')`: it already handles
   * dotfiles (`.gitignore` is a name with no extension), multiple dots
   * (`my.file.txt` -> `txt`) and a trailing dot, and guarantees
   * `name + ('.' + ext) === input`. It is bundled into `dist/`, so consumers
   * install nothing extra.
   *
   * Folders are not split: `src.old/` is a folder name, `.old` is not an extension.
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
