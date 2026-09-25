import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { EXIT, LAB } from '../../scripts/paths.mjs';
import { createConsumer, tarballFor } from '../../scripts/consumer.mjs';
import { printSummary, writeReport } from '../../scripts/report.mjs';
import { SSR_CJS, SSR_ESM, tsProbe } from './lib/fixtures.mjs';

const contract = JSON.parse(readFileSync(resolve(LAB, 'contract.json'), 'utf8')).packages;
const cases = [];
const findings = [];
const add = (id, ok, detail, extra = {}) => cases.push({ id, ok, detail, ...extra });
const t0 = Date.now();

const REACT = ['react@19', 'react-dom@19'];
const TGZ = ['tinita', 'tinita-react'].map(tarballFor);

function run(cmd, args, cwd, timeout = 300_000) {
  try {
    return { ok: true, code: 0, out: execFileSync(cmd, args, { cwd, encoding: 'utf8', timeout, stdio: ['ignore', 'pipe', 'pipe'] }) };
  } catch (error) {
    return { ok: false, code: error.status ?? -1, out: `${error.stdout ?? ''}${error.stderr ?? ''}` };
  }
}

// ---------- SSR smoke: ESM và CJS ----------
for (const [name, source, file, pkgJson] of [
  ['node-esm', SSR_ESM, 'probe.mjs', { type: 'module' }],
  ['node-cjs', SSR_CJS, 'probe.cjs', {}],
]) {
  const work = createConsumer({ level: 'l2', name, deps: REACT, tarballs: TGZ, files: { [file]: source }, pkgJson });
  const r = run('node', [file], work, 60_000);
  const hasPing = r.out.includes('tinita-ping');
  const ok = r.ok && hasPing;
  add(`ssr:${name}`, ok, ok ? `renderToString không throw, output có tinita-ping` : `exit=${r.code} ${r.out.split('\n').find((l) => /Error/.test(l))?.trim() ?? ''}`, { raw: r.out.slice(0, 400) });
}

findings.push({
  id: 'autoInjectStyles-unused-at-runtime',
  detail: 'autoInjectStyles có SSR guard và chịu được môi trường không có document, nhưng KHÔNG component nào gọi nó - nó là export chết về runtime. Ca này kiểm một API mà library không tự dùng.',
  assignedTo: 'pha 06',
});

// ---------- tsc matrix: 3 moduleResolution ----------
{
  const specs = [];
  for (const [pkg, def] of Object.entries(contract)) {
    for (const spec of def.specifiers) {
      const named = def.namedExports?.[spec]?.[0];
      if (!named) continue;
      specs.push([spec === '.' ? pkg : `${pkg}${spec.slice(1)}`, named]);
    }
  }
  const work = createConsumer({
    level: 'l2',
    name: 'tsc-matrix',
    deps: [...REACT, '@types/react@19', 'typescript@5.9.2', '@radix-ui/react-accordion', 'lucide-react'],
    tarballs: TGZ,
    files: { 'probe.ts': tsProbe(specs) },
  });

  for (const moduleResolution of ['bundler', 'nodenext', 'node']) {
    const module = moduleResolution === 'nodenext' ? 'nodenext' : moduleResolution === 'node' ? 'commonjs' : 'esnext';
    writeFileSync(
      resolve(work, 'tsconfig.json'),
      `${JSON.stringify({ compilerOptions: { module, moduleResolution, target: 'es2022', strict: true, noEmit: true, jsx: 'react-jsx', skipLibCheck: true, esModuleInterop: true }, files: ['probe.ts'] }, null, 2)}\n`,
    );
    const r = run('npx', ['tsc', '--noEmit'], work, 180_000);
    const errs = r.out.split('\n').filter((l) => /error TS/.test(l));
    // moduleResolution:node không resolve subpath exports - đã biết trước qua attw (node10 failed 5/6).
    const expectedFailure = moduleResolution === 'node';
    add(
      `tsc:${moduleResolution}`,
      r.ok || expectedFailure,
      r.ok ? `${specs.length} specifier compile sạch` : `${errs.length} lỗi TS, đầu tiên: ${errs[0]?.trim().slice(0, 120)}`,
      { expectedFailure: !r.ok && expectedFailure, errorCount: errs.length },
    );
    if (!r.ok && expectedFailure) {
      findings.push({
        id: 'ts-legacy-moduleResolution-node-fails',
        detail: `moduleResolution:node không resolve được ${errs.length} import - khớp attw báo node10 failed. Có cam kết support TS cũ hay không là QĐ-2 của owner.`,
        assignedTo: 'pha 06 QĐ-2',
      });
    }
  }
}

