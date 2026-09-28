import { readdirSync, readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * STATIC gate for the CSS leak-prevention rules.
 *
 * L2's `css-leak` case measures for real in Chromium against a simulated host and
 * is the stronger evidence. But it needs chromium + a packed tarball +
 * `next build`, so it does NOT run in the edit loop. The cases here run inside
 * `pnpm test`, read the source, and catch problems as you type. The two do not
 * replace each other.
 *
 * Every measurement behind these rules is in `docs/code-standards.md`, section
 * "Quy Tắc CSS Chống Rò Rỉ Global".
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

/** Strip comments before scanning: a comment mentioning `body` or `0.01ms` must not
 *  produce a false failure. */
function stripComments(css: string): string {
  return css.replace(/\/\*[\s\S]*?\*\//g, '');
}

/** Cut every `@<name>` block matching `test` out of the css, counting braces rather
 *  than relying on formatting. */
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

/** The selector at the head of each rule, with the brace body removed. */
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
   * `.module.css` = CSS Modules: class names are LOCAL and Vite scopes them to
   * `tnt-<folder>-<local>`. Source names do NOT need a prefix, and demanding one is
   * wrong - it would produce `tnt-ping-tnt-ping-root`.
   *
   * Global files (`src/styles/*.css`) are the opposite: their names ship verbatim
   * so they MUST carry the prefix. Two kinds of file, two rules.
   */
  isModule: path.endsWith('.module.css'),
}));
const globalFiles = files.filter((f) => !f.isModule);
const moduleFiles = files.filter((f) => f.isModule);

