import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { Tree } from 'tinita-react/ui/tree';
import type { TreeNode } from 'tinita-react/ui/tree';

/**
 * `Tree` is the primitive. It takes tree-shaped data and knows nothing about
 * files, extensions or CLI tree syntax - `FileTree` is the adapter for those.
 *
 * Split this way so the component is not locked to one string format. If you
 * already have tree-shaped data, use `Tree` directly rather than serialising it
 * back to a string and re-parsing.
 */
const nodes: TreeNode[] = [
  {
    id: 'docs',
    name: 'Documentation',
    description: 'Everything a reader needs',
    children: [
      {
        id: 'docs/getting-started',
        name: 'Getting started',
        description: 'Install in 2 minutes',
      },
      { id: 'docs/api', name: 'API', description: 'Full reference' },
      { id: 'docs/unwritten', name: 'Not written yet', children: [] },
    ],
  },
  {
    id: 'design',
    name: 'Design',
    children: [
      {
        id: 'design/tokens',
        name: 'Tokens',
        description: 'Colour, spacing, type',
      },
      { id: 'design/motion', name: 'Motion' },
    ],
  },
  { id: 'changelog', name: 'Changelog', description: "What's new" },
];

const meta = {
  title: 'UI/Tree',
  component: Tree,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'Generic tree primitive. Depends on no icon library. Keyboard follows the ARIA tree pattern: up/down move, right expands, left collapses or moves to the parent, Home/End, `*` expands all siblings, and typing a letter jumps to a node.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    sort: { control: 'select', options: ['none', 'name', 'type'] },
    overflow: { control: 'select', options: ['scroll', 'truncate', 'wrap'] },
    size: { control: 'select', options: ['sm', 'md', 'lg'] },
    borderRadius: { control: 'select', options: ['sm', 'md', 'lg'] },
    showDescriptions: { control: 'boolean' },
    indicator: { control: 'boolean' },
    showArrow: { control: 'boolean' },
    enableAnimation: { control: 'boolean' },
  },
} satisfies Meta<typeof Tree>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { nodes, 'aria-label': 'Documentation' },
};

export const Arrows: Story = {
  name: 'Expand/collapse arrows',
  args: { nodes, 'showArrow': true, 'aria-label': 'Documentation' },
};

/** `sort="type"` puts folders first, then files, each group in natural name order. */
export const SortByType: Story = {
  name: 'Sort by type',
  args: {
    nodes,
    'sort': 'type',
    'showArrow': true,
    'aria-label': 'Documentation',
  },
};

export const SortByName: Story = {
  name: 'Sort by name',
  args: {
    nodes,
    'sort': 'name',
    'showArrow': true,
    'aria-label': 'Documentation',
  },
};

/** Every description renders in its row. When space runs short the description
 *  shrinks first and the name stays intact. */
export const DescriptionsInline: Story = {
  name: 'Inline descriptions',
  args: {
    nodes,
    'showDescriptions': true,
    'showArrow': true,
    'aria-label': 'Documentation',
  },
};

/**
 * Only the named branch shows inline descriptions. The rest go to a tooltip, and
 * any node carrying a description gets a `?` marker at the end of its row.
 */
export const DescriptionsScoped: Story = {
  name: 'Descriptions scoped to a branch',
  args: {
    nodes,
    'showDescriptions': 'docs',
    'showArrow': true,
    'aria-label': 'Documentation',
  },
};

export const Selected: Story = {
  name: 'Selected node',
  args: {
    nodes,
    'selected': 'docs/api',
    'showArrow': true,
    'aria-label': 'Documentation',
  },
};

/** Subtrees start collapsed: use this to see they are NOT in the DOM until opened. */
export const Collapsed: Story = {
  name: 'Collapsed by default',
  args: {
    nodes,
    'defaultExpanded': false,
    'showArrow': true,
    'aria-label': 'Documentation',
  },
};

/** `renderNode` receives `defaultContent`, so it can wrap the row instead of
 *  rebuilding it from scratch. */
