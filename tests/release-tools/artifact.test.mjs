import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  readFileSync,
  rmSync
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { execFileSync } from 'node:child_process';
import {
  readArtifact,
  validateCandidate,
  verifyCandidateSource
} from '../../scripts/release/guards.mjs';

const betaVersion = '1.2.3-beta.1';
const betaMetadata = {
  version: betaVersion,
  channel: 'beta',
  releaseType: 'beta',
  sourceVersion: '',
  sourceSha: '',
  sourceIntegrity: '',
  reason: ''
};

function project(version = betaVersion) {
  const cwd = mkdtempSync(join(tmpdir(), 'esa-artifact-test-'));
  mkdirSync(join(cwd, 'doc', 'releases'), { recursive: true });
  mkdirSync(join(cwd, 'bin'));
  writeFileSync(join(cwd, 'bin', 'enter.cjs'), `console.log("v${version}");`);
  writeFileSync(
    join(cwd, 'package.json'),
    JSON.stringify({
      name: 'esa-cli',
      version,
      files: ['bin'],
      bin: { esa: 'bin/enter.cjs' }
    })
  );
  writeFileSync(
    join(cwd, 'package-lock.json'),
    JSON.stringify({
      name: 'esa-cli',
      version,
      lockfileVersion: 3,
      packages: { '': { name: 'esa-cli', version } }
    })
  );
  writeFileSync(
    join(cwd, 'doc', 'releases', `${version}.md`),
    'Verified release changes.'
  );
  return cwd;
}

test('pack produces a verifiable tarball and rejects corruption after packaging', () => {
  const cwd = project();
  const sha = 'a'.repeat(40);
  try {
    execFileSync(process.execPath, [resolve('scripts/release/pack.mjs')], {
      cwd,
      env: {
        ...process.env,
        GITHUB_SHA: sha,
        RELEASE_VERSION: betaVersion,
        RELEASE_CHANNEL: 'beta',
        RELEASE_TYPE: 'beta',
        RELEASE_SOURCE_VERSION: '',
        RELEASE_SOURCE_SHA: '',
        RELEASE_SOURCE_INTEGRITY: '',
        RELEASE_REASON: ''
      },
      stdio: 'pipe'
    });
    const directory = join(cwd, 'release-artifacts');
    const expected = { ...betaMetadata, sha };
    const manifest = readArtifact(directory, expected);
    assert.equal(manifest.file, `esa-cli-${betaVersion}.tgz`);
    assert.equal(
      readFileSync(join(directory, 'release-notes.md'), 'utf8'),
      'Verified release changes.'
    );
    writeFileSync(join(directory, manifest.file), 'corrupted tarball');
    assert.throws(() => readArtifact(directory, expected));
  } finally {
    rmSync(cwd, { recursive: true, force: true });
  }
});

test('candidate check accepts master history and rejects a commit existing only on a feature branch', () => {
  const cwd = project();
  const git = (args) =>
    execFileSync('git', args, {
      cwd,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe']
    }).trim();
  try {
    git(['init']);
    git(['add', '.']);
    git([
      '-c',
      'user.name=Release Test',
      '-c',
      'user.email=release-test@example.invalid',
      'commit',
      '-m',
      'fixture'
    ]);
    git(['update-ref', 'refs/remotes/origin/master', 'HEAD']);
    const sha = git(['rev-parse', 'HEAD']);
    const env = {
      ...process.env,
      RELEASE_VERSION: betaVersion,
      RELEASE_TYPE: 'beta',
      RELEASE_SOURCE_VERSION: '',
      RELEASE_REASON: '',
      GITHUB_REF: `refs/heads/release/${betaVersion}`,
      GITHUB_SHA: sha,
      RELEASE_SHA: sha
    };
    delete env.GITHUB_OUTPUT;
    const script = resolve('scripts/release/check-candidate.mjs');
    execFileSync(process.execPath, [script], { cwd, env, stdio: 'pipe' });
    writeFileSync(join(cwd, 'unreviewed.txt'), 'feature-only change');
    git(['add', '.']);
    git([
      '-c',
      'user.name=Release Test',
      '-c',
      'user.email=release-test@example.invalid',
      'commit',
      '-m',
      'feature'
    ]);
    const other = git(['rev-parse', 'HEAD']);
    assert.throws(() =>
      execFileSync(process.execPath, [script], {
        cwd,
        env: { ...env, GITHUB_SHA: other, RELEASE_SHA: other },
        stdio: 'pipe'
      })
    );
  } finally {
    rmSync(cwd, { recursive: true, force: true });
  }
});

