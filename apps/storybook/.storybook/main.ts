// This file has been automatically migrated to valid ESM format by Storybook.
import { createRequire } from "node:module";
import type { StorybookConfig } from '@storybook/react-vite';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mergeConfig } from 'vite';

const require = createRequire(import.meta.url);
const __dirname = dirname(fileURLToPath(import.meta.url));

function getAbsolutePath(value: string): string {
  // Use require.resolve for CommonJS compatibility with Storybook 8.6.14
  try {
    return dirname(require.resolve(join(value, 'package.json')));
  } catch {
    // Fallback: return the package name and let Storybook resolve it
    return value;
  }
}

const config: StorybookConfig = {
  stories: ['../stories/**/*.stories.@(js|jsx|ts|tsx|mdx)'],

  typescript: {
    check: false,
    reactDocgen: 'react-docgen-typescript',
  },

  addons: [getAbsolutePath("@storybook/addon-links"), getAbsolutePath("@storybook/addon-docs"), getAbsolutePath("@storybook/addon-a11y")],

  framework: {
    name: getAbsolutePath("@storybook/react-vite"),
    options: {},
  },

  async viteFinal(config) {
    return mergeConfig(config, {
      // resolve: {
      //   alias: {
      //     // Import from source during development instead of dist
      //     'tinita-react': resolve(__dirname, '../../../packages/tinita-react/src'),
      //   },
      // },
      css: {
        postcss: '../postcss.config.mjs',
      },
    });
  },
};

export default config;
