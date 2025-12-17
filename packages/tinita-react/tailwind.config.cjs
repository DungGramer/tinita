/**
 * Tailwind CSS Configuration for Library Build
 *
 * Used only during build process.
 * For Tailwind v4, use CSS-first approach with globals.css (recommended).
 * All design tokens live in CSS @theme inline in globals.css.
 */

/** @type {import('tailwindcss').Config} */
module.exports = {
  // No preset needed - Tailwind v4 uses CSS @theme in globals.css
  content: [
    './src/ui/**/*.{ts,tsx,js,jsx,css}',
    './src/styles/**/*.{css}',
  ],
};
