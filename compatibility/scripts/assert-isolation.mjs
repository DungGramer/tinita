import { createHash } from 'node:crypto';
import { existsSync, lstatSync, readFileSync, readdirSync } from 'node:fs';
import { relative, resolve } from 'node:path';

import { ARTIFACTS, EXIT, LAB, MANIFEST, REPO } from './paths.mjs';

const results = [];
const record = (id, ok, detail) => results.push({ id, ok, detail });

/** Đệ quy tìm file/dir theo predicate, bỏ qua node_modules ở tầng sâu để không quét vô tận. */
function walk(dir, onEntry, depth = 0) {
  if (!existsSync(dir) || depth > 8) return;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const abs = resolve(dir, entry.name);
    onEntry(abs, entry);
    if (entry.isDirectory() && entry.name !== '.git') walk(abs, onEntry, depth + 1);
  }
}

/** Glob của pnpm-workspace chỉ có * và **. Tự khớp thay vì grep chuỗi 'compatibility'
 *  - glob `*` cũng khớp compatibility mà không chứa chuỗi đó. */
const RE_SPECIAL = /[.+^$(){}|[\]\\]/g;

function segmentToRe(seg) {
  if (seg === '**') return '.*';
  return seg.replace(RE_SPECIAL, '\\$&').replace(/\*/g, '[^/]*');
}

function globMatchesCompatibility(pattern) {
  const clean = pattern.trim().replace(/^["']|["']$/g, '').replace(/^!/, '');
  const body = clean.split('/').map(segmentToRe).join('/');
  const re = new RegExp('^' + body + '$');
  return ['compatibility', 'compatibility/cases', 'compatibility/scripts'].some((c) => re.test(c));
}

// 1. pnpm-workspace.yaml không có glob nào khớp compatibility
{
  const wsPath = resolve(REPO, 'pnpm-workspace.yaml');
  // Không có file này = đang chạy NGOÀI monorepo (ví dụ trong container). Đó là dạng cô lập
  // mạnh nhất có thể, không phải thiếu sót - assertion này là kiểm phía host.
  if (!existsSync(wsPath)) {
    record('workspace-excludes-lab', true, 'không có pnpm-workspace.yaml - đang chạy ngoài monorepo (cô lập tuyệt đối)');
  } else {
  const raw = readFileSync(wsPath, 'utf8');
  const globs = raw.split('\n').filter((l) => /^\s*-\s/.test(l)).map((l) => l.replace(/^\s*-\s*/, ''));
  const offenders = globs.filter(globMatchesCompatibility);
  record(
    'workspace-excludes-lab',
    offenders.length === 0,
    offenders.length === 0
      ? `${globs.length} glob, không glob nào khớp compatibility: ${globs.join(', ')}`
      : `glob khớp compatibility: ${offenders.join(', ')}`,
  );
  }
}

// 2. Không tồn tại compatibility/**/node_modules/tinita* là symlink
{
  const symlinks = [];
  walk(LAB, (abs, entry) => {
    if (!/[/\\]node_modules[/\\]tinita[^/\\]*$/.test(abs)) return;
    if (entry.isSymbolicLink() || lstatSync(abs).isSymbolicLink()) symlinks.push(relative(REPO, abs));
  });
  record(
    'no-symlinked-tinita',
    symlinks.length === 0,
    symlinks.length === 0 ? 'không symlink tinita* nào trong lab' : `symlink: ${symlinks.join(', ')}`,
  );
}

// 3. Không package.json nào trong lab dùng workspace: hoặc file: trỏ packages/
{
  const offenders = [];
  walk(LAB, (abs) => {
    // CHỈ xét package.json do LAB viết. package.json bên trong bất kỳ node_modules nào là của
    // vendor - `workspace:*` trong đó là chuyện nội bộ của họ, không phải rò rỉ của lab.
    if (!abs.endsWith('package.json') || /[/\\]node_modules[/\\]/.test(abs)) return;
    const json = JSON.parse(readFileSync(abs, 'utf8'));
    for (const section of ['dependencies', 'devDependencies', 'peerDependencies', 'optionalDependencies']) {
      for (const [dep, spec] of Object.entries(json[section] ?? {})) {
        if (typeof spec !== 'string') continue;
        if (spec.startsWith('workspace:') || /^(file:|link:).*packages\//.test(spec)) {
          offenders.push(`${relative(REPO, abs)} -> ${dep}@${spec}`);
        }
      }
    }
  });
  record(
    'no-workspace-or-file-specs',
    offenders.length === 0,
    offenders.length === 0 ? 'không spec workspace:/file: nào trỏ packages/' : offenders.join(', '),
  );
}

// 4. Không có pnpm-workspace.yaml lồng trong lab
{
  const nested = [];
  walk(LAB, (abs) => {
    if (abs.endsWith('pnpm-workspace.yaml')) nested.push(relative(REPO, abs));
  });
  record('no-nested-workspace', nested.length === 0, nested.length === 0 ? 'không workspace lồng' : nested.join(', '));
}

// 5. tinita* trong node_modules của consumer phải là thư mục THẬT chứa dist/
{
  const checked = [];
  const bad = [];
  walk(LAB, (abs) => {
    if (!/[/\\]node_modules[/\\]tinita[^/\\]*$/.test(abs)) return;
    const st = lstatSync(abs);
    const hasDist = existsSync(resolve(abs, 'dist'));
    checked.push(relative(REPO, abs));
    if (st.isSymbolicLink() || !st.isDirectory() || !hasDist) bad.push(`${relative(REPO, abs)} (symlink=${st.isSymbolicLink()} dist=${hasDist})`);
  });
  record(
    'installed-tinita-is-real-dir',
    bad.length === 0,
    checked.length === 0 ? 'chưa có consumer nào cài tinita* (hợp lệ trước khi chạy ca)' : `kiểm ${checked.length}: ${bad.length === 0 ? 'đều là dir thật có dist/' : bad.join(', ')}`,
  );
}

// 6. manifest.json sha256 khớp tarball trên đĩa
{
  if (!existsSync(MANIFEST)) {
    record('manifest-sha-matches', false, `thiếu ${relative(REPO, MANIFEST)} - chạy pack.mjs trước`);
  } else {
    const entries = JSON.parse(readFileSync(MANIFEST, 'utf8')).packages;
    const bad = entries.filter((e) => {
      if (!existsSync(e.tarball)) return true;
      return createHash('sha256').update(readFileSync(e.tarball)).digest('hex') !== e.sha256;
    });
    record(
      'manifest-sha-matches',
      bad.length === 0,
      bad.length === 0 ? `${entries.length} tarball khớp sha256` : `lệch: ${bad.map((b) => b.name).join(', ')}`,
    );
  }
}

for (const r of results) {
  process.stdout.write(`${r.ok ? 'PASS' : 'FAIL'}  ${r.id.padEnd(30)} ${r.detail}\n`);
}
const failed = results.filter((r) => !r.ok);
if (failed.length > 0) {
  process.stderr.write(`\n[assert-isolation] ${failed.length}/${results.length} FAIL\n`);
  process.exit(EXIT.FAIL);
}
process.exit(EXIT.PASS);
