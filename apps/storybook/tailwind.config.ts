import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    // Storybook entry points
    './.storybook/**/*.{ts,tsx}',
    './stories/**/*.{ts,tsx,js,jsx,mdx}',

    // tinita-react source (components & hooks)
    '../../packages/tinita-react/src/**/*.{ts,tsx}',
  ],
};

export default config;
