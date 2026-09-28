#!/usr/bin/env node
/**
 * Build storybook rồi deploy lên `tinita.vercel.app`.
 *
 *   pnpm deploy:storybook            production
 *   pnpm deploy:storybook --preview  preview URL, không đụng tinita.vercel.app
 *
 * VÌ SAO LÀ SCRIPT CHỨ KHÔNG PHẢI MỘT DÒNG TRONG package.json: có một bước BẮT BUỘC
 * không được quên. `vercel link` ghi `.env.local` chứa `VERCEL_OIDC_TOKEN` vào thư mục
 * đang được deploy, và đây là static site - mọi file trong đó được serve CÔNG KHAI.
 * Không xoá thì `https://tinita.vercel.app/.env.local` trả về token. Đo được
 * 2026-09-28 khi link lần đầu.
 *
 * Link `.vercel` nằm TRONG `storybook-static` nên nó bị xoá mỗi lần build lại. Vì vậy
 * script link lại mỗi lần chạy - `--yes` làm việc đó idempotent.
 *
 * Đây là deploy TĨNH, không nối git. Nối git thì production alias serve branch
 * production (mặc định `main`), mà `main` hiện đang ở trước toàn bộ công việc này -
 * sẽ publish một storybook cũ. Nối git là quyết định riêng, và nó cần chọn giữa đổi
 * production branch hay merge vào `main` trước.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = resolve(ROOT, 'apps/storybook/storybook-static');
const SCOPE = 'dunggramers-projects';
const PROJECT = 'tinita';

const preview = process.argv.includes('--preview');

/** File `vercel link` tự sinh mà KHÔNG được upload. */
const MUST_NOT_SHIP = ['.env.local', '.env', '.gitignore'];

const run = (cmd, args, cwd = ROOT) =>
  execFileSync(cmd, args, { cwd, stdio: 'inherit', encoding: 'utf8' });

process.stdout.write('\n=== 1/4 build package (storybook đọc dist, không đọc src) ===\n');
run('pnpm', ['build']);

process.stdout.write('\n=== 2/4 build storybook ===\n');
rmSync(OUT, { recursive: true, force: true });
run('pnpm', ['--filter=@tinita/storybook', 'exec', 'storybook', 'build']);

if (!existsSync(resolve(OUT, 'index.html'))) {
  process.stderr.write('\nFAIL: không có storybook-static/index.html sau khi build\n');
  process.exit(1);
}

process.stdout.write('\n=== 3/4 link project + dọn file không được ship ===\n');
run('npx', ['vercel', 'link', '--yes', '--project', PROJECT, '--scope', SCOPE], OUT);

writeFileSync(
  resolve(OUT, '.vercelignore'),
  [
    '# Static site: mọi file ở đây được serve công khai.',
    '# `.env.local` do `vercel link` sinh ra và chứa VERCEL_OIDC_TOKEN.',
    '.env*',
    '.vercel',
    '.gitignore',
    '',
  ].join('\n')
);

const removed = [];
for (const name of MUST_NOT_SHIP) {
  const path = resolve(OUT, name);
  if (existsSync(path)) {
    rmSync(path, { force: true });
    removed.push(name);
  }
}
process.stdout.write(`  đã xoá khỏi output: ${removed.join(', ') || '(không có gì)'}\n`);

// Cửa chặn: thà dừng còn hơn publish một token.
const stillThere = MUST_NOT_SHIP.filter((n) => existsSync(resolve(OUT, n)));
if (stillThere.length) {
  process.stderr.write(`\nFAIL: còn file không được ship trong output: ${stillThere.join(', ')}\n`);
  process.exit(1);
}

process.stdout.write(`\n=== 4/4 deploy (${preview ? 'preview' : 'production'}) ===\n`);
run(
  'npx',
  ['vercel', 'deploy', ...(preview ? [] : ['--prod']), '--yes', '--scope', SCOPE],
  OUT
);

process.stdout.write(
  preview
    ? '\nXong. URL preview ở trên.\n'
    : '\nXong: https://tinita.vercel.app\n\nKiểm nhanh:\n  curl -s -o /dev/null -w "%{http_code}\\n" https://tinita.vercel.app/.env.local   # phải 404\n'
);
