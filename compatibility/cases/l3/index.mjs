import { execFileSync, spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { ARTIFACTS, EXIT, LAB } from '../../scripts/paths.mjs';
import { printSummary, writeReport } from '../../scripts/report.mjs';

const matrix = JSON.parse(readFileSync(resolve(LAB, 'docker/matrix.json'), 'utf8'));
const flags = Object.fromEntries(
  process.argv.slice(2).filter((a) => a.startsWith('--')).map((a) => {
    const [k, v = 'true'] = a.replace(/^--/, '').split('=');
    return [k, v];
  }),
);

// Docker không chạy -> lỗi HẠ TẦNG (exit 2), không phải "package sai" (exit 1).
try {
  execFileSync('docker', ['info'], { stdio: 'ignore', timeout: 30_000 });
} catch {
  process.stderr.write('[l3] Docker daemon không chạy hoặc docker không có trong PATH.\n[l3] Đây là lỗi hạ tầng, không phải lỗi package.\n');
  process.exit(EXIT.INFRA);
}

// Cell không giải thích được vì sao tồn tại thì không được chạy - chống matrix phình tới Cartesian.
const noWhy = matrix.cells.filter((c) => !c.why || c.why.trim() === '');
if (noWhy.length > 0) {
  process.stderr.write(`[l3] cell thiếu trường 'why': ${noWhy.map((c) => c.id).join(', ')}\n[l3] Mỗi cell phải trả lời một câu hỏi mà cell khác không trả lời được.\n`);
  process.exit(EXIT.INFRA);
}

const tier = flags.tier ? Number(flags.tier) : null;
const only = flags.case;
const selected = matrix.cells.filter((c) => (tier === null || c.tier <= tier) && (!only || c.id === only));

const cases = [];
const findings = [];
const t0 = Date.now();

for (const cell of selected) {
  const cellStart = Date.now();
  const tag = `tinita-compat-${cell.id}`;
  const dockerfile = cell.dockerfile ?? 'node.Dockerfile';

  const build = spawnSync('docker', [
    'build', '-q',
    '-f', resolve(LAB, 'docker', dockerfile),
    '-t', tag,
    ...(dockerfile === 'node.Dockerfile'
      ? ['--build-arg', `NODE_VERSION=${cell.node}`, '--build-arg', `PM=${cell.pm}`, '--build-arg', `PM_VERSION=${cell.pmVersion}`]
      : []),
    resolve(LAB, 'docker'),
  ], { encoding: 'utf8', timeout: 900_000 });

  if (build.status !== 0) {
    const err = `${build.stdout ?? ''}${build.stderr ?? ''}`;
    // Build fail do MẠNG là lỗi hạ tầng, không phải "package sai". Đã gặp 2026-09-25:
    // node22-yarn-classic fail vì Docker Hub timeout khi pull node:22-slim, và runner đếm nó
    // là fail package. CI sẽ xử hai thứ đó khác nhau.
    // Hai loại khác nhau, đừng gộp: "not found" là tag sai trong matrix.json (lỗi CẤU HÌNH của
    // ta), còn timeout là mạng. Cả hai đều exit 2 nhưng thông báo phải nói đúng nguyên nhân, nếu
    // không một typo trong matrix sẽ bị đọc thành "mạng hôm nay kém" và không ai sửa.
    const TAG_MISSING = /: not found(\s|$)|manifest unknown|manifest for .* not found/i;
    const NETWORK = /timeout awaiting response headers|DeadlineExceeded|TLS handshake timeout|temporary failure in name resolution|i\/o timeout|connection refused|no such host/i;
    if (TAG_MISSING.test(err)) {
      process.stderr.write(`\n[l3] ${cell.id}: image KHÔNG TỒN TẠI - kiểm 'node'/'pmVersion' trong matrix.json:\n${err.split('\n').filter(Boolean).pop()}\n`);
      process.exit(EXIT.INFRA);
    }
    if (NETWORK.test(err)) {
      process.stderr.write(`\n[l3] ${cell.id}: docker build fail do MẠNG, không phải lỗi package. Chạy lại:\n${err.split('\n').filter(Boolean).pop()}\n`);
      process.exit(EXIT.INFRA);
    }
    cases.push({ id: `${cell.id}:build`, ok: false, detail: `docker build exit=${build.status}: ${err.split('\n').filter(Boolean).pop() ?? ''}`, tier: cell.tier, advisory: cell.advisory ?? false });
    continue;
  }

  for (const level of cell.levels) {
    const run = spawnSync('docker', [
      'run', '--rm',
      '-v', `${LAB}:/lab:ro`,
      '-v', `${ARTIFACTS}:/artifacts:ro`,
      ...(cell.pmMode ? ['-e', `PM_MODE=${cell.pmMode}`] : []),
      tag, level,
    ], { encoding: 'utf8', timeout: 1_800_000 });

    const out = `${run.stdout ?? ''}${run.stderr ?? ''}`;
    const ok = run.status === 0;
    const summary = out.split('\n').find((l) => /\d+ ca, \d+ fail/.test(l))?.trim();
    const nodeVer = out.match(/node (v[\d.]+)/)?.[1] ?? cell.node;
    // Cell advisory KHÔNG được báo PASS khi nó thực sự fail - đó là xanh giả.
    // Báo là skipped kèm lý do: fail của nó không làm đỏ tier, nhưng cũng không được đọc thành "đã chạy và pass".
    cases.push({
      id: `${cell.id}:${level}`,
      ok: ok ? true : !(cell.advisory ?? false) ? false : true,
      skipped: !ok && (cell.advisory ?? false),
      detail: `node=${nodeVer} pm=${cell.pm}${cell.pmMode ? `(${cell.pmMode})` : ''} exit=${run.status}${summary ? ` | ${summary}` : ''}${!ok ? ` | ${out.split('\n').filter((l) => /FAIL|Error|error/.test(l))[0]?.trim().slice(0, 140) ?? ''}` : ''}`,
      tier: cell.tier,
      advisory: cell.advisory ?? false,
      wallClockMs: Date.now() - cellStart,
      raw: ok ? undefined : out.slice(-2000),
    });
    if (!ok && cell.advisory) {
      findings.push({ id: `advisory-cell-failed:${cell.id}`, detail: `cell advisory ${cell.id} fail (exit ${run.status}) - không làm đỏ tier 2. ${cell.why}`, assignedTo: 'theo dõi' });
    }
  }
}

if (selected.length === 0) {
  // --tier=1 chọn 0 cell là ĐÚNG: L3 bắt đầu từ tier 2. Đó không phải lỗi hạ tầng.
  // Chỉ --case trỏ tên không tồn tại mới là lỗi.
  if (only) {
    process.stderr.write(`[l3] không có cell nào tên '${only}' trong matrix.json\n`);
    process.exit(EXIT.INFRA);
  }
  process.stdout.write(`[l3] không cell nào ở tier <= ${tier} - L3 bắt đầu từ tier 2, bỏ qua\n`);
  process.exit(EXIT.PASS);
}

const payload = { level: 'l3', ranAt: new Date().toISOString(), wallClockMs: Date.now() - t0, selectedCells: selected.map((c) => c.id), cases, findings };
const file = writeReport('l3', payload);
const failed = printSummary(payload);
process.stdout.write(`\nwall-clock: ${((Date.now() - t0) / 1000).toFixed(1)}s\nreport: ${file}\n`);
process.exit(failed > 0 ? EXIT.FAIL : EXIT.PASS);
