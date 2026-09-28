/**
 * FileTree Component
 *
 * A tree view component for displaying hierarchical file/folder structures from text input.
 * Supports both indent-based and CLI tree formats.
 * Uses Radix UI Accordion for smooth animations.
 *
 * @example
 * ```tsx
 * const treeText = `
 * content/
 *   1_photography/
 *     album.txt
 *     photo.jpg
 * `;
 *
 * <FileTree text={treeText} />
 * ```
 */

'use client';

import React, { forwardRef, useMemo } from 'react';
import type { FileTreeProps } from './types';
import { parseFileTreeUniversal } from './utils';
import { renderTreeNodes } from './components';
import { variantAttributes } from '../../utils/variantAttributes';
import styles from './FileTree.module.css';

/**
 * FileTree - A tree view component for displaying hierarchical file/folder structures
 *
 * @public
 */
export const FileTree = forwardRef<HTMLDivElement, FileTreeProps>(
  (
    {
      text,
      className,
      hideRootName,
      // KHÔNG default 'light'. `undefined` nghĩa là "theo chủ nhà", và đó là hành vi
      // đúng: host bật dark thì component theo dark. Default 'light' sẽ render
      // `data-theme="light"` luôn, và từ khi `[data-theme='light']` có rule thật
      // (2026-09-28) thì nó ÉP sáng mọi component nằm trong host dark.
      theme,
      indicator = true,
      size = 'md',
      borderRadius = 'md',
      showArrow = false,
      enableAnimation = true,
      ...props
    },
    ref
  ) => {
    // Parse tree structure
    const tree = useMemo(() => parseFileTreeUniversal(text), [text]);

    // Optionally hide root name
    const wrappedTree = hideRootName && tree.length === 1 ? tree[0].children : tree;

    const containerClassName = [styles.root, className].filter(Boolean).join(' ');

    return (
      <div
        ref={ref}
        className={containerClassName}
        {...variantAttributes({
          theme,
          indicator,
          size,
          borderRadius,
          showArrow,
          animation: enableAnimation,
        })}
        {...props}
      >
        {renderTreeNodes(wrappedTree, 0, showArrow, enableAnimation)}
      </div>
    );
  }
);

FileTree.displayName = 'FileTree';
