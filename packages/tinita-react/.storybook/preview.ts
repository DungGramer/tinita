import type { Preview } from '@storybook/react-vite';
import '../src/ui/FileTree/FileTree.css';

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    backgrounds: {
      options: {
        dark: {
          name: 'dark',
          value: '#0a0a0a',
        },

        light: {
          name: 'light',
          value: '#ffffff',
        }
      }
    },
  },

  initialGlobals: {
    backgrounds: {
      value: 'light' // Match FileTree default theme
    }
  }
};

export default preview;
