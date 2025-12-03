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

import React, { forwardRef, useMemo } from 'react';
import type { FileTreeProps } from './types';
import { parseFileTreeUniversal } from './utils';
import { renderTreeNodes } from './components';

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
      theme = 'light',
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

    const containerClassName = ['tinita-filetree', className].filter(Boolean).join(' ');

    return (
      <div
        ref={ref}
        className={containerClassName}
        data-theme={theme}
        data-indicator={indicator}
        data-size={size}
        data-border-radius={borderRadius}
        data-show-arrow={showArrow}
        data-animation={enableAnimation}
        {...props}
      >
        {renderTreeNodes(wrappedTree, 0, showArrow, enableAnimation)}
      </div>
    );
  }
);

FileTree.displayName = 'FileTree';
