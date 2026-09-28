# FileTree

Render a directory tree from a text string.

`FileTree` is an **adapter**: it parses the string into nodes, attaches icons by file extension, and
hands the result to [`Tree`](../tree). Every behaviour - expand/collapse, keyboard, selection,
descriptions, RTL, animation, overflow - lives in `Tree`.

If you already have tree-shaped data, **use `Tree` directly** rather than serialising it to a string
and re-parsing:

```tsx
import { Tree } from 'tinita-react/ui/tree';

<Tree nodes={nodes} />;
```

## Install

```bash
pnpm add tinita-react lucide-react
```

`lucide-react` is an **optional peer** that only `FileTree` needs (it draws the per-extension file
icons). `Tree` does not need it, and no other component in the package does either - you only install
what the components you import actually use.

The CSS has to be imported once at the root of your app:

```tsx
import 'tinita-react/styles.css';
// or, if your app already uses cascade layers:
import 'tinita-react/styles.layer.css';
```

## Basic usage

```tsx
import { FileTree } from 'tinita-react/ui/file-tree';

const tree = `
src/
  components/
    Button.tsx
    index.ts
  utils/
    format.ts
README.md
`;

<FileTree text={tree} />;
```

## Input formats

The parser accepts **both** formats and detects which one it is looking at.

**Two-space indent:**

```
project/
  src/
    app.tsx
  README.md
```

**CLI tree (Windows or Unix `tree`):**

```
project/
├── src/
│   └── app.tsx
└── README.md
```

Two conventions matter:

| Written        | Meaning                 |
| -------------- | ----------------------- |
| `docs/`        | a folder                |
| `docs`         | a **file** named `docs` |
| `empty/` alone | an empty folder         |

A trailing `/` is the **only** signal separating a file from an empty folder.

### Descriptions with `?`

A `?` preceded by **whitespace** splits off the description:

```
src/          ? Application source
  app.tsx     ? Entry point
  types.ts
```

Requiring the whitespace is deliberate: `foo?.ts` is a legal file name and must not be cut.

`showDescriptions` decides whether descriptions render inline or in a tooltip.

## Props

`FileTreeProps` inherits **every** `TreeProps` except `nodes`, and adds:

| Prop           | Type                                    | Default | Description                                                                                                        |
| -------------- | --------------------------------------- | ------- | ------------------------------------------------------------------------------------------------------------------ |
| `text`         | `string`                                | -       | **Required.** The tree as text.                                                                                    |
| `showRoot`     | `boolean`                               | `true`  | Hide the root node when it is only a machine path (`D:\PROJECT`). Only applies when the tree has exactly one root. |
| `hideRootName` | `boolean`                               | `false` | The inverse of `showRoot`, kept for backwards compatibility. When both are passed, `showRoot` wins.                |
| `iconColors`   | `Partial<Record<FileIconType, string>>` | -       | Override icon colours per type.                                                                                    |

Props inherited from `Tree`:

| Prop               | Type                                             | Default    | Description                                                     |
| ------------------ | ------------------------------------------------ | ---------- | --------------------------------------------------------------- |
| `defaultExpanded`  | `boolean \| string[]`                            | `true`     | Initial expanded state when uncontrolled.                       |
| `expanded`         | `string[]`                                       | -          | Ids currently expanded. Passing it switches to controlled.      |
| `onExpandedChange` | `(expanded: string[]) => void`                   | -          | Required when using `expanded`.                                 |
| `selected`         | `string`                                         | -          | Id of the selected node, for highlighting.                      |
| `onSelectedChange` | `(node: TreeNode) => void`                       | -          | Called on click / Enter / Space.                                |
| `sort`             | `'none' \| 'name' \| 'type' \| (a, b) => number` | `'none'`   | `'type'` puts folders first.                                    |
| `showDescriptions` | `boolean \| string \| string[]`                  | `false`    | Which descriptions render inline. The rest go to tooltips.      |
| `overflow`         | `'scroll' \| 'truncate' \| 'wrap'`               | `'scroll'` | What to do when a label is wider than the container. See below. |
| `renderNode`       | `(node, context) => ReactNode`                   | -          | Replace or **wrap** the content of a row.                       |
| `indicator`        | `boolean`                                        | `true`     | Vertical guide line per level.                                  |
| `size`             | `'sm' \| 'md' \| 'lg'`                           | `'md'`     | Row density.                                                    |
| `borderRadius`     | `'sm' \| 'md' \| 'lg'`                           | `'md'`     | Row corner radius.                                              |
| `showArrow`        | `boolean`                                        | `false`    | Expand/collapse arrow on folders.                               |
| `enableAnimation`  | `boolean`                                        | `true`     | Always off under `prefers-reduced-motion`.                      |
| `theme`            | `'dark' \| 'light'`                              | -          | Left unset, follows the page's dark mode.                       |

Every node's `id` is its **full path** (`src/components/Button.tsx`). That is what `expanded`,
`selected` and `showDescriptions` target.

## Long labels: `overflow`

This question only comes up on a narrow screen, and all three answers are right in different
situations.

```tsx
<FileTree text={tree} overflow="truncate" />
```

