import type { Meta, StoryObj } from '@storybook/react-vite';
import { FileTree } from 'tinita-react/ui/file-tree';

const meta = {
  title: 'UI/FileTree',
  component: FileTree,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'Adapter from a tree string (indent or CLI format) to `Tree`. Every behaviour lives in `Tree`; `FileTree` only parses the string, attaches icons by extension, and hands it down. If you already have tree-shaped data, use `Tree` directly.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    text: {
      control: 'text',
      description: 'Text tree input (indent or CLI format)',
    },
    className: {
      control: 'text',
      description: 'Custom class name',
    },
    hideRootName: {
      control: 'boolean',
      description: 'Hide root node when only 1 root exists',
    },
    theme: {
      control: 'select',
      options: ['dark', 'light'],
      description: 'Theme color scheme',
    },
    indicator: {
      control: 'boolean',
      description: 'Whether to show the tree indicator line',
    },
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg'],
      description: 'Size preset for density (padding)',
    },
    borderRadius: {
      control: 'select',
      options: ['sm', 'md', 'lg'],
      description: 'Border radius for hover state',
    },
    showArrow: {
      control: 'boolean',
      description: 'Whether to show arrow icon for folders',
    },
    enableAnimation: {
      control: 'boolean',
      description: 'Enable smooth collapse/expand animations',
    },
    overflow: {
      control: 'select',
      options: ['scroll', 'truncate', 'wrap'],
      description: 'What happens when a label is wider than the container',
    },
    sort: {
      control: 'select',
      options: ['none', 'name', 'type'],
      description: 'Order of nodes within each level',
    },
    showDescriptions: {
      control: 'boolean',
      description: 'Show `?` descriptions inline instead of in a tooltip',
    },
  },
} satisfies Meta<typeof FileTree>;

export default meta;
type Story = StoryObj<typeof meta>;

// Example tree texts
const indentTreeText = `
content/
  1_photography/
    1_animals/
    2_trees/
    album.txt
    photo.jpg
    image.png
  2_notes/
    notes.md
    todo.json
  3_code/
    app.js
    styles.css
    config.yaml
`;

const cliTreeText = `
D:\\PROJECT
├───src
│   ├───components
│   │   ├───Button.tsx
│   │   ├───Input.tsx
│   │   └───Card.tsx
│   ├───utils
│   │   └───helpers.js
│   └───index.ts
├───public
│   ├───images
│   │   ├───logo.png
│   │   └───banner.jpg
│   └───favicon.ico
├───dist
│   └───index.js
├───package.json
├───README.md
└───.gitignore
`;

const complexTreeText = `
project/
  src/
    components/
      Button.tsx
      Input.tsx
      Card.tsx
    hooks/
      useToggle.ts
      useDebounce.ts
    utils/
      helpers.js
      constants.json
    styles/
      main.css
      theme.scss
  public/
    index.html
    favicon.ico
  tests/
    Button.test.ts
    helpers.test.js
  docs/
    README.md
    CONTRIBUTING.md
`;

export const Default: Story = {
  args: {
    text: indentTreeText,
    theme: 'light',
  },
};

export const CLITreeFormat: Story = {
  args: {
    text: cliTreeText,
  },
};

export const HideRootName: Story = {
  args: {
    text: cliTreeText,
    hideRootName: true,
  },
};

export const ComplexExample: Story = {
  args: {
    text: complexTreeText,
  },
};

export const WithArrows: Story = {
  args: {
    text: indentTreeText,
    showArrow: true,
  },
};

export const WithoutAnimation: Story = {
  args: {
    text: complexTreeText,
    enableAnimation: false,
  },
};

export const SmallSize: Story = {
  args: {
    text: indentTreeText,
    size: 'sm',
  },
};

export const LargeSize: Story = {
  args: {
    text: indentTreeText,
    size: 'lg',
  },
};

export const AllFeatures: Story = {
  args: {
    text: complexTreeText,
    theme: 'dark',
    size: 'md',
    borderRadius: 'md',
    showArrow: true,
    indicator: true,
    enableAnimation: true,
  },
};

/**
 * The `?` syntax inside the string: whitespace, a `?`, then the description.
 *
 * The separator REQUIRES leading whitespace, so a file name containing `?`
 * (`foo?.ts`) is never split by mistake.
 */
const DESCRIBED = [
  'project/',
  '├── src/                        ? Application source',
  '│   ├── components/             ? Reusable components',
  '│   │   ├── Button.tsx          ? The primary button',
  '│   │   └── FileTree.tsx        ? Renders a directory tree',
  '│   ├── app.tsx                 ? Application entry point',
  '│   └── index.ts                ? Public exports',
  '├── package.json                ? Dependencies and scripts',
  '└── README.md                   ? Project documentation',
].join('\n');

/** Default: descriptions live in a tooltip and any node carrying one gets a
 *  trailing `?` marker. */
export const DescriptionsTooltip: Story = {
  name: 'Descriptions in a tooltip',
  args: { text: DESCRIBED, showArrow: true },
};

