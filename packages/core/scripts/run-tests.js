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

let tsxCliPath;
try {
  // Run tsx via Node to avoid shell/binary resolution differences across platforms.
  const tsxPackageJsonPath = require.resolve('tsx/package.json', { paths: [packageRoot] });
  const tsxPackageJson = JSON.parse(fs.readFileSync(tsxPackageJsonPath, 'utf8'));
  const bin = tsxPackageJson.bin;
  const binPath = typeof bin === 'string' ? bin : bin && (bin.tsx || bin['tsx']);
  if (!binPath || typeof binPath !== 'string') {
    throw new Error(`Unexpected tsx bin field in ${tsxPackageJsonPath}`);
  }
  tsxCliPath = path.resolve(path.dirname(tsxPackageJsonPath), binPath);
} catch (error) {
  console.error('Failed to resolve tsx CLI path:', error);
  process.exit(1);
}

const result = spawnSync(process.execPath, [tsxCliPath, '--test', ...testFiles], {
  cwd: packageRoot,
  env: process.env,
  stdio: 'inherit',
});

if (result.error) {
  console.error('Failed to run tests:', result.error);
}

process.exit(result.status ?? 1);
