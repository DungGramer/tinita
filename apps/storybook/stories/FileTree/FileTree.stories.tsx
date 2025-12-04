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
          'A tree view component for displaying hierarchical file/folder structures from text input. Supports both indent-based and CLI tree formats. Powered by Radix UI Accordion for smooth, accessible animations.',
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

