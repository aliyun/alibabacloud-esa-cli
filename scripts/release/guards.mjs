import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { isDeepStrictEqual } from 'node:util';
import semver from 'semver';
export { assertSuccessfulJobs } from './check-jobs.mjs';

export const stableVersion = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;
const releaseVersion =
  /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-beta\.(0|[1-9]\d*))?$/;
const fullSha = /^[a-f0-9]{40}$/;
const integrity = /^sha512-[A-Za-z0-9+/]+={0,2}$/;
const policyFields = [
  'version',
  'channel',
  'releaseType',
  'sourceVersion',
  'sourceSha',
  'sourceIntegrity',
  'reason'
];

export function parseReleaseVersion(version) {
  if (
    typeof version !== 'string' ||
    !releaseVersion.test(version) ||
    semver.valid(version) !== version
  )
    throw new Error('Use x.y.z or x.y.z-beta.N without leading zeroes');
  const parsed = semver.parse(version);
  const beta = parsed.prerelease.length > 0;
  return {
    version,
    baseVersion: `${parsed.major}.${parsed.minor}.${parsed.patch}`,
    channel: beta ? 'beta' : 'latest',
    type: beta ? 'beta' : 'stable'
  };
}

export function compareVersions(left, right) {
  parseReleaseVersion(left);
  parseReleaseVersion(right);
  return semver.compare(left, right);
}

function releasePolicy({
  version,
  releaseType,
  sourceVersion = '',
  reason = ''
}) {
  const parsed = parseReleaseVersion(version);
  if (
    !['beta', 'stable', 'hotfix'].includes(releaseType) ||
    (parsed.type === 'beta') !== (releaseType === 'beta')
  )
    throw new Error('Release type does not match the version');
  if (typeof sourceVersion !== 'string' || typeof reason !== 'string')
    throw new Error('Invalid release source or reason');
  reason = reason.trim();
  if (releaseType === 'beta') {
    if (sourceVersion || reason)
      throw new Error('Beta releases must not override their source or reason');
  } else {
    const source = parseReleaseVersion(sourceVersion);
    if (releaseType === 'stable') {
      if (source.type !== 'beta' || source.baseVersion !== version || reason)
        throw new Error(
          'A regular stable release requires a beta of the same base version'
        );
    } else if (
      source.type !== 'stable' ||
      semver.inc(sourceVersion, 'patch') !== version ||
      !reason ||
      reason.length > 1000
    ) {
      throw new Error(
        'A hotfix requires the previous stable version, its next patch version and a reason'
      );
    }
  }
  return { ...parsed, releaseType, sourceVersion, reason };
}

export function validateReleaseMetadata(metadata) {
  const policy = releasePolicy(metadata);
  for (const field of [
    'channel',
    'sourceVersion',
    'sourceSha',
    'sourceIntegrity',
    'reason'
  ])
    if (typeof metadata[field] !== 'string')
      throw new Error(`Missing release metadata: ${field}`);
  if (metadata.channel !== policy.channel)
    throw new Error('Release channel does not match the version');
  if (policy.releaseType === 'beta') {
    if (metadata.sourceSha || metadata.sourceIntegrity)
      throw new Error('Beta releases must not override their source identity');
  } else if (
    !fullSha.test(metadata.sourceSha) ||
    !integrity.test(metadata.sourceIntegrity)
  ) {
    throw new Error('Missing verified source commit or npm integrity');
  }
  return {
    ...policy,
    sourceSha: metadata.sourceSha,
    sourceIntegrity: metadata.sourceIntegrity
  };
}

export function releaseMetadataFromEnv(env = process.env) {
  return validateReleaseMetadata({
    version: env.RELEASE_VERSION,
    channel: env.RELEASE_CHANNEL,
    releaseType: env.RELEASE_TYPE,
    sourceVersion: env.RELEASE_SOURCE_VERSION ?? '',
    sourceSha: env.RELEASE_SOURCE_SHA ?? '',
    sourceIntegrity: env.RELEASE_SOURCE_INTEGRITY ?? '',
    reason: env.RELEASE_REASON ?? ''
  });
}

