const { spawnSync } = require('node:child_process');
const crypto = require('node:crypto');

const env = {
  ...process.env,
  VSCODE_TEST_CHANNEL: process.env.VSCODE_TEST_CHANNEL || 'stable',
  VSCODE_TEST_INSTANCE_ID: process.env.VSCODE_TEST_INSTANCE_ID || crypto.randomUUID(),
};

const npmExecPath = process.env.npm_execpath;
if (!npmExecPath) {
  console.error('npm_execpath missing; cannot run npm from within this script.');
  process.exit(1);
}

const isLinux = process.platform === 'linux';
const command = isLinux ? 'xvfb-run' : process.execPath;
const args = isLinux
  ? ['-a', process.execPath, npmExecPath, 'run', 'test:integration']
  : [npmExecPath, 'run', 'test:integration'];

const result = spawnSync(command, args, { stdio: 'inherit', env });
if (result.error) {
  console.error(result.error);
}

process.exit(result.status ?? 1);
