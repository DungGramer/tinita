import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));

/** Lab luôn tự định vị từ vị trí file, không từ cwd - runner phải chạy được từ mọi cwd. */
export const LAB = resolve(here, '..');
export const REPO = resolve(LAB, '..');
export const ARTIFACTS = resolve(LAB, '.artifacts');
export const NPM_CACHE = resolve(LAB, '.npm-cache');
export const REPORTS = resolve(LAB, '.reports');
export const CASES = resolve(LAB, 'cases');
export const MANIFEST = resolve(ARTIFACTS, 'manifest.json');

/** 2 package được lab kiểm. Thứ tự cố định để report tái lập được. */
export const PACKAGES = [
  { name: 'tinita', dir: resolve(REPO, 'packages/tinita') },
  { name: 'tinita-react', dir: resolve(REPO, 'packages/tinita-react') },
];

/** Exit code hợp đồng - CI xử lý "package sai" khác "runner sai". */
export const EXIT = { PASS: 0, FAIL: 1, INFRA: 2 };
