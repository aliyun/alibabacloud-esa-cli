import { appendFileSync, readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import {
  validateCandidate,
  verifyCandidateSource,
  publishedSource,
  parseReleaseVersion
} from './guards.mjs';

const version = process.env.RELEASE_VERSION ?? '';
parseReleaseVersion(version);
const candidate = await verifyCandidateSource(
  validateCandidate({
    version,
    ref: process.env.GITHUB_REF,
    sha: process.env.GITHUB_SHA,
    expectedSha: process.env.RELEASE_SHA,
    pkg: JSON.parse(readFileSync('package.json', 'utf8')),
    lock: JSON.parse(readFileSync('package-lock.json', 'utf8')),
    notes: readFileSync(`doc/releases/${version}.md`, 'utf8'),
    releaseType: process.env.RELEASE_TYPE,
    sourceVersion: process.env.RELEASE_SOURCE_VERSION ?? '',
    reason: process.env.RELEASE_REASON ?? ''
  }),
  {
    git: (args) =>
      execFileSync('git', args, { encoding: 'utf8', timeout: 30000 }),
    readSource: publishedSource
  }
);
if (process.env.GITHUB_OUTPUT) {
  appendFileSync(
    process.env.GITHUB_OUTPUT,
    Object.entries({
      version,
      sha: candidate.sha,
      tag: candidate.tag,
      channel: candidate.channel,
      release_type: candidate.releaseType,
      source_version: candidate.sourceVersion,
      source_sha: candidate.sourceSha,
      source_integrity: candidate.sourceIntegrity
    })
      .map(([key, value]) => `${key}=${value}\n`)
      .join('')
  );
}
console.log(`Validated ${candidate.tag} at ${candidate.sha}`);
