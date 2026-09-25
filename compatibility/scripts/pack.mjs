import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { readdir } from 'node:fs/promises';
import { resolve } from 'node:path';

import { ARTIFACTS, EXIT, MANIFEST, PACKAGES, REPO } from './paths.mjs';

const sha256 = (file) => createHash('sha256').update(readFileSync(file)).digest('hex');

function run(cmd, args, cwd) {
  return execFileSync(cmd, args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
}

/** File phải tồn tại trong dist sau build, nếu thiếu thì build im lặng không đủ. */
const REQUIRED_DIST = {
  tinita: ['dist/index.mjs', 'dist/index.cjs', 'dist/index.d.ts'],
  'tinita-react': [
    'dist/index.mjs',
    'dist/index.cjs',
    'dist/styles.css',
    'dist/styles/globals.css',
    'dist/styles/animations.css',
    'dist/ui/file-tree/index.mjs',
    'dist/ui/file-tree/index.cjs',
  ],
};

async function main() {
  const startedAt = Date.now();
  rmSync(ARTIFACTS, { recursive: true, force: true });
  mkdirSync(ARTIFACTS, { recursive: true });

  const entries = [];

  for (const pkg of PACKAGES) {
    process.stdout.write(`\n[pack] ${pkg.name}: build\n`);
    try {
      run('pnpm', ['--filter', pkg.name, 'build'], REPO);
    } catch (error) {
      process.stderr.write(`[pack] build FAILED for ${pkg.name}\n${error.stdout ?? ''}${error.stderr ?? ''}\n`);
      process.exit(EXIT.INFRA);
    }

    // Build phải sinh dist MỚI, không dùng lại dist cũ từ cache.
    for (const rel of REQUIRED_DIST[pkg.name]) {
      const abs = resolve(pkg.dir, rel);
      if (!existsSync(abs)) {
        process.stderr.write(`[pack] ${pkg.name}: thiếu ${rel} sau build\n`);
        process.exit(EXIT.INFRA);
      }
      if (statSync(abs).mtimeMs < startedAt) {
        process.stderr.write(`[pack] ${pkg.name}: ${rel} cũ hơn lúc bắt đầu build - dist stale\n`);
        process.exit(EXIT.INFRA);
      }
    }

    process.stdout.write(`[pack] ${pkg.name}: npm pack\n`);
    run('npm', ['pack', '--pack-destination', ARTIFACTS], pkg.dir);

    const files = await readdir(ARTIFACTS);
    const prefix = `${pkg.name}-`;
    const tgz = files.find((f) => f.startsWith(prefix) && f.endsWith('.tgz'));
    if (!tgz) {
      process.stderr.write(`[pack] ${pkg.name}: npm pack không sinh tarball\n`);
      process.exit(EXIT.INFRA);
    }

    const manifestVersion = JSON.parse(readFileSync(resolve(pkg.dir, 'package.json'), 'utf8')).version;
    const tarball = resolve(ARTIFACTS, tgz);
    entries.push({
      name: pkg.name,
      version: manifestVersion,
      tarball,
      sha256: sha256(tarball),
      packedAt: new Date().toISOString(),
    });
    process.stdout.write(`[pack] ${pkg.name}@${manifestVersion} -> ${tgz}\n`);
  }

  writeFileSync(MANIFEST, `${JSON.stringify({ packages: entries }, null, 2)}\n`);
  process.stdout.write(`\n[pack] manifest: ${MANIFEST}\n`);
  process.exit(EXIT.PASS);
}

main().catch((error) => {
  process.stderr.write(`[pack] ${error.stack}\n`);
  process.exit(EXIT.INFRA);
});
