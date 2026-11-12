import { readdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
const files = readdirSync('tests/release-tools')
  .filter((file) => file.endsWith('.test.mjs'))
  .map((file) => `tests/release-tools/${file}`);
if (!files.length) throw new Error('No release tooling tests found');
const result = spawnSync(process.execPath, ['--test', ...files], {
  stdio: 'inherit'
});
if (result.error) throw result.error;
process.exit(result.status ?? 1);
