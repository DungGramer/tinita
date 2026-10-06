import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { EXIT, LAB } from '../../scripts/paths.mjs';
import { createConsumer, readManifest, tarballFor } from '../../scripts/consumer.mjs';
import { printSummary, writeReport } from '../../scripts/report.mjs';
import { ssrCjs, ssrEsm, tsProbe } from './lib/fixtures.mjs';
import { withPreview } from './lib/preview.mjs';

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

/**
 * Optional peer lấy TỪ CONTRACT, không viết tay.
 *
 * Bản trước hardcode `'@radix-ui/react-accordion'` ở 3 chỗ. Khi `Tree` chuyển sang
 * `@base-ui/react` thì 3 chỗ đó vẫn cài Radix, nên consumer thiếu đúng peer mà
 * library cần: `vite build` và 2 ca RSC của Next đỏ với 'Failed to resolve
 * @base-ui/react/collapsible', trông như lỗi package chứ không phải lỗi consumer
 * của lab. Đây ĐÚNG lỗi mà ca 04 của L1 đã sửa - hai nguồn sự thật thì sẽ lệch,
 * và nó lệch im lặng.
 *
 * Đo 2026-09-28: 3 ca đỏ trước khi suy từ contract, 0 sau.
 */
const OPTIONAL_PEERS = [
  ...new Set(Object.values(contract['tinita-react'].optionalPeers).flat()),
];
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
// Mọi specifier của package KHÔNG browserOnly, suy từ contract. `tinita-react` đã
// được import tường minh ở fixture (nó render), nên ở đây chỉ lấy phần còn lại.
const UNIVERSAL = Object.entries(contract)
  .filter(([name, def]) => !def.browserOnly && name !== 'tinita-react')
  .flatMap(([pkg, def]) =>
    def.specifiers
      .map((spec) => [spec === '.' ? pkg : `${pkg}${spec.slice(1)}`, def.namedExports?.[spec]?.[0]])
      .filter(([, named]) => named)
  );

