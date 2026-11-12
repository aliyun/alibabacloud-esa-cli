import { test } from 'node:test';
import { mkdtempSync, writeFileSync, rmSync, copyFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import assert from 'node:assert/strict';
import {
  integrationConfig,
  integrationKeys
} from '../../scripts/release/integration-config.mjs';
import { assertExecutedReport } from '../../scripts/release/check-test-report.mjs';

test('real API tests require explicit write opt-in and complete non-placeholder configuration', () => {
  const env = {
    ESA_TEST_ACCESS_KEY_ID: 'fake',
    ESA_TEST_ACCESS_KEY_SECRET: 'fake',
    ESA_TEST_SITE_ID: '123',
    ESA_TEST_SITE_NAME: 'my-test.org',
    ESA_TEST_DOMAIN_SUFFIX: 'cli-tests.my-test.org',
    ESA_TEST_ALLOW_WRITE: '1'
  };
  assert.equal(integrationConfig(env).siteId, '123');
  for (const key of integrationKeys) {
    assert.throws(() => integrationConfig({ ...env, [key]: '' }));
    assert.throws(() => integrationConfig({ ...env, [key]: '<placeholder>' }));
  }
  for (const patch of [
    { ESA_TEST_ALLOW_WRITE: '0' },
    { ESA_TEST_SITE_ID: 'abc' },
    { ESA_TEST_DOMAIN_SUFFIX: 'production.org' },
    {
      ESA_TEST_SITE_NAME: 'example.com',
      ESA_TEST_DOMAIN_SUFFIX: 'ci.example.com'
    }
  ]) {
    assert.throws(() => integrationConfig({ ...env, ...patch }));
  }
});

test('a green process with skipped, missing or failed tests is rejected', () => {
  const report = {
    success: true,
    numTotalTests: 6,
    numPassedTests: 6,
    numFailedTests: 0,
    numPendingTests: 0
  };
  assertExecutedReport(report, 6);
  for (const patch of [
    { numPendingTests: 1 },
    { numTotalTests: 0 },
    { numPassedTests: 0 },
    { success: false },
    { numFailedTests: 1 },
    { numTodoTests: 1 },
    { numFailedTestSuites: 1 }
  ]) {
    assert.throws(() => assertExecutedReport({ ...report, ...patch }, 6));
  }
});

test('report gate executes as a CLI and returns failure for skipped tests', () => {
  const directory = mkdtempSync(join(tmpdir(), 'esa-report-test-'));
  try {
    const file = join(directory, 'report.json');
    const script = resolve('scripts/release/check-test-report.mjs');
    writeFileSync(
      file,
      JSON.stringify({
        success: true,
        numTotalTests: 1,
        numPassedTests: 0,
        numFailedTests: 0,
        numPendingTests: 1
      })
    );
    assert.equal(
      spawnSync(process.execPath, [script, file, '1'], { stdio: 'pipe' })
        .status,
      1
    );
    writeFileSync(
      file,
      JSON.stringify({
        success: true,
        numTotalTests: 1,
        numPassedTests: 1,
        numFailedTests: 0,
        numPendingTests: 0
      })
    );
    assert.equal(
      spawnSync(process.execPath, [script, file, '1'], { stdio: 'pipe' })
        .status,
      0
    );
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test('CI summary gates execute without node_modules and reject every non-success result', () => {
  const directory = mkdtempSync(join(tmpdir(), 'esa-summary-gate-'));
  try {
    const script = join(directory, 'check-jobs.mjs');
    copyFileSync(resolve('scripts/release/check-jobs.mjs'), script);
    for (const result of [
      'success',
      'failure',
      'cancelled',
      'skipped',
      undefined
    ]) {
      const output = spawnSync(process.execPath, [script, 'build'], {
        cwd: directory,
        stdio: 'pipe',
        env: {
          ...process.env,
          JOB_RESULTS: JSON.stringify({ build: { result } })
        }
      });
      assert.equal(output.status, result === 'success' ? 0 : 1);
    }
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