test('regular stable promotion rejects changed code, dependency settings and stale beta evidence', async () => {
  const cwd = project();
  const git = (args) =>
    execFileSync('git', args, {
      cwd,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe']
    });
  const commit = (message) => {
    git(['add', '.']);
    git([
      '-c',
      'user.name=Release Test',
      '-c',
      'user.email=release-test@example.invalid',
      'commit',
      '-m',
      message
    ]);
    git(['update-ref', 'refs/remotes/origin/master', 'HEAD']);
    return git(['rev-parse', 'HEAD']).trim();
  };
  const candidate = (sha) =>
    validateCandidate({
      version: '1.2.3',
      releaseType: 'stable',
      sourceVersion: betaVersion,
      ref: 'refs/heads/release/1.2.3',
      sha,
      expectedSha: sha,
      pkg: JSON.parse(readFileSync(join(cwd, 'package.json'), 'utf8')),
      lock: JSON.parse(readFileSync(join(cwd, 'package-lock.json'), 'utf8')),
      notes: 'Promote the tested beta.'
    });
  try {
    git(['init']);
    const sourceSha = commit('beta');
    git(['tag', `v${betaVersion}`]);
    for (const file of ['package.json', 'package-lock.json']) {
      const data = JSON.parse(readFileSync(join(cwd, file), 'utf8'));
      data.version = '1.2.3';
      if (data.packages) data.packages[''].version = '1.2.3';
      writeFileSync(join(cwd, file), JSON.stringify(data));
    }
    writeFileSync(
      join(cwd, 'doc/releases/1.2.3.md'),
      'Promote the tested beta.'
    );
    const stableSha = commit('stable metadata');
    const evidence = {
      manifest: { ...betaMetadata, sha: sourceSha, integrity: 'sha512-source' },
      distTagVersion: betaVersion
    };
    const deps = { git, readSource: async () => evidence };
    assert.equal(
      (await verifyCandidateSource(candidate(stableSha), deps)).sourceSha,
      sourceSha
    );
    await assert.rejects(
      verifyCandidateSource(candidate(stableSha), {
        ...deps,
        readSource: async () => ({
          ...evidence,
          distTagVersion: '1.2.3-beta.2'
        })
      }),
      /current beta/
    );
    const pkg = JSON.parse(readFileSync(join(cwd, 'package.json'), 'utf8'));
    pkg.dependencies = { changed: '1.0.0' };
    writeFileSync(join(cwd, 'package.json'), JSON.stringify(pkg));
    const changedDependencies = commit('changed dependency');
    await assert.rejects(
      verifyCandidateSource(candidate(changedDependencies), deps),
      /dependency lock/
    );
    writeFileSync(
      join(cwd, 'bin/enter.cjs'),
      'console.log("untried business change");'
    );
    const changedCode = commit('changed code');
    await assert.rejects(
      verifyCandidateSource(candidate(changedCode), deps),
      /another beta/
    );
    git(['tag', '-f', `v${betaVersion}`, changedCode]);
    await assert.rejects(
      verifyCandidateSource(candidate(changedCode), deps),
      /Source tag/
    );
  } finally {
    rmSync(cwd, { recursive: true, force: true });
  }
});

test('hotfix candidates may be outside master but must descend from the published stable tag', async () => {
  const cwd = project('1.2.3');
  const git = (args) =>
    execFileSync('git', args, {
      cwd,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe']
    });
  const commit = (message) => {
    git(['add', '.']);
    git([
      '-c',
      'user.name=Release Test',
      '-c',
      'user.email=release-test@example.invalid',
      'commit',
      '-m',
      message
    ]);
    return git(['rev-parse', 'HEAD']).trim();
  };
  try {
    git(['init']);
    const sourceSha = commit('stable');
    git(['tag', 'v1.2.3']);
    git(['update-ref', 'refs/remotes/origin/master', 'HEAD']);
    for (const file of ['package.json', 'package-lock.json']) {
      const data = JSON.parse(readFileSync(join(cwd, file), 'utf8'));
      data.version = '1.2.4';
      if (data.packages) data.packages[''].version = '1.2.4';
      writeFileSync(join(cwd, file), JSON.stringify(data));
    }
    writeFileSync(join(cwd, 'bin/enter.cjs'), 'console.log("hotfix");');
    const sha = commit('hotfix');
    const candidate = validateCandidate({
      version: '1.2.4',
      releaseType: 'hotfix',
      sourceVersion: '1.2.3',
      reason: 'Fix a production regression',
      ref: 'refs/heads/release/1.2.4',
      sha,
      expectedSha: sha,
      pkg: JSON.parse(readFileSync(join(cwd, 'package.json'), 'utf8')),
      lock: JSON.parse(readFileSync(join(cwd, 'package-lock.json'), 'utf8')),
      notes: 'Emergency fix.'
    });
    const source = {
      manifest: {
        version: '1.2.3',
        channel: 'latest',
        releaseType: 'stable',
        sourceVersion: betaVersion,
        sourceSha: 'b'.repeat(40),
        sourceIntegrity: 'sha512-beta',
        reason: '',
        sha: sourceSha,
        integrity: 'sha512-stable'
      },
      distTagVersion: '1.2.3'
    };
    assert.equal(
      (
        await verifyCandidateSource(candidate, {
          git,
          readSource: async () => source
        })
      ).sourceSha,
      sourceSha
    );
    writeFileSync(join(cwd, 'after-hotfix'), 'unrelated later commit');
    const laterSha = commit('later');
    git(['tag', '-f', 'v1.2.3', laterSha]);
    git(['checkout', '--detach', sha]);
    await assert.rejects(
      verifyCandidateSource(candidate, {
        git,
        readSource: async () => ({
          ...source,
          manifest: { ...source.manifest, sha: laterSha }
        })
      })
    );
  } finally {
    rmSync(cwd, { recursive: true, force: true });
  }
});