export const DescriptionsInline: Story = {
  name: 'Inline descriptions (all)',
  args: { text: DESCRIBED, showArrow: true, showDescriptions: true },
};

/** Only the `src/components` branch; the rest stay in tooltips. */
export const DescriptionsScoped: Story = {
  name: 'Descriptions scoped to a branch',
  args: {
    text: DESCRIBED,
    showArrow: true,
    showDescriptions: 'project/src/components',
  },
};

export const SortByType: Story = {
  name: 'Sort by type',
  args: { text: DESCRIBED, showArrow: true, sort: 'type' },
};

export const SortByName: Story = {
  name: 'Sort by name',
  args: { text: DESCRIBED, showArrow: true, sort: 'name' },
};

/** `selected` takes the full PATH, not the file name. */
export const Selected: Story = {
  name: 'A selected file',
  args: {
    text: DESCRIBED,
    showArrow: true,
    selected: 'project/src/components/Button.tsx',
  },
};

/** `showRoot={false}` drops the root node and promotes its children to the
 *  outermost level. */
export const WithoutRoot: Story = {
  name: 'Hide the root node',
  args: { text: DESCRIBED, showArrow: true, showRoot: false },
};

export const CustomIconColors: Story = {
  name: 'Custom icon colours',
  args: {
    text: DESCRIBED,
    showArrow: true,
    iconColors: {
      folder: '#eab308',
      javascript: '#38bdf8',
      markdown: '#f472b6',
    },
  },
};

/** Subtrees start collapsed - they are NOT in the DOM until opened. */
export const Collapsed: Story = {
  name: 'Collapsed by default',
  args: { text: DESCRIBED, showArrow: true, defaultExpanded: false },
};

/**
 * RTL: indentation, the guide line and the arrows flip to the right; Latin file
 * names still read in the right direction thanks to `dir="auto"` on each label.
 */
export const RightToLeft: Story = {
  name: 'RTL',
  args: { text: DESCRIBED, showArrow: true, showDescriptions: true },
  render: (args) => (
    <div dir="rtl">
      <FileTree {...args} />
    </div>
  ),
};

/**
 * Long file names, the case that only shows up on a narrow screen.
 *
 * Each frame below is a fixed 300px wide, so the three `overflow` modes differ
 * here at any viewport - including the Docs tab, where the viewport globals do
 * not apply. Resize the browser and nothing about this comparison changes.
 */
const longNamesText = `
project/
  src/
    components/
      UserProfileSettingsDialogContainer.stories.tsx
      AuthenticationProviderConfiguration.test.ts
      index.ts
    .env.production.local
  documentation-for-new-contributors.md
  .gitignore
`;

const OVERFLOW_MODES = [
  {
    value: 'scroll' as const,
    title: 'scroll (default)',
    note: 'Row is as wide as its content and the tree scrolls sideways. Nothing is cut. This is what VS Code does.',
  },
  {
    value: 'truncate' as const,
    title: 'truncate',
    note: 'Row fits the frame, the name is cut with an ellipsis, and the file extension always stays visible. The full label is in the `title` attribute.',
  },
  {
    value: 'wrap' as const,
    title: 'wrap',
    note: 'The name wraps. No scrolling and nothing is cut, but rows have uneven heights, which makes a large tree harder to scan.',
  },
];

export const LongFileNames: Story = {
  name: 'Long file names (overflow)',
  args: { text: longNamesText },
  parameters: {
    docs: {
      description: {
        story:
          'The three answers to "the label is wider than the container", side by side in identical 300px frames. `scroll` is the default and matches the behaviour of every earlier version.',
      },
    },
  },
  render: (args) => (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
        gap: 24,
        alignItems: 'start',
      }}
    >
      {OVERFLOW_MODES.map((mode) => (
        <div
          key={mode.value}
          style={{ display: 'grid', gap: 8, maxInlineSize: 300 }}
        >
          <code style={{ fontSize: 12, fontWeight: 600 }}>
            overflow=&quot;{mode.value}&quot;
          </code>
          {/* The border makes the clip boundary VISIBLE - without it `truncate`
              and `scroll` look identical in a wide container. */}
          <div
            style={{
              inlineSize: 300,
              border: '1px solid rgb(127 127 127 / 0.4)',
              borderRadius: 8,
              overflow: 'hidden',
            }}
          >
            <FileTree {...args} overflow={mode.value} />
          </div>
          <p
            style={{ margin: 0, fontSize: 12, lineHeight: 1.5, opacity: 0.75 }}
          >
            {mode.note}
          </p>
        </div>
      ))}
    </div>
  ),
};

/** One mode at a time, in a 300px frame. Switch modes with the `overflow` control. */
export const LongFileNamesSingle: Story = {
  name: 'Long file names (single frame)',
  args: { text: longNamesText, overflow: 'truncate' },
  render: (args) => (
    <div
      style={{
        inlineSize: 300,
        border: '1px solid rgb(127 127 127 / 0.4)',
        borderRadius: 8,
        overflow: 'hidden',
      }}
    >
      <FileTree {...args} />
    </div>
  ),
};