describe('CSS must not leak into the host page', () => {
  it('has CSS files to check - without them every case below is falsely green', () => {
    expect(files.length).toBeGreaterThan(2);
  });

  it('no rule targets `body` or `html`', () => {
    // Measured before `@layer base` was removed: host `body` background
    // rgb(10,20,30) -> rgb(255,255,255), color rgb(40,50,60) -> rgb(26,26,26).
    const bad: string[] = [];
    for (const { rel, css } of files) {
      for (const s of selectors(css)) {
        if (/(^|\s|,)(body|html)(\s|$|:|\[|\.)/.test(s)) bad.push(`${rel}: ${s}`);
      }
    }
    expect(bad).toEqual([]);
  });

  it('no selector starts with `*`', () => {
    // `* { @apply border-border }` used to override host elements' border-color.
    const bad: string[] = [];
    for (const { rel, css } of files) {
      for (const s of selectors(css)) {
        if (s.startsWith('*')) bad.push(`${rel}: ${s}`);
      }
    }
    expect(bad).toEqual([]);
  });

  it('no rule sets `color-scheme`', () => {
    // It changes the scrollbars and form controls of the ENTIRE host page.
    const bad = files
      .filter(({ css }) => /(^|[;{\s])color-scheme\s*:/.test(stripComments(css)))
      .map(({ rel }) => rel);
    expect(bad).toEqual([]);
  });

  it('every class selector in GLOBAL CSS carries the `tnt-` prefix', () => {
    // Except `.dark` and `[data-theme]`: those are the HOST's convention, which we
    // READ rather than define. They always sit inside `:where()`, so specificity 0.
    const allowed = /^(dark)$/;
    const bad: string[] = [];
    for (const { rel, css } of globalFiles) {
      for (const s of selectors(css)) {
        for (const cls of s.matchAll(/\.([a-zA-Z_][\w-]*)/g)) {
          const name = cls[1] ?? '';
          if (!name.startsWith('tnt-') && !allowed.test(name)) {
            bad.push(`${rel}: .${name} in "${s}"`);
          }
        }
      }
    }
    expect(bad).toEqual([]);
  });

  it('every `@keyframes` in GLOBAL CSS carries the `tnt-` prefix', () => {
    // `accordion-down` / `accordion-up` are shadcn's keyframes names: on a shadcn
    // host they collide outright and whichever comes last wins.
    const bad: string[] = [];
    for (const { rel, css } of globalFiles) {
      for (const m of stripComments(css).matchAll(/@keyframes\s+([\w-]+)/g)) {
        if (!(m[1] ?? '').startsWith('tnt-')) bad.push(`${rel}: @keyframes ${m[1]}`);
      }
    }
    expect(bad).toEqual([]);
  });

  it('every declared custom property carries the `--tnt-` prefix', () => {
    // Except Tailwind's `@theme inline`: it declares `--color-*`/`--radius-*` per
    // Tailwind's own contract, and was measured to emit NOTHING into the bundle.
    const bad: string[] = [];
    for (const { rel, css } of files) {
      // Do NOT use `^\s*--`: that only catches declarations on their own line, so
      // `:root { --x: 1px; }` written on one line slips through. Measured
      // 2026-09-26 by mutation test: this was the only one of the 10 guards that
      // failed to catch it.
      const { rest } = cutBlocks(stripComments(css), /@theme/);
      for (const m of rest.matchAll(/(?:^|[;{]|\s)--([\w-]+)\s*:/g)) {
        if (!(m[1] ?? '').startsWith('tnt-')) bad.push(`${rel}: --${m[1]}`);
      }
    }
    expect(bad).toEqual([]);
  });

  it('third-party runtime variables appear EXACTLY ONCE, at the wrapping site', () => {
    // `--radix-*` is a Radix internal. It is ALLOWED to exist - `Tree` uses
    // `Collapsible` to measure content height - but only in one single place, where
    // it is assigned to a tinita token. Keyframes and every other rule read that
    // token only. Without this case `--radix-*` seeps into the public CSS contract,
    // and switching foundation breaks users with no way to see it coming.
    const uses: string[] = [];
    for (const { rel, css } of files) {
      // Base UI does NOT vendor-namespace its variables -
      // `--collapsible-panel-height`, not `--base-ui-...`. So the real names have to
      // be listed; a regex keyed on a vendor prefix would be blind to it. That is
      // also why wrapping is required: a bare name like that can collide with a
      // host variable of the same name.
      for (const m of stripComments(css).matchAll(
        /var\(\s*(--(?:radix|mui|chakra|mantine)-[\w-]+|--(?:collapsible|accordion|popup|positioner)-[\w-]+)/g
      )) {
        uses.push(`${rel}: ${m[1]}`);
      }
    }
    expect(uses).toHaveLength(1);
    expect(uses[0]).toContain('--collapsible-panel-height');
  });

  it('reduced-motion blocks turn things off entirely, no near-zero durations', () => {
    // The owner hit a real bug with `0.01ms`: the animation STILL runs, so
    // `animationend` still fires. See docs/code-standards.md, section
    // "Quy Tắc Reduced Motion".
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

  it('has both module and global files - missing either makes its guard falsely green', () => {
    expect(moduleFiles.length).toBeGreaterThanOrEqual(3);
    expect(globalFiles.length).toBeGreaterThanOrEqual(2);
  });

  it('`:global` in CSS Modules is used ONLY for the host dark convention', () => {
    // `:global` is the last remaining back door for a class to escape scoping. It is
    // required for `.dark` (without it CSS Modules scopes it to
    // `tnt-file-tree-dark` and dark mode breaks entirely), but every other use is a
    // deliberate leak.
    // EXACT string comparison, no parsing. `/:global\(([^)]*)\)/` stops at the `)`
    // of the inner `:where` and loses the closing paren - measured while writing
    // this case.
    const ALLOWED = ":global(:where(.dark, [data-theme='dark']))";
    const bad: string[] = [];
    for (const { rel, css } of moduleFiles) {
      const body = stripComments(css);
      const total = body.split(':global').length - 1;
      const allowed = body.split(ALLOWED).length - 1;
      if (total !== allowed) {
        bad.push(`${rel}: ${total} uses of :global, only ${allowed} in the allowed form`);
      }
    }
    expect(bad).toEqual([]);
  });

  it('CSS Modules declares no tokens - tokens belong in the global files', () => {
    // Mixing tokens into a component file leaves callers with no idea where to look
    // to override, and `:root` inside a `.module.css` is NOT scoped, so it is
    // genuinely global.
    const bad: string[] = [];
    for (const { rel, css } of moduleFiles) {
      for (const sel of selectors(css)) {
        if (/(^|\s|,):root(\s|$|:|\[|,)/.test(sel)) bad.push(`${rel}: ${sel}`);
      }
    }
    expect(bad).toEqual([]);
  });

  it('source CSS does NOT wrap itself in `@layer` - the layered build emits that', () => {
    // Two builds ship: `styles.css` unlayered and `styles.layer.css` wrapped in
    // `@layer tnt`. If the source wrapped itself, the unlayered build would cease to
    // exist.
    const bad = files
      .filter(({ css }) => /^\s*@layer\s+[\w,\s]*\{/m.test(stripComments(css)))
      .map(({ rel }) => rel);
    expect(bad).toEqual([]);
  });
});
