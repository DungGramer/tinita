import type { Meta, StoryObj } from '@storybook/react';
import { FileTree } from './FileTree';

const meta = {
  title: 'UI/FileTree',
  component: FileTree,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'A tree view component for displaying hierarchical file/folder structures from text input. Supports both indent-based and CLI tree formats. **Powered by Radix UI Accordion** for smooth, accessible animations with ARIA compliance and keyboard navigation support.',
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
      description: 'Whether to show arrow icon for folders (collapse/expand indicator)',
    },
    enableAnimation: {
      control: 'boolean',
      description: 'Enable smooth collapse/expand animations (powered by Radix UI Accordion)',
    },
  },
} satisfies Meta<typeof FileTree>;

export default meta;
type Story = StoryObj<typeof meta>;

// Indent tree format example
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

// CLI tree format example
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

// Complex example with various file types
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
    assets/
      images/
        logo.png
        banner.jpg
        icon.svg
      videos/
        intro.mp4
        demo.webm
      audio/
        sound.mp3
        music.wav
    config/
      app.yaml
      database.sql
    data/
      users.xlsx
      export.csv
    archives/
      backup.zip
      old.tar.gz
  public/
    index.html
    favicon.ico
  tests/
    Button.test.ts
    helpers.test.js
  docs/
    README.md
    CONTRIBUTING.md
    CHANGELOG.md
  scripts/
    build.sh
    deploy.js
  .gitignore
  .gitattributes
  package.json
  package-lock.json
  tsconfig.json
  vite.config.ts
`;

export const Default: Story = {
  args: {
    text: indentTreeText,
    theme: 'light',
  },
  parameters: {
    docs: {
      description: {
        story: 'Default FileTree with light theme (new default). Powered by Radix UI Accordion for smooth animations.',
      },
    },
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

export const WithCustomClassName: Story = {
  args: {
    text: indentTreeText,
    className: 'custom-filetree',
  },
};

export const ManualCSSImport: Story = {
  args: {
    text: indentTreeText,
  },
  parameters: {
    docs: {
      description: {
        story:
          'You need to manually import the CSS file. This is required for all environments, including SSR (Next.js, Remix, etc.).',
      },
    },
  },
  render: (args) => (
    <div>
      <p style={{ marginBottom: '1rem', color: '#666' }}>
        Make sure to import the CSS file:
        <br />
        <code style={{ background: '#f5f5f5', padding: '2px 6px', borderRadius: '4px' }}>
          import 'tinita-react/ui/FileTree/FileTree.css';
        </code>
      </p>
      <FileTree {...args} />
    </div>
  ),
};

export const SmallTree: Story = {
  args: {
    text: `
src/
  index.ts
  utils.ts
`,
  },
};

export const SingleFile: Story = {
  args: {
    text: 'README.md',
  },
};

export const NestedFolders: Story = {
  args: {
    text: `
root/
  level1/
    level2/
      level3/
        deep-file.txt
