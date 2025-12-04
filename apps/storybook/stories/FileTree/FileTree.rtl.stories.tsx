import type { Meta, StoryObj } from '@storybook/react-vite';
import { FileTree } from 'tinita-react/ui/file-tree';

const meta = {
  title: 'UI/FileTree/RTL',
  component: FileTree,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: 'FileTree component in Right-to-Left (RTL) layout for Arabic, Hebrew, and other RTL languages.',
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

export const RTL: Story = {
  args: {
    text: treeText,
  },
  parameters: {
    docs: {
      description: {
        story: 'FileTree in RTL mode. Tree structure should be mirrored and text should flow right-to-left.',
      },
    },
  },
  render: (args) => (
    <div dir="rtl">
      <FileTree {...args} />
    </div>
  ),
};

export const LTR: Story = {
  args: {
    text: treeText,
  },
  parameters: {
    docs: {
      description: {
        story: 'FileTree in LTR mode (default).',
      },
    },
  },
  render: (args) => (
    <div dir="ltr">
      <FileTree {...args} />
    </div>
  ),
};

export const RTLComparison: Story = {
  args: {
    text: treeText,
  },
  parameters: {
    docs: {
      description: {
        story: 'Side-by-side comparison of LTR and RTL layouts.',
      },
    },
  },
  render: () => (
    <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
      <div>
        <h3 style={{ marginBottom: '1rem' }}>LTR (Left-to-Right)</h3>
        <div dir="ltr">
          <FileTree text={treeText} />
        </div>
      </div>
      <div>
        <h3 style={{ marginBottom: '1rem' }}>RTL (Right-to-Left)</h3>
        <div dir="rtl">
          <FileTree text={treeText} />
        </div>
      </div>
    </div>
  ),
};

export const RTLWithDarkTheme: Story = {
  args: {
    text: treeText,
    theme: 'dark',
  },

  parameters: {
    docs: {
      description: {
        story: 'RTL layout with dark theme.',
      },
    }
  },

  render: (args) => (
    <div dir="rtl">
      <FileTree {...args} />
    </div>
  ),

  globals: {
    backgrounds: {
      value: "dark"
    }
  }
};

