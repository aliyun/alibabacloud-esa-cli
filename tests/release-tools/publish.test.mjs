import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import {
  findGitHubRelease,
  publishPackage
} from '../../scripts/release/publish-package.mjs';

const sourceIntegrity = `sha512-${Buffer.alloc(64, 1).toString('base64')}`;
function releaseArtifact(version, overrides = {}) {
  const beta = version.includes('-beta.');
  return {
    name: 'esa-cli',
    version,
    sha: 'a'.repeat(40),
    file: `esa-cli-${version}.tgz`,
    integrity: `sha512-${Buffer.alloc(64, 2).toString('base64')}`,
    channel: beta ? 'beta' : 'latest',
    releaseType: beta ? 'beta' : 'stable',
    sourceVersion: beta ? '' : `${version}-beta.3`,
    sourceSha: beta ? '' : 'b'.repeat(40),
    sourceIntegrity: beta ? '' : sourceIntegrity,
    reason: '',
    ...overrides
  };
}
const artifact = releaseArtifact('1.2.3');
const npmPackage = (release) => ({
  version: release.version,
  dist: { integrity: release.integrity }
});
const published = npmPackage(artifact);
function harness(options = {}) {
  const target = options.artifact ?? artifact;
  const calls = [];
  let state = options.published ?? null;
  let targetTags = options.tag ?? '';
  const sourceTags =
    options.sourceTag ??
    (target.sourceVersion
      ? `${target.sourceSha}\trefs/tags/v${target.sourceVersion}\n`
      : '');
  const source = options.source ?? {
    version: target.sourceVersion,
    dist: { integrity: target.sourceIntegrity }
  };
  const latest = Object.hasOwn(options, 'latest')
    ? options.latest
    : { version: '1.2.2', dist: { integrity: sourceIntegrity } };
  const beta = Object.hasOwn(options, 'beta')
    ? options.beta
    : { version: '1.2.3-beta.3', dist: { integrity: sourceIntegrity } };
  return {
    calls,
    dependencies: {
      repo: 'aliyun/alibabacloud-esa-cli',
      sleep: async () => {},
      getRelease: async () => options.release ?? null,
      registry: async (name, version) => {
        if (version === 'latest') return latest;
        if (version === 'beta') return beta;
        if (version === target.version) return state;
        if (version === target.sourceVersion) return source;
        return null;
      },
      run(command, args) {
        calls.push([command, args]);
        if (command === 'git') return targetTags + sourceTags;
        if (command === 'npm') {
          if (options.failPublish) throw new Error('publish failed');
          if (!options.invisiblePublish) state = npmPackage(target);
        }
        if (command === 'gh' && args[0] === 'api')
          targetTags = `${target.sha}\trefs/tags/v${target.version}\n`;
        if (command === 'gh' && args[0] === 'release' && options.failRelease) {
          if (options.leaveDraft)
            options.release = {
              draft: true,
              prerelease: target.releaseType === 'beta'
            };
          throw new Error('release creation failed');
        }
        return '';
      }
    }
  };
}
test('publishes the tarball before creating its exact source tag and GitHub Release', async () => {
  const { calls, dependencies } = harness();
  await publishPackage(artifact, dependencies);
  assert.deepEqual(
    calls.map(([command]) => command),
    ['git', 'npm', 'gh', 'gh']
  );
  assert.equal(calls[1][1][1], resolve('release-artifacts', artifact.file));
  assert.equal(calls[1][1][calls[1][1].indexOf('--tag') + 1], 'latest');
  assert.ok(calls[2][1].includes(`sha=${artifact.sha}`));
  assert.ok(calls[3][1].includes('--latest'));
  assert.ok(!calls[3][1].includes('--prerelease'));
});
test('beta uses its own npm tag and a GitHub prerelease without changing Latest', async () => {
  const candidate = releaseArtifact('1.2.3-beta.10');
  const { calls, dependencies } = harness({ artifact: candidate });
  await publishPackage(candidate, dependencies);
  const npm = calls.find(([command]) => command === 'npm')[1];
  const release = calls.find(
    ([command, args]) => command === 'gh' && args[0] === 'release'
  )[1];
  assert.equal(npm[npm.indexOf('--tag') + 1], 'beta');
  assert.ok(release.includes('--prerelease'));
  assert.ok(release.includes('--latest=false'));
  assert.ok(!release.includes('--latest'));
});
test('does not create a tag or release when npm publish fails', async () => {
  const { calls, dependencies } = harness({ failPublish: true });
  await assert.rejects(publishPackage(artifact, dependencies));
  assert.equal(
    calls.some(([command]) => command === 'gh'),
    false
  );
});
test('retry uses an identical current npm artifact without publishing again', async () => {
  const { calls, dependencies } = harness({ published, latest: published });
  await publishPackage(artifact, dependencies);
  assert.equal(
    calls.some(([command]) => command === 'npm'),
    false
  );
  assert.equal(calls.filter(([command]) => command === 'gh').length, 2);
  assert.ok(calls.at(-1)[1].includes('--latest'));
});
test('conflicting tags, packages, drafts, channels and older versions fail before writes', async () => {
  for (const options of [
    { tag: `${'b'.repeat(40)}\trefs/tags/v1.2.3\n` },
    { published: { dist: { integrity: 'different' } } },
    { release: { draft: true } },
    { latest: { version: '1.2.4' } },
    { latest: { version: '1.2.3-beta.1' } },
    { release: { draft: false, prerelease: false } },
    { release: { draft: false, prerelease: true }, published }
  ]) {
    const { calls, dependencies } = harness(options);
    await assert.rejects(publishPackage(artifact, dependencies));
    assert.equal(
      calls.some(([command]) => command !== 'git'),
      false
    );
  }
});
test('completed release can be retried without any mutation', async () => {
  const { calls, dependencies } = harness({
    published,
    release: { draft: false, prerelease: false },
    tag: `${artifact.sha}\trefs/tags/v1.2.3\n`
  });
  await publishPackage(artifact, dependencies);
  assert.deepEqual(
    calls.map(([command]) => command),
    ['git']
  );
});
test('an old beta retry repairs GitHub without republishing or rolling back either channel', async () => {
  const candidate = releaseArtifact('1.2.3-beta.2');
  const { calls, dependencies } = harness({
    artifact: candidate,
    published: npmPackage(candidate),
    latest: { version: '1.2.3' },
    beta: { version: '1.3.0-beta.1' }
  });
  await publishPackage(candidate, dependencies);
  assert.ok(!calls.some(([command]) => command === 'npm'));
  const release = calls.find(
    ([command, args]) => command === 'gh' && args[0] === 'release'
  )[1];
  assert.ok(release.includes('--prerelease'));
  assert.ok(release.includes('--latest=false'));
});
test('an old stable retry repairs GitHub without moving GitHub Latest backwards', async () => {
  const { calls, dependencies } = harness({
    published,
    latest: { version: '1.2.4' },
    beta: { version: '1.3.0-beta.1' }
  });
  await publishPackage(artifact, dependencies);
  assert.ok(!calls.some(([command]) => command === 'npm'));
  const release = calls.find(
    ([command, args]) => command === 'gh' && args[0] === 'release'
  )[1];
  assert.ok(release.includes('--latest=false'));
});
test('a completed older release stays retryable after its source channels advance', async () => {
  const { calls, dependencies } = harness({
    published,
    latest: { version: '1.2.4' },
    beta: { version: '1.3.0-beta.1' },
    release: { draft: false, prerelease: false },
    tag: `${artifact.sha}\trefs/tags/v1.2.3\n`
  });
  await publishPackage(artifact, dependencies);
  assert.deepEqual(
    calls.map(([command]) => command),
    ['git']
  );
});
test('numeric beta ordering accepts beta.10 after beta.2 and rejects the reverse', async () => {
  const candidate = releaseArtifact('1.2.3-beta.10');
  const forward = harness({
    artifact: candidate,
    beta: { version: '1.2.3-beta.2' }
  });
  await publishPackage(candidate, forward.dependencies);
  assert.ok(forward.calls.some(([command]) => command === 'npm'));
  const older = releaseArtifact('1.2.3-beta.2');
  const backward = harness({
    artifact: older,
    beta: { version: '1.2.3-beta.10' }
  });
  await assert.rejects(publishPackage(older, backward.dependencies), /beta/);
  assert.deepEqual(
    backward.calls.map(([command]) => command),
    ['git']
  );
});
test('new beta cannot replace a newer stable release or a malformed beta channel', async () => {
  const candidate = releaseArtifact('1.2.3-beta.4');
  for (const options of [
    { latest: { version: '1.2.3' } },
    { beta: { version: '1.2.3' } },
    { beta: { version: candidate.version } }
  ]) {
    const { calls, dependencies } = harness({
      artifact: candidate,
      ...options
    });
    await assert.rejects(publishPackage(candidate, dependencies));
    assert.deepEqual(
      calls.map(([command]) => command),
      ['git']
    );
  }
});
test('manifest channel and release policy cannot override the version channel', async () => {
  for (const candidate of [
    { ...artifact, channel: 'beta' },
    { ...artifact, releaseType: 'beta' },
    releaseArtifact('1.2.3-beta.4', { channel: 'latest' }),
    releaseArtifact('1.2.3-beta.4', { reason: 'not permitted for beta' })
  ]) {
    const { calls, dependencies } = harness({ artifact: candidate });
    await assert.rejects(publishPackage(candidate, dependencies));
    assert.equal(calls.length, 0);
  }
});
test('stable publication rechecks the beta pointer, source integrity and source Git tag', async () => {
  for (const options of [
    { beta: { version: '1.2.3-beta.4' } },
    { beta: null },
    {
      source: {
        version: artifact.sourceVersion,
        dist: { integrity: 'changed' }
      }
    },
    { sourceTag: `${'c'.repeat(40)}\trefs/tags/v${artifact.sourceVersion}\n` },
    { sourceTag: '' }
  ]) {
    const { calls, dependencies } = harness(options);
    await assert.rejects(
      publishPackage(artifact, dependencies),
      /source|Source/
    );
    assert.deepEqual(
      calls.map(([command]) => command),
      ['git']
    );
  }
});
test('hotfix publication uses the latest stable baseline and rejects a moved baseline', async () => {
  const candidate = releaseArtifact('1.2.3', {
    releaseType: 'hotfix',
    sourceVersion: '1.2.2',
    reason: 'Emergency production fix\nReviewed by the release maintainer.'
  });
  const valid = harness({ artifact: candidate });
  await publishPackage(candidate, valid.dependencies);
  const npm = valid.calls.find(([command]) => command === 'npm')[1];
  assert.equal(npm[npm.indexOf('--tag') + 1], 'latest');
  assert.ok(valid.calls.at(-1)[1].includes('--latest'));
  assert.ok(!valid.calls.at(-1)[1].includes('--prerelease'));
  const changed = harness({
    artifact: candidate,
    latest: { version: '1.2.1' }
  });
  await assert.rejects(
    publishPackage(candidate, changed.dependencies),
    /source/
  );
  assert.deepEqual(
    changed.calls.map(([command]) => command),
    ['git']
  );
});
test('retry after GitHub fails without leaving a draft preserves the published artifact', async () => {
  const options = { failRelease: true };
  const { calls, dependencies } = harness(options);
  await assert.rejects(
    publishPackage(artifact, dependencies),
    /release creation/
  );
  options.failRelease = false;
  await publishPackage(artifact, dependencies);
  assert.equal(calls.filter(([command]) => command === 'npm').length, 1);
  assert.equal(
    calls.filter(([command, args]) => command === 'gh' && args[0] === 'api')
      .length,
    1
  );
});
test('a draft left after an asset upload failure requires manual resolution before retry', async () => {
  const options = { failRelease: true, leaveDraft: true };
  const { calls, dependencies } = harness(options);
  await assert.rejects(
    publishPackage(artifact, dependencies),
    /release creation/
  );
  options.failRelease = false;
  const beforeRetry = calls.length;
  await assert.rejects(publishPackage(artifact, dependencies), /draft release/);
  assert.deepEqual(
    calls.slice(beforeRetry).map(([command]) => command),
    ['git']
  );
  assert.equal(calls.filter(([command]) => command === 'npm').length, 1);
});
test('npm registry visibility timeout leaves GitHub untouched for a safe retry', async () => {
  const { calls, dependencies } = harness({ invisiblePublish: true });
  await assert.rejects(
    publishPackage(artifact, dependencies),
    /not visible yet/
  );
  assert.ok(!calls.some(([command]) => command === 'gh'));
});

