import { resolve } from 'node:path';
import {
  compareVersions,
  parseReleaseVersion,
  validateReleaseMetadata
} from './guards.mjs';

export async function findGitHubRelease(
  repo,
  tag,
  { token, request = fetch } = {}
) {
  const base = `https://api.github.com/repos/${repo}/releases`;
  const get = (url) =>
    request(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json'
      },
      signal: AbortSignal.timeout(15000)
    });
  const response = await get(`${base}/tags/${encodeURIComponent(tag)}`);
  if (response.status !== 404) {
    if (!response.ok)
      throw new Error(`GitHub Release lookup failed: HTTP ${response.status}`);
    return response.json();
  }
  // The tag endpoint only guarantees published releases. A failed asset upload
  // can leave a draft, which is visible to our write token through this list.
  for (let page = 1; ; page++) {
    const response = await get(`${base}?per_page=100&page=${page}`);
    if (!response.ok)
      throw new Error(`GitHub Release listing failed: HTTP ${response.status}`);
    const releases = await response.json();
    if (!Array.isArray(releases))
      throw new Error('Invalid GitHub Release list');
    const matches = releases.filter((release) => release.tag_name === tag);
    if (matches.length > 1)
      throw new Error(
        'Multiple GitHub Releases use this tag; resolve them first'
      );
    if (matches.length) return matches[0];
    if (releases.length < 100) return null;
  }
}

export async function publishPackage(
  manifest,
  { repo, run, registry, getRelease, sleep }
) {
  if (repo !== 'aliyun/alibabacloud-esa-cli')
    throw new Error('Unexpected release repository');
  const metadata = validateReleaseMetadata(manifest);
  const prerelease = metadata.type === 'beta';
  const tag = `v${manifest.version}`;
  const sourceTag = metadata.sourceVersion ? `v${metadata.sourceVersion}` : '';
  const gitTags = run('git', [
    'ls-remote',
    '--tags',
    'origin',
    `refs/tags/${tag}`,
    `refs/tags/${tag}^{}`,
    ...(sourceTag
      ? [`refs/tags/${sourceTag}`, `refs/tags/${sourceTag}^{}`]
      : [])
  ]);
  const refs = new Map(
    gitTags
      .trim()
      .split('\n')
      .filter(Boolean)
      .map((line) => line.split(/\s+/).reverse())
  );
  const resolveTag = (name) =>
    refs.get(`refs/tags/${name}^{}`) || refs.get(`refs/tags/${name}`);
  const tagSha = resolveTag(tag);
  if (tagSha && tagSha !== manifest.sha)
    throw new Error('Existing version tag points to another commit');
  const existing = await getRelease(tag);
  if (existing?.draft)
    throw new Error(
      'A draft release already exists; resolve it before retrying'
    );
  if (existing && existing.prerelease !== prerelease)
    throw new Error('Existing GitHub Release uses a different release channel');
  const published = await registry(manifest.name, manifest.version);
  const latest = await registry(manifest.name, 'latest');
  if (latest && parseReleaseVersion(latest.version).channel !== 'latest')
    throw new Error('The latest npm channel must contain a stable version');
  if (published) {
    if (
      published.version !== manifest.version ||
      published.dist?.integrity !== manifest.integrity
    )
      throw new Error('This npm version already contains a different artifact');
  } else {
    if (existing)
      throw new Error(
        'A public GitHub Release already exists without this npm version'
      );
    if (latest && compareVersions(manifest.version, latest.version) <= 0)
      throw new Error(
        'Refusing to replace latest with an older or equal version'
      );
    if (prerelease) {
      const beta = await registry(manifest.name, 'beta');
      if (
        beta &&
        (parseReleaseVersion(beta.version).channel !== 'beta' ||
          compareVersions(manifest.version, beta.version) <= 0)
      )
        throw new Error(
          'Refusing to replace beta with an older or equal version'
        );
    } else {
      const sourceChannel =
        metadata.releaseType === 'stable' ? 'beta' : 'latest';
      const baseline =
        sourceChannel === 'latest'
          ? latest
          : await registry(manifest.name, sourceChannel);
      if (baseline?.version !== metadata.sourceVersion)
        throw new Error(
          'The source release channel changed; prepare a new candidate'
        );
      const source = await registry(manifest.name, metadata.sourceVersion);
      if (
        source?.version !== metadata.sourceVersion ||
        source.dist?.integrity !== metadata.sourceIntegrity ||
        resolveTag(sourceTag) !== metadata.sourceSha
      )
        throw new Error(
          'Source package integrity or Git tag does not match the candidate'
        );
    }
    run('npm', [
      'publish',
      resolve('release-artifacts', manifest.file),
      '--access',
      'public',
      '--tag',
      metadata.channel,
      '--provenance',
      '--ignore-scripts',
      '--registry=https://registry.npmjs.org'
    ]);
  }
  let verified = false;
  for (let attempt = 0; attempt < 12; attempt++) {
    const current = await registry(manifest.name, manifest.version);
    if (current) {
      if (
        current.version !== manifest.version ||
        current.dist?.integrity !== manifest.integrity
      )
        throw new Error('Published npm integrity mismatch');
      verified = true;
      break;
    }
    await sleep(5000);
  }
  if (!verified)
    throw new Error(
      'npm version not visible yet; rerun the failed job using the same artifact'
    );
  if (!tagSha)
    run('gh', [
      'api',
      '--method',
      'POST',
      `repos/${repo}/git/refs`,
      '-f',
      `ref=refs/tags/${tag}`,
      '-f',
      `sha=${manifest.sha}`
    ]);
  if (!existing)
    run('gh', [
      'release',
      'create',
      tag,
      '--repo',
      repo,
      '--verify-tag',
      '--title',
      tag,
      '--notes-file',
      'release-artifacts/release-notes.md',
      ...(prerelease
        ? ['--prerelease', '--latest=false']
        : [
            !published || latest?.version === manifest.version
              ? '--latest'
              : '--latest=false'
          ]),
      `release-artifacts/${manifest.file}`,
      'release-artifacts/manifest.json'
    ]);
}
