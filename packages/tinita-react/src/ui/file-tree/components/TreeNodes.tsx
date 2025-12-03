/**
 * TreeNodes Component
 *
 * Internal component for rendering tree nodes recursively.
 * Wraps folders in Radix UI Accordion for smooth animations.
 */

import React from 'react';
import * as Accordion from '@radix-ui/react-accordion';
import type { FileNode } from '../types';
import { getIconType } from '../utils';
import { FolderNode, FileLabel } from './';

export interface TreeNodesProps {
  /** Array of nodes to render */
  nodes: FileNode[];
  /** Current nesting level */
  level?: number;
  /** Whether to show arrow icons */
  showArrow?: boolean;
  /** Whether animations are enabled */
  enableAnimation?: boolean;
}

/**
 * Render tree nodes recursively
 *
 * @internal
 */
export const renderTreeNodes = (
  nodes: FileNode[],
  level = 0,
  showArrow = false,
  enableAnimation = true
): React.ReactElement => {
  // Collect all folder values for default expanded state
  const folderValues: string[] = [];
  nodes.forEach((node, idx) => {
    const hasChildren = node.children.length > 0;
    if (hasChildren) {
      folderValues.push(`${level}-${idx}`);
    }
  });

  return (
    <Accordion.Root type="multiple" defaultValue={folderValues} asChild>
      <ul className="tinita-filetree__list" data-level={level}>
        {nodes.map((node, idx) => {
          const hasChildren = node.children.length > 0;
          const isFolder = hasChildren || node.name.endsWith('/');
          const displayName = node.name.replace(/\/$/, '');
          const iconType = isFolder ? 'folder' : getIconType(node.name);

          const key = `${level}-${idx}-${displayName}`;
          const itemValue = `${level}-${idx}`;

          return (
            <li key={key} className="tinita-filetree__item">
              {isFolder && hasChildren ? (
                <FolderNode
                  node={node}
                  level={level}
                  displayName={displayName}
                  iconType={iconType}
                  showArrow={showArrow}
                  enableAnimation={enableAnimation}
                  itemValue={itemValue}
                />
              ) : (
                <FileLabel
                  name={displayName}
                  type={isFolder ? 'folder' : 'file'}
                  iconType={iconType}
                  isExpanded={false}
                  showArrow={false}
                />
              )}
            </li>
          );
        })}
      </ul>
    </Accordion.Root>
  );
};
