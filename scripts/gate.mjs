#!/usr/bin/env node
/**
 * Cổng trước commit/publish. Chạy LOCAL, không có CI - đó là quyết định của owner
 * (2026-09-26): repo một người, chạy máy mình là đủ, không dựng GitHub Actions.
 *
 *   pnpm gate        nhanh  - format, lint, types, build, test, stories, L1
 *   pnpm gate --full        + L2 và L4 (cần chromium, chậm hàng phút)
 *
 * DỪNG ở lỗi đầu tiên và nói rõ bước nào chưa chạy. Chạy hết rồi báo một đống lỗi
 * là vô nghĩa khi `build` đã đỏ: mọi bước sau nó đo trên dist cũ.
 *
 * Thứ tự KHÔNG tuỳ ý: `build` phải trước `test` (test đọc dist của package khác qua
 * turbo) và trước L1 (L1 pack tarball từ dist).
 */
import { spawnSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const full = process.argv.includes('--full');

const STEPS = [
  { id: 'format', label: 'prettier --check', cmd: 'pnpm', args: ['format:check'] },
  { id: 'lint', label: 'eslint', cmd: 'pnpm', args: ['lint'] },
  { id: 'types', label: 'tsc --noEmit', cmd: 'pnpm', args: ['check-types'] },
  { id: 'build', label: 'tsup + build-css', cmd: 'pnpm', args: ['build'] },
  { id: 'test', label: 'vitest', cmd: 'pnpm', args: ['test'] },
  { id: 'stories', label: 'mọi subpath có story', cmd: 'node', args: ['scripts/check-stories.mjs'] },
  { id: 'l1', label: 'lab L1 (artifact package)', cmd: 'node', args: ['compatibility/run.mjs', 'l1'] },
  ...(full
    ? [
        { id: 'l2', label: 'lab L2 (consumer thật + CSS leak)', cmd: 'node', args: ['compatibility/run.mjs', 'l2'] },
        { id: 'l4', label: 'lab L4 (Next production + browser)', cmd: 'node', args: ['compatibility/run.mjs', 'l4'] },
      ]
    : []),
];

const results = [];
let failedAt = -1;

for (let i = 0; i < STEPS.length; i += 1) {
  const step = STEPS[i];
  const started = Date.now();
  process.stdout.write(`\n=== ${step.id}: ${step.label} ===\n`);
  const r = spawnSync(step.cmd, step.args, { cwd: ROOT, stdio: 'inherit' });
  const seconds = ((Date.now() - started) / 1000).toFixed(1);
  const code = r.status ?? -1;
  results.push({ ...step, code, seconds });
  if (code !== 0) {
    failedAt = i;
    break;
  }
}

process.stdout.write('\n');
process.stdout.write('─'.repeat(64) + '\n');
for (const r of results) {
  process.stdout.write(
    `${r.code === 0 ? 'PASS' : 'FAIL'}  ${r.id.padEnd(9)} ${String(r.seconds).padStart(7)}s  ${r.label}\n`
  );
}
if (failedAt >= 0) {
  const skipped = STEPS.slice(failedAt + 1).map((s) => s.id);
  if (skipped.length) {
    process.stdout.write(`\nCHƯA CHẠY (dừng ở lỗi trên): ${skipped.join(', ')}\n`);
  }
} else if (!full) {
  process.stdout.write('\nL2 và L4 chưa chạy. Trước khi publish: pnpm gate --full\n');
}
process.stdout.write('─'.repeat(64) + '\n');

process.exit(failedAt >= 0 ? 1 : 0);
