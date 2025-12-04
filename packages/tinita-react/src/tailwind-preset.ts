import type { Config } from 'tailwindcss';

/**
 * Tailwind CSS Preset for tinita-react
 *
 * Minimal preset for Tailwind v3 users.
 * For Tailwind v4, use CSS-first approach with globals.css (recommended).
 *
 * All design tokens now live in CSS @theme inline in globals.css.
 */
const tinitaPreset: Config = {
  theme: {
    extend: {
      // Optional: extra utilities (animations, keyframes, etc.)
      // All design tokens now live in CSS @theme inline in globals.css
    },
  },
};

export default tinitaPreset;
export { tinitaPreset };
