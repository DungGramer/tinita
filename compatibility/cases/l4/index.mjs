import { execFileSync, spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { extname, join } from 'node:path';
import { createReadStream } from 'node:fs';
import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { EXIT, LAB } from '../../scripts/paths.mjs';
import { createConsumer, tarballFor } from '../../scripts/consumer.mjs';
import { printSummary, writeReport } from '../../scripts/report.mjs';

/**
 * Optional peer lấy TỪ CONTRACT, không viết tay - giống ca 04 của L1 và L2.
 *
 * Bản trước gõ cứng `'@radix-ui/react-accordion'`. Sau khi `Tree` chuyển sang
 * `@base-ui/react`, cả 2 ca của L4 đỏ với 'Build failed because of webpack errors'
 * vì consumer cài sai peer. Đo 2026-09-28: 2 đỏ trước, 0 sau.
 */
const OPTIONAL_PEERS = [
  ...new Set(
    Object.values(
      JSON.parse(readFileSync(resolve(LAB, 'contract.json'), 'utf8')).packages['tinita-react']
        .optionalPeers
    ).flat()
  ),
];

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

// L4 là tier 3: production build + browser. --tier thấp hơn thì bỏ qua sạch, không fail.
if (flags.tier && Number(flags.tier) < 3) {
  process.stdout.write(`[l4] tier=${flags.tier} < 3 - L4 thuộc tier 3, bỏ qua\n`);
  process.exit(EXIT.PASS);
}

const SHOTS = resolve(LAB, 'cases/l4/__screenshots__');
const IN_CONTAINER = process.env.IN_PLAYWRIGHT_CONTAINER === '1';

// Baseline chỉ được sinh TRONG container. Trên host thì refuse - không phải cảnh báo, là chặn.
if (flags['update-snapshots'] === 'true' && !IN_CONTAINER) {
  process.stderr.write(
    '[l4] TỪ CHỐI sinh baseline trên host.\n' +
      '[l4] Font rendering và antialiasing của macOS khác Linux container -> baseline sinh trên host\n' +
      '[l4] sẽ làm mọi ca đỏ vì lý do không liên quan tới library.\n' +
      '[l4] Chạy trong container: node compatibility/cases/l3/index.mjs --case=playwright --update-snapshots\n',
  );
  process.exit(EXIT.INFRA);
}

let chromium;
try {
  ({ chromium } = await import('playwright'));
} catch {
  process.stderr.write('[l4] không có playwright - lỗi hạ tầng\n');
  process.exit(EXIT.INFRA);
}

const REACT_VERSIONS = ['18', '19'];

for (const reactVersion of REACT_VERSIONS) {
  const work = createConsumer({
    level: 'l4',
    name: `next-react${reactVersion}`,
    deps: [`react@${reactVersion}`, `react-dom@${reactVersion}`, 'next@15', ...OPTIONAL_PEERS],
    tarballs: [tarballFor('tinita-react')],
    files: {
      'next.config.mjs': 'export default { eslint: { ignoreDuringBuilds: true }, typescript: { ignoreBuildErrors: true } };\n',
      'app/layout.tsx':
        "import 'tinita-react/styles.css';\n" +
        'export default function L({ children }: { children: React.ReactNode }) {\n' +
        '  return (<html lang="en"><body style={{ margin: 0, padding: 16 }}>{children}</body></html>);\n}\n',
      // FloatingWindow mặc định ĐÓNG, bật bằng nút. Nó là `position: fixed` qua portal
      // nên mở sẵn sẽ phủ lên cả ba vùng `data-shot` và phá baseline ảnh - phần kiểm
      // nó nằm trước mục chụp ảnh và đóng lại trước khi chụp.
      'app/page.tsx':
        "'use client';\n" +
        "import { useState } from 'react';\n" +
        "import { FileTree } from 'tinita-react/ui/file-tree';\n" +
        "import { Ping } from 'tinita-react/ui/ping';\n" +
        "import { CarouselTicker } from 'tinita-react/ui/carousel-ticker';\n" +
        "import { FloatingWindow } from 'tinita-react/ui/floating-window';\n\n" +
        "const TREE = ['src', '  index.ts', '  ui', '    button.tsx', 'README.md'].join('\\n');\n\n" +
        'export default function Page() {\n' +
        '  const [fw, setFw] = useState(false);\n' +
        '  return (<main><div data-shot="ping"><Ping count={3} /></div>' +
        '<div data-shot="ticker" style={{ width: 300 }}><CarouselTicker><span>alpha</span></CarouselTicker></div>' +
        '<div data-shot="filetree"><FileTree text={TREE} /></div>' +
        '<button type="button" data-fw-toggle onClick={() => setFw((v) => !v)}>toggle window</button>' +
        '<FloatingWindow open={fw} onOpenChange={setFw} title="Dashboard"><p data-fw-body>window body</p></FloatingWindow>' +
        '</main>);\n}\n',
    },
  });

  const build = (() => {
    try {
      execFileSync('npx', ['next', 'build'], { cwd: work, encoding: 'utf8', timeout: 900_000, stdio: ['ignore', 'pipe', 'pipe'] });
      return { ok: true, out: '' };
    } catch (error) {
      return { ok: false, out: `${error.stdout ?? ''}${error.stderr ?? ''}` };
    }
  })();

  if (!build.ok) {
    add(`react${reactVersion}:build`, false, `next build fail: ${build.out.split('\n').find((l) => /rror/.test(l))?.trim() ?? ''}`);
    continue;
  }
  add(`react${reactVersion}:build`, true, 'next build production exit 0');

  const port = reactVersion === '18' ? 4418 : 4419;
  const server = spawn('npx', ['next', 'start', '-p', String(port)], { cwd: work, stdio: 'ignore' });
  try {
    await new Promise((r) => setTimeout(r, 6000));
    const browser = await chromium.launch();
    const page = await browser.newPage({ viewport: { width: 800, height: 600 } });

    // Hydration: đọc console message của BROWSER, exit code của build không thấy được.
    const consoleErrors = [];
    page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text()); });
    page.on('pageerror', (e) => consoleErrors.push(String(e)));

    await page.goto(`http://127.0.0.1:${port}/`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);

    const hydrationErrors = consoleErrors.filter((t) => /hydrat/i.test(t));
    add(`react${reactVersion}:hydration`, hydrationErrors.length === 0,
      hydrationErrors.length === 0
        ? `không console error nào chứa 'hydrat' (${consoleErrors.length} error khác)`
        : `${hydrationErrors.length} lỗi hydration: ${hydrationErrors[0].slice(0, 200)}`,
      { consoleErrors: consoleErrors.slice(0, 5) });

    // FloatingWindow trong browser THẬT, trên cả React 18 và 19.
    //
    // Đây là chỗ duy nhất component được mount trong một browser thật, và là chỗ duy
    // nhất React 18 được đo - `peerDependencies` khai `>=18` nhưng L1 và L2 chỉ cài
    // react@19 (ghi ở nợ kỹ thuật). Component dùng `useSyncExternalStore`, API của
    // React 18, nên 18 là sàn CỨNG; ca này là thứ chứng minh sàn đó đứng được.
    const fwErrorsBefore = consoleErrors.length;
    await page.click('[data-fw-toggle]');
    await page.waitForTimeout(600);

    const fw = await page.evaluate(() => {
      const root = document.querySelector('.tnt-floating-window-root');
      if (!root) return null;
      const box = root.getBoundingClientRect();
      return {
        // Portal, đo bằng phép phân biệt DỨT KHOÁT: node không được có tổ tiên
        // `<main>`. Bản đầu dùng `parentElement?.tagName === 'BODY' ||
        // parentElement?.parentElement?.tagName === 'BODY'`, và cái fallback hai
        // tầng đó làm ca MÙ: bỏ `createPortal` thì root nằm trong `<main>`, cha của
        // `<main>` là `<body>`, nên nhánh thứ hai vẫn đúng và ca vẫn xanh. Đo được
        // 2026-10-02: gỡ portal -> L4 exit 0, `portal ra body=true`.
        parentIsBody: root.parentElement?.tagName === 'BODY',
        insideApp: Boolean(root.closest('main')),
        width: Math.round(box.width),
        height: Math.round(box.height),
        position: getComputedStyle(root).position,
        mode: root.getAttribute('data-mode'),
        hasBody: Boolean(document.querySelector('[data-fw-body]')),
        // Nếu CSS không được load thì class có nhưng kích thước là 0.
        hasHeader: Boolean(document.querySelector('.tnt-floating-window-header')),
      };
    });

    const fwErrors = consoleErrors.slice(fwErrorsBefore);
    const fwOk = Boolean(
      fw && fw.parentIsBody && fw.insideApp === false
      && fw.position === 'fixed' && fw.mode === 'windowed'
      && fw.width > 0 && fw.height > 0 && fw.hasBody && fw.hasHeader && fwErrors.length === 0
    );
    add(`react${reactVersion}:floating-window-mounts`, fwOk,
      fw
        ? `cha là body=${fw.parentIsBody}, trong <main>=${fw.insideApp}, position=${fw.position}, mode=${fw.mode}, ${fw.width}x${fw.height}, header=${fw.hasHeader}, body=${fw.hasBody}, console error mới=${fwErrors.length}`
        : 'không tìm thấy .tnt-floating-window-root sau khi bật',
      { measured: fw, newConsoleErrors: fwErrors.slice(0, 3) });

    // reduced-motion của CHÍNH component, trong khi nó đang mở.
    //
    // Ca `reduced-motion-own-elements` phía dưới probe một div mang
    // `tnt-animate-fade-in`, nên nó không nói gì về component này. Và motion của
    // FloatingWindow là transition CSS chứ không phải animation, nên phải đọc
    // `transitionDuration`, không phải `animationDuration`. Media được trả lại ngay
    // để các mục phía dưới giữ nguyên điều kiện của chúng.
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.waitForTimeout(200);
    const fwMotion = await page.evaluate(() => {
      const read = (sel) => {
        const el = document.querySelector(sel);
        return el ? getComputedStyle(el).transitionDuration : null;
      };
      return { root: read('.tnt-floating-window-root'), button: read('.tnt-floating-window-button') };
    });
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.waitForTimeout(200);
    const fwMotionOn = await page.evaluate(() => {
      const el = document.querySelector('.tnt-floating-window-root');
      return el ? getComputedStyle(el).transitionDuration : null;
    });

    // Kiểm CẢ HAI chiều. Chỉ kiểm "0s khi reduce" thì một component chưa bao giờ có
    // transition cũng cho xanh, và khối reduced-motion có thể đã bị xoá mà không ai thấy.
    const zeroed = (v) => v !== null && /^0s(, 0s)*$/.test(v);
    const fwMotionOk = zeroed(fwMotion.root) && zeroed(fwMotion.button)
      && fwMotionOn !== null && !zeroed(fwMotionOn);
    add(`react${reactVersion}:floating-window-reduced-motion`, fwMotionOk,
      `reduce: root=${fwMotion.root}, button=${fwMotion.button}` +
        ` | no-preference: root=${fwMotionOn}` +
        (fwMotionOk ? ' -> tắt hẳn khi reduce, và CÓ transition khi không' : ' -> SAI: xem khối @media trong FloatingWindow.module.css'),
      { reduce: fwMotion, noPreference: fwMotionOn });

    // Đóng bằng CONTROL CỦA WINDOW, không bằng nút toggle của trang.
    //
    // Nút toggle nằm dưới window: ở viewport 800x600 window trải x 40..760, y 60..540
    // và nút ở (16..116, 245..266), nên click bị chặn - Playwright báo "element is
    // visible, enabled and stable" rồi retry 56 lần tới timeout. Đó là hành vi ĐÚNG
    // của một overlay, và dùng nút Close thì vừa đóng được vừa kiểm luôn control đó
    // cùng với đường `onOpenChange` quay về state của trang.
    await page.click('.tnt-floating-window-root button[aria-label="Close"]');
    await page.waitForTimeout(400);
    const fwGone = await page.evaluate(() => !document.querySelector('.tnt-floating-window-root'));
    add(`react${reactVersion}:floating-window-closes`, fwGone,
      fwGone ? 'đóng xong, không còn node nào trong body' : 'VẪN còn node sau khi đóng - baseline ảnh dưới sẽ sai');

    // reduced-motion: khối `*, *::before, *::after { !important }` có đè element CHỦ NHÀ không.
    //
    // Đo bằng cách SO VỚI GIÁ TRỊ ĐÃ SET, không so với một hằng số. Bản trước dò
    // `seconds <= 0.0001` để bắt hack `0.01ms` (Chromium in ra `1e-05s`); khi khối đổi sang
    // `animation: none` thì giá trị là `0s`, không rơi vào khoảng đó, và ca sẽ báo "không bị đè"
    // trong lúc rò rỉ vẫn còn nguyên. So với `5s`/`spin` đã set thì đúng cho cả hai cơ chế.
    await page.emulateMedia({ reducedMotion: 'reduce' });
    const rm = await page.evaluate(() => {
      const probe = document.createElement('div');
      probe.style.animation = 'spin 5s linear infinite';
      probe.style.transition = 'opacity 5s linear';
      document.body.appendChild(probe);
      const style = getComputedStyle(probe);
      const measured = {
        animationDuration: style.animationDuration,
        animationName: style.animationName,
        transitionDuration: style.transitionDuration,
      };
      probe.remove();
      return measured;
    });
    const asked = 'animation 5s/spin + transition 5s';
    const got = `${rm.animationDuration}/${rm.animationName} + ${rm.transitionDuration}`;
    const overridden =
      rm.animationDuration !== '5s' ||
      rm.animationName !== 'spin' ||
      rm.transitionDuration !== '5s';
    // ĐẢO 2026-09-26. Trước đây khối này là `*, *::before, *::after { ... !important }` và ca
    // chốt lại đúng cái rò rỉ đó (`overridden === true`). Giờ selector là `[class*='tnt-']`, nên
    // element của chủ nhà PHẢI giữ nguyên giá trị nó đặt. Dưới reduced-motion host có cách xử lý
    // riêng và đó là việc của họ.
    add(`react${reactVersion}:reduced-motion-scope`, overridden === false,
      `element chủ nhà: đặt ${asked}, đo được ${got}${overridden ? ' -> RÒ RỈ: khối !important của library ĐÈ lên element KHÔNG thuộc library' : ' -> giữ nguyên, không bị đè'}`,
      { leaks: overridden, measured: rm });
    if (overridden) {
      findings.push({
        id: 'reduced-motion-unscoped',
        detail: `Khối \`@media (prefers-reduced-motion: reduce)\` của animations.css lại với tới element chủ nhà. Đo được: đặt ${asked} nhưng nhận ${got}. Selector phải là \`[class*='tnt-']\`, không phải \`*\`.`,
        assignedTo: 'regression',
      });
    }

    // Chieu con lai: element CUA LIBRARY phai bi tat that. Neu chi kiem "host khong bi
    // dè" thi mot khoi reduced-motion bi xoa han cung cho xanh.
    const own = await page.evaluate(() => {
      const probe = document.createElement('div');
      probe.className = 'tnt-animate-fade-in';
      probe.style.animation = 'spin 5s linear infinite';
      document.body.appendChild(probe);
      const style = getComputedStyle(probe);
      const measured = { duration: style.animationDuration, name: style.animationName };
      probe.remove();
      return measured;
    });
    const ownDisabled = own.duration === '0s' && own.name === 'none';
    add(`react${reactVersion}:reduced-motion-own-elements`, ownDisabled,
      `element mang class tnt-: đặt animation 5s/spin, đo được ${own.duration}/${own.name}` +
        (ownDisabled ? ' -> đã tắt hẳn' : ' -> KHÔNG tắt, khối reduced-motion không với tới element của chính library'),
      { measured: own });

    // CarouselTicker: HÀNH VI thật dưới reduced-motion, không phải declaration.
    //
    // Marquee chạy bằng Web Animations API (`element.animate()`) nên CSS `animation-*` KHÔNG điều
    // khiển được nó: khối `@media (prefers-reduced-motion)` trong CarouselTicker.css không tắt
    // được marquee, việc tắt nằm ở JS trong CarouselTicker.tsx. Chỉ có đo chuyển động mới thấy.
    //
    // Kiểm CẢ HAI chiều. Nếu chỉ kiểm "đứng yên khi reduce" thì một ticker chưa bao giờ chạy, hoặc
    // một selector viết sai, cũng cho xanh. Chiều `no-preference` chứng minh phép đo thấy được
    // chuyển động, và nó cũng kiểm luôn listener `change` của matchMedia theo chiều ngược.
    const sampleTicker = () => page.evaluate(() => {
      const el = document.querySelector('.tnt-carousel-ticker-content');
      if (!el) return null;
      return { transform: getComputedStyle(el).transform, running: el.getAnimations().length };
    });

    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.waitForTimeout(700);
    const movingA = await sampleTicker();
    await page.waitForTimeout(700);
    const movingB = await sampleTicker();
    const doesMove = Boolean(movingA && movingB && movingA.transform !== movingB.transform);

    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.waitForTimeout(700);
    const stoppedA = await sampleTicker();
    await page.waitForTimeout(700);
    const stoppedB = await sampleTicker();
    const isStopped = Boolean(
      stoppedA && stoppedB && stoppedA.transform === stoppedB.transform && stoppedA.running === 0
    );

    const tickerParts = [];
    if (!movingA) tickerParts.push('không tìm thấy .tnt-carousel-ticker-content');
    if (movingA && !doesMove) tickerParts.push(`no-preference: KHÔNG chuyển động (${movingA.transform}, ${movingA.running} animation)`);
    if (stoppedA && !isStopped) tickerParts.push(`reduce: vẫn chạy (${stoppedA.transform} -> ${stoppedB.transform}, ${stoppedA.running} animation)`);
    add(`react${reactVersion}:ticker-reduced-motion-stops`, doesMove && isStopped,
      doesMove && isStopped
        ? `no-preference: transform đổi (${movingA.transform} -> ${movingB.transform}); reduce: đứng yên tại ${stoppedA.transform} và 0 animation đang chạy`
        : tickerParts.join(' | '),
      { doesMove, isStopped });

    // Đưa media về `reduce` cho phần chụp ảnh phía dưới giữ nguyên điều kiện cũ.
    await page.emulateMedia({ reducedMotion: 'reduce' });

    // Visual regression: baseline chỉ so khi đã có, và chỉ sinh trong container.
    mkdirSync(SHOTS, { recursive: true });
    for (const shot of ['ping', 'ticker', 'filetree']) {
      const file = resolve(SHOTS, `${shot}-react${reactVersion}.png`);
      const el = page.locator(`[data-shot="${shot}"]`);
      if (flags['update-snapshots'] === 'true') {
        await el.screenshot({ path: file, animations: 'disabled' });
        add(`react${reactVersion}:shot:${shot}`, true, `baseline ghi: ${shot}-react${reactVersion}.png`);
      } else if (!existsSync(file)) {
        add(`react${reactVersion}:shot:${shot}`, true, 'skip: chưa có baseline (sinh trong container trước)', { skipped: true, reason: 'no-baseline' });
      } else {
        const current = await el.screenshot({ animations: 'disabled' });
        const baseline = readFileSync(file);
        const same = Buffer.compare(current, baseline) === 0;
        add(`react${reactVersion}:shot:${shot}`, same, same ? 'ảnh khớp baseline byte-for-byte' : `ảnh khác baseline (${current.length} vs ${baseline.length} byte)`);
      }
    }

    await browser.close();
  } finally {
    server.kill('SIGTERM');
  }
}


