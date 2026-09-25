/** Dữ liệu bịa - không dùng đường dẫn/tên thật của máy dev (baseline ảnh sẽ commit). */
export const TREE_TEXT = ['src', '  index.ts', '  ui', '    button.tsx', 'README.md'].join('\n');

/** Render SSR cho cả ESM và CJS. Cố ý KHÔNG render FileTree - nó cần optional peer, ca L1 phụ trách. */
export const SSR_ESM = `
import { renderToString } from 'react-dom/server';
import { createElement as h } from 'react';
import { Ping } from 'tinita-react/ui/ping';
import { CarouselTicker } from 'tinita-react/ui/carousel-ticker';
import { autoInjectStyles } from 'tinita-react/utils/autoInjectStyles';

// autoInjectStyles chạm document.head. Trong SSR không có document - guard phải chịu được.
autoInjectStyles('probe-ssr', '.probe{}');

const out = [
  renderToString(h(Ping, { count: 3 })),
  renderToString(h(CarouselTicker, null, h('span', null, 'x'))),
].join('\\n');
process.stdout.write(out);
`;

export const SSR_CJS = `
const { renderToString } = require('react-dom/server');
const { createElement: h } = require('react');
const { Ping } = require('tinita-react/ui/ping');
const { CarouselTicker } = require('tinita-react/ui/carousel-ticker');
const { autoInjectStyles } = require('tinita-react/utils/autoInjectStyles');

autoInjectStyles('probe-ssr', '.probe{}');

process.stdout.write([
  renderToString(h(Ping, { count: 3 })),
  renderToString(h(CarouselTicker, null, h('span', null, 'x'))),
].join('\\n'));
`;

/** Dùng MỌI specifier trong contract và MỘT named export mỗi cái - đúng góc nhìn người dùng TS. */
export function tsProbe(specifiers) {
  const lines = ['/* eslint-disable */'];
  specifiers.forEach(([spec, named], i) => {
    lines.push(`import { ${named} as v${i} } from ${JSON.stringify(spec)};`);
  });
  lines.push(`const used: unknown[] = [${specifiers.map((_, i) => `v${i}`).join(', ')}];`);
  lines.push('export default used;');
  return lines.join('\n');
}
