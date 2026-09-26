import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    // jsdom, không phải node: installSmoothScroll chạm document, window.matchMedia,
    // requestAnimationFrame, getComputedStyle. Nó browser-only về bản chất.
    environment: 'jsdom',
  },
});
