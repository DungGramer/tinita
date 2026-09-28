import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { chromium } from 'playwright';

import { LAB } from '../../../scripts/paths.mjs';

const FIXTURES = {
  unlayered: resolve(LAB, 'cases/l2/lib/host-fixture.html'),
  layered: resolve(LAB, 'cases/l2/lib/host-fixture-layered.html'),
};

/**
 * Mỗi bề mặt là một điều đã ĐO ĐƯỢC trong source, kèm evidence file:dòng.
 * `expected` đọc từ đây nên sau mốc M1 chỉ cần đổi 'leaks' -> 'clean', không viết lại ca.
 */
/**
 * Mỗi bề mặt kèm evidence file:dòng, và `expected` ĐO ĐƯỢC theo từng biến thể host.
 *
 * Ba điều đo được 2026-09-25 mà suy từ source KHÔNG ra:
 *
 * 1. Reset và utility của library được build vào `@layer base` / `@layer utilities` của
 *    `dist/styles.css` (dòng 47 và 113). Component CSS thì LAYERLESS.
 * 2. 22 token của `@theme inline` KHÔNG được emit vào bundle - `--color-primary` và bạn bè
 *    không tồn tại trong dist. Rò rỉ token mà tài liệu source-level khẳng định là KHÔNG CÓ THẬT.
 * 3. Yếu tố quyết định là THỨ TỰ KHAI LAYER, không phải specificity:
 *    - Host KHÔNG khai `@layer` order: layer `base` của library được khai SAU layer của host
 *      -> library thắng.
 *    - Host khai `@layer theme, base, components, utilities` trước (đúng cách Tailwind v4 làm):
 *      `@layer base` của library map vào layer `base` ĐÃ KHAI, đứng trước `components` của host
 *      -> HOST thắng.
 *    Nghĩa là consumer tự bảo vệ được bằng cách khai layer order - một cách xử lý rẻ mà tài liệu
 *    hiện chưa nêu.
 *
 * Sau mốc M1 chỉ cần đổi `expected`, không viết lại ca.
 *
 * M1 XONG 2026-09-26. Cả 11 bề mặt `clean` ở CẢ HAI chế độ. Ca vẫn giữ nguyên và
 * vẫn chạy: nó là cửa chặn hồi quy, không phải bản báo cáo một lần. Bất kỳ rule
 * nào chạm `body`, `*`, hay một class không prefix quay lại sẽ làm ca đỏ.
 */
export const LEAK_SURFACES = [
  { id: 'reset-body-bg', selector: 'body', property: 'background-color', expected: { unlayered: 'clean', layered: 'clean' }, evidence: 'ĐÃ BỊT 2026-09-26: xoá cả khối `@layer base` khỏi globals.css. Library không chạm `body` của ai' },
  { id: 'reset-body-color', selector: 'body', property: 'color', expected: { unlayered: 'clean', layered: 'clean' }, evidence: 'ĐÃ BỊT 2026-09-26: xoá khối `@layer base`' },
  { id: 'reset-star-border', selector: '#host-box', property: 'border-color', expected: { unlayered: 'clean', layered: 'clean' }, evidence: 'ĐÃ BỊT 2026-09-26: rule `* { @apply border-border }` không còn tồn tại. Trước đó vẫn clean vì `*` (0,0,0) thua `div[data-host]` (0,1,1)' },
  { id: 'token-color-primary', selector: ':root', property: '--color-primary', expected: { unlayered: 'clean', layered: 'clean' }, evidence: '@theme inline KHÔNG được emit vào dist - rò rỉ này không tồn tại' },
  { id: 'token-radius', selector: ':root', property: '--radius', expected: { unlayered: 'clean', layered: 'clean' }, evidence: '@theme inline KHÔNG được emit vào dist' },
  { id: 'token-font-sans', selector: ':root', property: '--font-sans', expected: { unlayered: 'clean', layered: 'clean' }, evidence: '@theme inline KHÔNG được emit vào dist' },
  { id: 'unprefixed-animate', selector: '#host-animate', property: 'animation-name', expected: { unlayered: 'clean', layered: 'clean' }, evidence: 'ĐÃ BỊT 2026-09-26: 27 class trần được prefix (.animate-fade-in -> .tnt-animate-fade-in), không còn trùng tên với host' },
  { id: 'unprefixed-transition', selector: '#host-transition', property: 'transition-duration', expected: { unlayered: 'clean', layered: 'clean' }, evidence: 'ĐÃ BỊT 2026-09-26: .transition-fast -> .tnt-transition-fast' },
  { id: 'unprefixed-interactive', selector: '#host-interactive', property: 'opacity', expected: { unlayered: 'clean', layered: 'clean' }, evidence: 'ĐÃ BỊT 2026-09-26: .interactive -> .tnt-interactive. Trước đó vẫn clean vì rule chỉ set will-change ở :hover' },
  { id: 'layered-base-beats-host-layer', selector: '#host-filetree-override', property: 'border-color', expected: { unlayered: 'clean', layered: 'clean' }, evidence: 'ĐÃ BỊT 2026-09-26: `*{border-color}` không còn tồn tại nên không còn phụ thuộc thứ tự khai layer của host' },
  { id: 'component-star-boxsizing', selector: '#host-ticker-child', property: 'box-sizing', expected: { unlayered: 'clean', layered: 'clean' }, evidence: 'ĐÃ BỊT 2026-09-26: `.tnt-carousel-ticker *` bỏ hẳn, box-sizing chỉ đặt trên element của chính component. Trước đó vẫn clean vì inline style của consumer thắng' },
];

