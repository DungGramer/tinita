import { readdirSync, readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Cửa chặn TĨNH cho các quy tắc chống rò rỉ CSS.
 *
 * Ca `css-leak` của L2 đo thật trong Chromium trên một host giả lập và nó là
 * bằng chứng mạnh hơn. Nhưng nó cần chromium + tarball đã pack + `next build`,
 * nên nó KHÔNG chạy trong vòng lặp sửa code. Ca ở đây chạy trong `pnpm test`,
 * đọc source, và bắt được ngay lúc gõ. Hai cái không thay thế nhau.
 *
 * Mọi số đo đứng sau các quy tắc này ở `docs/code-standards.md` mục "Quy Tắc CSS
 * Chống Rò Rỉ Global".
 */
const SRC = resolve(__dirname, '../../src');

function collectCss(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = resolve(dir, entry);
    if (statSync(full).isDirectory()) out.push(...collectCss(full));
    else if (entry.endsWith('.css')) out.push(full);
  }
  return out;
}

/** Bỏ comment trước khi quét: comment nhắc `body` hay `0.01ms` không được làm đỏ giả. */
function stripComments(css: string): string {
  return css.replace(/\/\*[\s\S]*?\*\//g, '');
}

/** Cắt mọi khối `@<name>` khớp `test` ra khỏi css, đếm ngoặc chứ không dựa vào format. */
function cutBlocks(css: string, test: RegExp): { rest: string; bodies: string[] } {
  const bodies: string[] = [];
  let rest = '';
  let i = 0;
  while (i < css.length) {
    const at = css.indexOf('@', i);
    if (at === -1) {
      rest += css.slice(i);
      break;
    }
    const open = css.indexOf('{', at);
    const prelude = open === -1 ? '' : css.slice(at, open);
    if (open === -1 || !test.test(prelude)) {
      rest += css.slice(i, at + 1);
      i = at + 1;
      continue;
    }
    rest += css.slice(i, at);
    let depth = 1;
    let j = open + 1;
    const start = j;
    while (j < css.length && depth > 0) {
      if (css[j] === '{') depth += 1;
      else if (css[j] === '}') depth -= 1;
      j += 1;
    }
    bodies.push(css.slice(start, j - 1));
    i = j;
  }
  return { rest, bodies };
}

/** Selector ở đầu mỗi rule, đã bỏ phần trong ngoặc nhọn. */
function selectors(css: string): string[] {
  const out: string[] = [];
  for (const match of stripComments(css).matchAll(/(^|[}])\s*([^{}@][^{}]*)\{/g)) {
    for (const part of (match[2] ?? '').split(',')) {
      const s = part.trim();
      if (s) out.push(s);
    }
  }
  return out;
}

const files = collectCss(SRC).map((path) => ({
  path,
  rel: path.slice(SRC.length + 1),
  css: readFileSync(path, 'utf8'),
  /**
   * `.module.css` = CSS Modules: tên class là LOCAL và Vite scope thành
   * `tnt-<folder>-<local>`. Tên ở source KHÔNG cần prefix, và đòi nó prefix là sai -
   * sẽ ra `tnt-ping-tnt-ping-root`.
   *
   * File global (`src/styles/*.css`) thì ngược lại: tên ship nguyên văn nên PHẢI
   * prefix. Hai loại file, hai quy tắc.
   */
  isModule: path.endsWith('.module.css'),
}));
const globalFiles = files.filter((f) => !f.isModule);
const moduleFiles = files.filter((f) => f.isModule);

describe('CSS không được rò rỉ ra trang khách', () => {
  it('có file CSS để kiểm - nếu không, mọi ca dưới đây xanh giả', () => {
    expect(files.length).toBeGreaterThan(2);
  });

  it('không rule nào nhắm `body` hoặc `html`', () => {
    // Đo được trước khi xoá `@layer base`: host `body` background
    // rgb(10,20,30) -> rgb(255,255,255), color rgb(40,50,60) -> rgb(26,26,26).
    const bad: string[] = [];
    for (const { rel, css } of files) {
      for (const s of selectors(css)) {
        if (/(^|\s|,)(body|html)(\s|$|:|\[|\.)/.test(s)) bad.push(`${rel}: ${s}`);
      }
    }
    expect(bad).toEqual([]);
  });

  it('không selector nào bắt đầu bằng `*`', () => {
    // `* { @apply border-border }` từng đè border-color của element host.
    const bad: string[] = [];
    for (const { rel, css } of files) {
      for (const s of selectors(css)) {
        if (s.startsWith('*')) bad.push(`${rel}: ${s}`);
      }
    }
    expect(bad).toEqual([]);
  });

  it('không rule nào set `color-scheme`', () => {
    // Nó đổi scrollbar và form control của CẢ trang khách.
    const bad = files
      .filter(({ css }) => /(^|[;{\s])color-scheme\s*:/.test(stripComments(css)))
      .map(({ rel }) => rel);
    expect(bad).toEqual([]);
  });

  it('mọi class selector trong CSS GLOBAL đều mang prefix `tnt-`', () => {
    // Trừ `.dark` và `[data-theme]`: đó là quy ước của HOST mà ta ĐỌC, không định
    // nghĩa. Chúng luôn nằm trong `:where()` nên specificity 0.
    const allowed = /^(dark)$/;
    const bad: string[] = [];
    for (const { rel, css } of globalFiles) {
      for (const s of selectors(css)) {
        for (const cls of s.matchAll(/\.([a-zA-Z_][\w-]*)/g)) {
          const name = cls[1] ?? '';
          if (!name.startsWith('tnt-') && !allowed.test(name)) {
            bad.push(`${rel}: .${name} trong "${s}"`);
          }
        }
      }
    }
    expect(bad).toEqual([]);
  });

  it('mọi `@keyframes` trong CSS GLOBAL đều mang prefix `tnt-`', () => {
    // `accordion-down` / `accordion-up` là tên keyframes của shadcn: host dùng
    // shadcn thì trùng thẳng và một trong hai bên thắng tuỳ thứ tự.
    const bad: string[] = [];
    for (const { rel, css } of globalFiles) {
      for (const m of stripComments(css).matchAll(/@keyframes\s+([\w-]+)/g)) {
        if (!(m[1] ?? '').startsWith('tnt-')) bad.push(`${rel}: @keyframes ${m[1]}`);
      }
    }
    expect(bad).toEqual([]);
  });

  it('mọi custom property khai ra đều mang prefix `--tnt-`', () => {
    // Trừ `@theme inline` của Tailwind: nó khai `--color-*`/`--radius-*` theo đúng
    // hợp đồng của Tailwind, và đo được là KHÔNG phát vào bundle.
    const bad: string[] = [];
    for (const { rel, css } of files) {
      // KHÔNG dùng `^\s*--` : nó chỉ bắt được declaration nằm riêng một dòng, nên
      // `:root { --x: 1px; }` viết trên một dòng lọt qua. Đo được 2026-09-26 bằng
      // mutation test: đây là guard duy nhất trong 10 guard không bắt được.
      const { rest } = cutBlocks(stripComments(css), /@theme/);
      for (const m of rest.matchAll(/(?:^|[;{]|\s)--([\w-]+)\s*:/g)) {
        if (!(m[1] ?? '').startsWith('tnt-')) bad.push(`${rel}: --${m[1]}`);
      }
    }
    expect(bad).toEqual([]);
  });

  it('không dùng biến runtime của third-party trực tiếp', () => {
    // `--radix-*` là chi tiết nội bộ của Radix. Nó chỉ được xuất hiện đúng một lần,
    // ở chỗ bọc lại sau token của tinita.
    const uses: string[] = [];
    for (const { rel, css } of files) {
      for (const m of stripComments(css).matchAll(/var\(\s*(--radix-[\w-]+)/g)) {
        uses.push(`${rel}: ${m[1]}`);
      }
    }
    expect(uses).toHaveLength(1);
    expect(uses[0]).toContain('--radix-accordion-content-height');
  });

  it('khối reduced-motion tắt hẳn, không thời lượng gần-0', () => {
    // Owner đã gặp bug thật với `0.01ms`: animation VẪN chạy nên `animationend`
    // vẫn fire. Xem docs/code-standards.md mục "Quy Tắc Reduced Motion".
    const bad: string[] = [];
    for (const { rel, css } of files) {
      const { bodies } = cutBlocks(stripComments(css), /prefers-reduced-motion/);
      for (const body of bodies) {
        for (const t of body.matchAll(/(?<![\w-])(\d*\.?\d+)(ms|s)(?![\w-])/g)) {
          const ms = t[2] === 's' ? Number(t[1]) * 1000 : Number(t[1]);
          if (ms > 0) bad.push(`${rel}: ${t[0]}`);
        }
      }
    }
    expect(bad).toEqual([]);
  });

  it('có cả file module và file global - nếu thiếu loại nào, guard tương ứng xanh giả', () => {
    expect(moduleFiles.length).toBeGreaterThanOrEqual(3);
    expect(globalFiles.length).toBeGreaterThanOrEqual(2);
  });

  it('`:global` trong CSS Modules CHỈ dùng cho quy ước dark của host', () => {
    // `:global` là cửa hậu duy nhất còn lại để một class thoát khỏi scope. Nó cần
    // thiết cho `.dark` (không có nó, CSS Modules scope thành `tnt-file-tree-dark` và
    // dark mode vỡ hẳn), nhưng mọi chỗ dùng khác là rò rỉ có chủ ý.
    // So khớp chuỗi CHÍNH XÁC, không parse. `/:global\(([^)]*)\)/` dừng ở `)` của
    // `:where` bên trong và cắt mất ngoặc đóng - đo được khi viết ca này.
    const ALLOWED = ":global(:where(.dark, [data-theme='dark']))";
    const bad: string[] = [];
    for (const { rel, css } of moduleFiles) {
      const body = stripComments(css);
      const total = body.split(':global').length - 1;
      const allowed = body.split(ALLOWED).length - 1;
      if (total !== allowed) {
        bad.push(`${rel}: ${total} lần :global, chỉ ${allowed} lần đúng dạng cho phép`);
      }
    }
    expect(bad).toEqual([]);
  });

  it('CSS Modules không khai token - token thuộc file global', () => {
    // Trộn token vào file component thì người dùng không biết nhìn đâu để override, và
    // `:root` trong `.module.css` KHÔNG bị scope nên nó là global thật.
    const bad: string[] = [];
    for (const { rel, css } of moduleFiles) {
      for (const sel of selectors(css)) {
        if (/(^|\s|,):root(\s|$|:|\[|,)/.test(sel)) bad.push(`${rel}: ${sel}`);
      }
    }
    expect(bad).toEqual([]);
  });

  it('CSS source KHÔNG tự bọc `@layer` - bản layer do build sinh', () => {
    // Ship hai bản: `styles.css` không layer và `styles.layer.css` bọc `@layer tnt`.
    // Nếu source tự bọc thì bản không layer không còn tồn tại.
    const bad = files
      .filter(({ css }) => /^\s*@layer\s+[\w,\s]*\{/m.test(stripComments(css)))
      .map(({ rel }) => rel);
    expect(bad).toEqual([]);
  });
});
