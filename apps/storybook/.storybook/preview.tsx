import type { Preview, StoryContext } from '@storybook/react-vite';
import React from 'react';

// Import component CSS from source
// `styles.css` là bundle đủ cả ba tầng: token (globals), utility animation, và CSS
// component đã qua CSS Modules. Trước đây chỉ import globals + animations, nên
// FileTree/Ping/CarouselTicker chạy trong storybook mà KHÔNG có style của chính nó -
// lỗ này có từ trước khi chuyển sang CSS Modules, chỉ là không ai để ý vì token và
// animation vẫn nạp được nên trang không trắng hẳn.
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
 * Nó bơm `*:focus { outline: 2px solid #2563eb !important; outline-offset: 2px
 * !important }` vào MỌI story. Hai hậu quả, cả hai đều làm Storybook nói sai về
 * library:
 *
 * 1. `outline-offset: 2px` đè mất `-2px` mà `Tree.module.css` đặt CÓ CHỦ Ý. Offset
 *    dương vẽ vòng focus ra NGOÀI border box, nên `overflow: hidden` của nhóm con
 *    ăn mất cạnh trên của hàng đầu tiên trong nhóm. Đây chính là lỗi "focus bị mất
 *    viền trên" owner báo 2026-09-28 - đo được `outline-offset` computed là `2px`
 *    trong khi CSS nguồn và `dist/styles.css` đều là `-2px`, và rule đè đến từ
 *    inline `<style>` 126 byte này.
 * 2. Nó bắt `:focus` chứ không phải `:focus-visible`, nên click chuột cũng hiện
 *    vòng focus - trong app thật thì không.
 *
 * Library đã tự lo vòng focus. Storybook không được thêm lớp thứ hai.
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
