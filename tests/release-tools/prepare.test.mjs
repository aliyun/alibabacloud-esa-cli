import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  mkdtempSync,
  writeFileSync,
  readFileSync,
  rmSync,
  existsSync
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { execFileSync } from 'node:child_process';
import { compareVersions } from '../../scripts/release/guards.mjs';

test('version preparation updates both manifests without running package scripts or creating tags', () => {
  const cwd = mkdtempSync(join(tmpdir(), 'esa-prepare-test-'));
  try {
    writeFileSync(
      join(cwd, 'package.json'),
      JSON.stringify({
        name: 'esa-cli',
        version: '1.2.3',
        scripts: { version: 'exit 99' }
      })
    );
    writeFileSync(
      join(cwd, 'package-lock.json'),
      JSON.stringify({
        name: 'esa-cli',
        version: '1.2.3',
        lockfileVersion: 3,
        packages: { '': { name: 'esa-cli', version: '1.2.3' } }
      })
    );
    execFileSync(
      process.execPath,
      [resolve('scripts/release/prepare.mjs'), '1.2.4'],
      { cwd, stdio: 'pipe' }
    );
    const pkg = JSON.parse(readFileSync(join(cwd, 'package.json'), 'utf8'));
    const lock = JSON.parse(
      readFileSync(join(cwd, 'package-lock.json'), 'utf8')
    );
    assert.equal(pkg.version, '1.2.4');
    assert.equal(lock.version, '1.2.4');
    assert.equal(lock.packages[''].version, '1.2.4');
    assert.ok(
      readFileSync(join(cwd, 'doc/releases/1.2.4.md'), 'utf8').includes('TODO')
    );
    assert.equal(existsSync(join(cwd, '.git')), false);
    assert.throws(() =>
      execFileSync(
        process.execPath,
        [resolve('scripts/release/prepare.mjs'), '1.2.3'],
        { cwd, stdio: 'pipe' }
      )
    );
  } finally {
    rmSync(cwd, { recursive: true, force: true });
  }
});

test('version comparison handles stable and numeric beta precedence', () => {
  assert.equal(compareVersions('1.10.0', '1.9.99'), 1);
  assert.equal(compareVersions('1.2.3', '1.2.3'), 0);
  assert.equal(compareVersions('1.99.0', '2.0.0'), -1);
  assert.equal(compareVersions('1.2.3-beta.1', '1.2.3'), -1);
  assert.equal(compareVersions('1.2.3-beta.10', '1.2.3-beta.2'), 1);
  assert.throws(() => compareVersions('1.2.3-rc.1', '1.2.3'));
});

test('version preparation supports beta iterations and stable promotion without changing the project version in place', () => {
  const cwd = mkdtempSync(join(tmpdir(), 'esa-beta-prepare-test-'));
  try {
    writeFileSync(
      join(cwd, 'package.json'),
      JSON.stringify({
        name: 'esa-cli',
        version: '1.2.3',
        scripts: { version: 'exit 99' }
      })
    );
    writeFileSync(
      join(cwd, 'package-lock.json'),
      JSON.stringify({
        name: 'esa-cli',
        version: '1.2.3',
        lockfileVersion: 3,
        packages: { '': { name: 'esa-cli', version: '1.2.3' } }
      })
    );
    for (const version of [
      '1.2.4-beta.1',
      '1.2.4-beta.2',
      '1.2.4-beta.10',
      '1.2.4'
    ]) {
      execFileSync(
        process.execPath,
        [resolve('scripts/release/prepare.mjs'), version],
        { cwd, stdio: 'pipe' }
      );
      assert.equal(
        JSON.parse(readFileSync(join(cwd, 'package.json'), 'utf8')).version,
        version
      );
      assert.equal(
        JSON.parse(readFileSync(join(cwd, 'package-lock.json'), 'utf8'))
          .packages[''].version,
        version
      );
      assert.ok(existsSync(join(cwd, `doc/releases/${version}.md`)));
    }
    for (const version of ['1.2.4-beta.11', '1.2.4-rc.1', '1.2.3'])
      assert.throws(() =>
        execFileSync(
          process.execPath,
          [resolve('scripts/release/prepare.mjs'), version],
          { cwd, stdio: 'pipe' }
        )
      );
    assert.equal(existsSync(join(cwd, '.git')), false);
  } finally {
    rmSync(cwd, { recursive: true, force: true });
  }
});
