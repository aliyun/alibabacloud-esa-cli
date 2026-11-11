import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve, join } from 'node:path';
import { stripVTControlCharacters } from 'node:util';

const tarball = resolve(process.argv[2] ?? '');
const expectedVersion = process.argv[3];
if (!expectedVersion || !tarball.endsWith('.tgz'))
  throw new Error('Usage: smoke.mjs <tarball> <version>');
const workspace = mkdtempSync(join(tmpdir(), 'esa-package-smoke-'));
const testHome = join(workspace, 'home');
mkdirSync(join(testHome, '.esa-logs'), { recursive: true });
const env = {
  ...process.env,
  HOME: testHome,
  USERPROFILE: testHome,
  ESA_NO_UPDATE_CHECK: '1'
};
try {
  execFileSync(
    'npm',
    ['install', '--prefix', workspace, '--no-audit', '--no-fund', tarball],
    { env, stdio: 'inherit', timeout: 240000 }
  );
  const root = join(workspace, 'node_modules', 'esa-cli');
  const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
  if (pkg.version !== expectedVersion)
    throw new Error('Installed version mismatch');
  for (const alias of ['esa', 'esa-cli']) {
    if (!pkg.bin?.[alias]) throw new Error(`Missing CLI alias ${alias}`);
    const output = execFileSync(
      process.execPath,
      [join(root, pkg.bin[alias]), '--version'],
      { env, encoding: 'utf8', timeout: 15000 }
    ).trim();
    if (stripVTControlCharacters(output).replace(/^v/, '') !== expectedVersion)
      throw new Error(`${alias} returned unexpected version: ${output}`);
  }
  const help = execFileSync(
    process.execPath,
    [join(root, pkg.bin.esa), 'deploy', '--help'],
    { env, encoding: 'utf8', timeout: 15000 }
  );
  if (!help.includes('--environment'))
    throw new Error('Installed deploy command is incomplete');
  console.log(
    `Installed package ${expectedVersion}: both CLI aliases and deploy help verified`
  );
} finally {
  rmSync(workspace, { recursive: true, force: true });
}