for (const [name, source, file, pkgJson] of [
  ['node-esm', ssrEsm(UNIVERSAL), 'probe.mjs', { type: 'module' }],
  ['node-cjs', ssrCjs(UNIVERSAL), 'probe.cjs', {}],
]) {
  const work = createConsumer({ level: 'l2', name, deps: REACT, tarballs: TGZ, files: { [file]: source }, pkgJson });
  const r = run('node', [file], work, 60_000);
  // `tnt-probe` thay cho `tnt-ping`: fixture không còn render component nào, vì
  // `ui/*` không thuộc hợp đồng Node-safe nữa - xem đầu `lib/fixtures.mjs`.
  const hasProbe = r.out.includes('tnt-probe');
  const ok = r.ok && hasProbe;
  add(`ssr:${name}`, ok, ok ? `renderToString không throw, output có tnt-probe; ${UNIVERSAL.length} specifier universal + utils/hooks của tinita-react import được, binding không undefined` : `exit=${r.code} ${r.out.split('\n').find((l) => /Error/.test(l))?.trim() ?? ''}`, { raw: r.out.slice(0, 400), universalSpecifiers: UNIVERSAL.length });
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
    deps: [...REACT, '@types/react@19', 'typescript@5.9.2', ...OPTIONAL_PEERS],
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
    // QĐ-2 (2026-09-26): owner chốt SUPPORT TS cũ. `typesVersions` đã được thêm cho cả 3 package
    // và đo được `moduleResolution: node` compile sạch. Nên đây KHÔNG còn là expectedFailure -
    // fail ở đây từ nay là hồi quy thật.
    const expectedFailure = false;
    add(
      `tsc:${moduleResolution}`,
      r.ok || expectedFailure,
      r.ok ? `${specs.length} specifier compile sạch` : `${errs.length} lỗi TS, đầu tiên: ${errs[0]?.trim().slice(0, 120)}`,
      { expectedFailure: !r.ok && expectedFailure, errorCount: errs.length },
    );
    if (!r.ok && moduleResolution === 'node') {
      findings.push({
        id: 'ts-legacy-regression',
        detail: `moduleResolution:node fail ${errs.length} import. QĐ-2 đã chốt support TS cũ và typesVersions đã làm nó sạch - đây là HỒI QUY, không phải hiện trạng đã biết. Kiểm typesVersions của 3 package có còn đồng bộ exports.`,
        assignedTo: 'sửa ngay',
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
  for (const id of ['css-leak:unlayered', 'css-leak:layered', 'theme-matrix', 'css-probe-proof', 'no-tailwind-standalone-layout', 'vite:render']) {
    add(id, true, 'skip: không có chromium trong môi trường này', { skipped: true, reason: 'no-browser' });
  }
}

if (hasBrowser) {
  const { probeLeak, probeTheme } = await import('./lib/css-probe.mjs');
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
  {
    const rows = await probeTheme({ cssPath });
    const wrong = rows.filter((r) => !r.ok);
    add(
      'theme-matrix',
      wrong.length === 0,
      wrong.length === 0
        ? `${rows.length} vị trí dark/light đều đúng, kể cả .dark trên <html>`
        : wrong.map((r) => `${r.id}: mong ${r.expect}, đo ${r.actual} (${r.why})`).join(' | '),
      { rows: rows.map(({ id, expect, actual, ok }) => ({ id, expect, actual, ok })) },
    );
  }

  add('css-probe-proof', proofRow?.after === '0.123', `thêm rule có chủ ý -> probe đo được opacity="${proofRow?.after}" (mong đợi 0.123)`);
}

// ---------- host KHÔNG có Tailwind: utility thô trong JSX không được ship ----------
if (hasBrowser) {
  const { probeMissingUtilities } = await import('./lib/css-probe.mjs');
  // Markup lấy qua một BUNDLER, không bằng `node render.mjs`.
  //
  // Ca này đo CSS: host không có Tailwind mà Ping vẫn phải `inline-flex`. Node chỉ là
  // phương tiện lấy markup, và từ 2026-10-05 `ui/ping` mang một import CSS nên Node
  // trần không nạp được nó. Một bản build SSR của vite gỡ import CSS khỏi output SSR,
  // nên markup vẫn lấy được qua đúng con đường mà package giờ đòi hỏi.
  const work = createConsumer({ level: 'l2', name: 'no-tailwind', deps: [...REACT, 'vite@7'], tarballs: TGZ, files: {
    'render.mjs': `
import { renderToStaticMarkup } from 'react-dom/server';
import { createElement as h } from 'react';
import { Ping } from 'tinita-react/ui/ping';
process.stdout.write(renderToStaticMarkup(h(Ping, { count: 1 })));
`,
    // `ssr.noExternal` BẮT BUỘC: mặc định vite externalize mọi thứ trong node_modules
    // cho bản SSR, nên output giữ nguyên `import { Ping } from 'tinita-react/ui/ping'`
    // và Node lại gặp đúng import CSS đó. `noExternal` bundle package vào, và lúc đó
    // import CSS bị gỡ - đo 2026-10-05: 0 lần `.css` trong output.
    //
    // Và output là `render.js`, KHÔNG phải `.mjs` - vite đặt tên theo đuôi của nó.
    'ssr.config.mjs': "export default { ssr: { noExternal: ['tinita-react'] }, build: { ssr: 'render.mjs', outDir: 'ssr-out', emptyOutDir: true, minify: false } };\n",
  }, pkgJson: { type: 'module' } });

  const ssrBuilt = run('npx', ['vite', 'build', '-c', 'ssr.config.mjs'], work, 300_000);
  if (!ssrBuilt.ok) {
    add('no-tailwind-standalone-layout', false, `không build được bản SSR để lấy markup: exit=${ssrBuilt.code}`);
  }
  const rendered = ssrBuilt.ok ? run('node', ['ssr-out/render.js'], work, 60_000) : { out: '', ok: false };
  // Gắn data-probe vào node gốc của Ping để đo được, giữ nguyên class mà component sinh ra.
  const html = rendered.out.replace(/^<([a-z]+)/, '<$1 data-probe="ping-root"');
  const cssPath = resolve(work, 'node_modules/tinita-react/dist/styles.css');
  const style = await probeMissingUtilities({ cssPath, html });

  // ĐẢO 2026-09-26. Trước: Ping viết class Tailwind thô trong JSX mà bundle không ship
  // utility, nên host KHÔNG có Tailwind thì `display` là `block` - component vỡ layout.
  // Ca cũ chốt lại đúng cái vỡ đó (`display !== 'inline-flex'`).
  //
  // Giờ Ping có Ping.module.css và JSX chỉ còn class `tnt-ping-*`. Yêu cầu đảo chiều:
  // KHÔNG có Tailwind mà component vẫn phải đúng. `inline-flex` đến từ CSS của
  // library, không từ utility của host - đó chính là điều cần chứng minh.
  const standalone = style && style.display === 'inline-flex';
  add(
    'no-tailwind-standalone-layout',
    standalone === true,
    style
      ? `host KHÔNG có Tailwind, Ping root display="${style.display}" (mong đợi inline-flex, đến từ Ping.css chứ không từ utility của host)`
      : 'không đo được node Ping',
  );
  if (!standalone && style) {
    findings.push({
      id: 'implicit-tailwind-dependency',
      detail: `Ping root display="${style.display}" khi host không có Tailwind. Nghĩa là layout lại phụ thuộc utility mà bundle không ship - class Tailwind thô đã quay lại JSX.`,
      assignedTo: 'regression',
    });
  }
}

// ---------- Vite production build + chromium ----------
if (hasBrowser) {
  const { chromium } = await import('playwright');
  const work = createConsumer({
    level: 'l2',
    name: 'vite-react19',
    deps: [...REACT, 'vite@7', '@vitejs/plugin-react@5', ...OPTIONAL_PEERS],
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
    // Lấy DÒNG SAU dòng 'error during build:' nữa, không chỉ dòng khớp /rror/.
    // Vite in tiêu đề lỗi trước, nguyên nhân sau; chỉ lấy dòng đầu thì detail ra
    // đúng chuỗi "error during build:" và không nói được gì (đo 2026-09-28).
    const lines = built.out.split('\n').map((l) => l.trim()).filter(Boolean);
    const at = lines.findIndex((l) => /rror/.test(l));
    add('vite:build', false, `vite build exit=${built.code}: ${lines.slice(at, at + 4).join(' | ')}`);
  } else {
    add('vite:build', true, 'vite build exit 0');
    const rendered = await withPreview({
      work,
      port: 4319,
      probe: (page) =>
        page.evaluate(() => ({
          filetree: document.querySelectorAll('.tnt-file-tree-root').length,
          ping: document.querySelectorAll('[class*="tnt-ping"]').length,
          tinitaRules: [...document.styleSheets]
            .flatMap((sh) => {
              try {
                return [...sh.cssRules];
              } catch {
                return [];
              }
            })
            .filter((r) => r.selectorText?.includes('tnt-')).length,
        })),
    });
    if (!rendered.ok) {
      add('vite:render', false, `không dựng được trang preview: ${rendered.error.message}`);
    } else {
      const seen = rendered.value;
      add(
        'vite:render',
        seen.filetree >= 1 && seen.tinitaRules > 0,
        `FileTree=${seen.filetree} Ping=${seen.ping} rule .tnt-*=${seen.tinitaRules}`,
      );
    }
  }

  /**
   * ---------- Token motion: consumer per-component KHÔNG nhập styles.css ----------
   *
   * Ca này tồn tại vì mọi consumer browser khác của lab đều `import
   * 'tinita-react/styles.css'` - `vite:render` ngay trên, và CẢ app Next của L4
   * (root layout của nó nhập, và trong App Router root layout áp cho mọi route nên
   * không route nào tránh được). Đo 2026-10-06: hai tầng browser duy nhất của repo
   * đều che đúng lớp lỗi mà ship-CSS-theo-component sinh ra.
   *
   * Phán quyết HAI CHIỀU, và tín hiệu "CSS đã tới" phải đến từ declaration KHÔNG
   * dùng token VÀ KHÔNG bị animation làm đổi:
   *   position/borderRadius sai  -> CSS của component không tới (bridge hỏng)
   *   animationName === 'none'   -> CSS tới nhưng token không giải được
   *
   * Bản đầu của ca này đọc `animationName` + `animationDuration` và cả hai cùng
   * báo hỏng, trong khi `css-graph:ping` cùng lượt chạy lại PASS với 2396 byte CSS
   * của Ping - hai thứ không thể cùng đúng. Lý do: `animation` là SHORTHAND, nên
   * `var()` không giải được làm invalid cả declaration và `animation-name` cũng về
   * initial `none`. Hai tín hiệu đó hỏng cùng nhau nên không phân biệt được gì.
   * `position: absolute` trong cùng rule `.pulse` không qua token, nên nó là bằng
   * chứng độc lập rằng rule đã áp. Đo 2026-10-06.
   *
   * Và `opacity` KHÔNG dùng được làm tín hiệu đó, dù rule đặt `opacity: 0.75`:
   * keyframes `tnt-ping-pulse` animate chính opacity, nên khi fix đã xong và
   * animation CHẠY thì giá trị đọc được là một điểm giữa hai keyframe - đo
   * `0.503264`. Lần thứ hai cùng một lỗi: chọn tín hiệu mà thứ đang test làm đổi.
   * `borderRadius` thì không bị animate, nên nó là cái belt đúng.
   *
   * Ping được chọn vì pulse là toàn bộ chức năng của nó, và nó không cần optional
   * peer nào.
   */
  const noGlobal = createConsumer({
    level: 'l2',
    name: 'vite-no-global-css',
    deps: [...REACT, 'vite@7', '@vitejs/plugin-react@5'],
    tarballs: TGZ,
    pkgJson: { type: 'module' },
    files: {
      'index.html': '<!doctype html><div id="root"></div><script type="module" src="/main.jsx"></script>',
      'vite.config.js': "import react from '@vitejs/plugin-react';\nexport default { plugins: [react()] };\n",
      // CỐ Ý không có `import 'tinita-react/styles.css'`. Thêm vào là xoá ca này.
      'main.jsx': `
import { createRoot } from 'react-dom/client';
import { createElement as h } from 'react';
import { Ping } from 'tinita-react/ui/ping';
createRoot(document.getElementById('root')).render(h(Ping, { count: 2 }));
`,
    },
  });

  const noGlobalBuilt = run('npx', ['vite', 'build'], noGlobal, 300_000);
  if (!noGlobalBuilt.ok) {
    add('motion-present:build', false, `vite build exit=${noGlobalBuilt.code}`);
  } else {
    const probed = await withPreview({
      work: noGlobal,
      port: 4320,
      probe: (page) =>
        page.evaluate(() => {
          const el = document.querySelector('.tnt-ping-pulse');
          if (!el) return { found: false };
          const cs = getComputedStyle(el);
          return {
            found: true,
            name: cs.animationName,
            duration: cs.animationDuration,
            // Không qua token -> bằng chứng độc lập rằng rule `.pulse` đã áp.
            position: cs.position,
            borderRadius: cs.borderRadius,
            opacity: cs.opacity,
          };
        }),
    });
    if (!probed.ok) {
      add('motion-present', false, `không dựng được trang preview: ${probed.error.message}`);
    } else {
      const m = probed.value;
      const cssArrived = m.found && m.position === 'absolute' && m.borderRadius === '9999px';
      const tokenResolved = m.found && m.name !== 'none' && m.name !== '' && m.duration !== '0s';
      add(
        'motion-present',
        cssArrived && tokenResolved,
        m.found
          ? `position=${m.position} borderRadius=${m.borderRadius} opacity=${m.opacity} animationName=${m.name} animationDuration=${m.duration}` +
              ` | CSS tới=${cssArrived}, token giải được=${tokenResolved}` +
              (cssArrived && !tokenResolved ? ' <- token nằm NGOÀI CSS graph của component' : '')
          : 'không tìm thấy .tnt-ping-pulse',
        { measured: m },
      );
    }
  }
}

// ---------- hợp đồng optional peer cho specifier CSS-AWARE ----------
//
// Đây là phần L1 `04b` không đo được nữa. Từ 2026-10-05 mọi `ui/*` mang một import CSS
// nên Node không nạp được chúng, và "thiếu peer" với "không nạp được CSS" cho cùng một
// exit code. Hợp đồng không bỏ - nó chuyển về đây, nơi consumer là một bundler thật và
// peer thiếu hiện ra đúng tên.
{
  const SPECS = Object.entries(contract['tinita-react'].optionalPeers)
    .filter(([spec, needed]) => spec.startsWith('./ui/') && needed.length > 0)
    .map(([spec, needed]) => ({ spec, needed, id: spec.replace('./ui/', '') }));

  const entryFor = (spec) =>
    `import * as m from 'tinita-react${spec.slice(1)}';\nif (!Object.keys(m).length) throw new Error('rỗng');\nexport default m;\n`;
  const configFor = (id) =>
    `export default { build: { lib: { entry: '${id}.js', formats: ['es'], fileName: '${id}' }, outDir: 'out-${id}', emptyOutDir: true } };\n`;

  const files = { };
  for (const { spec, id } of SPECS) {
    files[`${id}.js`] = entryFor(spec);
    files[`vite.${id}.config.js`] = configFor(id);
  }

  for (const state of ['absent', 'present']) {
    const work = createConsumer({
      level: 'l2',
      name: `peer-${state}-bundled`,
      deps: state === 'present' ? [...REACT, 'vite@7', ...OPTIONAL_PEERS] : [...REACT, 'vite@7'],
      tarballs: TGZ,
      pkgJson: { type: 'module' },
      files,
    });

    for (const { spec, needed, id } of SPECS) {
      const built = run('npx', ['vite', 'build', '-c', `vite.${id}.config.js`], work, 300_000);
      if (state === 'present') {
        add(`peer-matrix-css-aware:${id}:present`, built.ok,
          built.ok
            ? `${spec} build được khi có ${needed.join(' + ')}`
            : `exit=${built.code}: ${built.out.split('\n').map((l) => l.trim()).filter(Boolean).find((l) => /rror/.test(l)) ?? ''}`);
      } else {
        // Thiếu peer phải fail VÀ nêu đúng tên peer. Chỉ đòi "có fail" thì ca sẽ xanh
        // y nguyên khi nguyên nhân đổi sang thứ khác.
        const named = needed.filter((n) => built.out.includes(n));
        const ok = !built.ok && named.length > 0;
        add(`peer-matrix-css-aware:${id}:absent`, ok,
          ok
            ? `${spec} fail đúng như mong đợi, nêu tên: ${named.join(', ')}`
            : built.ok
              ? `${spec} build ĐƯỢC dù thiếu ${needed.join(' + ')} - optional peer không còn bị đòi`
              : `${spec} fail nhưng KHÔNG nêu peer nào trong ${needed.join(', ')}`,
          { needed, named });
      }
    }
  }
}

// ---------- CSS dependency graph phản ánh JS dependency graph ----------
//
// Invariant, không phải chi tiết implementation: import MỘT component thì chỉ nạp
// shared tokens + tokens của nó + CSS của nó (+ shared CSS primitive nó thật sự cần).
// Ca này KHÔNG đếm xem vite emit mấy file và KHÔNG khoá đường dẫn - đổi sang
// Rollup/tsup thì nó vẫn còn nghĩa.
//
// Đo 2026-10-05 trên Next: `styles.css` toàn bộ là 27023 byte, chỉ Ping là 2424.
{
  const MARKERS = {
    ping: 'tnt-ping-root',
    tree: 'tnt-tree-root',
    // `tnt-file-tree-root`, không phải `tnt-filetree`. Marker này từng viết KHÁC mọi
    // marker cùng khối - không có `-root`, và nó khớp token `--tnt-filetree-*` thay vì
    // class. Nên khi P4 đổi tiền tố token sang `--tnt-file-tree-`, lượt rename quét
    // `--tnt-filetree-` không khớp nó và ba ca `css-graph:*` đỏ với `THIẾU: filetree`.
    // Đo 2026-10-06.
    //
    // `tnt-tree-root` KHÔNG là substring của `tnt-file-tree-root` (sau `tnt-` là
    // `file`), nên hai marker vẫn phân biệt được nhau.
    filetree: 'tnt-file-tree-root',
    carousel: 'tnt-carousel',
    fw: 'tnt-floating-window-root',
    // Dấu HAI CHẤM quan trọng. `--tnt-radius` là TIỀN TỐ của bốn token khai báo
    // (`--tnt-radius`, `--tnt-radius-sm`, `--tnt-radius-md`, `--tnt-radius-lg`), nên
    // đếm thiếu dấu hai chấm ra x4 và ca dedupe đỏ oan. Đo 2026-10-05 trên CSS thật:
    // tiền tố 4 lần, `--tnt-radius:` đúng 1 lần.
    sharedToken: '--tnt-radius:',
    // `animations.css` (18 keyframes) và `@theme inline` (150 biến `--color-*`) thuộc
    // GLOBAL layer. Không component nào dùng - đo được 0/18 keyframes và 0 lần
    // `var(--color-*)` trong src/ui - nên một bridge kéo chúng vào là hồi quy.
    animations: 'tnt-animate-',
    tailwindVars: '--color-background',
  };

  const SCENARIOS = [
    {
      id: 'ping',
      imp: "import { Ping } from 'tinita-react/ui/ping';",
      jsx: "h(Ping, { count: 1 })",
      present: ['ping', 'sharedToken'],
      absent: ['tree', 'filetree', 'carousel', 'fw', 'animations', 'tailwindVars'],
      why: 'Ping một mình: CSS + token của Ping, không gì khác',
    },
    {
      id: 'file-tree',
      // FileTree render Tree, nên CSS của Tree là shared primitive BẮT BUỘC: mọi rule
      // `tnt-tree-*` nằm ở stylesheet của Tree, `ui/file-tree/styles.css` có 0 cái.
      imp: "import { FileTree } from 'tinita-react/ui/file-tree';",
      jsx: "h(FileTree, { text: 'src' })",
      present: ['filetree', 'tree', 'sharedToken'],
      absent: ['ping', 'carousel', 'fw', 'animations', 'tailwindVars'],
      why: 'FileTree kéo theo CSS của Tree vì nó render Tree, nhưng không kéo Ping',
    },
    {
      // Tree là shared primitive: CẢ `ui/tree` và `ui/file-tree` đều `@import` CSS của
      // nó. Import cả hai component thì CSS đó phải vào ĐÚNG MỘT LẦN, không phải hai.
      id: 'tree-plus-file-tree',
      imp: "import { Tree } from 'tinita-react/ui/tree';\nimport { FileTree } from 'tinita-react/ui/file-tree';",
      jsx: "h('div', null, h(Tree, { nodes: [] }), h(FileTree, { text: 'src' }))",
      present: ['tree', 'filetree', 'sharedToken'],
      absent: ['ping', 'carousel', 'fw', 'animations', 'tailwindVars'],
      sharedTokenCount: 1,
      // `.tnt-tree-item{` được định nghĩa đúng 1 lần trong `ui/tree/styles.css`, nên
      // đếm nó trong bundle cho thẳng số BẢN COPY.
      ruleOnce: '.tnt-tree-item{',
      why: 'Tree là shared primitive của hai bridge, CSS của nó không được vào hai lần',
    },
    {
      id: 'ping-plus-file-tree',
      imp: "import { Ping } from 'tinita-react/ui/ping';\nimport { FileTree } from 'tinita-react/ui/file-tree';",
      jsx: "h('div', null, h(Ping, { count: 1 }), h(FileTree, { text: 'src' }))",
      present: ['ping', 'filetree', 'tree', 'sharedToken'],
      absent: ['carousel', 'fw', 'animations', 'tailwindVars'],
      // Hai component đều `@import` shared tokens; nó phải vào bundle ĐÚNG MỘT LẦN.
      sharedTokenCount: 1,
      why: 'hai component: hợp của hai graph, shared tokens không lặp',
    },
    {
      id: 'floating-window',
      imp: "import { FloatingWindow } from 'tinita-react/ui/floating-window';",
      jsx: "h(FloatingWindow, { open: true, onOpenChange: () => {}, title: 't' }, 'x')",
      present: ['fw', 'sharedToken'],
      absent: ['ping', 'tree', 'filetree', 'carousel', 'animations', 'tailwindVars'],
      why: 'FloatingWindow một mình, dù JS của nó phụ thuộc tinita - cạnh JS không chạm CSS graph',
    },
  ];

  for (const sc of SCENARIOS) {
    const work = createConsumer({
      level: 'l2',
      name: `css-graph-${sc.id}`,
      deps: [...REACT, 'vite@7', '@vitejs/plugin-react@5', ...OPTIONAL_PEERS],
      tarballs: TGZ,
      pkgJson: { type: 'module' },
      files: {
        'index.html': '<!doctype html><div id="root"></div><script type="module" src="/main.jsx"></script>',
        'vite.config.js': "import react from '@vitejs/plugin-react';\nexport default { plugins: [react()] };\n",
        // KHÔNG import CSS nào bằng tay - đó chính là thứ đang được kiểm.
        'main.jsx': `import { createRoot } from 'react-dom/client';\nimport { createElement as h } from 'react';\n${sc.imp}\ncreateRoot(document.getElementById('root')).render(${sc.jsx});\n`,
      },
    });

    const built = run('npx', ['vite', 'build'], work, 300_000);
    if (!built.ok) {
      const lines = built.out.split('\n').map((l) => l.trim()).filter(Boolean);
      const at = lines.findIndex((l) => /rror/.test(l));
      add(`css-graph:${sc.id}`, false, `vite build exit=${built.code}: ${lines.slice(at, at + 3).join(' | ')}`);
      continue;
    }

    const assetDir = resolve(work, 'dist/assets');
    const cssFiles = existsSync(assetDir) ? readdirSync(assetDir).filter((f) => f.endsWith('.css')) : [];
    const css = cssFiles.map((f) => readFileSync(resolve(assetDir, f), 'utf8')).join('\n');

    const missing = sc.present.filter((k) => !css.includes(MARKERS[k]));
    const leaked = sc.absent.filter((k) => css.includes(MARKERS[k]));
    // Byte count chỉ là DIAGNOSTIC, không bao giờ là assertion: Vite và Next minify
    // khác nhau nên 2396 vs 2424 là bình thường. Khẳng định nằm ở có/không và ở quan
    // hệ phụ thuộc.
    const sharedSeen = sc.sharedTokenCount === undefined
      ? null
      : css.split(MARKERS.sharedToken).length - 1;
    const dedupeOk = sharedSeen === null || sharedSeen === sc.sharedTokenCount;
    // Một selector được định nghĩa đúng 1 lần trong stylesheet nguồn, nên số lần nó
    // xuất hiện trong bundle CHÍNH LÀ số bản copy. Đếm class name trần thì vô nghĩa:
    // `tnt-tree-root` có mặt trong 20 selector khác nhau - đo 2026-10-05.
    const ruleSeen = sc.ruleOnce ? css.split(sc.ruleOnce).length - 1 : null;
    const ruleOnceOk = ruleSeen === null || ruleSeen === 1;
    const ok =
      cssFiles.length > 0 && missing.length === 0 && leaked.length === 0 && dedupeOk && ruleOnceOk;
    const detail = cssFiles.length === 0
      ? 'KHÔNG emit CSS nào - component không tự kéo CSS của nó'
      : `${css.length} byte; ${sc.why}`
        + (sharedSeen === null ? '' : ` | shared tokens x${sharedSeen}`)
        + (missing.length ? ` | THIẾU: ${missing.join(', ')}` : '')
        + (leaked.length ? ` | RÒ: ${leaked.join(', ')}` : '')
        + (ruleSeen === null ? '' : ` | ${sc.ruleOnce} x${ruleSeen}`)
        + (dedupeOk ? '' : ` | TOKEN LẶP: chờ x${sc.sharedTokenCount}`)
        + (ruleOnceOk ? '' : ` | RULE LẶP: ${sc.ruleOnce} vào ${ruleSeen} lần`);
    add(`css-graph:${sc.id}`, ok, detail, { bytes: css.length, missing, leaked, sharedSeen, ruleSeen });
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
  for (const id of ['next:rsc-ping-no-directive', 'next:rsc-filetree-no-directive', 'next:rsc-ticker-no-directive', 'next:rsc-filetree-app-directive', 'next:rsc-floatingwindow-no-directive', 'next:rsc-floatingwindow-app-directive']) {
    add(id, true, 'skip: ca Next thuộc tier 2 (next build chậm)', { skipped: true, reason: 'tier' });
  }
}

if (tierFlag >= 2) {
  const base = {
    level: 'l2',
    deps: [...REACT, 'next@15', ...OPTIONAL_PEERS],
    tarballs: TGZ,
    files: {
      'next.config.mjs': 'export default { eslint: { ignoreDuringBuilds: true }, typescript: { ignoreBuildErrors: true } };\n',
      'app/layout.tsx': 'export default function L({ children }: { children: React.ReactNode }) {\n  return (<html lang="en"><body>{children}</body></html>);\n}\n',
    },
  };
  // `path` per variant, not a ternary on the component name: the ternary had to be
  // edited for every component added and its fall-through branch silently sent an
  // unknown name to `carousel-ticker`.
  const page = (directive, imp, path, jsx) => `${directive}import { ${imp} } from 'tinita-react/ui/${path}';\n\nconst TREE = ['src', '  a.ts'].join('\\n');\n\nexport default function Page() {\n  return ${jsx};\n}\n`;

  const variants = [
    { id: 'rsc-ping-no-directive', directive: '', imp: 'Ping', path: 'ping', jsx: '<Ping count={1} />', expectOk: true, why: 'Ping không dùng hook nên Server Component chịu được' },
    // ĐẢO 2026-09-26. Trước: `expectOk: false` - FileTree trong Server Component throw
    // `(0 , e.useState) is not a function` vì library không khai 'use client' ở đâu, và
    // mọi consumer phải tự bọc. Giờ library tự khai (tsup `banner`, vì esbuild xoá
    // directive trong source) nên consumer KHÔNG phải làm gì.
    { id: 'rsc-filetree-no-directive', directive: '', imp: 'FileTree', path: 'file-tree', jsx: '<FileTree text={TREE} />', expectOk: true, why: "library tự khai 'use client' -> Server Component dùng trực tiếp được" },
    { id: 'rsc-ticker-no-directive', directive: '', imp: 'CarouselTicker', path: 'carousel-ticker', jsx: '<CarouselTicker><span>a</span></CarouselTicker>', expectOk: true, why: "CarouselTicker dùng useRef; library tự khai 'use client'" },
    { id: 'rsc-filetree-app-directive', directive: "'use client';\n", imp: 'FileTree', path: 'file-tree', jsx: '<FileTree text={TREE} />', expectOk: true, why: 'consumer bọc thêm use client vẫn phải chạy' },
    // FloatingWindow khác ba ca trên: nó nhận PROP LÀ HÀM (`onOpenChange`), và hàm
    // không qua được biên Server -> Client. Nên `'use client'` của library là cần
    // nhưng CHƯA đủ: consumer phải tự bọc. Cặp ca này khoá đúng sự khác biệt đó.
    // `expectError` chứ không chỉ `expectOk: false`: một ca chỉ đòi exit != 0 sẽ
    // xanh kể cả khi build fail vì lý do hoàn toàn khác. Chuỗi dưới ĐO THẬT
    // 2026-10-02 bằng `npx next build` trong .work của ca này.
    { id: 'rsc-floatingwindow-no-directive', directive: '', imp: 'FloatingWindow', path: 'floating-window', jsx: '<FloatingWindow open onOpenChange={() => {}} title="t"><span>a</span></FloatingWindow>', expectOk: false, expectError: 'Event handlers cannot be passed to Client Component props', why: 'prop là hàm không qua được biên RSC; library khai use client là cần nhưng chưa đủ' },
    { id: 'rsc-floatingwindow-app-directive', directive: "'use client';\n", imp: 'FloatingWindow', path: 'floating-window', jsx: '<FloatingWindow open onOpenChange={() => {}} title="t"><span>a</span></FloatingWindow>', expectOk: true, why: 'consumer bọc use client -> prop là hàm hợp lệ' },
  ];

  for (const v of variants) {
    const work = createConsumer({ ...base, name: `next-${v.id}`, files: { ...base.files, 'app/page.tsx': page(v.directive, v.imp, v.path, v.jsx) } });
    const r = run('npx', ['next', 'build'], work, 600_000);
    const hookErr = /is not a function/.test(r.out) ? r.out.split('\n').find((l) => /is not a function/.test(l))?.trim() : null;
    // Một ca mong đợi fail phải khớp CẢ exit code VÀ lý do, nếu không nó chỉ đang
    // canh "có fail" - và nó sẽ xanh y nguyên khi nguyên nhân đổi thành thứ khác.
    const reasonMatched = !v.expectError || r.out.includes(v.expectError);
    const ok = r.ok === v.expectOk && reasonMatched;
    const detail = v.expectError
      ? `${v.why}; exit=${r.code}; lý do khớp: ${reasonMatched ? 'có' : `KHÔNG - chờ "${v.expectError}"`}`
      : `${v.why}; exit=${r.code}${hookErr ? ` | ${hookErr}` : ''}`;
    // KHÔNG truyền `expectedFailure`. `report.mjs:18` biến một ca đỏ thành XFAIL khi
    // cờ đó bật, và `:25` loại nó khỏi danh sách fail - nên ca sẽ xanh y nguyên dù
    // build fail vì lý do khác. Phán quyết đã nằm trong `ok`: build phải khớp cả
    // expectOk lẫn expectError. Đo 2026-10-02: với cờ đó bật, đổi expectError thành
    // một chuỗi không tồn tại cho XFAIL và suite vẫn exit 0.
    add(`next:${v.id}`, ok, detail, { mustFail: !v.expectOk, hookError: hookErr, expectError: v.expectError ?? null });
  }

}

const payload = { level: 'l2', ranAt: new Date().toISOString(), wallClockMs: Date.now() - t0, cases, findings };
const file = writeReport('l2', payload);
const failed = printSummary(payload);
process.stdout.write(`wall-clock: ${((Date.now() - t0) / 1000).toFixed(1)}s\nreport: ${file}\n`);
process.exit(failed > 0 ? EXIT.FAIL : EXIT.PASS);