// ---------- CSS leak: 2 biến thể host (CSS trần vs CSS trong @layer) ----------
{
  const { probeLeak } = await import('./lib/css-probe.mjs');
  const work = createConsumer({ level: 'l2', name: 'css-host', deps: REACT, tarballs: TGZ });
  const cssPath = resolve(work, 'node_modules/tinita-react/dist/styles.css');

  for (const variant of ['unlayered', 'layered']) {
    const rows = await probeLeak({ cssPath, variant });
    const wrong = rows.filter((r) => !r.ok);
    add(
      `css-leak:${variant}`,
      wrong.length === 0,
      `${rows.length} bề mặt: ${rows.filter((r) => r.actual === 'leaks').length} rò rỉ, ${rows.filter((r) => r.actual === 'clean').length} sạch` +
        (wrong.length ? `; LỆCH: ${wrong.map((r) => `${r.id}(expected=${r.expected} actual=${r.actual})`).join(', ')}` : ''),
      { surfaces: rows },
    );
    for (const r of rows.filter((x) => x.actual === 'leaks')) {
      findings.push({
        id: `css-leak:${variant}:${r.id}`,
        detail: `[host ${variant}] ${r.selector} ${r.property}: "${r.before}" -> "${r.after}" (${r.evidence})`,
        assignedTo: 'roadmap M1',
      });
    }
  }

  // Ca CHỨNG MINH: thêm rule rò rỉ mới có chủ ý -> probe phải thấy.
  const proof = await probeLeak({ cssPath, extraCss: '\n#host-interactive { opacity: 0.123 !important }' });
  const proofRow = proof.find((r) => r.id === 'unprefixed-interactive');
  add('css-probe-proof', proofRow?.after === '0.123', `thêm rule có chủ ý -> probe đo được opacity="${proofRow?.after}" (mong đợi 0.123)`);
}

// ---------- host KHÔNG có Tailwind: utility thô trong JSX không được ship ----------
{
  const { probeMissingUtilities } = await import('./lib/css-probe.mjs');
  const work = createConsumer({ level: 'l2', name: 'no-tailwind', deps: REACT, tarballs: TGZ, files: {
    'render.mjs': `
import { renderToStaticMarkup } from 'react-dom/server';
import { createElement as h } from 'react';
import { Ping } from 'tinita-react/ui/ping';
process.stdout.write(renderToStaticMarkup(h(Ping, { count: 1 })));
`,
  }, pkgJson: { type: 'module' } });

  const rendered = run('node', ['render.mjs'], work, 60_000);
  // Gắn data-probe vào node gốc của Ping để đo được, giữ nguyên class mà component sinh ra.
  const html = rendered.out.replace(/^<([a-z]+)/, '<$1 data-probe="ping-root"');
  const cssPath = resolve(work, 'node_modules/tinita-react/dist/styles.css');
  const style = await probeMissingUtilities({ cssPath, html });

  // bundle không ship utility Tailwind -> inline-flex/gap KHÔNG áp được.
  const missing = style && style.display !== 'inline-flex';
  add('no-tailwind-missing-utilities', missing === true, style ? `Ping root: display="${style.display}" gap="${style.gap}" (mong đợi KHÁC inline-flex vì bundle không ship utility)` : 'không đo được node Ping');
  if (missing) {
    findings.push({
      id: 'implicit-tailwind-dependency',
      detail: `Ping viết class Tailwind thô trong JSX (Ping.tsx:45-50) nhưng dist/styles.css không ship utility. Host không có Tailwind thì display="${style.display}" thay vì inline-flex -> component vỡ layout. Phụ thuộc ngầm vào Tailwind của host.`,
      assignedTo: 'roadmap M1',
    });
  }
}

const payload = { level: 'l2', ranAt: new Date().toISOString(), wallClockMs: Date.now() - t0, cases, findings };
const file = writeReport('l2', payload);
const failed = printSummary(payload);
process.stdout.write(`wall-clock: ${((Date.now() - t0) / 1000).toFixed(1)}s\nreport: ${file}\n`);
process.exit(failed > 0 ? EXIT.FAIL : EXIT.PASS);
