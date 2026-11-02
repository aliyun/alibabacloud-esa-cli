import { readArtifact, releaseMetadataFromEnv } from './guards.mjs';
const artifact = readArtifact('release-artifacts', {
  ...releaseMetadataFromEnv(),
  sha: process.env.RELEASE_SHA
});
console.log(`Verified ${artifact.file}: ${artifact.sha256}`);
