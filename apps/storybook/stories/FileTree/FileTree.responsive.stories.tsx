import type { Meta, StoryObj } from '@storybook/react-vite';
import { FileTree } from 'tinita-react/ui/file-tree';

const meta = {
  title: 'UI/FileTree/Responsive',
  component: FileTree,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'FileTree component tested across different viewport sizes to ensure responsive behavior.',
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
      isRotated: false,
    },
  },
};

export const Mobile: Story = {
  args: {
    text: treeText,
  },
  globals: {
    viewport: {
      value: 'mobile',
      isRotated: false,
    },
  },
};

export const MobileLarge: Story = {
  args: {
    text: treeText,
  },
  globals: {
    viewport: {
      value: 'mobileLarge',
      isRotated: false,
    },
  },
};

export const Tablet: Story = {
  args: {
    text: treeText,
  },
  globals: {
    viewport: {
      value: 'tablet',
      isRotated: false,
    },
  },
};

export const Laptop: Story = {
  args: {
    text: treeText,
  },
  globals: {
    viewport: {
      value: 'laptop',
      isRotated: false,
    },
  },
};

export const Desktop: Story = {
  args: {
    text: treeText,
  },
  globals: {
    viewport: {
      value: 'desktop',
      isRotated: false,
    },
  },
};

export const DesktopWide: Story = {
  args: {
    text: treeText,
  },
  globals: {
    viewport: {
      value: 'desktopWide',
      isRotated: false,
    },
  },
};

export const DesktopUltraWide: Story = {
  args: {
    text: treeText,
  },
  globals: {
    viewport: {
      value: 'desktopUltraWide',
      isRotated: false,
    },
  },
};

/**
 * Tên file dài hơn khung - trường hợp CHỈ xuất hiện trên mobile.
 *
 * Ba story dưới đây là ba câu trả lời của prop `overflow`, cùng một cây, cùng một
 * viewport, để so trực tiếp.
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

/** Mặc định: không mất ký tự nào, cả cây cuộn ngang. Hành vi của VS Code. */
export const OverflowScroll: Story = {
  name: 'overflow: scroll (mặc định)',
  args: { text: longNamesText, overflow: 'scroll' },
  globals: { viewport: { value: 'mobile', isRotated: false } },
};

/**
 * Rút bằng `…` nhưng ĐUÔI FILE luôn hiện - `UserProfileSetti….tsx` vẫn đọc được là
 * file gì, `UserProfileSettingsDial…` thì không. Nhãn đầy đủ nằm trong `title`.
 */
export const OverflowTruncate: Story = {
  name: 'overflow: truncate',
  args: { text: longNamesText, overflow: 'truncate' },
  globals: { viewport: { value: 'mobile', isRotated: false } },
};

/** Xuống dòng: không cuộn, không mất ký tự, nhưng hàng cao không đều. */
export const OverflowWrap: Story = {
  name: 'overflow: wrap',
  args: { text: longNamesText, overflow: 'wrap' },
  globals: { viewport: { value: 'mobile', isRotated: false } },
};
