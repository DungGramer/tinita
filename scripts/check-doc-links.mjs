#!/usr/bin/env node
/**
 * Every `tinita*` import path written in a markdown file must exist in some
 * package's `exports`.
 *
 * This guard exists because the repo already shipped the defect it catches.
 * `CLAUDE.md` stated that `import { useToggle } from 'tinita-react/hooks'` and
 * `import { FileTree } from 'tinita-react/ui'` were the REQUIRED import paths. Neither
 * subpath has ever existed, so the file that is meant to orient a reader pointed them
 * at a dead end. L1 found it only because someone wrote a case for that exact pair by
 * hand.
 *
 * With 92 public subpaths across three packages, that class of error is no longer
 * findable by eye - which is the whole argument for a script rather than a review.
 *
 * Matching is deliberately crude: any `tinita`, `tinita-dom` or `tinita-react`
 * followed by a slash path, wherever it appears. A false positive is cheap to
 * silence and a false negative is the thing being prevented.
 *
 * A trailing `*` is treated as a glob and checked as a PREFIX: at least one real
 * subpath must start with it. That keeps `tinita-react/hooks/*` honest - it is a
 * claim about a group, which docs legitimately make - while still failing on a typo
 * such as `tinita-react/hook/*`.
 *
 * To document a path on purpose that does not resolve - a planned API, or an example
 * of what NOT to write - put `<!-- doc-links-ignore -->` before it, or anywhere in a
 * fenced block to exempt that whole block. Blank lines between the marker and the line
 * it protects are skipped, because `prettier` reflows markdown and will insert one.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PACKAGES = ['tinita', 'tinita-dom', 'tinita-react'];

/** `plans/` records history, including names that were deliberately changed. */
const SKIP_DIRS = new Set([
  'node_modules',
  '.git',
  'dist',
  'plans',
  '.turbo',
  '.next',
  'storybook-static',
  'coverage',
  '.work',
  '.artifacts',
  '.reports',
  '.npm-cache',
]);

const valid = new Set();
for (const name of PACKAGES) {
  const manifest = JSON.parse(readFileSync(resolve(ROOT, 'packages', name, 'package.json'), 'utf8'));
  for (const key of Object.keys(manifest.exports ?? {})) {
    valid.add(key === '.' ? name : `${name}${key.slice(1)}`);
  }
}

function markdownFiles(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    if (SKIP_DIRS.has(entry)) continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...markdownFiles(full));
    else if (entry.endsWith('.md')) out.push(full);
  }
  return out;
}

// `tinita-react` before `tinita` so the longer name wins the alternation.
//
// The lookbehind excludes `@tinita/...`: a scoped name is a different package
// entirely, and ARCHITECTURE.md discusses a hypothetical `@tinita/*` layout at
// length. Also excludes a preceding word character or slash, so `packages/tinita/...`
// and `mytinita/x` are repo paths rather than specifiers.
const SPECIFIER = /(?<![@\w/-])(tinita-react|tinita-dom|tinita)((?:\/[\w.*-]+)+)/g;
const IGNORE = '<!-- doc-links-ignore -->';

const bad = [];
let checked = 0;

for (const file of markdownFiles(ROOT)) {
  const lines = readFileSync(file, 'utf8').split('\n');
  let fenceIgnored = false;
  let inFence = false;

  lines.forEach((line, index) => {
    if (line.trimStart().startsWith('```')) {
      inFence = !inFence;
      if (!inFence) fenceIgnored = false;
      return;
    }
    if (line.includes(IGNORE)) {
      if (inFence) fenceIgnored = true;
      return;
    }
    if (fenceIgnored) return;
    // Walk back over blank lines: prettier reflows markdown and will put a blank
    // between the marker and the line it protects. Anchoring to `index - 1` alone
    // made the marker break on the next `pnpm format`.
    for (let back = index - 1; back >= 0; back -= 1) {
      const previous = lines[back];
      if (previous === undefined) break;
      if (previous.includes(IGNORE)) return;
      if (previous.trim() !== '') break;
    }

    for (const match of line.matchAll(SPECIFIER)) {
      const specifier = `${match[1]}${match[2]}`;
      // A path ending in a file extension is a repo path, not a package specifier:
      // `packages/tinita/src/x.ts`, `tinita-react/tsup.config.ts`.
      if (/\.(ts|tsx|mjs|cjs|json|md|css|png|txt|map)$/.test(specifier)) continue;
      checked += 1;

      // A trailing `*` is a glob, and docs legitimately use one to make a claim
      // about a whole group ("no hook needs an optional peer"). Validate it as a
      // PREFIX rather than ignoring it, so `tinita-react/hooks/*` passes only while
      // such subpaths exist and a typo like `tinita-react/hook/*` still fails.
      if (specifier.endsWith('/*')) {
        const prefix = specifier.slice(0, -1);
        if (![...valid].some((known) => known.startsWith(prefix))) {
          bad.push({
            file: relative(ROOT, file),
            line: index + 1,
            specifier,
            text: `${line.trim()}  (glob khớp 0 subpath)`,
          });
        }
        continue;
      }

      if (!valid.has(specifier)) {
        bad.push({ file: relative(ROOT, file), line: index + 1, specifier, text: line.trim() });
      }
    }
  });
}

if (bad.length > 0) {
  process.stdout.write(`FAIL check-doc-links: ${bad.length}/${checked} đường nhập không tồn tại\n\n`);
  for (const entry of bad) {
    process.stdout.write(`  ${entry.file}:${entry.line}  ${entry.specifier}\n    ${entry.text.slice(0, 120)}\n`);
  }
  process.stdout.write(
    `\nSửa đường nhập, hoặc đặt ${IGNORE} ở dòng trước nếu nó cố ý không resolve.\n`
  );
  process.exit(1);
}

process.stdout.write(
  `PASS check-doc-links: ${checked} đường nhập trong markdown đều có trong exports (${valid.size} subpath hợp lệ)\n`
);