const response = (body, status = 200) => ({
  status,
  ok: status >= 200 && status < 300,
  json: async () => body
});
test('published GitHub releases are returned directly by tag', async () => {
  const release = { tag_name: 'v1.2.3', draft: false, prerelease: false };
  const calls = [];
  const result = await findGitHubRelease(
    'aliyun/alibabacloud-esa-cli',
    'v1.2.3',
    {
      token: 'test-token',
      request: async (url) => {
        calls.push(url);
        return response(release);
      }
    }
  );
  assert.equal(result, release);
  assert.equal(calls.length, 1);
  assert.ok(calls[0].endsWith('/releases/tags/v1.2.3'));
});
test('a tag lookup 404 checks paginated authenticated listings for hidden drafts', async () => {
  const draft = { tag_name: 'v1.2.3', draft: true, prerelease: false };
  const pages = [
    response(null, 404),
    response(
      Array.from({ length: 100 }, (_, i) => ({ tag_name: `other-${i}` }))
    ),
    response([draft])
  ];
  const calls = [];
  const result = await findGitHubRelease(
    'aliyun/alibabacloud-esa-cli',
    'v1.2.3',
    {
      token: 'test-token',
      request: async (url, options) => {
        calls.push(url);
        assert.equal(options.headers.Authorization, 'Bearer test-token');
        return pages.shift();
      }
    }
  );
  assert.equal(result, draft);
  assert.equal(calls.length, 3);
  assert.ok(calls.at(-1).endsWith('?per_page=100&page=2'));
});
test('GitHub listing errors and malformed results fail closed instead of hiding draft conflicts', async () => {
  for (const failed of [response(null, 403), response({ unexpected: true })]) {
    const pages = [response(null, 404), failed];
    await assert.rejects(
      findGitHubRelease('aliyun/alibabacloud-esa-cli', 'v1.2.3', {
        request: async () => pages.shift()
      }),
      /listing failed|Invalid GitHub Release list/
    );
  }
  const pages = [response(null, 404), response([])];
  assert.equal(
    await findGitHubRelease('aliyun/alibabacloud-esa-cli', 'v1.2.3', {
      request: async () => pages.shift()
    }),
    null
  );
});
