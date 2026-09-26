#!/usr/bin/env node
/**
 * Mọi thứ publish ra từ `tinita-react` và `tinita-dom` phải có story.
 *
 * Quy tắc này vô nghĩa nếu không ai kiểm: thêm component mới rồi quên story là
 * chuyện sẽ xảy ra, và không có gì báo. Ca này chạy trong cổng local
 * (`pnpm gate`) và đọc `exports` của package chứ không đọc thư mục - đúng thứ
 * người dùng nhìn thấy.
 *
 * Khớp theo TÊN, không theo đường dẫn: story nằm ở
 * `apps/storybook/stories/<Bất kỳ>/<Bất kỳ>.stories.tsx` và chỉ cần import đúng
 * specifier. Ràng theo đường dẫn thì đổi tên thư mục là vỡ mà chẳng vì lý do gì.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const STORIES = resolve(ROOT, 'apps/storybook/stories');

/** Subpath KHÔNG cần story: file CSS, barrel, và hook/util không có mặt nhìn được. */
const EXEMPT = {
  'tinita-react': ['.', './hooks/useToggle', './utils/autoInjectStyles'],
  'tinita-dom': ['.'],
};

function collect(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = resolve(dir, entry);
    if (statSync(full).isDirectory()) out.push(...collect(full));
    else if (entry.endsWith('.stories.tsx') || entry.endsWith('.stories.ts')) out.push(full);
  }
  return out;
}

const storyFiles = collect(STORIES);
const storySource = storyFiles.map((f) => readFileSync(f, 'utf8')).join('\n');

const missing = [];
let checked = 0;

for (const pkg of ['tinita-react', 'tinita-dom']) {
  const manifest = JSON.parse(readFileSync(resolve(ROOT, 'packages', pkg, 'package.json'), 'utf8'));
  for (const key of Object.keys(manifest.exports ?? {})) {
    if (key.endsWith('.css')) continue;
    if (EXEMPT[pkg].includes(key)) continue;
    checked += 1;
    const specifier = key === '.' ? pkg : `${pkg}/${key.slice(2)}`;
    if (!storySource.includes(`'${specifier}'`) && !storySource.includes(`"${specifier}"`)) {
      missing.push(specifier);
    }
  }
}

if (missing.length) {
  process.stderr.write(
    `FAIL check-stories: ${missing.length}/${checked} subpath không có story nào import nó:\n` +
      missing.map((m) => `  - ${m}\n`).join('') +
      `\nThêm story vào apps/storybook/stories/<Tên>/<Tên>.stories.tsx, hoặc thêm vào EXEMPT ` +
      `trong scripts/check-stories.mjs KÈM lý do nếu nó thật sự không có mặt nhìn được.\n`
  );
  process.exit(1);
}

process.stdout.write(
  `PASS check-stories: ${checked} subpath đều có story (${storyFiles.length} file story)\n`
);
