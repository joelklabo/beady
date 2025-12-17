const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const packageRoot = path.resolve(__dirname, '..');
const testRoot = path.join(packageRoot, 'test');

function collectTestFiles(dir) {
  /** @type {string[]} */
  const files = [];

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      files.push(...collectTestFiles(fullPath));
      continue;
    }

    if (entry.isFile() && entry.name.endsWith('.test.ts')) {
      files.push(fullPath);
    }
  }

  return files;
}

if (!fs.existsSync(testRoot)) {
  console.error(`Test directory not found: ${testRoot}`);
  process.exit(1);
}

const testFiles = collectTestFiles(testRoot)
  .map((file) => path.relative(packageRoot, file))
  .sort((a, b) => a.localeCompare(b));

if (testFiles.length === 0) {
  console.error(`No test files found under: ${testRoot}`);
  process.exit(1);
}

const tsxCommand = process.platform === 'win32' ? 'tsx.cmd' : 'tsx';
const result = spawnSync(tsxCommand, ['--test', ...testFiles], {
  cwd: packageRoot,
  env: process.env,
  stdio: 'inherit',
});

process.exit(result.status ?? 1);
