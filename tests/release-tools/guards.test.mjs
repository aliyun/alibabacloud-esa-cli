import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  assertSuccessfulJobs,
  validateCandidate,
  validateReleaseMetadata,
  parseReleaseVersion,
  compareVersions,
  publishedSource,
  digest,
  verifyArtifact
} from '../../scripts/release/guards.mjs';

test('required jobs fail closed for failures, cancellation, skips and missing results', () => {
  assertSuccessfulJobs({ build: { result: 'success' } }, ['build']);
  for (const result of ['failure', 'cancelled', 'skipped', undefined]) {
    assert.throws(() => assertSuccessfulJobs({ build: { result } }, ['build']));
  }
  assert.throws(() => assertSuccessfulJobs({}, ['build']));
  assert.throws(() => assertSuccessfulJobs({}, []));
});

const candidate = {
  version: '1.2.3-beta.1',
  releaseType: 'beta',
  ref: 'refs/heads/release/1.2.3-beta.1',
  sha: 'a'.repeat(40),
  expectedSha: 'a'.repeat(40),
  pkg: { name: 'esa-cli', version: '1.2.3-beta.1' },
  lock: {
    version: '1.2.3-beta.1',
    packages: { '': { version: '1.2.3-beta.1' } }
  },
  notes: 'Fix CLI deployment.'
};
test('only the explicitly selected release commit and matching package versions are accepted', () => {
  assert.equal(validateCandidate(candidate).tag, 'v1.2.3-beta.1');
  for (const patch of [
    { ref: 'refs/heads/master' },
    { ref: 'refs/tags/v1.2.3' },
    { version: '../bad' },
    { version: '1.2.3-rc.1' },
    { releaseType: 'stable' },
    { expectedSha: 'b'.repeat(40) },
    { expectedSha: 'aaaaaaa' },
    { pkg: { name: 'wrong', version: candidate.version } },
    { lock: { version: '1.2.2' } },
    { notes: 'TODO' }
  ])
    assert.throws(() => validateCandidate({ ...candidate, ...patch }));
});

test('publishing rejects a changed tarball, version, commit or path', () => {
  const buffer = Buffer.from('verified package');
  const manifest = {
    name: 'esa-cli',
    version: candidate.version,
    channel: 'beta',
    releaseType: 'beta',
    sourceVersion: '',
    sourceSha: '',
    sourceIntegrity: '',
    reason: '',
    sha: candidate.sha,
    file: `esa-cli-${candidate.version}.tgz`,
    sha256: digest(buffer),
    integrity: `sha512-${digest(buffer, 'sha512')}`
  };
  const expected = { ...manifest };
  verifyArtifact(manifest, buffer, expected);
  assert.throws(() =>
    verifyArtifact(manifest, Buffer.from('changed package'), expected)
  );
  for (const patch of [
    { sha: 'b'.repeat(40) },
    { version: '1.2.4' },
    { file: '../package.tgz' },
    { channel: 'latest' },
    { releaseType: 'hotfix' },
    { sourceVersion: '1.2.2' },
    { integrity: 'invalid' }
  ]) {
    assert.throws(() =>
      verifyArtifact({ ...manifest, ...patch }, buffer, expected)
    );
  }
});

test('release channels reject arbitrary prereleases and use numeric beta precedence', () => {
  assert.equal(parseReleaseVersion('1.2.3').channel, 'latest');
  assert.equal(parseReleaseVersion('1.2.3-beta.0').channel, 'beta');
  assert.equal(compareVersions('1.2.3-beta.10', '1.2.3-beta.2'), 1);
  assert.equal(compareVersions('1.2.3-beta.10', '1.2.3'), -1);
  for (const version of [
    'v1.2.3',
    '1.2.3-rc.1',
    '1.2.3-beta',
    '1.2.3-beta.01',
    '01.2.3',
    '1.2.3+build',
    '../bad'
  ])
    assert.throws(() => parseReleaseVersion(version));
});

test('stable promotion and hotfix bind their source version, commit, integrity and reason', () => {
  const policy = {
    version: '1.2.3',
    channel: 'latest',
    releaseType: 'stable',
    sourceVersion: '1.2.3-beta.2',
    sourceSha: 'b'.repeat(40),
    sourceIntegrity: 'sha512-source',
    reason: ''
  };
  assert.equal(validateReleaseMetadata(policy).sourceVersion, '1.2.3-beta.2');
  for (const patch of [
    { sourceVersion: '1.2.4-beta.1' },
    { sourceSha: '' },
    { sourceIntegrity: '' },
    { reason: 'bypass beta' },
    { channel: 'beta' }
  ])
    assert.throws(() => validateReleaseMetadata({ ...policy, ...patch }));
  const hotfix = {
    ...policy,
    version: '1.2.4',
    releaseType: 'hotfix',
    sourceVersion: '1.2.3',
    reason: 'Fix a production regression'
  };
  assert.equal(validateReleaseMetadata(hotfix).releaseType, 'hotfix');
  for (const patch of [
    { reason: '' },
    { version: '1.2.5' },
    { sourceVersion: '1.2.3-beta.1' }
  ])
    assert.throws(() => validateReleaseMetadata({ ...hotfix, ...patch }));
});

test('published beta evidence must agree across npm and the GitHub Release manifest', async () => {
  const original = globalThis.fetch;
  const buffer = Buffer.from('source package');
  const manifest = {
    name: 'esa-cli',
    version: candidate.version,
    channel: 'beta',
    releaseType: 'beta',
    sourceVersion: '',
    sourceSha: '',
    sourceIntegrity: '',
    reason: '',
    sha: candidate.sha,
    file: `esa-cli-${candidate.version}.tgz`,
    sha256: digest(buffer),
    integrity: `sha512-${digest(buffer, 'sha512')}`
  };
  let corrupt = false;
  let draft = false;
  globalThis.fetch = async (url) => {
    if (url.includes('/releases/tags/'))
      return Response.json({
        tag_name: `v${candidate.version}`,
        draft,
        prerelease: true,
        assets: [{ name: 'manifest.json', id: 123 }]
      });
    if (url.includes('/releases/assets/')) return Response.json(manifest);
    return Response.json({
      version: candidate.version,
      dist: { integrity: corrupt ? 'different' : manifest.integrity }
    });
  };
  try {
    assert.equal(
      (await publishedSource(candidate.version)).manifest.sha,
      candidate.sha
    );
    corrupt = true;
    await assert.rejects(publishedSource(candidate.version), /npm package/);
    corrupt = false;
    draft = true;
    await assert.rejects(
      publishedSource(candidate.version),
      /completed Release/
    );
  } finally {
    globalThis.fetch = original;
  }
});
