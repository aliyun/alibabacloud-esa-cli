import { execFileSync, spawn, spawnSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const repositoryRoot = fileURLToPath(new URL('../../', import.meta.url));
const buildRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'esa-cli-build-'));
const buildDist = path.join(buildRoot, 'dist');
const entryPath = path.join(buildDist, 'index.js');
const launcherPath = path.join(buildRoot, 'bin', 'enter.cjs');
const isolatedHome = fs.mkdtempSync(
  path.join(os.tmpdir(), 'esa-cli-process-contract-')
);
const launcherRunnerPath = path.join(
  repositoryRoot,
  'tests',
  'fixtures',
  'runLauncher.cjs'
);
const signalChildPath = path.join(
  repositoryRoot,
  'tests',
  'fixtures',
  'waitForSignal.cjs'
);
const keepProcessAlivePath = path.join(
  repositoryRoot,
  'tests',
  'fixtures',
  'keepProcessAlive.cjs'
);

function createIsolatedEnvironment(): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = {
    ...process.env,
    HOME: isolatedHome,
    USERPROFILE: isolatedHome,
    ESA_NO_UPDATE_CHECK: '1',
    NO_COLOR: '1',
    FORCE_COLOR: '0'
  };
  for (const key of [
    'ALIBABA_CLOUD_ACCESS_KEY_ID',
    'ALIBABA_CLOUD_ACCESS_KEY_SECRET',
    'ALIBABA_CLOUD_SECURITY_TOKEN',
    'ESA_ACCESS_KEY_ID',
    'ESA_ACCESS_KEY_SECRET',
    'ESA_SECURITY_TOKEN'
  ]) {
    delete env[key];
  }
  return env;
}

function runCli(entry: string, args: string[]) {
  const result = spawnSync(process.execPath, [entry, ...args], {
    cwd: repositoryRoot,
    env: createIsolatedEnvironment(),
    encoding: 'utf-8',
    timeout: 20_000
  });
  if (result.error) throw result.error;
  return result;
}

function copyRuntimeAsset(source: string, target: string) {
  const targetPath = path.join(buildRoot, target);
  fs.mkdirSync(path.dirname(targetPath), { recursive: true });
  fs.cpSync(path.join(repositoryRoot, source), targetPath, { recursive: true });
}

