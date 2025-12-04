import type { Meta, StoryObj } from '@storybook/react-vite';
import { FileTree } from 'tinita-react/ui/file-tree';

const meta = {
  title: 'UI/FileTree/Themes',
  component: FileTree,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'FileTree component in light and dark themes. All color combinations meet WCAG AA contrast ratio requirements.',
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

export const LightTheme: Story = {
  args: {
    text: treeText,
    theme: 'light',
  },
  globals: {
    backgrounds: {
      value: "light"
    }
  },
};

export const DarkTheme: Story = {
  args: {
    text: treeText,
    theme: 'dark',
  },
  globals: {
    backgrounds: {
      value: "dark"
    }
  },
};

export const ThemeComparison: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
      <div>
        <h3 style={{ marginBottom: '1rem', color: '#1a1a1a' }}>Light Theme</h3>
        <div style={{ background: '#ffffff', padding: '1rem', borderRadius: '4px', border: '1px solid #e0e0e0' }}>
          <FileTree text={treeText} theme="light" />
        </div>
      </div>
      <div>
        <h3 style={{ marginBottom: '1rem', color: '#e5e7eb' }}>Dark Theme</h3>
        <div style={{ background: '#0a0a0a', padding: '1rem', borderRadius: '4px' }}>
          <FileTree text={treeText} theme="dark" />
        </div>
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Side-by-side comparison of light and dark themes. Both themes meet WCAG AA contrast requirements.',
      },
    },
  },
};

