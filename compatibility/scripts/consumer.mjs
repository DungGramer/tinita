import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

import { CASES, EXIT, MANIFEST, NPM_CACHE } from './paths.mjs';

export function readManifest() {
  if (!existsSync(MANIFEST)) {
    process.stderr.write(`[consumer] thiếu ${MANIFEST} - chạy pack.mjs trước\n`);
    process.exit(EXIT.INFRA);
  }
  return JSON.parse(readFileSync(MANIFEST, 'utf8')).packages;
}

export function tarballFor(name) {
  const entry = readManifest().find((p) => p.name === name);
  if (!entry) {
    process.stderr.write(`[consumer] manifest không có ${name}\n`);
    process.exit(EXIT.INFRA);
  }
  return entry.tarball;
}

/**
 * Dựng project sạch và install tarball. Đây là CỔNG DUY NHẤT dựng consumer.
 * Fresh install là mặc định, không phải tuỳ chọn: `.work/` bị xoá mỗi lần.
 * Cache cô lập trong lab, không dùng ~/.npm - cache của máy dev che lỗi.
 * KHÔNG symlink, KHÔNG `file:` tới packages/ - symlink làm Node resolve ngược
 * lên monorepo và test pass giả (đã đo).
 */
export function createConsumer({ level, name, deps = [], tarballs = [], files = {}, pkgJson = {} }) {
  const work = resolve(CASES, level, name, '.work');
  rmSync(work, { recursive: true, force: true });
  mkdirSync(work, { recursive: true });

  writeFileSync(
    resolve(work, 'package.json'),
    `${JSON.stringify({ name: `consumer-${name}`, version: '1.0.0', private: true, ...pkgJson }, null, 2)}\n`,
  );

  for (const [rel, content] of Object.entries(files)) {
    const abs = resolve(work, rel);
    mkdirSync(dirname(abs), { recursive: true });
    writeFileSync(abs, content);
  }

  const specs = [...deps, ...tarballs];
  if (specs.length > 0) {
    execFileSync('npm', ['install', '--cache', NPM_CACHE, '--no-audit', '--no-fund', ...specs], {
      cwd: work,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
  }

  return work;
}

/** Chạy một specifier trong process con RIÊNG - một lỗi không được che specifier sau. */
export function tryLoad(cwd, specifier, mode) {
  const args =
    mode === 'require'
      ? ['-e', `require(${JSON.stringify(specifier)})`]
      : ['--input-type=module', '-e', `await import(${JSON.stringify(specifier)})`];
  try {
    const stdout = execFileSync('node', args, { cwd, encoding: 'utf8', timeout: 30_000, stdio: ['ignore', 'pipe', 'pipe'] });
    return { ok: true, code: 0, stdout, stderr: '' };
  } catch (error) {
    return { ok: false, code: error.status ?? -1, stdout: error.stdout ?? '', stderr: error.stderr ?? String(error) };
  }
}
