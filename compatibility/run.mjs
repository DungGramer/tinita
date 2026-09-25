import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

import { ARTIFACTS, EXIT, LAB, MANIFEST } from './scripts/paths.mjs';

const LEVELS = ['l1', 'l2', 'l3', 'l4'];

function parseArgs(argv) {
  const positional = argv.filter((a) => !a.startsWith('--'));
  const flags = Object.fromEntries(
    argv.filter((a) => a.startsWith('--')).map((a) => {
      const [k, v = 'true'] = a.replace(/^--/, '').split('=');
      return [k, v];
    }),
  );
  const level = positional[0] ?? 'all';
  return { level, flags };
}

function usage(message) {
  process.stderr.write(`${message}\nnode compatibility/run.mjs <l1|l2|l3|l4|all> [--case=<name>] [--tier=1|2|3] [--json] [--no-pack]\n`);
  process.exit(EXIT.INFRA);
}

const { level, flags } = parseArgs(process.argv.slice(2));
if (level !== 'all' && !LEVELS.includes(level)) usage(`level không hợp lệ: ${level}`);

// --no-pack mà thiếu manifest là lỗi hạ tầng rõ ràng - báo trước khi assert-isolation,
// nếu không assertion 6 fail và thông báo sẽ nói sai nguyên nhân.
if (flags['no-pack'] === 'true' && !existsSync(MANIFEST)) {
  process.stderr.write(`[run] --no-pack nhưng thiếu manifest: ${MANIFEST}\n[run] chạy 'node compatibility/scripts/pack.mjs' trước, hoặc bỏ --no-pack\n`);
  process.exit(EXIT.INFRA);
}

// assert-isolation LUÔN chạy trước. Nó fail thì không ca nào đáng tin -> exit 2, không chạy gì.
try {
  execFileSync('node', [resolve(LAB, 'scripts/assert-isolation.mjs')], { stdio: 'inherit' });
} catch {
  process.stderr.write('\n[run] assert-isolation FAIL - lab không còn cô lập, không chạy ca nào\n');
  process.exit(EXIT.INFRA);
}

if (flags['no-pack'] !== 'true') {
  try {
    execFileSync('node', [resolve(LAB, 'scripts/pack.mjs')], { stdio: 'inherit' });
  } catch {
    process.stderr.write('\n[run] pack FAIL\n');
    process.exit(EXIT.INFRA);
  }
}

if (!existsSync(MANIFEST)) {
  process.stderr.write(`\n[run] thiếu manifest (${ARTIFACTS} trống). Bỏ --no-pack hoặc chạy pack.mjs trước.\n`);
  process.exit(EXIT.INFRA);
}

const levels = level === 'all' ? LEVELS : [level];
let failed = 0;
let ran = 0;

for (const lv of levels) {
  const runner = resolve(LAB, 'cases', lv, 'index.mjs');
  if (!existsSync(runner)) {
    process.stdout.write(`\n[run] ${lv}: chưa triển khai, skip\n`);
    continue;
  }
  ran += 1;
  try {
    execFileSync('node', [runner, ...process.argv.slice(2).filter((a) => a.startsWith('--'))], { stdio: 'inherit' });
  } catch (error) {
    if (error.status === EXIT.INFRA) {
      process.stderr.write(`\n[run] ${lv}: lỗi hạ tầng\n`);
      process.exit(EXIT.INFRA);
    }
    failed += 1;
  }
}

if (ran === 0) {
  process.stderr.write(`\n[run] không level nào được triển khai cho '${level}'\n`);
  process.exit(EXIT.INFRA);
}
process.exit(failed > 0 ? EXIT.FAIL : EXIT.PASS);
