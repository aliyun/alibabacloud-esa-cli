import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, it } from 'vitest';
import { cliEnvironment, runCliProcess } from './cli-process';
import { runInteractiveDelayed } from '../e2e/helper';

it('delivers every delayed input and closes stdin in a path containing spaces', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'esa process test '));
  try {
    const bin = join(directory, 'input.cjs');
    writeFileSync(
      bin,
      "let input = ''; process.stdin.on('data', data => { input += data; }); process.stdin.on('end', () => process.stdout.write(input));"
    );
    const result = await runCliProcess({
      bin,
      args: [],
      inputs: [
        { value: 'first\r', delay: 250 },
        { value: 'accepted\r', delay: 250 }
      ],
      timeout: 5000
    });
    expect(result.timedOut).toBe(false);
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toBe('first\raccepted\r');
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

it('waits for complete prompts across chunks and streams before sending each answer', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'esa prompt test '));
  try {
    const bin = join(directory, 'prompts.cjs');
    writeFileSync(
      bin,
      `let stage = 0;
setTimeout(() => {
  process.stdout.write('\u001b[36mFirst ');
  setTimeout(() => { stage = 1; process.stdout.write('prompt:\u001b[0m'); }, 30);
}, 100);
process.stdin.on('data', chunk => {
  if (stage === 1 && String(chunk) === 'one\\r') {
    stage = 2;
    process.stderr.write('Second ');
    setTimeout(() => { stage = 3; process.stderr.write('prompt:'); }, 50);
  } else if (stage === 3 && String(chunk) === 'two\\r') {
    stage = 4;
  } else {
    process.exit(2);
  }
});
process.stdin.on('end', () => {
  if (stage !== 4) process.exit(3);
  process.stdout.write('all answers received');
});`
    );
    const result = await runCliProcess({
      bin,
      args: [],
      inputs: [
        { value: 'one\r', waitFor: 'First prompt:' },
        { value: 'two\r', waitFor: /Second prompt:/g }
      ],
      timeout: 5000
    });
    expect(result.timedOut).toBe(false);
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('all answers received');
    expect(result.stderr).toBe('Second prompt:');
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}, 10000);

it('does not reuse an old prompt and rejects exit before every answer was sent', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'esa repeated prompt '));
  try {
    const bin = join(directory, 'prompt.cjs');
    writeFileSync(
      bin,
      "process.stdout.write('Answer:'); process.stdin.once('data', () => process.exit(0));"
    );
    await expect(
      runCliProcess({
        bin,
        args: [],
        inputs: [
          { value: 'one\r', waitFor: 'Answer:' },
          { value: 'two\r', waitFor: 'Answer:' }
        ],
        timeout: 5000
      })
    ).rejects.toThrow('CLI exited before input 2/2; expected prompt: Answer:');
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}, 10000);

it('bounds a missing prompt by the total timeout without sending an early answer', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'esa missing prompt '));
  try {
    const bin = join(directory, 'prompt.cjs');
    writeFileSync(
      bin,
      "process.stdout.write('Other prompt:'); process.stdin.on('data', () => { console.log('unexpected input'); process.exit(0); }); setInterval(() => {}, 1000);"
    );
    const result = await runCliProcess({
      bin,
      args: [],
      inputs: [{ value: 'answer\r', waitFor: 'Expected prompt:' }],
      timeout: 500
    });
    expect(result.timedOut).toBe(true);
    expect(result.exitCode).not.toBe(0);
    expect(result.stdout).not.toContain('unexpected input');
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

it('terminates a CLI that waits forever instead of treating timeout as success', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'esa-timeout-'));
  try {
    const bin = join(directory, 'hang.cjs');
    writeFileSync(bin, 'setInterval(() => {}, 1000);');
    const result = await runCliProcess({ bin, args: [], timeout: 500 });
    expect(result.timedOut).toBe(true);
    expect(result.exitCode).not.toBe(0);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

it('isolates cloud credentials and mirrors only the explicit test home', () => {
  const env = cliEnvironment({ HOME: '/temporary-test-home' });
  expect(env.USERPROFILE).toBe('/temporary-test-home');
  expect(env.ESA_NO_UPDATE_CHECK).toBe('1');
  expect(
    Object.keys(env).filter((key) =>
      /^(ALIBABA_CLOUD_|ESA_ACCESS_|ESA_SECURITY_|ESA_TEST_)/.test(key)
    )
  ).toEqual([]);
});

it('rejects an interactive timeout even after success output and a clean signal exit', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'esa-hung-prompt-'));
  try {
    const bin = join(directory, 'hang.cjs');
    writeFileSync(
      bin,
      "console.log('Login success!'); process.on('SIGTERM', () => process.exit(0)); setInterval(() => {}, 1000);"
    );
    await expect(
      runInteractiveDelayed({ bin, args: ['login'], timeout: 500 })
    ).rejects.toThrow('CLI login timed out');
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
