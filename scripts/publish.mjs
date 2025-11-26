#!/usr/bin/env node
/**
 * Helper script to publish packages to npm
 * Usage: node scripts/publish.mjs [package-name]
 *
 * Examples:
 *   node scripts/publish.mjs tinita
 *   node scripts/publish.mjs tinita-react
 *   node scripts/publish.mjs --all
 */

import { execSync } from 'child_process';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { createInterface } from 'readline';

const PACKAGES = [
  { name: 'tinita', path: 'packages/tinita' },
  { name: 'tinita-react', path: 'packages/tinita-react' },
];

const Colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = Colors.reset) {
  console.log(`${color}${message}${Colors.reset}`);
}

function exec(command, options = {}) {
  try {
    return execSync(command, {
      encoding: 'utf-8',
      stdio: options.silent ? 'pipe' : 'inherit',
      ...options
    });
  } catch (error) {
    if (!options.ignoreError) {
      throw error;
    }
    return null;
  }
}

function question(prompt) {
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(prompt, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

function checkNpmLogin() {
  log('\n🔐 Checking npm login status...', Colors.cyan);

  const username = exec('npm whoami', { silent: true, ignoreError: true });

  if (!username) {
    log('❌ Not logged in to npm', Colors.red);
    log('Please run: npm login', Colors.yellow);
    process.exit(1);
  }

  log(`✅ Logged in as: ${username.trim()}`, Colors.green);
  return username.trim();
}

function getPackageInfo(packagePath) {
  const packageJsonPath = join(packagePath, 'package.json');

  if (!existsSync(packageJsonPath)) {
    throw new Error(`package.json not found at: ${packageJsonPath}`);
  }

  const pkg = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
  return {
    name: pkg.name,
    version: pkg.version,
    path: packagePath,
  };
}

function checkPackageOnNpm(packageName) {
  log(`\n📦 Checking if ${packageName} exists on npm...`, Colors.cyan);

  const result = exec(`npm view ${packageName} version`, {
    silent: true,
    ignoreError: true
  });

  if (result) {
    const publishedVersion = result.trim();
    log(`⚠️  Package ${packageName}@${publishedVersion} already exists on npm`, Colors.yellow);
    return publishedVersion;
  }

  log(`✅ Package name ${packageName} is available`, Colors.green);
  return null;
}

async function publishPackage(packageInfo, dryRun = false) {
  const { name, version, path } = packageInfo;

  log(`\n${'='.repeat(60)}`, Colors.blue);
  log(`📦 ${dryRun ? 'DRY RUN' : 'PUBLISHING'}: ${name}@${version}`, Colors.blue);
  log(`${'='.repeat(60)}`, Colors.blue);

  // Check if we're in a CI environment
  const isCI = process.env.CI === 'true' ||
               process.env.GITHUB_ACTIONS === 'true' ||
               process.env.GITLAB_CI === 'true' ||
               process.env.CIRCLECI === 'true';

  // Add --no-provenance flag when publishing locally (not in CI)
  const provenanceFlag = isCI ? '' : ' --no-provenance';

  // Change to package directory
  process.chdir(path);

  // Run prepublish checks
  log('\n🔍 Running pre-publish checks...', Colors.cyan);

  log('  ✓ Generating exports...', Colors.cyan);
  exec('pnpm run generate:exports');

  log('  ✓ Building package...', Colors.cyan);
  exec('pnpm run build');

  if (!existsSync('dist')) {
    log('❌ Build failed: dist/ directory not found', Colors.red);
    return false;
  }

  // Dry run
  log('\n🧪 Running dry-run publish...', Colors.cyan);
  exec(`npm publish --dry-run${provenanceFlag}`);

  if (dryRun) {
    log('\n✅ Dry run completed successfully', Colors.green);
    return true;
  }

  // Ask for confirmation
  const answer = await question(`\n❓ Publish ${name}@${version} to npm? (yes/no): `);

  if (answer.toLowerCase() !== 'yes' && answer.toLowerCase() !== 'y') {
    log('❌ Publish cancelled', Colors.yellow);
    return false;
  }

  // Publish
  log('\n🚀 Publishing to npm...', Colors.cyan);

  if (!isCI) {
    log('  ℹ️  Publishing without provenance (local environment)', Colors.yellow);
  }

  exec(`npm publish${provenanceFlag}`);

  log(`\n✅ Successfully published ${name}@${version}`, Colors.green);
  log(`   View at: https://www.npmjs.com/package/${name}`, Colors.cyan);

  return true;
}

async function main() {
  const args = process.argv.slice(2);
  const isDryRun = args.includes('--dry-run');
  const publishAll = args.includes('--all');
  const packageName = args.find(arg => !arg.startsWith('--'));

  log('\n🚀 Tinita Package Publisher', Colors.blue);
  log('='.repeat(60), Colors.blue);

  // Check npm login
  const username = checkNpmLogin();

  // Determine which packages to publish
  let packagesToPublish = [];

  if (publishAll) {
    packagesToPublish = PACKAGES;
  } else if (packageName) {
    const pkg = PACKAGES.find(p => p.name === packageName);
    if (!pkg) {
      log(`❌ Package "${packageName}" not found`, Colors.red);
      log(`Available packages: ${PACKAGES.map(p => p.name).join(', ')}`, Colors.yellow);
      process.exit(1);
    }
    packagesToPublish = [pkg];
  } else {
    log('\n❌ Please specify a package or use --all', Colors.red);
    log('\nUsage:', Colors.yellow);
    log('  node scripts/publish.mjs tinita', Colors.cyan);
    log('  node scripts/publish.mjs tinita-react', Colors.cyan);
    log('  node scripts/publish.mjs --all', Colors.cyan);
    log('  node scripts/publish.mjs --all --dry-run', Colors.cyan);
    process.exit(1);
  }

  // Check packages on npm
  for (const pkg of packagesToPublish) {
    const info = getPackageInfo(pkg.path);
    const publishedVersion = checkPackageOnNpm(info.name);

    if (publishedVersion && publishedVersion === info.version) {
      log(`⚠️  Version ${info.version} already published. Please bump version first.`, Colors.yellow);
      log(`   Run: cd ${pkg.path} && npm version patch`, Colors.cyan);

      const answer = await question('\n❓ Continue anyway? (yes/no): ');
      if (answer.toLowerCase() !== 'yes' && answer.toLowerCase() !== 'y') {
        process.exit(1);
      }
    }
  }

  // Return to root directory
  const rootDir = process.cwd();

  // Publish packages
  const results = [];
  for (const pkg of packagesToPublish) {
    process.chdir(rootDir);
    const info = getPackageInfo(pkg.path);
    const success = await publishPackage(info, isDryRun);
    results.push({ package: info.name, success });
  }

  // Summary
  log('\n' + '='.repeat(60), Colors.blue);
  log('📊 PUBLISH SUMMARY', Colors.blue);
  log('='.repeat(60), Colors.blue);

  for (const result of results) {
    const status = result.success ? '✅' : '❌';
    const color = result.success ? Colors.green : Colors.red;
    log(`${status} ${result.package}`, color);
  }

  const allSuccess = results.every(r => r.success);

  if (allSuccess) {
    log('\n✨ All packages published successfully!', Colors.green);

    if (!isDryRun) {
      log('\n📝 Next steps:', Colors.cyan);
      log('  1. Verify packages on npmjs.com', Colors.cyan);
      log('  2. Test install: npm install tinita tinita-react', Colors.cyan);
      log('  3. Update CHANGELOG.md', Colors.cyan);
      log('  4. Create GitHub release', Colors.cyan);
      log('  5. Commit and push changes', Colors.cyan);
    }
  } else {
    log('\n❌ Some packages failed to publish', Colors.red);
    process.exit(1);
  }
}

main().catch((error) => {
  log(`\n❌ Error: ${error.message}`, Colors.red);
  console.error(error);
  process.exit(1);
});
