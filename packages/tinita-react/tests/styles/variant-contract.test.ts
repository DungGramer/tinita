import { readdirSync, readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * The contract between variants in the JSX and selectors in the CSS.
 *
 * These two drift apart silently: rename a prop and the CSS no longer matches, the
 * component just loses its styling, and nothing reports it. This is the only gate.
 */
const SRC = resolve(__dirname, '../../src');
const UI = resolve(SRC, 'ui');

function walk(dir: string, test: (name: string) => boolean): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = resolve(dir, entry);
    if (statSync(full).isDirectory()) out.push(...walk(full, test));
    else if (test(entry)) out.push(full);
  }
  return out;
}

const tsxFiles = walk(UI, (n) => n.endsWith('.tsx')).map((path) => ({
  path,
  rel: path.slice(SRC.length + 1),
  code: readFileSync(path, 'utf8'),
}));

const cssFiles = walk(UI, (n) => n.endsWith('.module.css')).map((path) => ({
  path,
  rel: path.slice(SRC.length + 1),
  css: readFileSync(path, 'utf8').replace(/\/\*[\s\S]*?\*\//g, ''),
}));

/** The `data-x` attributes the CSS targets, with or without a value. */
const cssAttributes = new Set(
  cssFiles.flatMap(({ css }) =>
    [...css.matchAll(/\[(data-[a-z-]+)[^\]]*\]/g)].map((m) => m[1] as string)
  )
);

/**
 * The value of every `className=` in the file, with comments already stripped.
 *
 * Brace-matched rather than regex-captured, because the forms that matter nest:
 * `className={cn('flex', styles.root)}` hides a literal INSIDE a call, and that is
 * exactly how a utility class gets in without looking like one.
 */
function classNameValues(code: string): string[] {
  const clean = code.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  const out: string[] = [];
  const attr = /className\s*=\s*/g;
  for (let m = attr.exec(clean); m; m = attr.exec(clean)) {
    let i = m.index + m[0].length;
    if (clean[i] === '"' || clean[i] === "'") {
      const quote = clean[i];
      const end = clean.indexOf(quote, i + 1);
      if (end === -1) continue;
      out.push(clean.slice(i, end + 1));
      attr.lastIndex = end + 1;
    } else if (clean[i] === '{') {
      let depth = 0;
      const start = i;
      for (; i < clean.length; i++) {
        if (clean[i] === '{') depth++;
        else if (clean[i] === '}' && --depth === 0) break;
      }
      out.push(clean.slice(start, i + 1));
      attr.lastIndex = i + 1;
    }
  }
  return out;
}

/** Quoted or backtick-quoted runs inside a className value. */
function literalsIn(value: string): string[] {
  return [
    ...[...value.matchAll(/"([^"]*)"/g)].map((m) => m[1] as string),
    ...[...value.matchAll(/'([^']*)'/g)].map((m) => m[1] as string),
    ...[...value.matchAll(/`([^`]*)`/g)].map((m) => m[1] as string),
  ].filter((text) => /[a-z]/i.test(text));
}

describe('variant contract', () => {
  it('has files to check - without them every case below is falsely green', () => {
    expect(tsxFiles.length).toBeGreaterThanOrEqual(3);
    expect(cssAttributes.size).toBeGreaterThanOrEqual(5);
  });

  it('NO component writes `data-*` directly in the JSX', () => {
    // Every variant and state must go through `variantAttributes`. Written by hand,
    // each site invents its own boolean convention, and React's `data-x={false}`
    // and the resolver's `data-x="false"` differ when the prop is `undefined`.
    const bad: string[] = [];
    for (const { rel, code } of tsxFiles) {
      const withoutComments = code.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
      for (const m of withoutComments.matchAll(/(?:^|\s)(data-[a-z-]+)=/g)) {
        bad.push(`${rel}: ${m[1]}`);
      }
    }
    expect(bad).toEqual([]);
  });

  it('every `data-*` the CSS targets is actually emitted by a component', () => {
    // This direction catches renaming a prop while forgetting the CSS, where the CSS
    // dies silently.
    // Set by Base UI's `Collapsible`, not by tinita. `data-starting-style` and
    // `data-ending-style` only exist while the enter/exit transition runs; our CSS
    // reads them per the pattern in Base UI's docs.
    //
    // `data-disabled` once had 2 rules in FileTree.module.css while `disabled` was
    // never passed down - measured 0 elements carrying it, so the rules were deleted
    // rather than allowlisted.
    const fromLibrary = new Set([
      'data-open',
      'data-closed',
      'data-starting-style',
      'data-ending-style',
    ]);
    const emitted = new Set<string>();
    for (const { code } of tsxFiles) {
      for (const m of code.matchAll(/variantAttributes\(\{([\s\S]*?)\}\)/g)) {
        // `(?=[,:}]|$)`: the outer regex already consumed the `}`, so for a
        // single-key shorthand (`variantAttributes({ level })`) the block is just
        // `" level "` and a REQUIRED trailing delimiter would never match.
        // `data-level` slipped through on exactly this bug.
        for (const k of (m[1] as string).matchAll(/(?:^|[\s,{])([a-zA-Z][\w]*)\s*(?=[,:}]|$)/g)) {
          const key = k[1] as string;
          emitted.add(`data-${key.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)}`);
        }
      }
    }
    const missing = [...cssAttributes].filter((a) => !emitted.has(a) && !fromLibrary.has(a));
    expect(missing).toEqual([]);
  });

  /**
   * No `className` anywhere in `src/ui` receives a literal string.
   *
   * The rule it enforces is older than the guard and already written in
   * `src/utils/cn.ts`, which explains why `tailwind-merge` is absent: "there is no
   * Tailwind class in the JSX". Nothing checked it. Measured 2026-10-02 on
   * `feature/snap-corner`: 22 literal classNames carrying `flex items-center
   * justify-center rounded-full border bg-background shadow-lg` went through
   * `pnpm lint` at exit 0, and `bg-background`/`text-sm` need the host's shadcn
   * CSS variables on top of its Tailwind.
   *
   * Why "no literal" and not a Tailwind dictionary: across the four components that
   * predate this guard there are ZERO literal classNames - every one goes through
   * `styles.*` or the forwarded `className` prop. So the exact rule needs no
   * dictionary to maintain, and it catches any utility framework rather than one.
   * A literal global class would also be a leak of its own.
   *
   * `Ping` was measured receiving `display: block` instead of `inline-flex` in a
   * host without Tailwind. That is the failure this prevents.
   */
  it('NO className in src/ui receives a literal string', () => {
    const bad: string[] = [];
    for (const { rel, code } of tsxFiles) {
      for (const value of classNameValues(code)) {
        for (const text of literalsIn(value)) {
          bad.push(`${rel}: className ... "${text.trim().slice(0, 48)}"`);
        }
      }
    }
    expect(bad).toEqual([]);
  });

  it('no module CSS pulls Tailwind in through @apply or @tailwind', () => {
    // The second way in, and it leaves the JSX clean so the case above cannot see
    // it. `@apply` compiles to utilities, so the bundle would then depend on the
    // host's Tailwind build rather than shipping real CSS.
    const bad: string[] = [];
    for (const { rel, css } of cssFiles) {
      for (const m of css.matchAll(/@(apply|tailwind)\b/g)) bad.push(`${rel}: @${m[1]}`);
    }
    expect(bad).toEqual([]);
  });
});
