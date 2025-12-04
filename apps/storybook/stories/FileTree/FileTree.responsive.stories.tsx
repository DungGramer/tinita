import type { Meta, StoryObj } from '@storybook/react-vite';
import { FileTree } from 'tinita-react/ui/file-tree';

const meta = {
  title: 'UI/FileTree/Responsive',
  component: FileTree,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: 'FileTree component tested across different viewport sizes to ensure responsive behavior.',
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
`;

export const MobileSmall: Story = {
  args: {
    text: treeText,
  },
  globals: {
    viewport: {
      value: 'mobileSmall',
      isRotated: false
    }
  },
};

export const Mobile: Story = {
  args: {
    text: treeText,
  },
  globals: {
    viewport: {
      value: 'mobile',
      isRotated: false
    }
  },
};

export const MobileLarge: Story = {
  args: {
    text: treeText,
  },
  globals: {
    viewport: {
      value: 'mobileLarge',
      isRotated: false
    }
  },
};

export const Tablet: Story = {
  args: {
    text: treeText,
  },
  globals: {
    viewport: {
      value: 'tablet',
      isRotated: false
    }
  },
};

export const Laptop: Story = {
  args: {
    text: treeText,
  },
  globals: {
    viewport: {
      value: 'laptop',
      isRotated: false
    }
  },
};

export const Desktop: Story = {
  args: {
    text: treeText,
  },
  globals: {
    viewport: {
      value: 'desktop',
      isRotated: false
    }
  },
};

export const DesktopWide: Story = {
  args: {
    text: treeText,
  },
  globals: {
    viewport: {
      value: 'desktopWide',
      isRotated: false
    }
  },
};

export const DesktopUltraWide: Story = {
  args: {
    text: treeText,
  },
  globals: {
    viewport: {
      value: 'desktopUltraWide',
      isRotated: false
    }
  },
};