| Value        | Behaviour                                                                                                                     |
| ------------ | ----------------------------------------------------------------------------------------------------------------------------- |
| `'scroll'`   | **Default.** The row is as wide as its content and the tree scrolls sideways. Nothing is cut. This is what VS Code does.      |
| `'truncate'` | The row fits the container, the name is cut with `…`, and the **file extension stays visible**. The full label is in `title`. |
| `'wrap'`     | The name wraps. No scrolling and nothing is cut, but rows have uneven heights, which makes a large tree harder to scan.       |

`'truncate'` produces `UserProfileSetti….tsx` rather than `UserProfileSettings…` - the extension is
the most informative part once the name is cut. `FileTree` splits it with
[`getFileNameParts`](../../../../tinita/src/file/getFileNameParts.ts) from `tinita`, so dotfiles
(`.gitignore` is a **name** with no extension) and multi-dot names (`.env.production.local`) both come
out right.

With plain `Tree` you pass `nameSuffix` yourself - `Tree` knows nothing about files:

```tsx
<Tree
  overflow="truncate"
  nodes={[{ id: 'a', name: 'Q4-report-2026-final', nameSuffix: '.xlsx' }]}
/>
```

Invariant: `name + (nameSuffix ?? '')` must equal the original label. Sort and type-ahead both rely on
it.

## Examples

### Controlled expanded state

```tsx
const [expanded, setExpanded] = useState<string[]>(['src']);

<FileTree text={tree} expanded={expanded} onExpandedChange={setExpanded} />;
```

### Highlight the open file

```tsx
<FileTree text={tree} selected={currentPath} onSelectedChange={(node) => router.push(node.id)} />
```

### Descriptions for one branch only

```tsx
<FileTree text={tree} showDescriptions="src/components" />
```

Nodes outside the branch keep their descriptions, but they move into a tooltip and the row gets a
trailing `?` marker.

### Wrap the content of a row

`renderNode` receives `defaultContent`, so it can wrap instead of rebuilding from scratch:

```tsx
<FileTree
  text={tree}
  renderNode={(node, ctx) => (
    <>
      {ctx.defaultContent}
      {ctx.isFolder && <span className="count">{node.children?.length}</span>}
    </>
  )}
/>
```

### Change icon colours

```tsx
<FileTree text={tree} iconColors={{ folder: '#eab308', javascript: '#f7df1e' }} />
```

The values are assigned to the `--tnt-filetree-icon-*` variables on the root element, so they travel
the same path the theme does - not a second mechanism.

## Keyboard

Follows the [ARIA tree pattern](https://www.w3.org/WAI/ARIA/apg/patterns/treeview/). The whole tree is
**one** tab stop (roving tabindex).

| Key               | Action                                                |
| ----------------- | ----------------------------------------------------- |
| `↑` / `↓`         | Previous / next row (visible rows only)               |
| `→`               | Expand a folder; if already open, move to first child |
| `←`               | Collapse a folder; if already closed, move to parent  |
| `Home` / `End`    | First / last row                                      |
| `Enter` / `Space` | Toggle and activate the node                          |
| `*`               | Expand every sibling folder at this level             |
| a letter          | Jump to the next node starting with it                |

Under `dir="rtl"`, `←` and `→` **swap meaning**.

## Styling

Every class is a CSS Module, emitted with the `tnt-` prefix: `.tnt-tree-root`, `.tnt-tree-row`,
`.tnt-file-tree-root`. No global class leaks into your page.

### CSS variables

Adjust structure and colour through variables, without overriding selectors:

```css
:root {
  --tnt-tree-bg: #ffffff;
  --tnt-tree-text: #1a1a1a;
  --tnt-tree-text-dim: #6b7280;
  --tnt-tree-hover: rgb(0 0 0 / 0.06);
  --tnt-tree-selected-bg: rgb(37 99 235 / 0.12);
  --tnt-tree-font: Menlo, Monaco, 'Courier New', monospace;
  --tnt-tree-font-size: 14px;
  --tnt-tree-indent: 16px;
  --tnt-tree-row-gap: 1px;
}
```

Icon colours: `--tnt-filetree-icon-<type>`, where `<type>` is any `FileIconType` value (`folder`,
`javascript`, `markdown`, `image`, ...).

### Theme

Dark mode follows `.dark` or `[data-theme='dark']` on any ancestor automatically. To pin one tree to
one theme:

```tsx
<FileTree text={tree} theme="light" />
```

## Animation

Expanding and collapsing use [Base UI](https://base-ui.com)'s `Collapsible` with a **transition on
`height`**, exactly as its docs prescribe - not keyframes. The detail and the reasoning are in
`Tree.module.css`.

A collapsed subtree is **not in the DOM**. On a 1364-row tree this cut DOM nodes while collapsed from
7277 to 145.

`prefers-reduced-motion: reduce` turns the animation **off entirely**, never down to a near-zero
duration.

## TypeScript

```tsx
import type { FileTreeProps, FileIconType } from 'tinita-react/ui/file-tree';
import type { TreeNode, TreeProps, TreeSort } from 'tinita-react/ui/tree';
```

`FileNode` is still exported so older code does not break. The internal parser now returns
`ParsedNode` (it adds `path` and `description`, and `children` is optional).

## Related

- [`Tree`](../tree) - the primitive, with no icon-library dependency
