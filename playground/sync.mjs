/**
 * Pack lại `tinita-react` rồi cài đè vào playground.
 *
 * Playground cài từ TARBALL, không phải symlink workspace - symlink sẽ kéo cả `src/`
 * và devDependencies vào, tức kiểm một thứ khác với thứ người dùng thật nhận. Giá
 * phải trả là sau mỗi lần sửa library phải chạy lại script này.
 */
import { execFileSync } from 'node:child_process';
import { readdirSync, unlinkSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const PKG = resolve(HERE, '../packages/tinita-react');
const run = (cmd, args, cwd) => execFileSync(cmd, args, { cwd, stdio: 'inherit' });

for (const f of readdirSync(HERE)) if (f.endsWith('.tgz')) unlinkSync(resolve(HERE, f));
run('pnpm', ['--filter', 'tinita-react', 'build'], resolve(HERE, '..'));
run('npm', ['pack', '--pack-destination', HERE], PKG);

const tgz = readdirSync(HERE).find((f) => f.endsWith('.tgz'));
if (!tgz) throw new Error('npm pack không ra .tgz');
// `--no-save` để `package.json` giữ nguyên tên file tarball cố định.
run('npm', ['install', `./${tgz}`, '--no-save', '--no-audit', '--no-fund'], HERE);
console.log(`\n✓ đã cài lại ${tgz}. Chạy: npm run dev`);
