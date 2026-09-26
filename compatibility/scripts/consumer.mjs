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

/** Yarn 4 dùng cho cell PnP. Phải pin: resolver đổi giữa các minor. */
export const YARN_PNP_VERSION = '4.5.0';

/**
 * corepack mặc định tải yarn từ `repo.yarnpkg.com`, và máy này không tới được nó:
 * `UNABLE_TO_GET_ISSUER_CERT_LOCALLY` (đo 2026-09-26, TLS bị chặn giữa đường).
 * `COREPACK_NPM_REGISTRY` bắt nó lấy qua npm registry - đường mà `npm install` đã
 * đi được. Cùng cách vá đã dùng trong docker/node.Dockerfile.
 */
function corepackEnv() {
  if (process.env.COREPACK_NPM_REGISTRY) return process.env;
  return { ...process.env, COREPACK_NPM_REGISTRY: 'https://registry.npmjs.org/' };
}

/**
 * Dựng project sạch và install tarball. Đây là CỔNG DUY NHẤT dựng consumer.
 * Fresh install là mặc định, không phải tuỳ chọn: `.work/` bị xoá mỗi lần.
 * Cache cô lập trong lab, không dùng ~/.npm - cache của máy dev che lỗi.
 * KHÔNG symlink, KHÔNG `file:` tới packages/ - symlink làm Node resolve ngược
 * lên monorepo và test pass giả (đã đo).
 *
 * `pm`: `'npm'` (mặc định) hoặc `'yarn-pnp'`. `LAB_CONSUMER_PM` ghi đè, để
 * docker/entry.sh chọn theo cell mà không phải sửa từng ca.
 *
 * Với `yarn-pnp` KHÔNG có `node_modules` nào - resolver đọc `.pnp.cjs`. Đó là lý
 * do duy nhất cell này tồn tại: nó bắt phantom dependency mà npm và pnpm bỏ qua.
 */
export function createConsumer({ level, name, deps = [], tarballs = [], files = {}, pkgJson = {}, pm }) {
  const manager = pm ?? process.env.LAB_CONSUMER_PM ?? 'npm';
  const work = resolve(CASES, level, name, '.work');
  rmSync(work, { recursive: true, force: true });
  mkdirSync(work, { recursive: true });

  const base = { name: `consumer-${name}`, version: '1.0.0', private: true, ...pkgJson };
  if (manager === 'yarn-pnp') base.packageManager = `yarn@${YARN_PNP_VERSION}`;

  writeFileSync(resolve(work, 'package.json'), `${JSON.stringify(base, null, 2)}\n`);

  if (manager === 'yarn-pnp') {
    // `pnpEnableEsmLoader: true` là BẮT BUỘC và phải khai tường minh. Yarn chỉ bật
    // ESM loader khi nó TỰ phát hiện ESM lúc install; consumer của lab ghi file
    // `.mjs` sau install nên nó không phát hiện được, và mọi `import` đều
    // ERR_MODULE_NOT_FOUND trong khi `require` thì chạy. Đo được 2026-09-26.
    writeFileSync(
      resolve(work, '.yarnrc.yml'),
      [
        'nodeLinker: pnp',
        'pnpEnableEsmLoader: true',
        'enableGlobalCache: false',
        'cacheFolder: ./.yarn/cache',
        'enableTelemetry: false',
        '',
      ].join('\n'),
    );
    // `yarn.lock` rỗng làm thư mục này thành PROJECT ROOT của yarn. Không có nó,
    // yarn đi ngược lên và thấy monorepo: `Usage Error: The nearest package
    // directory ... doesn't seem to be part of the project`. Consumer của lab nằm
    // trong `compatibility/cases/`, tức luôn có monorepo ở phía trên.
    writeFileSync(resolve(work, 'yarn.lock'), '');
  }

  for (const [rel, content] of Object.entries(files)) {
    const abs = resolve(work, rel);
    mkdirSync(dirname(abs), { recursive: true });
    writeFileSync(abs, content);
  }

  const specs = [...deps, ...tarballs];
  if (specs.length > 0) {
    if (manager === 'yarn-pnp') {
      execFileSync('corepack', ['yarn', 'add', ...specs], {
        cwd: work,
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
        env: corepackEnv(),
        timeout: 600_000,
      });
    } else {
      execFileSync('npm', ['install', '--cache', NPM_CACHE, '--no-audit', '--no-fund', ...specs], {
        cwd: work,
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
      });
    }
  }

  return work;
}

/**
 * Chứng minh consumer THẬT SỰ đang ở chế độ PnP.
 *
 * Không có ca này thì cell yarn-pnp xanh mà chẳng kiểm PnP: nếu `yarn add` âm thầm
 * rơi về nodeLinker `node-modules`, mọi specifier vẫn load được qua resolver
 * thường và không ai biết. Đó đúng là trạng thái của cell này trước 2026-09-26.
 */
export function assertPnpShape(work) {
  const hasNodeModules = existsSync(resolve(work, 'node_modules'));
  const hasPnpFile = existsSync(resolve(work, '.pnp.cjs'));
  return {
    ok: !hasNodeModules && hasPnpFile,
    hasNodeModules,
    hasPnpFile,
    detail: `node_modules: ${hasNodeModules ? 'CÓ (không phải PnP)' : 'không'}; .pnp.cjs: ${hasPnpFile ? 'có' : 'THIẾU'}`,
  };
}

/**
 * Chạy một specifier trong process con RIÊNG - một lỗi không được che specifier sau.
 *
 * `pm = 'yarn-pnp'` đi qua `corepack yarn node <file>`, và phải là FILE chứ không
 * phải `-e`: PnP resolve ESM theo URL của module cha, còn `--input-type=module -e`
 * không có cha nào. Đo được 2026-09-26: `yarn node -e "await import(...)"` cho
 * ERR_MODULE_NOT_FOUND trong khi cùng code trong `.mjs` thì chạy.
 */
export function tryLoad(cwd, specifier, mode, pm) {
  const manager = pm ?? process.env.LAB_CONSUMER_PM ?? 'npm';

  if (manager === 'yarn-pnp') {
    const stamp = `${mode}-${specifier.replace(/[^a-zA-Z0-9]+/g, '-')}`;
    const file = resolve(cwd, `.lab-probe-${stamp}.${mode === 'require' ? 'cjs' : 'mjs'}`);
    writeFileSync(
      file,
      mode === 'require'
        ? `require(${JSON.stringify(specifier)});\n`
        : `await import(${JSON.stringify(specifier)});\n`,
    );
    try {
      const stdout = execFileSync('corepack', ['yarn', 'node', file], {
        cwd,
        encoding: 'utf8',
        timeout: 60_000,
        stdio: ['ignore', 'pipe', 'pipe'],
        env: corepackEnv(),
      });
      return { ok: true, code: 0, stdout, stderr: '' };
    } catch (error) {
      return { ok: false, code: error.status ?? -1, stdout: error.stdout ?? '', stderr: error.stderr ?? String(error) };
    }
  }

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
