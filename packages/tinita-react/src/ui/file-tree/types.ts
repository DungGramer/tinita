import type { TreeProps } from '../tree';

/**
 * Node produced by the parser.
 *
 * `children === undefined` is a FILE. `children === []` is an empty folder. A
 * trailing `/` on the name in the input string is the only signal separating the
 * two.
 *
 * @internal
 */
export interface ParsedNode {
  name: string;
  /** Full path, e.g. `src/components/Button.tsx`. This is the node's `id`. */
  path: string;
  description?: string;
  children?: ParsedNode[];
}

/**
 * Legacy node shape, kept so existing imports keep working.
 *
 * The parser returns `ParsedNode` now: it adds `path` and `description`, and makes
 * `children` optional so a file can be told apart from an empty folder. A
 * `FileNode` is still assignable to `ParsedNode` once you add `path`.
 *
 * @public
 */
export interface FileNode {
  name: string;
  children: FileNode[];
}

/**
 * Icon type derived from the file extension. `iconColors` takes exactly these keys.
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
 * Props of FileTree.
 *
 * Inherits every `Tree` prop except `nodes` - `FileTree` builds `nodes` from
 * `text`. If you already have tree-shaped data, use `Tree` directly instead of
 * serialising it to a string.
 *
 * @public
 */
export interface FileTreeProps extends Omit<TreeProps, 'nodes'> {
  /**
   * The tree as text, in either of two formats:
   *
   * **Two-space indent:**
   * ```
   * src/
   *   components/
   *     Button.tsx
   * ```
   *
   * **CLI tree (Windows/Unix):**
   * ```
   * project/
   * ├── src/          ? Source code
   * │   └── app.tsx   ? Entry point
   * └── README.md     ? Docs
   * ```
   *
   * A `?` preceded by whitespace splits off the description. `showDescriptions`
   * decides whether descriptions render inline or in a tooltip.
   */
  text: string;

  /**
   * Show the root node. Set `false` when the root is just a machine path
   * (`D:\PROJECT`) and carries no information - its children then become the
   * outermost level.
   *
   * Only has an effect when the tree has EXACTLY one root.
   *
   * @default true
   */
  showRoot?: boolean;

  /**
   * Hide the root node's name. The inverse of `showRoot`, kept from the first
   * version.
   *
   * When both are passed, `showRoot` wins.
   *
   * @default false
   */
  hideRootName?: boolean;

  /**
   * Override icon colours per type.
   *
   * ```tsx
   * <FileTree text={tree} iconColors={{ folder: '#eab308', javascript: '#f7df1e' }} />
   * ```
   *
   * The values are assigned to the `--tnt-filetree-icon-*` variables on the root
   * element, so they travel the same path the theme does - not a second mechanism.
   */
  iconColors?: Partial<Record<FileIconType, string>>;
}
