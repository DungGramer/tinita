import { execFileSync, spawn } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { EXIT, LAB } from '../../scripts/paths.mjs';
import { createConsumer, tarballFor } from '../../scripts/consumer.mjs';
import { printSummary, writeReport } from '../../scripts/report.mjs';

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
    deps: [`react@${reactVersion}`, `react-dom@${reactVersion}`, 'next@15', '@radix-ui/react-accordion', 'lucide-react'],
    tarballs: [tarballFor('tinita-react')],
    files: {
      'next.config.mjs': 'export default { eslint: { ignoreDuringBuilds: true }, typescript: { ignoreBuildErrors: true } };\n',
      'app/layout.tsx':
        "import 'tinita-react/styles.css';\n" +
        'export default function L({ children }: { children: React.ReactNode }) {\n' +
        '  return (<html lang="en"><body style={{ margin: 0, padding: 16 }}>{children}</body></html>);\n}\n',
      'app/page.tsx':
        "'use client';\n" +
        "import { FileTree } from 'tinita-react/ui/file-tree';\n" +
        "import { Ping } from 'tinita-react/ui/ping';\n" +
        "import { CarouselTicker } from 'tinita-react/ui/carousel-ticker';\n\n" +
        "const TREE = ['src', '  index.ts', '  ui', '    button.tsx', 'README.md'].join('\\n');\n\n" +
        'export default function Page() {\n' +
        '  return (<main><div data-shot="ping"><Ping count={3} /></div>' +
        '<div data-shot="ticker" style={{ width: 300 }}><CarouselTicker><span>alpha</span></CarouselTicker></div>' +
        '<div data-shot="filetree"><FileTree text={TREE} /></div></main>);\n}\n',
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
    // Đây là hành vi HIỆN TẠI được chốt lại, không phải điều mong muốn. Sau mốc M1 (scope khối
    // reduced-motion) thì overridden phải thành false và ca này sẽ đỏ -> lúc đó đảo assertion.
    add(`react${reactVersion}:reduced-motion-scope`, overridden === true,
      `element chủ nhà: đặt ${asked}, đo được ${got}${overridden ? ' -> khối !important của library ĐÈ lên element KHÔNG thuộc library' : ' -> không bị đè'}`,
      { leaks: overridden, measured: rm });
    if (overridden) {
      findings.push({
        id: 'reduced-motion-unscoped',
        detail: `animations.css khối \`@media (prefers-reduced-motion: reduce)\` dùng \`*, *::before, *::after { ... !important }\` không scope. Đo được: element của chủ nhà đặt ${asked} nhưng nhận ${got}.`,
        assignedTo: 'roadmap M1',
      });
    }

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
      const el = document.querySelector('.tinita-carousel-ticker__content');
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
    if (!movingA) tickerParts.push('không tìm thấy .tinita-carousel-ticker__content');
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

const payload = { level: 'l4', ranAt: new Date().toISOString(), wallClockMs: Date.now() - t0, inContainer: IN_CONTAINER, cases, findings };
const file = writeReport('l4', payload);
const failed = printSummary(payload);
process.stdout.write(`\nwall-clock: ${((Date.now() - t0) / 1000).toFixed(1)}s\nreport: ${file}\n`);
process.exit(failed > 0 ? EXIT.FAIL : EXIT.PASS);
