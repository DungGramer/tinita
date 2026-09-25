import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { EXIT, LAB, PACKAGES, REPO } from '../../scripts/paths.mjs';
import { createConsumer, tarballFor, tryLoad } from '../../scripts/consumer.mjs';
import { printSummary, writeReport } from '../../scripts/report.mjs';

const contract = JSON.parse(readFileSync(resolve(LAB, 'contract.json'), 'utf8')).packages;
const cases = [];
const findings = [];
const add = (id, ok, detail, extra = {}) => cases.push({ id, ok, detail, ...extra });

const npx = (args, cwd = LAB) => {
  try {
    return { code: 0, out: execFileSync('npx', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }) };
  } catch (error) {
    return { code: error.status ?? -1, out: `${error.stdout ?? ''}${error.stderr ?? ''}` };
  }
};

// ---------- 01 publint ----------
for (const { name, dir } of PACKAGES) {
  const { code, out } = npx(['publint', '--pack', 'npm', dir]);
  const errorLines = out.split('\n').filter((l) => /but the file does not exist|is not exported|is invalid/.test(l));
  const accepted = contract[name].accepted.filter((a) => a.tool === 'publint');
  const ok = errorLines.length === 0;
  add(`01-publint:${name}`, ok, ok ? `không Errors (${accepted.length} accepted)` : `${errorLines.length} Errors: ${errorLines[0]?.trim()}`, { raw: out.trim(), exit: code });
}

// ---------- 02 attw ----------
for (const { name, dir } of PACKAGES) {
  const { out } = npx(['attw', '--pack', dir, '--format', 'table-flipped']);
  const problems = new Set();
  if (/Masquerading as CJS/.test(out)) problems.add('FalseCJS');
  if (/Resolution failed|failed to resolve/.test(out)) problems.add('NoResolution');
  const acceptedProblems = new Set(contract[name].accepted.filter((a) => a.tool === 'attw').map((a) => a.problem));
  const unexpected = [...problems].filter((p) => !acceptedProblems.has(p));
  const ok = unexpected.length === 0;
  add(`02-attw:${name}`, ok, ok ? `vấn đề: ${[...problems].join(', ') || 'không'} (đều trong allowlist)` : `NGOÀI allowlist: ${unexpected.join(', ')}`, { raw: out.trim() });
  for (const p of problems) {
    if (acceptedProblems.has(p)) findings.push({ id: `attw:${name}:${p}`, detail: contract[name].accepted.find((a) => a.problem === p).reason, assignedTo: 'pha 06' });
  }
}

// ---------- 03 smoke: từng specifier × require + import ----------
{
  const work = createConsumer({
    level: 'l1',
    name: '03-smoke',
    deps: ['react@19'],
    tarballs: PACKAGES.map((p) => tarballFor(p.name)),
  });
  const peers = contract['tinita-react'].optionalPeers;
  let total = 0;
  const failures = [];
  for (const { name } of PACKAGES) {
    for (const spec of contract[name].specifiers) {
      const full = spec === '.' ? name : `${name}${spec.slice(1)}`;
      // Specifier cần optional peer thì bỏ ở ca này - ca 04 phụ trách.
      if ((peers[spec] ?? []).length > 0 && name === 'tinita-react') continue;
      for (const mode of ['require', 'import']) {
        total += 1;
        const r = tryLoad(work, full, mode);
        if (!r.ok) failures.push(`${full} (${mode}) exit=${r.code}: ${r.stderr.split('\n').find((l) => /Error|error/.test(l))?.trim() ?? ''}`);
      }
    }
  }
  add('03-smoke-cjs-esm', failures.length === 0, `${total} lần thực thi${failures.length ? `, fail: ${failures.join(' | ')}` : ', đều load được'}`, { executions: total });
}

