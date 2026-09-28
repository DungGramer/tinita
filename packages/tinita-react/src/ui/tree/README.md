# Tree

Generic tree primitive. It takes tree-shaped data and knows **nothing** about files, extensions or
CLI tree syntax - [`FileTree`](../file-tree) is the adapter for those.

Split this way so the component is not locked to one string format. If you already have tree-shaped
data, use `Tree` directly rather than serialising it back to a string and re-parsing.

**Zero optional peers for icons.** `Tree` draws its own chevron and `?` marker as SVG, so it does not
pull in `lucide-react`.

## Usage

```tsx
import { Tree } from 'tinita-react/ui/tree';
import type { TreeNode } from 'tinita-react/ui/tree';
import 'tinita-react/styles.css';

const nodes: TreeNode[] = [
  {
    id: 'docs',
    name: 'Documentation',
    description: 'Everything a reader needs',
    children: [
      { id: 'docs/getting-started', name: 'Getting started' },
      { id: 'docs/unwritten', name: 'Not written yet', children: [] },
    ],
  },
  { id: 'changelog', name: 'Changelog' },
];

<Tree nodes={nodes} aria-label="Documentation" />;
```

## `TreeNode`

| Field          | Type         | Description                                                    |
| -------------- | ------------ | -------------------------------------------------------------- |
| `id`           | `string`     | **Required.** Stable identifier, unique across the whole tree. |
| `name`         | `string`     | **Required.** Display label.                                   |
| `nameSuffix`   | `string`     | Tail of the label that is never shortened. See `overflow`.     |
| `children`     | `TreeNode[]` | See the table below.                                           |
| `description`  | `string`     | Description. `showDescriptions` decides inline vs tooltip.     |
| `icon`         | `ReactNode`  | Icon when collapsed, or the icon of a leaf.                    |
| `expandedIcon` | `ReactNode`  | Icon when expanded. Falls back to `icon`.                      |
| `disabled`     | `boolean`    | Not focusable, not expandable.                                 |

`children` distinguishes **three** states, and the distinction carries meaning:

| `children`  | Meaning                                          |
| ----------- | ------------------------------------------------ |
| `undefined` | a **leaf** (file). No arrow, cannot expand       |
| `[]`        | an **empty** folder. Has an arrow, expands empty |
| `[...]`     | a folder with contents                           |

`id` must be **stable**, never positional. It is what `expanded`, `selected` and `showDescriptions`
target, so an id derived from index or depth makes every expanded and selected state jump to a
different node as soon as the sort order changes.

## Props

See the full table in [`FileTree`'s README](../file-tree/README.md#props) - `FileTreeProps` inherits
every `TreeProps` except `nodes`. That table is the single source, so the two cannot disagree.

Specific to `Tree`:

```tsx
<Tree nodes={nodes} />
```

`nodes: TreeNode[]` is the only required prop.

## Keyboard

Follows the [ARIA tree pattern](https://www.w3.org/WAI/ARIA/apg/patterns/treeview/) with roving
tabindex - the whole tree is **one** tab stop. Key table: see
[`FileTree`](../file-tree/README.md#keyboard).

`Tree` borrows Base UI's `Collapsible.Root` + `Panel` for expanding and collapsing, but does **not**
use `Collapsible.Trigger`: that renders `<button aria-expanded>`, while inside `role="tree"` the
`aria-expanded` belongs on the `treeitem`. Declaring it twice makes screen readers announce the wrong
thing.

## Performance

Two decisions, both with measurements (2026-09-28, 1364-row tree):

1. **A collapsed subtree is not in the DOM.** DOM nodes while collapsed: 7277 -> 145.
2. **Each node subscribes to its own id** via `useSyncExternalStore` + `React.memo`. Before that the
   set of expanded ids lived in state and was passed down, so every row re-rendered on each toggle -
   measured 242ms of main-thread stall. Details in `store.ts`.

## RTL

Every horizontal property in the CSS is **logical** (`padding-inline-start`, `inset-inline-start`).
Indentation, the guide line and the arrows all flip under `dir="rtl"`, and the left/right arrow keys
swap meaning.

Node names carry `dir="auto"`, so Arabic names are not reversed in an LTR interface and ASCII names
are not reversed in an RTL one.