`,
  },
};

export const ThemeComparison: Story = {
  args: {
    text: indentTreeText,
  },
  render: () => (
    <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
      <div>
        <h3 style={{ marginBottom: '1rem', color: '#e0e0e0' }}>Dark Theme</h3>
        <div style={{ background: '#0a0a0a', padding: '1rem', borderRadius: '4px' }}>
          <FileTree text={indentTreeText} theme="dark" />
        </div>
      </div>
      <div>
        <h3 style={{ marginBottom: '1rem', color: '#1a1a1a' }}>Light Theme</h3>
        <div style={{ background: '#ffffff', padding: '1rem', borderRadius: '4px', border: '1px solid #e0e0e0' }}>
          <FileTree text={indentTreeText} theme="light" />
        </div>
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Side-by-side comparison of dark and light themes.',
      },
    },
  },
};

export const IndicatorComparison: Story = {
  args: {
    text: indentTreeText,
  },
  render: () => (
    <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
      <div>
        <h3 style={{ marginBottom: '1rem', color: '#e0e0e0' }}>With Indicator</h3>
        <div style={{ background: '#0a0a0a', padding: '1rem', borderRadius: '4px' }}>
          <FileTree text={indentTreeText} indicator={true} />
        </div>
      </div>
      <div>
        <h3 style={{ marginBottom: '1rem', color: '#e0e0e0' }}>Without Indicator</h3>
        <div style={{ background: '#0a0a0a', padding: '1rem', borderRadius: '4px' }}>
          <FileTree text={indentTreeText} indicator={false} />
        </div>
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Side-by-side comparison of FileTree with and without indicator lines.',
      },
    },
  },
};

export const SizeComparison: Story = {
  args: {
    text: indentTreeText,
  },
  render: () => (
    <div style={{ display: 'flex', gap: '2rem', flexDirection: 'column' }}>
      <div>
        <h3 style={{ marginBottom: '1rem', color: '#e0e0e0' }}>Small (sm)</h3>
        <div style={{ background: '#0a0a0a', padding: '1rem', borderRadius: '4px' }}>
          <FileTree text={indentTreeText} size="sm" />
        </div>
      </div>
      <div>
        <h3 style={{ marginBottom: '1rem', color: '#e0e0e0' }}>Medium (md) - Default</h3>
        <div style={{ background: '#0a0a0a', padding: '1rem', borderRadius: '4px' }}>
          <FileTree text={indentTreeText} size="md" />
        </div>
      </div>
      <div>
        <h3 style={{ marginBottom: '1rem', color: '#e0e0e0' }}>Large (lg)</h3>
        <div style={{ background: '#0a0a0a', padding: '1rem', borderRadius: '4px' }}>
          <FileTree text={indentTreeText} size="lg" />
        </div>
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Comparison of all size presets: sm (compact), md (default), lg (spacious).',
      },
    },
  },
};

export const ArrowComparison: Story = {
  args: {
    text: indentTreeText,
  },
  render: () => (
    <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
      <div>
        <h3 style={{ marginBottom: '1rem', color: '#e0e0e0' }}>With Arrow</h3>
        <div style={{ background: '#0a0a0a', padding: '1rem', borderRadius: '4px' }}>
          <FileTree text={indentTreeText} showArrow={true} />
        </div>
      </div>
      <div>
        <h3 style={{ marginBottom: '1rem', color: '#e0e0e0' }}>Without Arrow</h3>
        <div style={{ background: '#0a0a0a', padding: '1rem', borderRadius: '4px' }}>
          <FileTree text={indentTreeText} showArrow={false} />
        </div>
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Side-by-side comparison of FileTree with and without arrow icons.',
      },
    },
  },
};

export const BorderRadiusComparison: Story = {
  args: {
    text: indentTreeText,
  },
  render: () => (
    <div style={{ display: 'flex', gap: '2rem', flexDirection: 'column' }}>
      <div>
        <h3 style={{ marginBottom: '1rem', color: '#e0e0e0' }}>Border Radius: sm (1px)</h3>
        <div style={{ background: '#0a0a0a', padding: '1rem', borderRadius: '4px' }}>
          <FileTree text={indentTreeText} borderRadius="sm" />
        </div>
      </div>
      <div>
        <h3 style={{ marginBottom: '1rem', color: '#e0e0e0' }}>Border Radius: md (4px) - Default</h3>
        <div style={{ background: '#0a0a0a', padding: '1rem', borderRadius: '4px' }}>
          <FileTree text={indentTreeText} borderRadius="md" />
        </div>
      </div>
      <div>
        <h3 style={{ marginBottom: '1rem', color: '#e0e0e0' }}>Border Radius: lg (30px)</h3>
        <div style={{ background: '#0a0a0a', padding: '1rem', borderRadius: '4px' }}>
          <FileTree text={indentTreeText} borderRadius="lg" />
        </div>
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Comparison of all border radius options: sm (1px), md (4px), lg (30px).',
      },
    },
  },
};

// Animation Stories (Radix UI Accordion)

export const WithAnimation: Story = {
  args: {
    text: complexTreeText,
    enableAnimation: true,
    showArrow: true,
  },
  parameters: {
    docs: {
      description: {
        story: 'FileTree with smooth animations enabled (default). Powered by Radix UI Accordion with height + fade transitions (250ms ease-out). Click folders to see animations.',
      },
    },
  },
};

export const WithoutAnimation: Story = {
  args: {
    text: complexTreeText,
    enableAnimation: false,
    showArrow: true,
  },
  parameters: {
    docs: {
      description: {
        story: 'FileTree with animations disabled. Folders expand/collapse instantly. Useful for static documentation or performance-critical scenarios.',
      },
    },
  },
};

export const AnimationComparison: Story = {
  args: {
    text: indentTreeText,
  },
  render: () => (
    <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
      <div>
        <h3 style={{ marginBottom: '1rem', color: '#e0e0e0' }}>With Animation (Radix UI)</h3>
        <div style={{ background: '#0a0a0a', padding: '1rem', borderRadius: '4px' }}>
          <FileTree text={indentTreeText} enableAnimation={true} showArrow={true} />
        </div>
        <p style={{ marginTop: '0.5rem', fontSize: '0.875rem', color: '#9ca3af' }}>
          ✓ Smooth height + fade transitions<br />
          ✓ Arrow rotation animation<br />
          ✓ ARIA-compliant accessibility
        </p>
      </div>
      <div>
        <h3 style={{ marginBottom: '1rem', color: '#e0e0e0' }}>Without Animation</h3>
        <div style={{ background: '#0a0a0a', padding: '1rem', borderRadius: '4px' }}>
          <FileTree text={indentTreeText} enableAnimation={false} showArrow={true} />
        </div>
        <p style={{ marginTop: '0.5rem', fontSize: '0.875rem', color: '#9ca3af' }}>
          ✓ Instant expand/collapse<br />
          ✓ No animation overhead<br />
          ✓ Best for static displays
        </p>
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Side-by-side comparison of FileTree with and without animations. Try clicking folders to see the difference.',
      },
    },
  },
};

export const NestedAnimations: Story = {
  args: {
    text: `
project/
  src/
    components/
      ui/
        buttons/
          PrimaryButton.tsx
          SecondaryButton.tsx
        inputs/
          TextField.tsx
          TextArea.tsx
      layout/
        Header.tsx
        Footer.tsx
        Sidebar.tsx
    hooks/
      useAuth.ts
      useForm.ts
    utils/
      helpers.js
      validators.ts
  tests/
    unit/
      components.test.ts
    integration/
      api.test.ts
  docs/
    README.md
    CONTRIBUTING.md
`,
    enableAnimation: true,
    showArrow: true,
    indicator: true,
  },
  parameters: {
    docs: {
      description: {
        story: 'Demonstrates smooth nested animations with multiple folder levels. Each folder animates independently thanks to Radix UI Accordion.',
      },
    },
  },
};

export const AllFeaturesShowcase: Story = {
  args: {
    text: complexTreeText,
    theme: 'dark',
    size: 'md',
    borderRadius: 'md',
    showArrow: true,
    indicator: true,
    enableAnimation: true,
  },
  parameters: {
    docs: {
      description: {
        story: 'All features enabled: dark theme, arrows, indicators, animations (Radix UI), and various file types with colored icons.',
      },
    },
  },
};
