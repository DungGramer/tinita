/**
 * Tailwind CSS Configuration for Library Build
 *
 * Used only during build process. Users should use the preset in their own config.
 */

const tinitaPreset = require('./dist/tailwind-preset.cjs').default;

/** @type {import('tailwindcss').Config} */
module.exports = {
  presets: [tinitaPreset],
  content: [
    './src/ui/**/*.{ts,tsx,js,jsx,css}',
    './src/styles/**/*.{css}',
  ],
};
