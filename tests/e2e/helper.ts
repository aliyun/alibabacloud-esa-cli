import { resolve } from 'node:path';
import { runCliProcess } from '../support/cli-process';

export function stripAnsi(text: string): string {
  // eslint-disable-next-line no-control-regex
  return text.replace(/\u001b\[[0-9;?]*[A-Za-z]/g, '');
}

export async function runInteractiveDelayed(
  options: {
    bin: string;
    args: string[];
    cwd?: string;
    env?: Record<string, string>;
    timeout?: number;
  },
  inputs: { value: string; delay?: number }[] = []
) {
  const result = await runCliProcess({
    ...options,
    inputs,
    nodeArgs: ['--require', resolve('tests/fixtures/offline-http.cjs')]
  });
  if (result.timedOut)
    throw new Error(`CLI ${options.args[0] ?? ''} timed out`);
  return result;
}
