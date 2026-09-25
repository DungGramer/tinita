import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { REPORTS } from './paths.mjs';

export function writeReport(level, payload) {
  mkdirSync(REPORTS, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const file = resolve(REPORTS, `${level}-${stamp}.json`);
  writeFileSync(file, `${JSON.stringify(payload, null, 2)}\n`);
  return file;
}

export function printSummary(payload) {
  const { level, cases = [], findings = [] } = payload;
  process.stdout.write(`\n=== ${level.toUpperCase()} ===\n`);
  for (const c of cases) {
    const mark = c.skipped ? 'SKIP' : c.ok ? 'PASS' : c.expectedFailure ? 'XFAIL' : 'FAIL';
    process.stdout.write(`${mark.padEnd(6)}${c.id.padEnd(28)}${c.detail ?? ''}\n`);
  }
  if (findings.length > 0) {
    process.stdout.write(`\n--- findings (${findings.length}) ---\n`);
    for (const f of findings) process.stdout.write(`  ${f.id}: ${f.detail}${f.assignedTo ? `  [${f.assignedTo}]` : ''}\n`);
  }
  const failed = cases.filter((c) => !c.ok && !c.skipped && !c.expectedFailure);
  process.stdout.write(`\n${cases.length} ca, ${failed.length} fail, ${cases.filter((c) => c.skipped).length} skip\n`);
  return failed.length;
}