// ---------- tinita-dom trong browser thật ----------
//
// Ba hợp đồng của `tinita-dom` chỉ quan sát được ở đây. jsdom không đủ, và một ca
// jsdom sẽ XANH GIẢ - đúng lớp lỗi "ca báo xanh mà không kiểm thứ nó nói đang kiểm"
// repo đã gặp bốn lần:
//
//   XSS           jsdom KHÔNG tải resource, nên `<img onerror>` nằm im dù dùng
//                 innerHTML. Đo 2026-10-01.
//   scrollbar     jsdom không layout, `offsetHeight` luôn 0, nên getScrollbarSize
//                 luôn ra [0, 0] bất kể OS.
//   device pixel  không có devicePixelRatio thật để nhân.
{
  const work = createConsumer({
    level: 'l4',
    name: 'dom-browser',
    deps: [],
    tarballs: [tarballFor('tinita-dom')],
    files: {
      'index.html':
        '<!doctype html><meta charset="utf-8"><body><script type="module" src="./probe.mjs"></script></body>\n',
      'probe.mjs':
        "import { isBlockLevelHtml } from './node_modules/tinita-dom/dist/html/isBlockLevelHtml.mjs';\n" +
        "import { jsonToHtml } from './node_modules/tinita-dom/dist/html/jsonToHtml.mjs';\n" +
        "import { htmlToJson } from './node_modules/tinita-dom/dist/html/htmlToJson.mjs';\n" +
        "import { getScrollbarSize } from './node_modules/tinita-dom/dist/dimension/getScrollbarSize.mjs';\n" +
        "import { toDevicePixels } from './node_modules/tinita-dom/dist/unit/toDevicePixels.mjs';\n" +
        "\n" +
        "// Payload chạy được NẾU chuỗi đi qua innerHTML: ảnh bắt đầu tải, fail, onerror chạy.\n" +
        "const PAYLOAD = '<img src=\"/does-not-exist.png\" onerror=\"window.__pwned = 1\">';\n" +
        "const result = {\n" +
        "  blockForP: isBlockLevelHtml('<p>x</p>'),\n" +
        "  blockForSpan: isBlockLevelHtml('<span>x</span>'),\n" +
        "  payloadVerdict: isBlockLevelHtml(PAYLOAD),\n" +
        "  domNodesBefore: document.querySelectorAll('*').length,\n" +
        "  escaped: jsonToHtml({ nodeName: 'div', attributes: {}, children: ['<script>alert(1)</scr' + 'ipt>'] }),\n" +
        "  roundTrip: jsonToHtml(htmlToJson('<p id=\"a\">hi</p>')),\n" +
        "  scrollbar: getScrollbarSize(),\n" +
        "  devicePixelRatio: window.devicePixelRatio,\n" +
        "  oneInchCss: toDevicePixels(1, 'in'),\n" +
        "};\n" +
        "// Cho ảnh đủ thời gian fail trước khi chốt.\n" +
        "await new Promise((r) => setTimeout(r, 600));\n" +
        "result.pwned = window.__pwned ?? null;\n" +
        "result.domNodesAfter = document.querySelectorAll('*').length;\n" +
        "window.__probe = result;\n",
    },
  });

  const MIME = { '.html': 'text/html', '.mjs': 'text/javascript', '.js': 'text/javascript', '.json': 'application/json' };
  const port = 4420;
  const statik = createServer((request, response) => {
    const path = join(work, decodeURIComponent((request.url ?? '/').split('?')[0]));
    const stream = createReadStream(path);
    stream.on('error', () => {
      response.writeHead(404).end();
    });
    stream.on('open', () => {
      response.writeHead(200, { 'content-type': MIME[extname(path)] ?? 'application/octet-stream' });
      stream.pipe(response);
    });
  });
  await new Promise((r) => statik.listen(port, '127.0.0.1', r));

  try {
    const browser = await chromium.launch();
    // deviceScaleFactor 2: dựng ra một màn hình retina để toDevicePixels có gì mà nhân.
    const page = await browser.newPage({ viewport: { width: 800, height: 600 }, deviceScaleFactor: 2 });
    const consoleErrors = [];
    page.on('pageerror', (e) => consoleErrors.push(String(e)));
    await page.goto(`http://127.0.0.1:${port}/index.html`, { waitUntil: 'networkidle' });
    await page.waitForFunction('window.__probe !== undefined', null, { timeout: 15_000 }).catch(() => undefined);
    const probe = await page.evaluate('window.__probe ?? null');

    if (!probe) {
      add('dom:probe-loaded', false, `probe không chạy: ${consoleErrors[0]?.slice(0, 200) ?? 'không rõ'}`);
    } else {
      add('dom:probe-loaded', true, `module load được qua HTTP, ${consoleErrors.length} pageerror`);

      // GUARD CHÍNH. isBlockLevelHtml dùng DOMParser, không innerHTML: tài liệu sinh
      // ra là inert nên không script nào chạy và không resource nào được fetch.
      // Phá bằng cách đổi lại về innerHTML thì ca này phải ĐỎ.
      add('dom:isBlockLevelHtml-does-not-execute', probe.pwned === null,
        probe.pwned === null
          ? 'payload <img onerror> KHÔNG chạy: window.__pwned vẫn undefined sau 600ms'
          : `XSS: window.__pwned = ${probe.pwned} - chuỗi đầu vào đã đi qua innerHTML`);

      add('dom:isBlockLevelHtml-does-not-touch-document',
        probe.domNodesBefore === probe.domNodesAfter,
        `số node trong document không đổi (${probe.domNodesBefore})`);

      add('dom:isBlockLevelHtml-classifies',
        probe.blockForP === true && probe.blockForSpan === false && probe.payloadVerdict === false,
        `p=${probe.blockForP} span=${probe.blockForSpan} img=${probe.payloadVerdict}`);

      add('dom:jsonToHtml-escapes',
        probe.escaped.includes('&lt;script&gt;') && !probe.escaped.includes('<script'),
        `serializer của DOM escape text node: ${probe.escaped.slice(0, 60)}`);

      add('dom:html-json-round-trip', probe.roundTrip === '<p id="a">hi</p>',
        `jsonToHtml(htmlToJson(x)) === x: ${probe.roundTrip}`);

      // Chỉ browser thật trả số này. Trên máy CI Linux thường là 15px, macOS overlay
      // là 0 - nên ca chỉ khẳng định HÌNH DẠNG và việc nó không âm.
      add('dom:getScrollbarSize-shape',
        Array.isArray(probe.scrollbar) && probe.scrollbar.length === 2 &&
          probe.scrollbar.every((n) => typeof n === 'number' && n >= 0),
        `[${probe.scrollbar.join(', ')}] - phụ thuộc OS, nên chỉ kiểm hình dạng`);

      // devicePixelRatio là thứ DUY NHẤT thay đổi theo màn hình. Đo 2026-10-01: probe
      // một <div> 100mm ra 378 layout px ở mọi deviceScaleFactor, nên nó không bao
      // giờ phát hiện được màn hình; đây mới là chỗ màn hình xuất hiện.
      add('dom:toDevicePixels-tracks-the-display',
        probe.devicePixelRatio === 2 && probe.oneInchCss === 192,
        `devicePixelRatio=${probe.devicePixelRatio}, toDevicePixels(1,'in')=${probe.oneInchCss} (mong đợi 2 và 192)`);
    }

    await browser.close();
  } finally {
    await new Promise((r) => statik.close(r));
  }
}

const payload = { level: 'l4', ranAt: new Date().toISOString(), wallClockMs: Date.now() - t0, inContainer: IN_CONTAINER, cases, findings };
const file = writeReport('l4', payload);
const failed = printSummary(payload);
process.stdout.write(`\nwall-clock: ${((Date.now() - t0) / 1000).toFixed(1)}s\nreport: ${file}\n`);
process.exit(failed > 0 ? EXIT.FAIL : EXIT.PASS);
