#!/usr/bin/env node
/**
 * Update package versions across the monorepo
 * Usage: node scripts/update-package-versions.mjs <version>
 */

import { existsSync, readFileSync, readdirSync, writeFileSync } from 'fs';
import { join } from 'path';

const version = process.argv[2];

if (!version) {
  console.error('❌ Usage: node scripts/update-package-versions.mjs <version>');
  process.exit(1);
}

// ĐỌC ĐỘNG, không hardcode. Bản trước liệt kê 2 package và khi thêm `tinita-dom` nó bị bỏ quên
// đúng lúc publish - loại lỗi không thu hồi được. Package thứ tư sau này không phải sửa file này.
const PACKAGES = readdirSync('packages', { withFileTypes: true })
  .filter((e) => e.isDirectory() && existsSync(join('packages', e.name, 'package.json')))
  .map((e) => join('packages', e.name))
  .sort();

console.log(`\n🔄 Updating packages to version ${version}...\n`);

for (const packagePath of PACKAGES) {
  const packageJsonPath = join(packagePath, 'package.json');

  try {
    const pkg = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
    const oldVersion = pkg.version;

    pkg.version = version;

    writeFileSync(packageJsonPath, JSON.stringify(pkg, null, 2) + '\n');

    console.log(`✅ ${pkg.name}: ${oldVersion} → ${version}`);
  } catch (error) {
    console.error(`❌ Failed to update ${packagePath}:`, error.message);
    process.exit(1);
  }
}

console.log(`\n✨ All packages updated to ${version}\n`);
