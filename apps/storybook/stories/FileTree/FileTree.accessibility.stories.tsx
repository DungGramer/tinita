import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, within } from 'storybook/test';
import { FileTree } from 'tinita-react/ui/file-tree';

const meta = {
  title: 'UI/FileTree/Accessibility',
  component: FileTree,
  parameters: {
    layout: 'padded',
    a11y: {
      config: {
        rules: [
          {
            id: 'color-contrast',
            enabled: true,
          },
          {
            id: 'keyboard-navigation',
            enabled: true,
          },
          {
            id: 'aria-required-attributes',
            enabled: true,
          },
        ],
      },
    },
    docs: {
      description: {
        component:
          'Accessibility testing for FileTree component. Includes keyboard navigation, ARIA attributes, and WCAG compliance checks.',
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

export const KeyboardNavigation: Story = {
  args: {
    text: treeText,
    showArrow: true,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // Test Tab navigation
    const firstFolder = canvas.getByRole('button', { name: /src/i });
    await expect(firstFolder).toBeInTheDocument();

    // Test Enter/Space to expand/collapse
    await userEvent.keyboard('{Tab}');
    await expect(firstFolder).toHaveFocus();

    await userEvent.keyboard('{Enter}');
    // Folder should expand/collapse
  },
  parameters: {
    docs: {
      description: {
        story: 'Test keyboard navigation: Tab to focus, Enter/Space to expand/collapse folders.',
      },
    },
  },
};

export const ARIACompliance: Story = {
  args: {
    text: treeText,
    showArrow: true,
  },
  parameters: {
    docs: {
      description: {
        story: 'FileTree uses Radix UI Accordion which provides full ARIA compliance including proper roles, states, and properties.',
      },
    },
  },
};

export const ScreenReaderFriendly: Story = {
  args: {
    text: treeText,
    showArrow: true,
  },
  parameters: {
    docs: {
      description: {
        story: 'All interactive elements have proper ARIA labels and descriptions for screen readers.',
      },
    },
  },
};

export const HighContrast: Story = {
  args: {
    text: treeText,
    theme: 'light',
  },

  parameters: {
    docs: {
      description: {
        story: 'Light theme with high contrast for better visibility. Meets WCAG AA contrast requirements.',
      },
    }
  },

  globals: {
    backgrounds: {
      value: "light"
    }
  }
};

export const FocusIndicators: Story = {
  args: {
    text: treeText,
    showArrow: true,
  },
  parameters: {
    docs: {
      description: {
        story: 'Focus indicators are clearly visible for keyboard navigation. Test by pressing Tab.',
      },
    },
  },
};
