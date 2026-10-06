#!/usr/bin/env node
/**
 * Mọi `var(--tnt-*)` trong CSS graph của một component phải được khai TRONG chính
 * graph đó, hoặc có fallback.
 *
 * Guard này tồn tại vì repo đã ship đúng defect nó bắt. Khi CSS chuyển sang ship
 * theo component (2026-10-05), bridge `ui/<name>/index.css` cố ý KHÔNG import
 * `styles/animations.css` - lý do ghi trong bridge là "0/18 keyframes của
 * animations.css được component tham chiếu". Câu đó đúng về KEYFRAMES và sai về
 * TOKEN: `animations.css` khai 56 token, và 5 trong số đó được 3 component dùng.
 *
 * Đo 2026-10-06 trên `dist`: `ui/tree/styles.css` dùng `var(--tnt-duration-fast)`
 * x1, khai x0; `ui/tree/tokens.css` khai x0; `styles/tokens.css` khai x0. Chỗ duy
 * nhất khai là `dist/styles.css`, mà người dùng per-component được bảo là không
 * cần nhập.
 *
 * Hậu quả: `var()` không giải được làm declaration invalid at computed-value time,
 * property nhận giá trị initial. `transition` thành `all 0s`, `animation-duration`
 * thành `0s`, `opacity` thành `1`.
 *
 * Vì sao script chứ không phải review: lỗi này nằm giữa hai file khác nhau trong
 * hai thư mục khác nhau, và nó không làm gì đỏ. Cả L2 lẫn L4 đều có consumer
 * browser thật nhưng CẢ HAI đều `import 'tinita-react/styles.css'`, nên cả hai
 * tầng đều che nó - đo 2026-10-06.
 *
 * Vì sao đọc `dist` chứ không phải `src`: specifier trong bridge là BARE và giải
 * qua `exports`, nên `dist` là graph mà consumer thật nhận. Đọc `src` sẽ bỏ qua
 * đúng tầng mà lỗi sống.
 *
 * Ba thứ được kiểm trong một lần đọc graph:
 *   I6  use thiếu declaration và thiếu fallback
 *   I4  token khai trong ui/<name>/tokens.css phải khớp ^--tnt-<name>(-|$)
 *   I8  bridge không được import styles.css / styles.layer.css / globals.css /
 *       animations.css
 *   I2  graph phải chứa `ui/<name>/styles.css` của chính component, và mọi
 *       @import phải giải được qua `exports`
 *
 * I2 là phần chống xanh-oan. Không có nó thì một bridge bị xoá hết `@import` cho
 * graph rỗng -> 0 use -> guard XANH, trong khi component ship ra không có style
 * nào. Đo 2026-10-06 bằng cách xoá `@import` khỏi `dist/ui/ping/index.css`: trước
 * khi có I2, guard tụt từ 13 vấn đề xuống 12 và KHÔNG nói gì về ping.
 *
 * Nhánh `$` của I4 là bắt buộc, không phải tiện tay: `ui/ping/tokens.css` khai
 * `--tnt-ping` (khối light và khối dark), và luật `^--tnt-<name>-` thiếu nhánh đó
 * bắt oan đúng 2 khai báo ấy rồi đẩy người đọc đi rename vô cớ.
 */
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { resolve, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const PKG_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DIST = resolve(PKG_DIR, 'dist');
const pkg = JSON.parse(readFileSync(resolve(PKG_DIR, 'package.json'), 'utf8'));

/** Bridge không được kéo bốn file này - mỗi cái là token/keyframes của MỌI component. */
const FORBIDDEN = ['styles.css', 'styles.layer.css', 'styles/globals.css', 'styles/animations.css'];

/**
 * Specifier bare -> file trong `dist`, qua chính `exports`.
 *
 * Đi qua `exports` chứ không ghép đường dẫn, vì đó là thứ bundler của consumer
 * làm: một specifier không có trong `exports` là lỗi đóng gói, và nó phải hiện ra
 * ở đây dưới dạng "không giải được" chứ không phải dưới dạng file đọc không ra.
 */
function resolveSpecifier(spec) {
  if (!spec.startsWith(`${pkg.name}/`)) return null;
  const key = `./${spec.slice(pkg.name.length + 1)}`;
  const target = pkg.exports?.[key];
  if (typeof target !== 'string') return null;
  return resolve(PKG_DIR, target);
}

/**
 * Comment phải bị xoá TRƯỚC khi quét.
 *
 * Không xoá thì một comment nhắc tên token đọc ra thành use thật. Đo 2026-10-06:
 * comment trong `ui/carousel-ticker/tokens.css` ghi lại tên CŨ
 * (`var(--tnt-carousel-min-block-size)`) để giải thích lịch sử, và guard báo nó là
 * use thiếu declaration - đúng một false positive, trên đúng file vừa sửa để làm
 * guard xanh.
 */
const stripComments = (css) => css.replace(/\/\*[\s\S]*?\*\//g, '');

const IMPORT_RE = /@import\s+(?:url\(\s*)?["']([^"']+)["']/g;
const DECL_RE = /(--tnt-[a-z0-9-]+)\s*:/g;
/** Nhóm 2 bắt được dấu phẩy nghĩa là `var()` có fallback. */
const USE_RE = /var\(\s*(--tnt-[a-z0-9-]+)\s*(,)?/g;

/** Đọc graph từ một bridge, theo `@import` đệ quy. Trả về cả phần KHÔNG giải được. */
function readGraph(entryFile) {
  const files = [];
  const unresolved = [];
  const imports = [];
  const seen = new Set();
  const walk = (file) => {
    if (seen.has(file) || !existsSync(file)) return;
    seen.add(file);
    const css = stripComments(readFileSync(file, 'utf8'));
    files.push({ file, css });
    for (const m of css.matchAll(IMPORT_RE)) {
      const spec = m[1];
      imports.push({ from: file, spec });
      const target = resolveSpecifier(spec);
      if (target === null) unresolved.push({ from: file, spec });
      else walk(target);
    }
  };
  walk(entryFile);
  return { files, unresolved, imports };
}

const UI = resolve(DIST, 'ui');
const components = existsSync(UI)
  ? readdirSync(UI, { withFileTypes: true })
      .filter((e) => e.isDirectory() && existsSync(resolve(UI, e.name, 'index.css')))
      .map((e) => e.name)
      .sort()
  : [];

if (components.length === 0) {
  console.error('check-css-tokens: không thấy dist/ui/*/index.css. Chạy `pnpm build` trước.');
  process.exit(2);
}

const missing = [];
const badPrefix = [];
const forbidden = [];
const unresolvedAll = [];
const brokenGraph = [];
const rel = (f) => relative(PKG_DIR, f);

for (const name of components) {
  const bridge = resolve(DIST, 'ui', name, 'index.css');
  const { files, unresolved, imports } = readGraph(bridge);
  unresolvedAll.push(...unresolved.map((u) => ({ ...u, name })));

  // I2: graph phải kéo CSS đã compile của chính component. Thiếu nó thì mọi phán
  // quyết dưới đây chạy trên một graph không đại diện cho thứ consumer nhận.
  const ownStyles = resolve(DIST, 'ui', name, 'styles.css');
  if (existsSync(ownStyles) && !files.some((f) => f.file === ownStyles)) {
    brokenGraph.push({ name, want: rel(ownStyles), got: files.length });
  }

  const declared = new Set();
  for (const { css } of files) for (const m of css.matchAll(DECL_RE)) declared.add(m[1]);

  for (const { file, css } of files) {
    for (const m of css.matchAll(USE_RE)) {
      const [, token, hasFallback] = m;
      if (hasFallback || declared.has(token)) continue;
      missing.push({ name, token, file: rel(file) });
    }
  }

  // I4: chỉ tokens.css của CHÍNH component, không phải cả graph - token của Tree
  // nằm trong graph của FileTree là đúng theo thiết kế.
  const ownTokens = resolve(DIST, 'ui', name, 'tokens.css');
  if (existsSync(ownTokens)) {
    const ok = new RegExp(`^--tnt-${name}(-|$)`);
    const bad = new Set();
    for (const m of stripComments(readFileSync(ownTokens, 'utf8')).matchAll(DECL_RE)) {
      if (!ok.test(m[1])) bad.add(m[1]);
    }
    if (bad.size > 0) badPrefix.push({ name, tokens: [...bad].sort() });
  }

  for (const { from, spec } of imports) {
    if (FORBIDDEN.some((f) => spec === `${pkg.name}/${f}`)) forbidden.push({ name, from: rel(from), spec });
  }
}

const dedupe = (rows) => [...new Map(rows.map((r) => [`${r.name}|${r.token}|${r.file}`, r])).values()];
const missingUnique = dedupe(missing);

console.log(`check-css-tokens: ${components.length} component (${components.join(', ')})\n`);

console.log(`I6 - var() thiếu declaration và thiếu fallback: ${missingUnique.length}`);
for (const r of missingUnique) console.log(`  ${r.name.padEnd(16)} ${r.token.padEnd(32)} ${r.file}`);

console.log(`\nI4 - token sai tiền tố trong tokens.css của chính nó: ${badPrefix.length} component`);
for (const r of badPrefix) console.log(`  ${r.name.padEnd(16)} ${r.tokens.length} token: ${r.tokens.slice(0, 3).join(', ')}${r.tokens.length > 3 ? ', ...' : ''}`);

console.log(`\nI8 - bridge import file global: ${forbidden.length}`);
for (const r of forbidden) console.log(`  ${r.name.padEnd(16)} ${r.spec}  (trong ${r.from})`);

// Một graph không giải được @import của chính nó thì mọi phán quyết trên nó là vô
// nghĩa - và nó sẽ XANH vì không thấy use nào. Đây là cách guard tự tố mình.
console.log(`\n@import không giải được qua exports: ${unresolvedAll.length}`);
for (const r of unresolvedAll) console.log(`  ${r.name.padEnd(16)} ${r.spec}  (trong ${rel(r.from)})`);

console.log(`\nI2 - graph KHÔNG kéo CSS của chính component: ${brokenGraph.length}`);
for (const r of brokenGraph) console.log(`  ${r.name.padEnd(16)} thiếu ${r.want} (graph chỉ có ${r.got} file)`);

const failed =
  missingUnique.length + badPrefix.length + forbidden.length + unresolvedAll.length + brokenGraph.length;
console.log(`\n${failed === 0 ? 'OK' : `ĐỎ: ${failed} vấn đề`}`);
process.exit(failed === 0 ? 0 : 1);
