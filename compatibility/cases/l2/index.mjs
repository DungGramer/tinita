import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { EXIT, LAB } from '../../scripts/paths.mjs';
import { createConsumer, readManifest, tarballFor } from '../../scripts/consumer.mjs';
import { printSummary, writeReport } from '../../scripts/report.mjs';
import { SSR_CJS, SSR_ESM, tsProbe } from './lib/fixtures.mjs';

const contract = JSON.parse(readFileSync(resolve(LAB, 'contract.json'), 'utf8')).packages;
const cases = [];
const findings = [];
const add = (id, ok, detail, extra = {}) => cases.push({ id, ok, detail, ...extra });
const t0 = Date.now();
const flags = Object.fromEntries(
  process.argv.slice(2).filter((a) => a.startsWith('--')).map((a) => {
    const [k, v = 'true'] = a.replace(/^--/, '').split('=');
    return [k, v];
  }),
);

const REACT = ['react@19', 'react-dom@19'];
// Đọc ĐỘNG từ manifest, không hardcode: thêm package thứ tư mà quên sửa đây thì ca `tsc` sẽ
// fail với 'Cannot find module' và trông như lỗi package, không phải lỗi consumer của lab.
const TGZ = readManifest().map((e) => e.tarball);

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

for (const [name, def] of Object.entries(contract)) {
  if (!def.browserOnly) continue;
  add(`ssr:skip-browser-only:${name}`, true, `bỏ qua ${name} trong ca SSR: browserOnly=true, không có SSR guard theo thiết kế (xem packages/${name}/README.md)`, { skipped: true, reason: 'browserOnly' });
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
// Playwright không có (ví dụ trong container Node trơn) -> skip SẠCH, không fail.
const hasBrowser = await (async () => {
  try {
    const { chromium } = await import('playwright');
    const b = await chromium.launch();
    await b.close();
    return true;
  } catch {
    return false;
  }
})();

if (!hasBrowser) {
  for (const id of ['css-leak:unlayered', 'css-leak:layered', 'css-probe-proof', 'no-tailwind-missing-utilities', 'vite:render']) {
    add(id, true, 'skip: không có chromium trong môi trường này', { skipped: true, reason: 'no-browser' });
  }
}

if (hasBrowser) {
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
if (hasBrowser) {
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

// ---------- Vite production build + chromium ----------
if (hasBrowser) {
  const { chromium } = await import('playwright');
  const work = createConsumer({
    level: 'l2',
    name: 'vite-react19',
    deps: [...REACT, 'vite@7', '@vitejs/plugin-react@5', '@radix-ui/react-accordion', 'lucide-react'],
    tarballs: TGZ,
    pkgJson: { type: 'module' },
    files: {
      'index.html': '<!doctype html><div id="root"></div><script type="module" src="/main.jsx"></script>',
      'vite.config.js': "import react from '@vitejs/plugin-react';\nexport default { plugins: [react()] };\n",
      'main.jsx': `
import { createRoot } from 'react-dom/client';
import { createElement as h, Fragment } from 'react';
import 'tinita-react/styles.css';
import { Ping } from 'tinita-react/ui/ping';
import { CarouselTicker } from 'tinita-react/ui/carousel-ticker';
import { FileTree } from 'tinita-react/ui/file-tree';
createRoot(document.getElementById('root')).render(
  h(Fragment, null, h(Ping, { count: 1 }), h(CarouselTicker, null, h('span', null, 'x')), h(FileTree, { text: 'src\\n  a.ts' })),
);
`,
    },
  });

  const built = run('npx', ['vite', 'build'], work, 300_000);
  if (!built.ok) {
    add('vite:build', false, `vite build exit=${built.code}: ${built.out.split('\n').find((l) => /rror/.test(l))?.trim() ?? ''}`);
  } else {
    add('vite:build', true, 'vite build exit 0');
    // preview chạy nền -> spawn, không execFileSync
    const { spawn } = await import('node:child_process');
    const proc = spawn('npx', ['vite', 'preview', '--port', '4319', '--strictPort'], { cwd: work, stdio: 'ignore' });
    try {
      await new Promise((r) => setTimeout(r, 4000));
      const browser = await chromium.launch();
      const page = await browser.newPage();
      await page.goto('http://127.0.0.1:4319/', { waitUntil: 'networkidle' });
      const seen = await page.evaluate(() => ({
        filetree: document.querySelectorAll('.tinita-filetree').length,
        ping: document.querySelectorAll('[class*="tinita-ping"]').length,
        tinitaRules: [...document.styleSheets].flatMap((sh) => { try { return [...sh.cssRules]; } catch { return []; } })
          .filter((r) => r.selectorText?.includes('tinita-')).length,
      }));
      await browser.close();
      const ok = seen.filetree >= 1 && seen.tinitaRules > 0;
      add('vite:render', ok, `FileTree=${seen.filetree} Ping=${seen.ping} rule .tinita-*=${seen.tinitaRules}`);
    } finally {
      proc.kill('SIGTERM');
    }
  }
}

// ---------- Next App Router: câu hỏi 'use client' ----------
// Chuỗi lỗi dưới đây ĐO THẬT 2026-09-25, không lấy từ tài liệu nghiên cứu (nguồn đó dự đoán sai).
//
// TIER 2, không phải tier 1. `next build` × 3 biến thể là phần chậm nhất của L2 và tier 1 phải
// chạy được mỗi PR. Đánh đổi đã ghi: ca chốt câu hỏi 'use client' không còn chạy mỗi PR, nhưng vẫn
// chạy trước publish. Ghi trong compatibility/README.md.
const tierFlag = flags.tier ? Number(flags.tier) : 3;
if (tierFlag < 2) {
  for (const id of ['next:rsc-ping-no-directive', 'next:rsc-filetree-no-directive', 'next:rsc-filetree-app-directive']) {
    add(id, true, 'skip: ca Next thuộc tier 2 (next build chậm)', { skipped: true, reason: 'tier' });
  }
}

if (tierFlag >= 2) {
  const base = {
    level: 'l2',
    deps: [...REACT, 'next@15', '@radix-ui/react-accordion', 'lucide-react'],
    tarballs: TGZ,
    files: {
      'next.config.mjs': 'export default { eslint: { ignoreDuringBuilds: true }, typescript: { ignoreBuildErrors: true } };\n',
      'app/layout.tsx': 'export default function L({ children }: { children: React.ReactNode }) {\n  return (<html lang="en"><body>{children}</body></html>);\n}\n',
    },
  };
  const page = (directive, imp, jsx) => `${directive}import { ${imp} } from 'tinita-react/ui/${imp === 'FileTree' ? 'file-tree' : imp === 'Ping' ? 'ping' : 'carousel-ticker'}';\n\nconst TREE = ['src', '  a.ts'].join('\\n');\n\nexport default function Page() {\n  return ${jsx};\n}\n`;

  const variants = [
    { id: 'rsc-ping-no-directive', directive: '', imp: 'Ping', jsx: '<Ping count={1} />', expectOk: true, why: 'Ping không dùng hook nên Server Component chịu được' },
    { id: 'rsc-filetree-no-directive', directive: '', imp: 'FileTree', jsx: '<FileTree text={TREE} />', expectOk: false, why: 'FileTree dùng hook qua Radix -> cần use client' },
    { id: 'rsc-filetree-app-directive', directive: "'use client';\n", imp: 'FileTree', jsx: '<FileTree text={TREE} />', expectOk: true, why: 'consumer bọc use client LÀ ĐỦ' },
  ];

  for (const v of variants) {
    const work = createConsumer({ ...base, name: `next-${v.id}`, files: { ...base.files, 'app/page.tsx': page(v.directive, v.imp, v.jsx) } });
    const r = run('npx', ['next', 'build'], work, 600_000);
    const hookErr = /is not a function/.test(r.out) ? r.out.split('\n').find((l) => /is not a function/.test(l))?.trim() : null;
    const ok = r.ok === v.expectOk;
    add(`next:${v.id}`, ok, `${v.why}; exit=${r.code}${hookErr ? ` | ${hookErr}` : ''}`, { expectedFailure: !v.expectOk, hookError: hookErr });
  }

  findings.push({
    id: 'library-missing-use-client',
    detail: "Source tinita-react không có directive 'use client' ở đâu. Đo được: FileTree trong Server Component -> `(0 , e.useState) is not a function`; CarouselTicker -> `(0 , e.useRef) is not a function`; Ping thì OK vì không dùng hook. Consumer tự bọc 'use client' LÀ ĐỦ để build xanh, nhưng việc đó bị đẩy sang mọi consumer. Nên thêm directive vào 2 component dùng hook.",
    assignedTo: 'roadmap M1',
  });
}

const payload = { level: 'l2', ranAt: new Date().toISOString(), wallClockMs: Date.now() - t0, cases, findings };
const file = writeReport('l2', payload);
const failed = printSummary(payload);
process.stdout.write(`wall-clock: ${((Date.now() - t0) / 1000).toFixed(1)}s\nreport: ${file}\n`);
process.exit(failed > 0 ? EXIT.FAIL : EXIT.PASS);
