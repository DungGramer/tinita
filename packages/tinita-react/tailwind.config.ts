import type { Config } from 'tailwindcss';
import tinitaPreset from './src/tailwind-preset';

const config: Config = {
  content: [
    './src/**/*.{ts,tsx,css}',
  ],
  presets: [tinitaPreset],
};

export default config;
