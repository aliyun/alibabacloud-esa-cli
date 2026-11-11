import { execFileSync } from 'node:child_process';
import {
  readArtifact,
  registryVersion,
  releaseMetadataFromEnv
} from './guards.mjs';
import { findGitHubRelease, publishPackage } from './publish-package.mjs';

const manifest = readArtifact('release-artifacts', {
  ...releaseMetadataFromEnv(),
  sha: process.env.RELEASE_SHA
});
const repo = process.env.GITHUB_REPOSITORY;
await publishPackage(manifest, {
  repo,
  registry: registryVersion,
  sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
  run: (command, args) =>
    execFileSync(command, args, {
      encoding: 'utf8',
      timeout: 180000,
      stdio: command === 'git' ? ['ignore', 'pipe', 'inherit'] : 'inherit'
    }) ?? '',
  getRelease: (tag) =>
    findGitHubRelease(repo, tag, { token: process.env.GH_TOKEN })
});
console.log(
  `Published ${manifest.name}@${manifest.version} on ${manifest.channel} (${manifest.sha})`
);
