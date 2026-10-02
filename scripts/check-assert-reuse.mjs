#!/usr/bin/env node
/**
 * An inline condition that duplicates an existing assertion primitive must not ship.
 *
 * This guard exists because the convention already failed once, measurably.
 * `packages/tinita/src/html/html.ts` carried an `assertString` with the right
 * `asserts` signature, solving a condition that appears in 14 files - and it was used
 * in 1. A day later `assertDpi` was written in `unit/printPixels.ts` without the
 * `asserts` signature, so two helpers in one codebase had two shapes. Nobody noticed
 * either, because nothing was looking.
 *
 * What it reports is not "you duplicated four lines". It reports a condition whose
 * invariant already has one authority, which is what keeps error messages and
 * narrowing consistent. Conditions that appear once and mean nothing outside their
 * function are NOT flagged - that is Level 1 of the validation hierarchy and it is
 * the right answer there.
 *
 * To keep a condition inline on purpose, put a reason on the line above:
 *
 *   // assert-reuse-ignore `once` constrains a generic, not a value
 *   if (typeof func !== 'function') { ... }
 *
 * or at the end of the line itself, which no reformatting can separate:
 *
 *   if (typeof func !== 'function') { ... } // assert-reuse-ignore <reason>
 *
 * The reason is REQUIRED. A bare marker still fails: an exemption nobody had to
 * justify is how a guard turns into decoration.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const MARKER = 'assert-reuse-ignore';

/**
 * Each pattern is an invariant that has exactly one authority in
 * `packages/tinita/src/asserts/`.
 *
 * Deliberately NOT listed, because no primitive owns them (there are one or two
 * consumers, so extracting would be abstraction without reuse):
 * `typeof x !== 'function'`, `x instanceof Blob`, `x instanceof Uint8Array`.
 */
const RULES = [
  {
    // Must come before the plain-string rule: this is the more specific invariant.
    use: 'assertNonEmptyString',
    test: (line) =>
      /typeof\s+[\w.]+\s*!==\s*'string'/.test(line) &&
      /===\s*''|\.length\s*===\s*0/.test(line),
  },
  { use: 'assertString', test: (line) => /typeof\s+[\w.]+\s*!==\s*'string'/.test(line) },
  { use: 'assertArray', test: (line) => /!\s*Array\.isArray\(/.test(line) },
  {
    use: 'assertObject',
    test: (line) =>
      /[\w.]+\s*===\s*null\s*\|\|\s*typeof\s+[\w.]+\s*!==\s*'object'/.test(line) ||
      /typeof\s+[\w.]+\s*!==\s*'object'\s*\|\|\s*[\w.]+\s*===\s*null/.test(line),
  },
  {
    use: 'assertPositiveFiniteNumber',
    test: (line) =>
      /!\s*Number\.isFinite\(/.test(line) && /<=\s*0|<\s*=\s*0/.test(line),
  },
  { use: 'assertInteger', test: (line) => /!\s*Number\.isInteger\(/.test(line) },
  { use: 'assertFiniteNumber', test: (line) => /!\s*Number\.isFinite\(/.test(line) },
];

function sourceFiles(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      if (entry === 'node_modules' || entry === 'dist') continue;
      out.push(...sourceFiles(full));
    } else if (/\.tsx?$/.test(entry) && !/\.d\.ts$/.test(entry)) {
      out.push(full);
    }
  }
  return out;
}

const findings = [];
let files = 0;
let exempt = 0;

for (const pkg of ['tinita', 'tinita-dom', 'tinita-react']) {
  for (const file of sourceFiles(resolve(ROOT, 'packages', pkg, 'src'))) {
    // The primitives themselves ARE the authority; they must contain the conditions.
    if (file.includes(`${join('src', 'asserts')}`)) continue;

    files += 1;
    const lines = readFileSync(file, 'utf8').split('\n');
    lines.forEach((line, index) => {
      const rule = RULES.find((candidate) => candidate.test(line));
      if (!rule) return;

      // A marker on the SAME line wins, and is the robust form: it cannot be
      // separated from what it protects by any reformatting or by an intervening
      // line of code.
      if (line.includes(MARKER)) {
        const inline = line.slice(line.indexOf(MARKER) + MARKER.length).trim();
        if (inline === '') {
          findings.push({
            file: relative(ROOT, file),
            line: index + 1,
            use: rule.use,
            text: `${MARKER} với lý do RỖNG - exemption phải nêu lý do`,
          });
        } else {
          exempt += 1;
        }
        return;
      }

      // Otherwise walk back over blank lines AND comment lines. Two reasons: prettier reflows
      // and will separate the marker from the line it protects (the doc-links guard
      // had exactly that bug), and a reason worth writing rarely fits on one line -
      // so a comment block counts as one unit and the marker may head it.
      const isComment = (line) => /^\s*(\/\/|\*|\/\*)/.test(line);
      let reason = null;
      for (let back = index - 1; back >= 0; back -= 1) {
        const previous = lines[back];
        if (previous === undefined) break;
        if (previous.includes(MARKER)) {
          reason = previous.slice(previous.indexOf(MARKER) + MARKER.length).trim();
          break;
        }
        if (previous.trim() !== '' && !isComment(previous)) break;
      }
      if (reason !== null) {
        if (reason === '') {
          findings.push({
            file: relative(ROOT, file),
            line: index + 1,
            use: rule.use,
            text: `${MARKER} với lý do RỖNG - exemption phải nêu lý do`,
          });
        } else {
          exempt += 1;
        }
        return;
      }

      findings.push({
        file: relative(ROOT, file),
        line: index + 1,
        use: rule.use,
        text: line.trim(),
      });
    });
  }
}

if (findings.length > 0) {
  process.stdout.write(
    `FAIL check-assert-reuse: ${findings.length} điều kiện inline đã có primitive\n\n`
  );
  for (const entry of findings) {
    process.stdout.write(`  ${entry.file}:${entry.line}\n`);
    process.stdout.write(`    ${entry.text.slice(0, 110)}\n`);
    process.stdout.write(`    -> dùng ${entry.use}() từ tinita/asserts\n`);
  }
  process.stdout.write(
    `\nHoặc đặt \`// ${MARKER} <lý do>\` ở dòng trên nếu nó cố ý giữ inline.\n`
  );
  process.exit(1);
}

process.stdout.write(
  `PASS check-assert-reuse: ${files} file, 0 điều kiện trùng primitive, ${exempt} exemption đều có lý do\n`
);