describe('CLI process contract', () => {
  beforeAll(() => {
    fs.mkdirSync(buildDist, { recursive: true });
    execFileSync(
      process.execPath,
      [
        path.join(repositoryRoot, 'node_modules', 'typescript', 'bin', 'tsc'),
        '--project',
        path.join(repositoryRoot, 'tsconfig.json'),
        '--outDir',
        buildDist
      ],
      {
        cwd: repositoryRoot,
        env: process.env,
        stdio: 'pipe',
        timeout: 60_000
      }
    );
    copyRuntimeAsset('package.json', 'package.json');
    copyRuntimeAsset('bin', 'bin');
    copyRuntimeAsset('src/i18n/locales.json', 'dist/i18n/locales.json');
    copyRuntimeAsset('src/cliconfig.toml', 'dist/cliconfig.toml');
    copyRuntimeAsset(
      'src/commands/init/template.jsonc',
      'dist/commands/init/template.jsonc'
    );
    copyRuntimeAsset(
      'src/commands/init/snippets',
      'dist/commands/init/snippets'
    );
    copyRuntimeAsset('src/utils/install', 'dist/utils/install');
    copyRuntimeAsset(
      'src/commands/dev/mockWorker/devEntry.js',
      'dist/commands/dev/mockWorker/devEntry.js'
    );
    copyRuntimeAsset(
      'src/commands/dev/mockWorker/mock',
      'dist/commands/dev/mockWorker/mock'
    );
    copyRuntimeAsset(
      'src/commands/dev/ew2/devEntry.js',
      'dist/commands/dev/ew2/devEntry.js'
    );
    copyRuntimeAsset('src/commands/dev/ew2/mock', 'dist/commands/dev/ew2/mock');
    fs.symlinkSync(
      path.join(repositoryRoot, 'node_modules'),
      path.join(buildRoot, 'node_modules'),
      process.platform === 'win32' ? 'junction' : 'dir'
    );
  }, 60_000);

  afterAll(() => {
    fs.rmSync(isolatedHome, { recursive: true, force: true });
    fs.rmSync(buildRoot, { recursive: true, force: true });
  });

  it('returns zero for help and version', () => {
    const help = runCli(entryPath, ['--help', '--skip-update-check']);
    const version = runCli(entryPath, ['--version', '--skip-update-check']);

    expect(help.status).toBe(0);
    expect(help.signal).toBeNull();
    expect(help.stdout).toContain('Commands:');
    expect(version.status).toBe(0);
    expect(version.signal).toBeNull();
    expect(version.stdout).toMatch(/^v\d+\.\d+\.\d+/m);
  }, 45_000);

  it('returns one for parser failures without polluting JSON stdout', () => {
    const unknown = runCli(entryPath, [
      'definitely-unknown',
      '--skip-update-check'
    ]);
    const invalidEnvironment = runCli(entryPath, [
      'deploy',
      '--environment',
      'invalid',
      '--output',
      'json',
      '--skip-update-check'
    ]);
    const missingVersionsValue = runCli(entryPath, [
      'deploy',
      '--versions',
      '--output',
      'json',
      '--skip-update-check'
    ]);

    expect(unknown.status).toBe(1);
    expect(unknown.signal).toBeNull();
    expect(invalidEnvironment.status).toBe(1);
    expect(invalidEnvironment.signal).toBeNull();
    expect(invalidEnvironment.stdout).toBe('');
    expect(missingVersionsValue.status).toBe(1);
    expect(missingVersionsValue.signal).toBeNull();
    expect(missingVersionsValue.stdout).toBe('');
  }, 45_000);

  it('emits a JSON result and returns one for a handled deploy failure', () => {
    const result = runCli(entryPath, [
      'deploy',
      '--versions',
      'v1:80',
      '--output',
      'json',
      '--skip-update-check'
    ]);

    expect(result.status).toBe(1);
    expect(result.signal).toBeNull();
    expect(JSON.parse(result.stdout)).toEqual({
      schemaVersion: 1,
      app: '',
      url: null,
      deployments: []
    });
  }, 45_000);

  it('exits after flushing a deploy result even with an unrelated active handle', async () => {
    const child = spawn(
      process.execPath,
      [
        '--require',
        keepProcessAlivePath,
        entryPath,
        'deploy',
        '--versions',
        'v1:80',
        '--output',
        'json',
        '--skip-update-check'
      ],
      {
        cwd: repositoryRoot,
        env: createIsolatedEnvironment(),
        stdio: ['ignore', 'pipe', 'pipe']
      }
    );
    let stdout = '';
    let stderr = '';
    let resultWrittenAt: number | undefined;
    let exitAfterResultTimer: NodeJS.Timeout | undefined;

    const [status, signal] = await new Promise<
      [number | null, NodeJS.Signals | null]
    >((resolve, reject) => {
      const overallTimer = setTimeout(() => {
        child.kill('SIGKILL');
        reject(new Error(`Deploy process timed out. stderr: ${stderr}`));
      }, 10_000);

      child.stdout.on('data', (chunk) => {
        stdout += String(chunk);
        if (resultWrittenAt === undefined && stdout.includes('\n')) {
          resultWrittenAt = Date.now();
          exitAfterResultTimer = setTimeout(() => {
            child.kill('SIGKILL');
            reject(
              new Error('Deploy process stayed alive after writing its result')
            );
          }, 3_000);
        }
      });
      child.stderr.on('data', (chunk) => {
        stderr += String(chunk);
      });
      child.once('error', (error) => {
        clearTimeout(overallTimer);
        if (exitAfterResultTimer) clearTimeout(exitAfterResultTimer);
        reject(error);
      });
      child.once('close', (code, closeSignal) => {
        clearTimeout(overallTimer);
        if (exitAfterResultTimer) clearTimeout(exitAfterResultTimer);
        resolve([code, closeSignal]);
      });
    });

    expect(resultWrittenAt).toBeDefined();
    expect(status).toBe(1);
    expect(signal).toBeNull();
    expect(JSON.parse(stdout)).toEqual({
      schemaVersion: 1,
      app: '',
      url: null,
      deployments: []
    });
  }, 45_000);

  it('forwards child command success and failure through the package launcher', () => {
    const success = runCli(launcherPath, ['--version', '--skip-update-check']);
    const failure = runCli(launcherPath, [
      'login',
      '--sts-token',
      'malformed',
      '--skip-update-check'
    ]);

    expect(success.status).toBe(0);
    expect(success.stdout).toMatch(/^v\d+\.\d+\.\d+/m);
    expect(failure.status).toBe(1);
    expect(failure.stdout).toContain('Invalid STS token format');
  }, 45_000);

  it('keeps diagnostics off stdout when the global config is invalid', () => {
    const configDir = path.join(isolatedHome, '.esa', 'config');
    const configPath = path.join(configDir, 'default.toml');
    fs.mkdirSync(configDir, { recursive: true });
    fs.writeFileSync(configPath, 'endpoint = [');

    let result;
    try {
      result = runCli(entryPath, [
        'deploy',
        '--versions',
        'v1:80',
        '--output',
        'json',
        '--skip-update-check'
      ]);
    } finally {
      fs.rmSync(configPath, { force: true });
    }

    expect(result.status).toBe(1);
    expect(result.signal).toBeNull();
    expect(result.stdout).toBe('');
    expect(result.stderr).toContain('Error parsing config file');
  }, 45_000);

  it.skipIf(process.platform === 'win32')(
    'forwards SIGINT to the child and terminates with SIGINT',
    async () => {
      const launcher = spawn(
        process.execPath,
        [launcherRunnerPath, launcherPath, signalChildPath],
        {
          cwd: repositoryRoot,
          env: createIsolatedEnvironment(),
          stdio: ['ignore', 'pipe', 'pipe']
        }
      );

      try {
        await new Promise<void>((resolve, reject) => {
          let output = '';
          const timer = setTimeout(
            () => reject(new Error('Timed out waiting for signal child')),
            5_000
          );
          launcher.stdout.on('data', (chunk) => {
            output += String(chunk);
            if (output.includes('ready')) {
              clearTimeout(timer);
              resolve();
            }
          });
          launcher.once('error', (error) => {
            clearTimeout(timer);
            reject(error);
          });
        });
        const exitPromise = new Promise<[number | null, NodeJS.Signals | null]>(
          (resolve, reject) => {
            const timer = setTimeout(
              () => reject(new Error('Timed out waiting for launcher exit')),
              5_000
            );
            launcher.once('exit', (code, signal) => {
              clearTimeout(timer);
              resolve([code, signal]);
            });
            launcher.once('error', (error) => {
              clearTimeout(timer);
              reject(error);
            });
          }
        );
        launcher.kill('SIGINT');
        const [code, signal] = await exitPromise;

        expect(code).toBeNull();
        expect(signal).toBe('SIGINT');
      } finally {
        if (launcher.exitCode === null && launcher.signalCode === null) {
          launcher.kill('SIGKILL');
        }
      }
    },
    15_000
  );
});
