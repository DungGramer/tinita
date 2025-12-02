/**
 * FolderNode Component
 *
 * Internal component for rendering folder nodes with accordion functionality.
 * Uses Radix UI Accordion for smooth animations.
 */

import React, { useState } from 'react';
import * as Accordion from '@radix-ui/react-accordion';
import type { FileNode } from '../types';
import { FileLabel } from './FileLabel';
import { renderTreeNodes } from './TreeNodes';

export interface FolderNodeProps {
  /** The folder node data */
  node: FileNode;
  /** Current nesting level */
  level: number;
  /** Display name for the folder */
  displayName: string;
  /** Icon type identifier */
  iconType: string;
  /** Whether to show arrow icon */
  showArrow: boolean;
  /** Whether animations are enabled */
  enableAnimation: boolean;
  /** Unique value for accordion item */
  itemValue: string;
}

/**
 * FolderNode - Renders a folder with collapsible children
 *
 * @internal
 */
export const FolderNode: React.FC<FolderNodeProps> = ({
  node,
  level,
  displayName,
  iconType,
  showArrow,
  enableAnimation,
  itemValue,
}) => {
  const [isExpanded, setIsExpanded] = useState(enableAnimation);

  const handleToggle = () => {
    setIsExpanded((prev) => !prev);
  };

  return (
    <Accordion.Item
      value={itemValue}
      className="tinita-filetree__accordion-item"
      data-expanded={isExpanded}
    >
      <Accordion.Trigger
        className="tinita-filetree__accordion-trigger"
        onClick={handleToggle}
      >
        <FileLabel
          name={displayName}
          type="folder"
          iconType={iconType}
          isExpanded={isExpanded}
          showArrow={showArrow}
        />
      </Accordion.Trigger>
      <Accordion.Content className="tinita-filetree__accordion-content">
        {renderTreeNodes(node.children, level + 1, showArrow, enableAnimation)}
      </Accordion.Content>
    </Accordion.Item>
  );
};