export const CustomRender: Story = {
  name: 'renderNode',
  args: {
    nodes,
    'showArrow': true,
    'aria-label': 'Documentation',
    'renderNode': (node, ctx) => (
      <>
        {ctx.defaultContent}
        {ctx.isFolder && (
          <span
            style={{
              marginInlineStart: 'auto',
              fontSize: 11,
              opacity: 0.55,
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {node.children?.length ?? 0}
          </span>
        )}
      </>
    ),
  },
};

/**
 * RTL: indentation, the guide line and the arrows all flip to the right. The
 * left/right arrow keys swap meaning too.
 */
export const RTL: Story = {
  name: 'RTL (Arabic)',
  args: {
    'aria-label': 'شجرة',
    'showArrow': true,
    'showDescriptions': true,
    'nodes': [
      {
        id: 'المستندات',
        name: 'المستندات',
        description: 'كل ما يحتاجه القارئ',
        children: [
          {
            id: 'المستندات/البداية',
            name: 'البداية',
            description: 'التثبيت في دقيقتين',
          },
          {
            id: 'المستندات/Button.tsx',
            name: 'Button.tsx',
            description: 'اسم ملف لاتيني',
          },
        ],
      },
      { id: 'التغييرات', name: 'التغييرات' },
    ],
  },
  render: (args) => (
    <div dir="rtl">
      <Tree {...args} />
    </div>
  ),
};

/** Controlled from outside: `expanded` + `onExpandedChange`. */
export const Controlled: Story = {
  name: 'Controlled expanded',
  args: { nodes, 'aria-label': 'Documentation' },
  render: (args) => {
    const [expanded, setExpanded] = useState<string[]>(['docs']);
    return (
      <div style={{ display: 'grid', gap: 12 }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button type="button" onClick={() => setExpanded(['docs', 'design'])}>
            Expand all
          </button>
          <button type="button" onClick={() => setExpanded([])}>
            Collapse all
          </button>
          <code style={{ fontSize: 12, alignSelf: 'center' }}>
            expanded = [{expanded.join(', ')}]
          </code>
        </div>
        <Tree
          {...args}
          expanded={expanded}
          onExpandedChange={setExpanded}
          showArrow
        />
      </div>
    );
  },
};

/**
 * A large tree for measurement. 6 levels, ~1500 nodes.
 *
 * This is the shape where the cost of expanding and collapsing becomes visible: a
 * collapsed subtree is NOT in the DOM, so expanding one branch only builds that
 * branch.
 */
function buildStressTree(
  depth: number,
  breadth: number,
  prefix = 'n'
): TreeNode[] {
  if (depth === 0) return [];
  return Array.from({ length: breadth }, (_, i) => {
    const id = `${prefix}-${i}`;
    const children = buildStressTree(depth - 1, breadth, id);
    return depth === 1
      ? { id, name: `file-${i}.ts` }
      : { id, name: `folder-${i}`, children };
  });
}

export const Stress: Story = {
  name: 'Large tree (performance)',
  args: {
    'nodes': buildStressTree(5, 4),
    'defaultExpanded': false,
    'showArrow': true,
    'aria-label': 'Large tree',
  },
};

/**
 * Long labels in a narrow container, for plain `Tree` (no `FileTree` splitting off
 * the extension).
 *
 * `nameSuffix` belongs to the NODE and is never derived from the name: `Tree` knows
 * nothing about files. It is passed by hand here to show the extension surviving
 * while the name is cut.
 */
const longNodes: TreeNode[] = [
  {
    id: 'src',
    name: 'src',
    children: [
      {
        id: 'src/a',
        name: 'UserProfileSettingsDialogContainer.stories',
        nameSuffix: '.tsx',
      },
      {
        id: 'src/b',
        name: 'AuthenticationProviderConfiguration',
        nameSuffix: '.ts',
      },
      { id: 'src/c', name: 'index', nameSuffix: '.ts' },
    ],
  },
];

export const Overflow: Story = {
  name: 'Long labels (overflow)',
  args: { 'nodes': longNodes, 'showArrow': true, 'aria-label': 'Long labels' },
  render: (args) => (
    <div style={{ display: 'grid', gap: 20, maxInlineSize: 320 }}>
      {(['scroll', 'truncate', 'wrap'] as const).map((mode) => (
        <div key={mode} style={{ display: 'grid', gap: 4 }}>
          <code style={{ fontSize: 12 }}>overflow=&quot;{mode}&quot;</code>
          <div style={{ border: '1px dashed currentColor', opacity: 0.999 }}>
            <Tree {...args} overflow={mode} />
          </div>
        </div>
      ))}
    </div>
  ),
};
