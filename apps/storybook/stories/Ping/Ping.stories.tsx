import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, within } from 'storybook/test';
import { Ping } from 'tinita-react';

const meta = {
  title: 'Tinita/Ping',
  component: Ping,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: 'A ping indicator component with optional count and click handler.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    count: {
      control: 'number',
      description: 'Optional count to display next to the ping indicator',
    },
    prefix: {
      control: 'text',
      description: 'Optional prefix content (icon, text, etc.)',
    },
    onClick: {
      action: 'clicked',
      description: 'Optional click handler',
    },
    theme: {
      control: 'select',
      options: ['light', 'dark', undefined],
      description: 'Theme variant',
    },
    className: {
      control: 'text',
      description: 'Custom className',
    },
  },
} satisfies Meta<typeof Ping>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {},
};

export const WithCount: Story = {
  args: {
    count: 5,
  },
};

export const WithPrefix: Story = {
  args: {
    prefix: 'Notifications',
    count: 3,
  },
};

export const Clickable: Story = {
  args: {
    prefix: 'Click me',
    count: 10,
    onClick: () => alert('Ping clicked!'),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const ping = canvas.getByRole('button');
    await expect(ping).toBeInTheDocument();
    await userEvent.click(ping);
  },
};

export const LightTheme: Story = {
  args: {
    count: 5,
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
    count: 5,
    theme: 'dark',
  },
  globals: {
    backgrounds: {
      value: "dark"
    }
  },
};

export const LargeCount: Story = {
  args: {
    count: 999,
  },
};

export const ZeroCount: Story = {
  args: {
    count: 0,
  },
};
