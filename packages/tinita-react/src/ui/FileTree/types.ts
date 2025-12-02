/**
 * FileTree Types
 *
 * Type definitions for FileTree component and related utilities.
 */

/**
 * Internal file node structure
 *
 * @internal
 */
export interface FileNode {
  /** Node name (file or folder name) */
  name: string;
  /** Child nodes */
  children: FileNode[];
}

/**
 * FileTree component props
 *
 * @public
 */
export interface FileTreeProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, 'children'> {
  /**
   * Text tree input in one of the following formats:
   *
   * **Indent-based format (2 spaces):**
   * ```
   * root/
   *   folder/
   *     file.txt
   * ```
   *
   * **CLI tree format (Windows/Unix):**
   * ```
   * D:\PROJECT
   * ├───src
   * │   └───components
   * └───dist
   * ```
   */
  text: string;

  /**
   * Hide root node name when only one root exists.
   * Useful for hiding the root path (e.g., `D:\...`) in CLI tree format.
   *
   * @default false
   */
  hideRootName?: boolean;

  /**
   * Theme color scheme.
   * @default 'light'
   */
  theme?: 'dark' | 'light';

  /**
   * Whether to show the tree indicator line.
   * @default true
   */
  indicator?: boolean;

  /**
   * Size preset for density (padding).
   * - sm: Compact (0.8px 8px 0.8px 4px)
   * - md: Default (4px 8px 4px 4px)
   * - lg: Spacious (8px 8px 8px 4px)
   * @default 'md'
   */
  size?: 'sm' | 'md' | 'lg';

  /**
   * Border radius for hover state.
   * - sm: 1px
   * - md: 4px
   * - lg: 30px
   * @default 'md'
   */
  borderRadius?: 'sm' | 'md' | 'lg';

  /**
   * Whether to show arrow icon for folders (collapse/expand indicator).
   * @default false
   */
  showArrow?: boolean;

  /**
   * Enable smooth collapse/expand animations.
   * When enabled, folders will animate smoothly when expanding/collapsing.
   * Respects user's prefers-reduced-motion preference.
   * @default true
   */
  enableAnimation?: boolean;
};
