/** Dữ liệu bịa - không dùng đường dẫn/tên thật của máy dev (baseline ảnh sẽ commit). */
export const TREE_TEXT = ['src', '  index.ts', '  ui', '    button.tsx', 'README.md'].join('\n');

/**
 * SSR smoke cho cả ESM và CJS. Cố ý KHÔNG render FileTree - nó cần optional peer,
 * ca L1 phụ trách.
 *
 * `universal` là mọi specifier của package KHÔNG browserOnly, suy từ contract.json
 * chứ không liệt kê tay. Trước 2026-10-01 hai fixture này chỉ import `tinita-react`,
 * nên hợp đồng "tinita chạy mọi nơi" không có guard nào: thêm một export chạm
 * `document` vào `tinita` thì ca SSR vẫn xanh. Suy từ contract đóng lỗ đó và làm
 * mọi export mới tự được canh.
 */
function universalImportsEsm(universal) {
  return universal
    .map(([spec, named], i) => `import { ${named} as u${i} } from ${JSON.stringify(spec)};`)
    .join('\n');
}

function universalImportsCjs(universal) {
  return universal
    .map(([spec, named], i) => `const { ${named}: u${i} } = require(${JSON.stringify(spec)});`)
    .join('\n');
}

// Import là nửa đầu của hợp đồng: module phải LOAD được khi không có DOM. Nửa sau là
// binding phải thật sự tồn tại - một barrel re-export sai tên vẫn load im lặng rồi
// trả undefined.
function universalAssert(universal) {
  const names = universal.map((_, i) => `u${i}`);
  return `
const bindings = ${JSON.stringify(universal.map(([s, n]) => `${s}#${n}`))};
const values = [${names.join(', ')}];
const missing = bindings.filter((_, i) => values[i] === undefined);
if (missing.length > 0) {
  throw new Error('SSR: binding undefined sau khi import: ' + missing.join(', '));
}`;
}

export function ssrEsm(universal) {
  return `
import { renderToString } from 'react-dom/server';
import { createElement as h } from 'react';
import { Ping } from 'tinita-react/ui/ping';
import { CarouselTicker } from 'tinita-react/ui/carousel-ticker';
import { autoInjectStyles } from 'tinita-react/utils/autoInjectStyles';
${universalImportsEsm(universal)}
${universalAssert(universal)}

// autoInjectStyles chạm document.head. Trong SSR không có document - guard phải chịu được.
autoInjectStyles('probe-ssr', '.probe{}');

const out = [
  renderToString(h(Ping, { count: 3 })),
  renderToString(h(CarouselTicker, null, h('span', null, 'x'))),
].join('\\n');
process.stdout.write(out);
`;
}

export function ssrCjs(universal) {
  return `
const { renderToString } = require('react-dom/server');
const { createElement: h } = require('react');
const { Ping } = require('tinita-react/ui/ping');
const { CarouselTicker } = require('tinita-react/ui/carousel-ticker');
const { autoInjectStyles } = require('tinita-react/utils/autoInjectStyles');
${universalImportsCjs(universal)}
${universalAssert(universal)}

autoInjectStyles('probe-ssr', '.probe{}');

process.stdout.write([
  renderToString(h(Ping, { count: 3 })),
  renderToString(h(CarouselTicker, null, h('span', null, 'x'))),
].join('\\n'));
`;
}

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