// ---------- 04 optional peer ----------
{
  const tgz = tarballFor('tinita-react');
  const specs = Object.entries(contract['tinita-react'].optionalPeers);
  const withoutPeers = createConsumer({ level: 'l1', name: '04-peer-absent', deps: ['react@19'], tarballs: [tgz] });
  const withPeers = createConsumer({
    level: 'l1',
    name: '04-peer-present',
    deps: ['react@19', '@radix-ui/react-accordion', 'lucide-react'],
    tarballs: [tgz],
  });

  const installed = execFileSync('/bin/ls', [resolve(withoutPeers, 'node_modules')], { encoding: 'utf8' })
    .split('\n').filter((x) => x && !x.startsWith('.'));
  const cleanEnv = installed.length === 2 && installed.includes('react') && installed.includes('tinita-react');
  add('04a-consumer-is-clean', cleanEnv, `node_modules: ${installed.join(', ')}`);

  const rows = [];
  let bad = 0;
  for (const [spec, needed] of specs) {
    const full = `tinita-react${spec.slice(1)}`;
    const absent = tryLoad(withoutPeers, full, 'require');
    const present = tryLoad(withPeers, full, 'require');
    const expectAbsentOk = needed.length === 0;
    const absentOk = absent.ok === expectAbsentOk;
    // Thiếu peer thì lỗi phải NÊU TÊN module thiếu, không chỉ fail chung chung.
    const namesMissing = expectAbsentOk || needed.some((n) => absent.stderr.includes(n));
    const presentOk = present.ok;
    if (!absentOk || !namesMissing || !presentOk) bad += 1;
    rows.push({ specifier: full, needs: needed, absentExit: absent.code, presentExit: present.code, namesMissingModule: namesMissing });
  }
  add('04b-optional-peer-matrix', bad === 0, `${rows.length} đường nhập × 2 trạng thái${bad ? `, ${bad} sai` : ', đúng hết'}`, { matrix: rows });

  const warned = /peer/i.test(readFileSync(resolve(withoutPeers, 'package.json'), 'utf8')) === false;
  findings.push({ id: 'npm-silent-on-optional-peer', detail: 'npm KHÔNG cài và KHÔNG cảnh báo optional peer thiếu - vì vậy bảng component -> peer trong README/docs là bắt buộc, không phải trang trí', assignedTo: 'docs' });
}

// ---------- 05 contract drift (hai chiều) ----------
for (const { name, dir } of PACKAGES) {
  const exportsMap = JSON.parse(readFileSync(resolve(dir, 'package.json'), 'utf8')).exports ?? {};
  const inExports = Object.keys(exportsMap);
  const declared = [...contract[name].specifiers, ...(contract[name].cssSpecifiers ?? [])];
  const missingFromExports = declared.filter((s) => !inExports.includes(s));
  const missingFromContract = inExports.filter((s) => !declared.includes(s));
  const ok = missingFromExports.length === 0 && missingFromContract.length === 0;
  const parts = [];
  if (missingFromExports.length) parts.push(`contract có nhưng exports thiếu: ${missingFromExports.join(', ')}`);
  if (missingFromContract.length) parts.push(`exports có nhưng contract thiếu: ${missingFromContract.join(', ')}`);
  add(`05-contract-drift:${name}`, ok, ok ? `${declared.length} specifier khớp hai chiều` : parts.join(' | '));
  for (const d of contract[name].documentedButMissing ?? []) {
    findings.push({ id: `documented-but-missing:${name}${d.specifier}`, detail: `${d.note} (nguồn: ${d.documentedIn})`, assignedTo: 'pha 06' });
  }
}