/** Chạy trong trang: đọc computed style của từng bề mặt. Function thật, không phải chuỗi. */
function readSurfaces(items) {
  const out = {};
  for (const { id, selector, property } of items) {
    const el = selector === ':root' ? document.documentElement : document.querySelector(selector);
    if (!el) {
      out[id] = null;
      continue;
    }
    const cs = getComputedStyle(el);
    out[id] = property.startsWith('--') ? cs.getPropertyValue(property).trim() : cs[property];
  }
  return out;
}

/**
 * Nạp CSS của library vào trang chủ nhà rồi so computed style trước/sau.
 * Chênh nào trên element của CHỦ NHÀ là rò rỉ.
 */
export async function probeLeak({ cssPath, extraCss = '', variant = 'unlayered' }) {
  const css = readFileSync(cssPath, 'utf8') + extraCss;
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    await page.goto(`file://${FIXTURES[variant]}`);
    const before = await page.evaluate(readSurfaces, LEAK_SURFACES);
    await page.addStyleTag({ content: css });
    const after = await page.evaluate(readSurfaces, LEAK_SURFACES);

    return LEAK_SURFACES.map((s) => {
      const changed = before[s.id] !== after[s.id];
      const actual = changed ? 'leaks' : 'clean';
      const expected = s.expected[variant];
      return { ...s, variant, expected, before: before[s.id], after: after[s.id], actual, ok: actual === expected };
    });
  } finally {
    await browser.close();
  }
}

/** Đo style của component khi host KHÔNG có Tailwind - bundle không ship utility. */
export async function probeMissingUtilities({ cssPath, html }) {
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    await page.setContent(`<style>${readFileSync(cssPath, 'utf8')}</style>${html}`);
    // PHẢI await trước khi finally đóng browser, nếu không promise chưa settle đã mất page.
    const measured = await page.evaluate(() => {
      const el = document.querySelector('[data-probe="ping-root"]');
      if (!el) return null;
      const cs = getComputedStyle(el);
      return { display: cs.display, alignItems: cs.alignItems, gap: cs.gap };
    });
    return measured;
  } finally {
    await browser.close();
  }
}

/**
 * Ma trận theme: dark mode của host được tôn trọng ở MỌI vị trí, và `theme` ép được.
 *
 * Ca này sinh ra từ một bug đã đo 2026-09-28: `:root` là specificity (0,1,0) còn
 * `:where(.dark, [data-theme='dark'])` là (0,0,0), nên khi host đặt `.dark` LÊN CHÍNH
 * `<html>` thì cả hai rule khớp cùng một element và `:root` thắng - dark mode vỡ hoàn
 * toàn. Đó đúng là cách Tailwind `darkMode: 'class'` và shadcn làm, tức cấu hình phổ
 * biến nhất. Đặt `.dark` ở `<body>` hay một div bọc ngoài thì lại chạy, nên bug ẩn rất kỹ.
 *
 * Phải đo trong browser thật: jsdom không resolve custom property qua stylesheet +
 * thừa kế, nên unit test không nói được gì về ca này.
 */
export const THEME_MATRIX = [
  { id: 'html-class-dark', expect: 'dark', html: '<html class="dark"><body><div id="probe">x</div></body></html>', why: 'Tailwind darkMode:class và shadcn đặt .dark lên <html>' },
  { id: 'html-attr-dark', expect: 'dark', html: '<html data-theme="dark"><body><div id="probe">x</div></body></html>', why: 'quy ước data-theme ở root' },
  { id: 'body-class-dark', expect: 'dark', html: '<html><body class="dark"><div id="probe">x</div></body></html>', why: 'dark ở body' },
  { id: 'wrapper-class-dark', expect: 'dark', html: '<html><body><div class="dark"><div id="probe">x</div></div></body></html>', why: 'dark ở div bọc ngoài' },
  { id: 'force-light-inside-dark', expect: 'light', html: '<html class="dark"><body><div id="probe" data-theme="light">x</div></body></html>', why: 'theme="light" phải ÉP được sáng bên trong host dark' },
  { id: 'force-dark-inside-light', expect: 'dark', html: '<html><body><div id="probe" data-theme="dark">x</div></body></html>', why: 'theme="dark" phải ép được tối' },
  { id: 'no-theme', expect: 'light', html: '<html><body><div id="probe">x</div></body></html>', why: 'mặc định là sáng' },
];

export async function probeTheme({ cssPath }) {
  const css = readFileSync(cssPath, 'utf8');
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    const rows = [];
    for (const item of THEME_MATRIX) {
      await page.setContent(item.html);
      await page.addStyleTag({ content: css });
      const measured = await page.evaluate(() => {
        const cs = getComputedStyle(document.getElementById('probe'));
        return {
          background: cs.getPropertyValue('--tnt-background').trim(),
          filetree: cs.getPropertyValue('--tnt-filetree-bg').trim(),
        };
      });
      // So bằng GIÁ TRỊ TOKEN, không bằng tên rule. Rule đổi tên thì ca vẫn đúng.
      const actual =
        measured.background === '#0a0a0a' ? 'dark' : measured.background === '#ffffff' ? 'light' : `?${measured.background}`;
      rows.push({ ...item, actual, ok: actual === item.expect, measured });
    }
    return rows;
  } finally {
    await browser.close();
  }
}
