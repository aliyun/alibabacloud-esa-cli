import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync, copyFileSync } from 'node:fs';
import { digest, releaseMetadataFromEnv } from './guards.mjs';

const version = JSON.parse(readFileSync('package.json', 'utf8')).version;
const metadata = releaseMetadataFromEnv();
if (metadata.version !== version)
  throw new Error('Package version does not match the verified candidate');
const sha =
  process.env.GITHUB_SHA ||
  execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
mkdirSync('release-artifacts', { recursive: true });
const args = [
  'pack',
  '--json',
  '--ignore-scripts',
  '--pack-destination',
  'release-artifacts'
];
const output = execFileSync(
  process.env.npm_execpath ? process.execPath : 'npm',
  process.env.npm_execpath ? [process.env.npm_execpath, ...args] : args,
  { encoding: 'utf8' }
);
const [pack] = JSON.parse(output);
if (pack.filename !== `esa-cli-${version}.tgz`)
  throw new Error('Unexpected package filename');
const buffer = readFileSync(`release-artifacts/${pack.filename}`);
writeFileSync(
  'release-artifacts/manifest.json',
  JSON.stringify(
    {
      name: 'esa-cli',
      ...metadata,
      sha,
      file: pack.filename,
      sha256: digest(buffer),
      integrity: `sha512-${digest(buffer, 'sha512')}`
    },
    null,
    2
  ) + '\n'
);
copyFileSync(
  `doc/releases/${version}.md`,
  'release-artifacts/release-notes.md'
);
console.log(`Packed ${pack.filename} from ${sha}`);