export function validateCandidate({
  version,
  ref,
  sha,
  expectedSha,
  pkg,
  lock,
  notes,
  releaseType,
  sourceVersion = '',
  reason = ''
}) {
  const policy = releasePolicy({ version, releaseType, sourceVersion, reason });
  if (ref !== `refs/heads/release/${version}`)
    throw new Error('Run from release/<version>');
  if (!fullSha.test(expectedSha) || sha !== expectedSha) {
    throw new Error(
      'The selected branch commit does not match the expected full SHA'
    );
  }
  if (
    pkg.name !== 'esa-cli' ||
    pkg.version !== version ||
    lock.version !== version ||
    lock.packages?.['']?.version !== version
  ) {
    throw new Error(
      'Package and lockfile versions must match the release version'
    );
  }
  if (!notes.trim() || /\bTODO\b|待填写/.test(notes))
    throw new Error('Complete the release notes first');
  return { ...policy, name: pkg.name, sha, tag: `v${version}` };
}

export async function verifyCandidateSource(candidate, { git, readSource }) {
  if (git(['rev-parse', 'HEAD']).trim() !== candidate.sha)
    throw new Error(
      'The checked-out commit differs from the release candidate'
    );
  if (candidate.releaseType !== 'hotfix')
    git(['merge-base', '--is-ancestor', candidate.sha, 'origin/master']);
  if (candidate.releaseType === 'beta')
    return {
      ...candidate,
      ...validateReleaseMetadata({
        ...candidate,
        sourceSha: '',
        sourceIntegrity: ''
      })
    };

  const { manifest, distTagVersion } = await readSource(
    candidate.sourceVersion
  );
  validateReleaseMetadata(manifest);
  if (
    manifest.version !== candidate.sourceVersion ||
    distTagVersion !== candidate.sourceVersion
  )
    throw new Error(
      'Choose the current beta or latest stable release as the source'
    );
  const sourceSha = git([
    'rev-parse',
    `refs/tags/v${candidate.sourceVersion}^{commit}`
  ]).trim();
  if (!fullSha.test(sourceSha) || manifest.sha !== sourceSha)
    throw new Error('Source tag does not match its published manifest');
  git(['merge-base', '--is-ancestor', sourceSha, candidate.sha]);

  if (candidate.releaseType === 'stable') {
    const allowed = new Set([
      'package.json',
      'package-lock.json',
      'CHANGELOG.md',
      `doc/releases/${candidate.version}.md`
    ]);
    const changed = git(['diff', '--name-only', '-z', sourceSha, candidate.sha])
      .split('\0')
      .filter(Boolean);
    if (changed.some((file) => !allowed.has(file)))
      throw new Error(
        'Business code or build inputs changed since beta; publish another beta first'
      );
    for (const file of ['package.json', 'package-lock.json']) {
      const read = (sha) => {
        const data = JSON.parse(git(['show', `${sha}:${file}`]));
        delete data.version;
        if (file === 'package-lock.json' && data.packages?.[''])
          delete data.packages[''].version;
        return data;
      };
      if (!isDeepStrictEqual(read(sourceSha), read(candidate.sha)))
        throw new Error(
          'Package configuration or dependency lock changed since beta; publish another beta first'
        );
    }
  }
  return {
    ...candidate,
    ...validateReleaseMetadata({
      ...candidate,
      sourceSha,
      sourceIntegrity: manifest.integrity
    })
  };
}

export function digest(buffer, algorithm = 'sha256') {
  return createHash(algorithm)
    .update(buffer)
    .digest(algorithm === 'sha512' ? 'base64' : 'hex');
}

