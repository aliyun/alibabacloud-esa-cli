/**
 * Helper for API integration tests.
 *
 * Manages test environment: login before tests, logout after.
 * Provides utilities to run CLI commands and parse JSON output.
 */
import { spawn } from 'child_process';
import { resolve } from 'path';
import { mkdtempSync, rmSync, existsSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import toml from '@iarna/toml';
import { CREDENTIALS } from './credentials';

export const CLI_BIN = process.env.ESA_CLI_BIN
  ? resolve(process.cwd(), process.env.ESA_CLI_BIN)
  : resolve(process.cwd(), 'bin/enter.cjs');

export interface CliResult {
  stdout: string;
  stderr: string;
  exitCode: number | null;
}

export async function runCli(
  args: string[] = [],
  options: { cwd?: string; env?: Record<string, string> } = {}
): Promise<CliResult> {
  return new Promise((resolvePromise, reject) => {
    const child = spawn('node', [CLI_BIN, ...args], {
      cwd: options.cwd,
      env: { ...process.env, ...options.env },
      stdio: ['pipe', 'pipe', 'pipe']
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (data) => {
      stdout += data.toString();
    });
    child.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    child.on('error', reject);
    child.on('close', (code) => {
      resolvePromise({ stdout, stderr, exitCode: code });
    });
  });
}

/** Temporary HOME directory with pre-configured credentials */
let _tmpHome: string | null = null;

/**
 * Get a temp HOME dir with ESA credentials pre-configured.
 * Created once per test run, cleaned up on process exit.
 */
export function getTestHome(): string {
  if (_tmpHome) return _tmpHome;

  _tmpHome = mkdtempSync(join(tmpdir(), 'esa-integration-'));

  // Write credentials to ~/.esa/config/default.toml
  const configDir = join(_tmpHome, '.esa', 'config');
  const { mkdirSync, writeFileSync } = require('fs');
  mkdirSync(configDir, { recursive: true });

  const credConfig = {
    auth: {
      accessKeyId: CREDENTIALS.accessKeyId,
      accessKeySecret: CREDENTIALS.accessKeySecret
    },
    endpoint: CREDENTIALS.endpoint,
    lang: 'en'
  };

  writeFileSync(
    join(configDir, 'default.toml'),
    toml.stringify(credConfig as any)
  );

  // Cleanup on exit
  process.on('exit', () => {
    if (_tmpHome && existsSync(_tmpHome)) {
      rmSync(_tmpHome, { recursive: true, force: true });
    }
  });

  return _tmpHome;
}

/** Environment with HOME pointed to test home (with credentials) */
export function testEnv(): Record<string, string> {
  return { HOME: getTestHome() };
}

/**
 * Run a CLI command that is expected to output JSON.
 * Returns the parsed JSON object.
 */
export async function runCliJson(
  args: string[],
  options: { cwd?: string; env?: Record<string, string> } = {}
): Promise<any> {
  const result = await runCli(args, {
    ...options,
    env: { ...testEnv(), ...options.env }
  });

  if (result.exitCode !== 0) {
    throw new Error(
      `CLI exited with code ${result.exitCode}:\n` +
        `  args: ${args.join(' ')}\n` +
        `  stdout: ${result.stdout}\n` +
        `  stderr: ${result.stderr}`
    );
  }

  // Try to extract JSON from output (may have log lines mixed in)
  const jsonMatch = result.stdout.match(/(\[[\s\S]*\]|\{[\s\S]*\})/);
  if (jsonMatch) {
    try {
      return JSON.parse(jsonMatch[0]);
    } catch {
      // If JSON parsing fails, return raw output
    }
  }

  // Return raw stdout if no JSON found
  return result.stdout;
}

/** Non-deterministic fields to strip before comparing API responses */
export const NON_DETERMINISTIC_FIELDS = [
  'createTime',
  'updateTime',
  'requestId',
  'createTimeStr',
  'updateTimeStr',
  'timestamp',
  'operationId',
  'deployId',
  'versionId'
];

/** Strip non-deterministic fields from an API response object */
export function stripNonDeterministic(obj: any): any {
  if (obj === null || obj === undefined) return obj;
  if (Array.isArray(obj)) return obj.map(stripNonDeterministic);
  if (typeof obj === 'object') {
    const result: Record<string, any> = {};
    for (const [key, value] of Object.entries(obj)) {
      if (!NON_DETERMINISTIC_FIELDS.includes(key)) {
        result[key] = stripNonDeterministic(value);
      }
    }
    return result;
  }
  return obj;
}
