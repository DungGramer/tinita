import type { Meta, StoryObj } from '@storybook/react-vite';
import { FileTree } from 'tinita-react/ui/file-tree';

const meta = {
  title: 'UI/FileTree/No-JS',
  component: FileTree,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'FileTree component behavior when JavaScript is disabled. Tests CSS-only functionality and fallback content.',
      },
    },
  },
  tags: ['autodocs'],
} satisfies Meta<typeof FileTree>;

export default meta;
type Story = StoryObj<typeof meta>;

const treeText = `
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
`;

export const NoJavaScript: Story = {
  args: {
    text: treeText,
    enableAnimation: false,
  },
  parameters: {
    noJS: true,
    actions: { disable: true },
    docs: {
      description: {
        story:
          'FileTree with JavaScript disabled. Folders should still be visible but interactions are disabled. CSS styling should still work.',
      },
    },
  },
};

export const StaticTree: Story = {
  args: {
    text: treeText,
    enableAnimation: false,
    showArrow: false,
  },
  parameters: {
    noJS: true,
    actions: { disable: true },
    docs: {
      description: {
        story: 'Static tree view without any JavaScript interactions. Pure CSS rendering.',
      },
    },
  },
};

export const CSSOnlyStyling: Story = {
  args: {
    text: treeText,
    theme: 'light',
    size: 'md',
    borderRadius: 'md',
  },
  parameters: {
    noJS: true,
    actions: { disable: true },
    docs: {
      description: {
        story: 'CSS-only styling should work without JavaScript. Theme, size, and border radius are applied via CSS.',
      },
    },
  },
};