export function verifyArtifact(manifest, buffer, expected) {
  const { version, sha } = expected;
  const actualPolicy = validateReleaseMetadata(manifest);
  const expectedPolicy = validateReleaseMetadata(expected);
  if (
    manifest.name !== 'esa-cli' ||
    manifest.version !== version ||
    manifest.sha !== sha ||
    manifest.file !== `esa-cli-${version}.tgz` ||
    manifest.sha256 !== digest(buffer) ||
    manifest.integrity !== `sha512-${digest(buffer, 'sha512')}` ||
    !fullSha.test(sha) ||
    policyFields.some((field) => actualPolicy[field] !== expectedPolicy[field])
  ) {
    throw new Error('Release artifact identity or checksum mismatch');
  }
}

export function readArtifact(directory, expected) {
  validateReleaseMetadata(expected);
  if (!fullSha.test(expected.sha ?? '')) {
    throw new Error('Invalid expected release identity');
  }
  const manifest = JSON.parse(
    readFileSync(`${directory}/manifest.json`, 'utf8')
  );
  // Verify the basename before using it as a path.
  if (manifest.file !== `esa-cli-${expected.version}.tgz`)
    throw new Error('Invalid tarball filename');
  const buffer = readFileSync(`${directory}/${manifest.file}`);
  verifyArtifact(manifest, buffer, expected);
  return manifest;
}

export async function registryVersion(name, version) {
  const response = await fetch(
    `https://registry.npmjs.org/${encodeURIComponent(name)}/${encodeURIComponent(version)}`,
    {
      signal: AbortSignal.timeout(15000)
    }
  );
  if (response.status === 404) return null;
  if (!response.ok)
    throw new Error(`npm registry returned HTTP ${response.status}`);
  return response.json();
}

export async function publishedSource(version) {
  const parsed = parseReleaseVersion(version);
  const repo = 'aliyun/alibabacloud-esa-cli';
  const headers = { Accept: 'application/vnd.github+json' };
  if (process.env.GH_TOKEN)
    headers.Authorization = `Bearer ${process.env.GH_TOKEN}`;
  const response = await fetch(
    `https://api.github.com/repos/${repo}/releases/tags/v${version}`,
    {
      headers,
      signal: AbortSignal.timeout(15000)
    }
  );
  if (!response.ok)
    throw new Error(
      `Published source Release lookup failed: HTTP ${response.status}`
    );
  const release = await response.json();
  const asset = release.assets?.find((item) => item.name === 'manifest.json');
  if (
    release.draft ||
    release.tag_name !== `v${version}` ||
    release.prerelease !== (parsed.type === 'beta') ||
    !Number.isSafeInteger(asset?.id) ||
    asset.id <= 0
  )
    throw new Error(
      'The source must be a completed Release with a manifest from this workflow'
    );
  const artifact = await fetch(
    `https://api.github.com/repos/${repo}/releases/assets/${asset.id}`,
    {
      headers: { ...headers, Accept: 'application/octet-stream' },
      signal: AbortSignal.timeout(15000)
    }
  );
  if (!artifact.ok)
    throw new Error(`Source manifest lookup failed: HTTP ${artifact.status}`);
  const manifest = await artifact.json();
  validateReleaseMetadata(manifest);
  const [published, distTag] = await Promise.all([
    registryVersion('esa-cli', version),
    registryVersion('esa-cli', parsed.channel)
  ]);
  if (
    manifest.name !== 'esa-cli' ||
    manifest.version !== version ||
    !fullSha.test(manifest.sha) ||
    manifest.file !== `esa-cli-${version}.tgz` ||
    !/^[a-f0-9]{64}$/.test(manifest.sha256) ||
    !integrity.test(manifest.integrity) ||
    published?.version !== version ||
    published.dist?.integrity !== manifest.integrity
  )
    throw new Error('Source manifest does not match the published npm package');
  return { manifest, distTagVersion: distTag?.version };
}
