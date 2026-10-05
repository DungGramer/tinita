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

/**
 * Hợp đồng NODE-SAFE, không phải "package hỗ trợ SSR".
 *
 * Từ 2026-10-05 mọi specifier `tinita-react/ui/*` cùng root mang một import CSS để
 * consumer tự nạp stylesheet, nên chúng đòi một bundler hiểu CSS và Node trần không
 * nạp được. Fixture này vì vậy chỉ dùng những entrypoint CÒN hợp đồng Node-safe -
 * `utils/*`, `hooks/*`, và mọi specifier universal của `tinita`/`tinita-dom`.
 *
 * SSR của component KHÔNG bị bỏ: nó được canh ở `next-rsc-*` của L2 và
 * `react18/19:*` của L4, nơi `next build` prerender thật. Đó cũng là nơi nó có nghĩa,
 * vì không ai SSR một React app mà không có bundler.
 */
export function ssrEsm(universal) {
  return `
import { renderToString } from 'react-dom/server';
import { createElement as h } from 'react';
import { autoInjectStyles } from 'tinita-react/utils/autoInjectStyles';
import { jsxJoin } from 'tinita-react/utils/jsxJoin';
${universalImportsEsm(universal)}
${universalAssert(universal)}

// autoInjectStyles chạm document.head. Trong SSR không có document - guard phải chịu được.
autoInjectStyles('probe-ssr', '.probe{}');

const out = [
  renderToString(h('span', { className: 'tnt-probe' }, jsxJoin(['a', 'b'], ', '))),
].join('\\n');
process.stdout.write(out);
`;
}

export function ssrCjs(universal) {
  return `
const { renderToString } = require('react-dom/server');
const { createElement: h } = require('react');
const { autoInjectStyles } = require('tinita-react/utils/autoInjectStyles');
const { jsxJoin } = require('tinita-react/utils/jsxJoin');
${universalImportsCjs(universal)}
${universalAssert(universal)}

autoInjectStyles('probe-ssr', '.probe{}');

process.stdout.write([
  renderToString(h('span', { className: 'tnt-probe' }, jsxJoin(['a', 'b'], ', '))),
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