// ---------- 06 artifact shape ----------
for (const { name } of PACKAGES) {
  const tgz = tarballFor(name);
  const listing = execFileSync('tar', ['-tzf', tgz], { encoding: 'utf8' })
    .split('\n').filter(Boolean).map((l) => l.replace(/^package\//, ''));
  const missing = contract[name].requiredFiles.filter((f) => !listing.includes(f));
  const forbidden = contract[name].forbiddenFiles.filter((f) => listing.some((l) => l === f || l.startsWith(`${f}/`)));
  const ok = missing.length === 0 && forbidden.length === 0;
  const parts = [];
  if (missing.length) parts.push(`thiếu: ${missing.join(', ')}`);
  if (forbidden.length) parts.push(`có file không được ship: ${forbidden.join(', ')}`);
  add(`06-artifact-shape:${name}`, ok, ok ? `${listing.length} entry, đủ ${contract[name].requiredFiles.length} file bắt buộc, không file cấm` : parts.join(' | '));
}

// ---------- 07 registry vs local ----------
// publint KHÔNG nhận package spec (`publint tinita@0.0.1` bị bỏ qua và cho xanh giả - đã gặp).
// Phải tải tarball thật rồi giải nén, sau đó kiểm trên thư mục đã giải nén.
{
  const online = (() => { try { execFileSync('npm', ['ping'], { stdio: 'ignore', timeout: 15_000 }); return true; } catch { return false; } })();
  if (!online) {
    add('07-registry-vs-local', true, 'skip: không có mạng', { skipped: true, reason: 'no-network' });
  } else {
    const { mkdtempSync } = await import('node:fs');
    const { tmpdir } = await import('node:os');
    const results = [];
    for (const { name, dir } of PACKAGES) {
      const version = JSON.parse(readFileSync(resolve(dir, 'package.json'), 'utf8')).version;
      const tmp = mkdtempSync(resolve(tmpdir(), `reg-${name}-`));
      let pulled;
      try {
        pulled = execFileSync('npm', ['pack', `${name}@${version}`, '--pack-destination', tmp], { encoding: 'utf8' }).trim().split('\n').pop();
      } catch {
        results.push({ name, version, status: 'not-published' });
        continue;
      }
      const tgz = resolve(tmp, pulled);
      execFileSync('tar', ['-xzf', tgz, '-C', tmp]);
      const root = resolve(tmp, 'package');
      const pkg = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8'));

      // Đối chiếu MỌI đường dẫn trong exports/main/module/types với file thật trong tarball.
      const paths = [];
      for (const key of ['main', 'module', 'types', 'style']) if (pkg[key]) paths.push([key, pkg[key]]);
      for (const [sub, val] of Object.entries(pkg.exports ?? {})) {
        if (typeof val === 'string') paths.push([`exports["${sub}"]`, val]);
        else for (const [cond, p] of Object.entries(val)) paths.push([`exports["${sub}"].${cond}`, p]);
      }
      const brokenPaths = paths.filter(([, p]) => !existsSync(resolve(root, p.replace(/^\.\//, ''))));
      results.push({ name, version, status: 'published', total: paths.length, broken: brokenPaths.map(([k, p]) => `${k} -> ${p}`) });
    }

    const anyBroken = results.filter((r) => r.status === 'published' && r.broken.length > 0);
    const summary = results.map((r) => r.status === 'published' ? `${r.name}@${r.version}: ${r.broken.length}/${r.total} gãy` : `${r.name}@${r.version}: chưa publish`).join(' | ');
    add('07-registry-vs-local', anyBroken.length === 0, summary, {
      expectedFailure: anyBroken.length > 0,
      registry: results,
    });
    for (const r of anyBroken) {
      findings.push({
        id: `published-broken:${r.name}@${r.version}`,
        detail: `Bản ĐÃ PUBLISH có ${r.broken.length}/${r.total} đường dẫn trỏ file không tồn tại trong tarball: ${r.broken.join(', ')}. Đầu vào cho QĐ-1 của owner (bump / deprecate / publish bản vá).`,
        assignedTo: 'pha 06 QĐ-1',
      });
    }
  }
}

const payload = { level: 'l1', ranAt: new Date().toISOString(), cases, findings };
const file = writeReport('l1', payload);
const failed = printSummary(payload);
process.stdout.write(`report: ${file}\n`);
process.exit(failed > 0 ? EXIT.FAIL : EXIT.PASS);
