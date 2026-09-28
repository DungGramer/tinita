import type { Preview, StoryContext } from '@storybook/react-vite';
import React from 'react';

// Import component CSS from source
// `styles.css` is the bundle covering all three layers: tokens (globals), animation
// utilities, and component CSS that went through CSS Modules. Only globals +
// animations were imported before, so FileTree/Ping/CarouselTicker ran in Storybook
// with NONE of their own styles - a hole that predates the move to CSS Modules and
// went unnoticed because tokens and animations still loaded, so the page was never
// blank.
import 'tinita-react/styles.css';

// Custom viewports for responsive testing
const customViewports = {
  mobileSmall: {
    name: 'Mobile Small',
    styles: {
      width: '320px',
      height: '568px',
    },
  },
  mobile: {
    name: 'iPhone',
    styles: {
      width: '375px',
      height: '667px',
    },
  },
  mobileLarge: {
    name: 'Mobile Large',
    styles: {
      width: '414px',
      height: '896px',
    },
  },
  tablet: {
    name: 'Tablet',
    styles: {
      width: '768px',
      height: '1024px',
    },
  },
  laptop: {
    name: 'Laptop',
    styles: {
      width: '1024px',
      height: '768px',
    },
  },
  desktop: {
    name: 'Desktop',
    styles: {
      width: '1280px',
      height: '720px',
    },
  },
  desktopWide: {
    name: 'Desktop Wide',
    styles: {
      width: '1440px',
      height: '900px',
    },
  },
  desktopUltraWide: {
    name: 'Desktop Ultra Wide',
    styles: {
      width: '1920px',
      height: '1080px',
    },
  },
};

// Theme decorator
const withTheme = (Story: React.ComponentType, context: StoryContext) => {
  const theme = context.globals?.theme || 'light';
  return React.createElement(
    'div',
    { 'data-theme': theme },
    React.createElement(Story)
  );
};

// RTL decorator
const withRTL = (Story: React.ComponentType, context: StoryContext) => {
  const direction = context.globals?.direction || 'ltr';
  return React.createElement(
    'div',
    { dir: direction },
    React.createElement(Story)
  );
};

// No-JS decorator
const withNoJS = (Story: React.ComponentType, context: StoryContext) => {
  const noJS = context.parameters?.noJS || false;
  if (noJS) {
    return React.createElement(
      'div',
      { 'data-no-js': 'true' },
      React.createElement(
        'noscript',
        null,
        React.createElement(
          'style',
          null,
          `
            [data-no-js="true"] * {
              pointer-events: none !important;
            }
          `
        )
      ),
      React.createElement(Story)
    );
  }
  return React.createElement(Story);
};

/**
 * ĐÃ XOÁ: decorator `withFocusManagement`.
 *
 * It injected `*:focus { outline: 2px solid #2563eb !important; outline-offset: 2px
 * !important }` into EVERY story. Two consequences, both of which make Storybook lie
 * about the library:
 *
 * 1. `outline-offset: 2px` overrode the `-2px` that `Tree.module.css` sets
 *    DELIBERATELY. A positive offset draws the focus ring OUTSIDE the border box, so
 *    the child group's `overflow: hidden` eats the top edge of the group's first
 *    row. This is exactly the "focus ring loses its top border" bug reported
 *    2026-09-28 - the computed `outline-offset` measured `2px` while both the source
 *    CSS and `dist/styles.css` said `-2px`, and the overriding rule came from this
 *    126-byte inline `<style>`.
 * 2. It matched `:focus` rather than `:focus-visible`, so a mouse click showed the
 *    focus ring too - which it does not do in a real app.
 *
 * The library handles its own focus ring. Storybook must not add a second layer.
 */

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    viewport: {
      options: customViewports,
    },
    backgrounds: {
      options: {
        light: {
          name: 'light',
          value: '#ffffff',
        },

        dark: {
          name: 'dark',
          value: '#0a0a0a',
        },
      },
    },
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
        ],
      },
      options: {
        checks: { 'color-contrast': { options: { noScroll: true } } },
      },
    },
    actions: { argTypesRegex: '^on[A-Z].*' },
    measure: {
      enabled: true,
    },
  },
  decorators: [withTheme, withRTL, withNoJS],
  globalTypes: {
    theme: {
      description: 'Global theme for components',
      defaultValue: 'light',
      toolbar: {
        title: 'Theme',
        icon: 'circlehollow',
        items: [
          { value: 'light', title: 'Light', icon: 'sun' },
          { value: 'dark', title: 'Dark', icon: 'moon' },
        ],
        dynamicTitle: true,
      },
    },
    direction: {
      description: 'Text direction',
      defaultValue: 'ltr',
      toolbar: {
        title: 'Direction',
        icon: 'paragraph',
        items: [
          { value: 'ltr', title: 'LTR', icon: 'arrowleft' },
          { value: 'rtl', title: 'RTL', icon: 'arrowright' },
        ],
        dynamicTitle: true,
      },
    },
  },
  initialGlobals: {
    theme: 'light',
    direction: 'ltr',

    viewport: {
      value: 'desktop',
      isRotated: false,
    },

    backgrounds: {
      value: 'light',
    },
  },
};

export default preview;
