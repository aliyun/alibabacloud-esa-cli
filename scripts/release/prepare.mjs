import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { compareVersions, parseReleaseVersion } from './guards.mjs';

const version = process.argv[2] ?? '';
const current = JSON.parse(readFileSync('package.json', 'utf8')).version;
parseReleaseVersion(version);
if (compareVersions(version, current) <= 0)
  throw new Error('Choose a stable or beta version newer than package.json');
const notes = `doc/releases/${version}.md`;
if (existsSync(notes))
  throw new Error('Release notes already exist; refusing to overwrite them');
const args = ['version', version, '--no-git-tag-version', '--ignore-scripts'];
execFileSync(
  process.env.npm_execpath ? process.execPath : 'npm',
  process.env.npm_execpath ? [process.env.npm_execpath, ...args] : args,
  { stdio: 'inherit' }
);
mkdirSync('doc/releases', { recursive: true });
writeFileSync(
  notes,
  `# esa-cli ${version}\n\n## Changes\n\nTODO: describe user-visible changes.\n\n## Compatibility\n\nTODO: document compatibility or migration requirements.\n`
);
console.log(
  `Updated package and lockfile. Complete ${notes}, then submit a version PR.`
);
