import type { ReactNode } from 'react';

/**
 * One node in the tree.
 *
 * `children` distinguishes three states:
 * - `undefined` -> a leaf (file). No arrow, cannot expand.
 * - `[]`        -> an empty folder. Has an arrow, expands to nothing.
 * - `[...]`     -> a folder with contents.
 */
export interface TreeNode {
  /**
   * Stable identifier, unique across the whole tree.
   *
   * This is what `expanded`, `selected` and `showDescriptions` target. It must not
   * be positional: an id derived from index or depth makes every expanded and
   * selected state jump to a different node as soon as the sort order changes.
   * `FileTree` uses the full path (`src/components/Button.tsx`).
   */
  id: string;
  /** Display label. */
  name: string;
  /**
   * Tail of the label that is never shortened under `overflow: 'truncate'`, so
   * `Button.stories.tsx` cuts to `Button.stor….tsx` rather than `Button.stor…`.
   *
   * `Tree` never derives this: it knows nothing about files. `FileTree` supplies
   * `'.tsx'`.
   *
   * Invariant: `name + (nameSuffix ?? '')` must equal the original label. Sort and
   * type-ahead both read that concatenation.
   */
  nameSuffix?: string;
  /** See the note above: `undefined` is a leaf, `[]` is an empty folder. */
  children?: TreeNode[];
  /** Description. `showDescriptions` decides inline vs tooltip. */
  description?: string;
  /** Icon when collapsed, or the icon of a leaf. */
  icon?: ReactNode;
  /** Icon when expanded. Falls back to `icon`. */
  expandedIcon?: ReactNode;
  /** Not focusable, not expandable. */
  disabled?: boolean;
}

/**
 * - `'name'`: by name, natural compare (`file2` before `file10`).
 * - `'type'`: folders first, then files, each group by name.
 * - `'none'`: keep input order. The default, since the order in the source data
 *   usually already means something.
 * - function: any comparator, applied per level.
 */
export type TreeSort = 'name' | 'type' | 'none' | ((a: TreeNode, b: TreeNode) => number);

/**
 * Context handed to `renderNode`.
 *
 * `defaultContent` lets `renderNode` wrap the row instead of replacing it, so a
 * small customisation does not mean rebuilding the arrow, icon and description.
 */
export interface TreeNodeRenderContext {
  node: TreeNode;
  /** 0 is the outermost level. */
  level: number;
  isExpanded: boolean;
  isSelected: boolean;
  /** `children` is not `undefined`. An empty folder is still a folder. */
  isFolder: boolean;
  /** Ancestor ids, nearest last. */
  ancestors: string[];
  /** Default content: arrow + icon + name + description. */
  defaultContent: ReactNode;
  /** Expand/collapse. No-op on a leaf. */
  toggle: () => void;
  /** Activate the node (same as a click or Enter). */
  select: () => void;
}

export interface TreeProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'children'> {
  nodes: TreeNode[];

  /**
   * Initial expanded state when UNCONTROLLED.
   * - `true`: expand everything
   * - `false`: collapse everything
   * - `string[]`: only these ids
   *
   * @default true
   */
  defaultExpanded?: boolean | string[];

  /** Ids currently expanded. Passing it switches to controlled mode. */
  expanded?: string[];

  /** Called on expand/collapse. Required when using `expanded`. */
  onExpandedChange?: (expanded: string[]) => void;

  /**
   * Id of the selected node, for highlighting.
   * Example: `selected="src/components/Button.tsx"`.
   */
  selected?: string;

  /**
   * Called when the user activates a node (click, Enter, Space).
   *
   * Named `onSelectedChange` rather than `onSelect` because `onSelect` is already
   * a DOM prop (the text-selection event), and this component spreads the rest of
   * its props onto the root element.
   */
  onSelectedChange?: (node: TreeNode) => void;

  /** @default 'none' */
  sort?: TreeSort;

  /**
   * Which descriptions render INLINE. The rest go to a tooltip, and any node with
   * a description gets a `?` marker at the end of its row.
   *
   * - `false` (default): nothing inline
   * - `true`: everything inline
   * - `string | string[]`: only nodes WITHIN these ids (the id itself included)
   *
   * @default false
   */
  showDescriptions?: boolean | string | string[];

  /** Replace or wrap the content of a row. */
  renderNode?: (node: TreeNode, context: TreeNodeRenderContext) => ReactNode;

  /**
   * What to do when a label is wider than the container.
   *
   * - `'scroll'` (default): the row is as wide as its content and the tree scrolls
   *   sideways. Nothing is cut. This is what VS Code does.
   * - `'truncate'`: the row fits the container, the name is cut with `…`, and
   *   `nameSuffix` (the file extension) stays visible. The full label goes into
   *   `title`.
   * - `'wrap'`: the name wraps. No scrolling and nothing is cut, but rows have
   *   uneven heights, which makes a large tree harder to scan.
   *
   * @default 'scroll'
   */
  overflow?: 'truncate' | 'scroll' | 'wrap';

  /** Vertical guide line per level. @default true */
  indicator?: boolean;

  /** @default 'md' */
  size?: 'sm' | 'md' | 'lg';

  /** @default 'md' */
  borderRadius?: 'sm' | 'md' | 'lg';

  /** Expand/collapse arrow on folders. @default false */
  showArrow?: boolean;

  /**
   * Expand/collapse animation. Always off when the user has
   * `prefers-reduced-motion` set.
   * @default true
   */
  enableAnimation?: boolean;

  /** Left unset, the component follows the page's dark mode. */
  theme?: 'dark' | 'light';

  /** Label for `role="tree"`. Ignored when `aria-labelledby` is present. */
  'aria-label'?: string;
}
